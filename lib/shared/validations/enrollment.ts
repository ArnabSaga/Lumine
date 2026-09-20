import { z } from "zod";

export const createEnrollmentSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;

export const approveEnrollmentSchema = z.object({
  assignedTeacherId: z.string().min(1, "Teacher ID is required"),
  qrToken: z.string().min(1, "QR token is required"),
});

export type ApproveEnrollmentInput = z.infer<typeof approveEnrollmentSchema>;

export const scanQrSchema = z.object({
  token: z.string().min(1, "QR token is required"),
});

export type ScanQrInput = z.infer<typeof scanQrSchema>;
