import type { EnrollmentStatus } from "@/generated/prisma/client";

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAYMENT_VERIFIED: "Payment Verified",
  APPROVED: "Approved",
};

export const ENROLLMENT_STATUS_COLORS: Record<
  EnrollmentStatus,
  { bg: string; text: string; border: string }
> = {
  PENDING_PAYMENT: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  PAYMENT_VERIFIED: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
  },
  APPROVED: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
};
