import "server-only";

import { prisma } from "@/lib/server/db";
import { EnrollmentStatus, PaymentStatus, Prisma } from "@/generated/prisma/client";
import { createQrToken } from "./qr.service";

/**
 * Atomically finalizes a verified payment.
 * All operations execute in one atomic Prisma transaction:
 * 1. Read & validate Payment + Enrollment state
 * 2. Idempotency: returns 200 if already finalized (even after enrollment is APPROVED)
 * 3. Strict Decimal amount & currency match
 * 4. Conditional PENDING_PAYMENT -> PAYMENT_VERIFIED update with concurrency fallback
 * 5. Update Payment to SUCCEEDED with verifiedAt timestamp
 * 6. Create PAYMENT_VERIFIED status history
 * 7. Stable QR creation (never rotates an existing QR token)
 */
export async function finalizeVerifiedPayment(params: {
  paymentId: string;
  amountReceived: Prisma.Decimal | string;
  currency: string;
}): Promise<{ ok: boolean; alreadyProcessed?: boolean; error?: string }> {
  const { paymentId, amountReceived, currency } = params;

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: {
        enrollment: true,
      },
    });

    if (!payment) {
      return { ok: false, error: "Payment record not found" };
    }

    const enrollment = payment.enrollment;

    // 1. Idempotency Invariant: already succeeded even after enrollment is APPROVED
    if (
      payment.status === PaymentStatus.SUCCEEDED &&
      (enrollment.status === EnrollmentStatus.PAYMENT_VERIFIED ||
        enrollment.status === EnrollmentStatus.APPROVED)
    ) {
      return { ok: true, alreadyProcessed: true };
    }

    // 2. Strict Decimal Amount & Currency Validation
    let receivedDecimal: Prisma.Decimal;
    try {
      receivedDecimal = new Prisma.Decimal(amountReceived);
    } catch {
      return { ok: false, error: "Invalid payment amount format" };
    }

    if (!receivedDecimal.equals(payment.amount) || currency.toUpperCase() !== payment.currency.toUpperCase()) {
      return { ok: false, error: "Payment amount or currency mismatch" };
    }

    // 3. Conditional Update: PENDING_PAYMENT -> PAYMENT_VERIFIED
    const updated = await tx.enrollment.updateMany({
      where: {
        id: payment.enrollmentId,
        status: EnrollmentStatus.PENDING_PAYMENT,
      },
      data: {
        status: EnrollmentStatus.PAYMENT_VERIFIED,
      },
    });

    // 4. Concurrency Fallback: if updated.count === 0, re-read state to handle concurrent duplicates
    if (updated.count === 0) {
      const currentEnrollment = await tx.enrollment.findUnique({
        where: { id: payment.enrollmentId },
        select: { status: true },
      });
      const currentPayment = await tx.payment.findUnique({
        where: { id: payment.id },
        select: { status: true },
      });

      if (
        currentPayment?.status === PaymentStatus.SUCCEEDED &&
        (currentEnrollment?.status === EnrollmentStatus.PAYMENT_VERIFIED ||
          currentEnrollment?.status === EnrollmentStatus.APPROVED)
      ) {
        return { ok: true, alreadyProcessed: true };
      }

      return { ok: false, error: "Enrollment is not in PENDING_PAYMENT state" };
    }

    const now = new Date();

    // 5. Update Payment to SUCCEEDED
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCEEDED,
        verifiedAt: now,
      },
    });

    // 6. Create Status History
    await tx.enrollmentStatusHistory.create({
      data: {
        enrollmentId: payment.enrollmentId,
        fromStatus: EnrollmentStatus.PENDING_PAYMENT,
        toStatus: EnrollmentStatus.PAYMENT_VERIFIED,
        changedById: null, // system/webhook event
      },
    });

    // 7. Stable QR Upsert: Never rotates an existing QR token.
    // Only a unique-constraint collision on another row's token is retried;
    // every other database error propagates.
    const MAX_QR_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_QR_ATTEMPTS; attempt++) {
      try {
        await tx.enrollmentQr.upsert({
          where: { enrollmentId: payment.enrollmentId },
          create: {
            enrollmentId: payment.enrollmentId,
            token: createQrToken(),
          },
          update: {}, // No-op on duplicate: stable token is preserved
        });
        break;
      } catch (err: unknown) {
        const target =
          err instanceof Prisma.PrismaClientKnownRequestError
            ? (err.meta?.["target"] as unknown)
            : undefined;
        const isTokenCollision =
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          Array.isArray(target) &&
          target.includes("token");
        if (!isTokenCollision || attempt === MAX_QR_ATTEMPTS) {
          throw err;
        }
      }
    }

    return { ok: true };
  });
}

/**
 * Webhook wrapper to resolve payment by providerPaymentId and finalize.
 */
export async function processPaymentWebhook(params: {
  providerPaymentId: string;
  amountReceived: Prisma.Decimal | string;
  currency: string;
}): Promise<{ ok: boolean; alreadyProcessed?: boolean; error?: string }> {
  const payment = await prisma.payment.findUnique({
    where: { providerPaymentId: params.providerPaymentId },
    select: { id: true },
  });

  if (!payment) {
    return { ok: false, error: "Payment record not found" };
  }

  return await finalizeVerifiedPayment({
    paymentId: payment.id,
    amountReceived: params.amountReceived,
    currency: params.currency,
  });
}
