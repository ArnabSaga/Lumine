import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { mockPaymentProvider } from "@/lib/server/payments/mock-provider";
import { finalizeVerifiedPayment } from "@/lib/server/services/payment.service";

// POST /api/student/enrollments/[id]/checkout — initiate payment for enrollment

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const enrollment = await prisma.enrollment.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      studentId: true,
      status: true,
      priceAtEnrollment: true,
      currencyAtEnrollment: true,
      course: { select: { name: true } },
    },
  });

  // Ownership check
  if (!enrollment || enrollment.studentId !== student.id) {
    return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
  }

  if (enrollment.status !== "PENDING_PAYMENT") {
    return NextResponse.json(
      { error: "This enrollment is not awaiting payment." },
      { status: 409 }
    );
  }

  const provider = mockPaymentProvider;

  const result = await provider.initiatePayment({
    enrollmentId: enrollment.id,
    reference: enrollment.reference,
    amount: Number(enrollment.priceAtEnrollment),
    currency: enrollment.currencyAtEnrollment,
    studentName: session.user.name,
    studentEmail: session.user.email,
  });

  // Create or reuse pending payment record
  const payment = await prisma.payment.create({
    data: {
      enrollmentId: enrollment.id,
      provider: provider.name,
      providerPaymentId: result.providerPaymentId,
      amount: enrollment.priceAtEnrollment,
      currency: enrollment.currencyAtEnrollment,
      status: "PENDING",
    },
    select: { id: true, providerPaymentId: true, amount: true, currency: true },
  });

  // In Demo / Mock simulation: Server directly finalizes verified payment
  if (result.isMock) {
    const finalizeRes = await finalizeVerifiedPayment({
      paymentId: payment.id,
      amountReceived: payment.amount,
      currency: payment.currency,
    });

    if (!finalizeRes.ok) {
      return NextResponse.json({ error: finalizeRes.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      verified: true,
      payment: { id: payment.id, providerPaymentId: payment.providerPaymentId },
      isMock: true,
      mockNotice: "DEMO PAYMENT SIMULATION — Automatically verified on server.",
    });
  }

  return NextResponse.json({
    payment: { id: payment.id, providerPaymentId: payment.providerPaymentId },
    checkoutUrl: result.checkoutUrl,
    isMock: false,
  });
}
