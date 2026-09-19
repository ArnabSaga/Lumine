import "server-only";

import { prisma } from "@/lib/server/db";
import { EnrollmentStatus, PaymentStatus, UserRole } from "@/generated/prisma/client";
import { generateReference } from "./qr.service";

const MAX_REFERENCE_RETRIES = 5;

/**
 * Generates a unique enrollment reference with collision retry.
 */
export async function generateEnrollmentReference(): Promise<string> {
  for (let i = 0; i < MAX_REFERENCE_RETRIES; i++) {
    const ref = generateReference();
    const existing = await prisma.enrollment.findUnique({
      where: { reference: ref },
      select: { id: true },
    });
    if (!existing) return ref;
  }
  throw new Error("Failed to generate unique enrollment reference after retries.");
}

/**
 * Creates a new enrollment for a student + course atomically.
 * Snapshots course price/currency at time of enrollment.
 * Concurrency-safe: if already enrolled, gracefully returns existing enrollment.
 */
export async function createEnrollment(params: {
  studentId: string;
  courseId: string;
}): Promise<{ enrollment: { id: string; reference: string } }> {
  const { studentId, courseId } = params;

  const course = await prisma.course.findUnique({
    where: { id: courseId, isActive: true },
    select: { id: true, price: true, currency: true },
  });

  if (!course) {
    throw new Error("Course not found or inactive.");
  }

  // Check if existing enrollment already exists
  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId, courseId: course.id } },
    select: { id: true, reference: true },
  });

  if (existing) {
    return { enrollment: existing };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const reference = await generateEnrollmentReference();

      const enrollment = await tx.enrollment.create({
        data: {
          reference,
          studentId,
          courseId: course.id,
          priceAtEnrollment: course.price,
          currencyAtEnrollment: course.currency,
          status: EnrollmentStatus.PENDING_PAYMENT,
        },
        select: { id: true, reference: true },
      });

      await tx.enrollmentStatusHistory.create({
        data: {
          enrollmentId: enrollment.id,
          fromStatus: null,
          toStatus: EnrollmentStatus.PENDING_PAYMENT,
          changedById: null,
        },
      });

      return { enrollment };
    });
  } catch (err: unknown) {
    // Handle concurrent creation race: if duplicate unique constraint hit, reload existing
    const duplicate = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: course.id } },
      select: { id: true, reference: true },
    });

    if (duplicate) {
      return { enrollment: duplicate };
    }

    throw err;
  }
}

/**
 * Atomically approves an enrollment with QR proof and Teacher assignment.
 * Requires:
 * 1. Approver is BDM or ACCOUNTS
 * 2. Enrollment is in PAYMENT_VERIFIED status
 * 3. Successful Payment exists
 * 4. Submitted QR token matches enrollment.qr.token and is not revoked
 * 5. Assigned user is a valid TEACHER
 * 6. Conditional update (count === 1) ensures race-safety and prevents duplicate approvals.
 */
export async function approveEnrollment(params: {
  enrollmentId: string;
  approverId: string;
  assignedTeacherId: string;
  qrToken: string;
}): Promise<{ ok: true } | { ok: false; status: 400 | 403 | 404 | 409; message: string }> {
  const { enrollmentId, approverId, assignedTeacherId, qrToken } = params;

  // Validate approver role
  const approver = await prisma.user.findUnique({
    where: { id: approverId },
    select: { id: true, role: true },
  });

  if (!approver || (approver.role !== UserRole.BDM && approver.role !== UserRole.ACCOUNTS)) {
    return { ok: false, status: 403, message: "Forbidden: Only BDM or Accounts staff can approve enrollments." };
  }

  return await prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        qr: true,
        payments: {
          where: { status: PaymentStatus.SUCCEEDED },
          take: 1,
        },
      },
    });

    if (!enrollment) {
      return { ok: false, status: 404, message: "Enrollment not found." };
    }

    if (enrollment.status === EnrollmentStatus.APPROVED) {
      return { ok: false, status: 409, message: "Enrollment is already approved." };
    }

    if (enrollment.status !== EnrollmentStatus.PAYMENT_VERIFIED) {
      return { ok: false, status: 409, message: "Enrollment payment has not been verified." };
    }

    if (enrollment.payments.length === 0) {
      return { ok: false, status: 409, message: "No successful payment found for this enrollment." };
    }

    // Validate QR token
    if (!enrollment.qr || enrollment.qr.token !== qrToken || enrollment.qr.revokedAt) {
      return { ok: false, status: 403, message: "Invalid or revoked QR token." };
    }

    // Validate teacher role
    const teacher = await tx.user.findUnique({
      where: { id: assignedTeacherId },
      select: { id: true, role: true },
    });

    if (!teacher || teacher.role !== UserRole.TEACHER) {
      return { ok: false, status: 400, message: "Assigned user is not a Teacher." };
    }

    const now = new Date();

    // Conditional update: PAYMENT_VERIFIED -> APPROVED
    const updated = await tx.enrollment.updateMany({
      where: {
        id: enrollmentId,
        status: EnrollmentStatus.PAYMENT_VERIFIED,
      },
      data: {
        status: EnrollmentStatus.APPROVED,
        assignedTeacherId,
        approvedById: approverId,
        approvedAt: now,
      },
    });

    if (updated.count !== 1) {
      return { ok: false, status: 409, message: "Enrollment is already approved or invalid state." };
    }

    await tx.enrollmentStatusHistory.create({
      data: {
        enrollmentId,
        fromStatus: EnrollmentStatus.PAYMENT_VERIFIED,
        toStatus: EnrollmentStatus.APPROVED,
        changedById: approverId,
      },
    });

    return { ok: true };
  });
}
