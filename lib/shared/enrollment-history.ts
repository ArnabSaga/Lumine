import type { EnrollmentStatus } from "@/generated/prisma/client";

export const ENROLLMENT_HISTORY_LABELS: Record<EnrollmentStatus, string> = {
  PENDING_PAYMENT: "Enrollment Created",
  PAYMENT_VERIFIED: "Payment Verified",
  APPROVED: "Enrollment Approved",
};

export const ENROLLMENT_HISTORY_DESCRIPTIONS: Record<EnrollmentStatus, string> = {
  PENDING_PAYMENT: "Pending payment",
  PAYMENT_VERIFIED: "Payment successfully verified",
  APPROVED: "Enrollment approved",
};

export function getEnrollmentHistoryLabel(status: EnrollmentStatus): string {
  return ENROLLMENT_HISTORY_LABELS[status];
}

export function getEnrollmentHistoryDescription(status: EnrollmentStatus): string {
  return ENROLLMENT_HISTORY_DESCRIPTIONS[status];
}
