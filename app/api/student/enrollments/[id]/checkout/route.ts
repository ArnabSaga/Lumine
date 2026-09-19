import { NextResponse } from "next/server";
import { Prisma, UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { mockPaymentProvider } from "@/lib/server/payments/mock-provider";
import { finalizeVerifiedPayment } from "@/lib/server/services/payment.service";

// POST /api/student/enrollments/[id]/checkout — initiate payment for enrollment.
// Concurrent checkouts never leave duplicate active PENDING payment attempts:
// resolution runs in a serializable transaction (existing PENDING is resumed,
// FAILED/none creates one new attempt, SUCCEEDED returns already-paid).

type CheckoutResolution =
  | { action: "already-paid"; paymentId: string }
  | {
      action: "finalize";
      paymentId: string;
      amount: string;
      currency: string;
    }
  | { action: "reject"; status: 404 | 409; message: string };

const MAX_CHECKOUT_ATTEMPTS = 3;

function isSerializationError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
    return true;
  }
  // Prisma 7 surfaces serializable conflicts as DriverAdapterError with the
  // database detail nested in `cause` (e.g. kind TransactionWriteConflict,
  // originalCode 40001). Inspect the whole chain, not just err.message.
  const parts: string[] = [];
  const visit = (value: unknown, depth: number): void => {
    if (depth > 3 || value === null || value === undefined) return;
    if (typeof value === "string") {
      parts.push(value);
      return;
    }
    if (value instanceof Error) {
      parts.push(value.name, value.message);
      visit((value as { cause?: unknown }).cause, depth + 1);
      return;
    }
    if (typeof value === "object") {
      for (const v of Object.values(value as Record<string, unknown>)) {
        if (typeof v === "string" || typeof v === "number") parts.push(String(v));
      }
    }
  };
  visit(err, 0);
  return /could not serialize|deadlock|write conflict|TransactionWriteConflict|40001|40P01/i.test(
    parts.join(" ")
  );
}

async function resolveCheckoutPayment(
  studentId: string,
  enrollmentId: string,
  studentName: string,
  studentEmail: string
): Promise<CheckoutResolution> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= MAX_CHECKOUT_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx): Promise<CheckoutResolution> => {
          const enrollment = await tx.enrollment.findUnique({
            where: { id: enrollmentId },
            select: {
              id: true,
              reference: true,
              studentId: true,
              status: true,
              priceAtEnrollment: true,
              currencyAtEnrollment: true,
            },
          });

          // Ownership check inside the transaction (authoritative).
          if (!enrollment || enrollment.studentId !== studentId) {
            return { action: "reject", status: 404, message: "Enrollment not found." };
          }

          const latestPayment = await tx.payment.findFirst({
            where: { enrollmentId: enrollment.id },
            orderBy: { createdAt: "desc" },
            select: { id: true, amount: true, currency: true, status: true },
          });

          if (enrollment.status !== "PENDING_PAYMENT") {
            if (latestPayment?.status === "SUCCEEDED") {
              return {
                action: "already-paid",
                paymentId: latestPayment.id,
              };
            }
            return { action: "reject", status: 409, message: "This enrollment is not awaiting payment." };
          }

          if (latestPayment?.status === "PENDING" || latestPayment?.status === "SUCCEEDED") {
            // Resume the existing attempt instead of creating a duplicate.
            // (SUCCEEDED + still PENDING_PAYMENT heals via finalization.)
            return {
              action: "finalize",
              paymentId: latestPayment.id,
              amount: latestPayment.amount.toString(),
              currency: latestPayment.currency,
            };
          }

          // No payment yet, or latest is FAILED → create one fresh attempt.
          const provider = mockPaymentProvider;
          const init = await provider.initiatePayment({
            enrollmentId: enrollment.id,
            reference: enrollment.reference,
            amount: enrollment.priceAtEnrollment.toString(),
            currency: enrollment.currencyAtEnrollment,
            studentName,
            studentEmail,
          });

          const payment = await tx.payment.create({
            data: {
              enrollmentId: enrollment.id,
              provider: provider.name,
              providerPaymentId: init.providerPaymentId,
              amount: enrollment.priceAtEnrollment,
              currency: enrollment.currencyAtEnrollment,
              status: "PENDING",
            },
            select: { id: true, amount: true, currency: true },
          });

          return {
            action: "finalize",
            paymentId: payment.id,
            amount: payment.amount.toString(),
            currency: payment.currency,
          };
        },
        { isolationLevel: "Serializable" }
      );
    } catch (err: unknown) {
      lastError = err;
      if (!isSerializationError(err) || attempt === MAX_CHECKOUT_ATTEMPTS) {
        throw err;
      }
    }
  }
  throw lastError;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requireApiRole([UserRole.STUDENT]);
  if (error || !session) return error;

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Student profile not found." }, { status: 400 });
  }

  let resolution: CheckoutResolution;
  try {
    resolution = await resolveCheckoutPayment(student.id, id, session.user.name, session.user.email);
  } catch (err: unknown) {
    console.error("[student/enrollments/checkout]", err);
    return NextResponse.json({ error: "Failed to initiate payment." }, { status: 500 });
  }

  if (resolution.action === "reject") {
    return NextResponse.json({ error: resolution.message }, { status: resolution.status });
  }

  if (resolution.action === "already-paid") {
    return NextResponse.json({
      success: true,
      alreadyPaid: true,
      payment: { id: resolution.paymentId },
      isMock: true,
    });
  }

  const provider = mockPaymentProvider;

  // In Demo / Mock simulation: server directly finalizes verified payment.
  if (provider.isMock) {
    const finalizeRes = await finalizeVerifiedPayment({
      paymentId: resolution.paymentId,
      amountReceived: resolution.amount,
      currency: resolution.currency,
    });

    if (!finalizeRes.ok) {
      console.error("[student/enrollments/checkout] finalize failed:", finalizeRes.error);
      return NextResponse.json({ error: finalizeRes.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      alreadyProcessed: finalizeRes.alreadyProcessed ?? false,
      payment: { id: resolution.paymentId },
      isMock: true,
      mockNotice: "DEMO PAYMENT SIMULATION — Automatically verified on server.",
    });
  }

  return NextResponse.json({
    payment: { id: resolution.paymentId },
    checkoutUrl: null,
    isMock: false,
  });
}
