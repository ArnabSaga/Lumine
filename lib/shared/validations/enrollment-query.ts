import { EnrollmentStatus } from "@/generated/prisma/client";
import { z } from "zod";

const optionalTrimmedString = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalId = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const pageSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Page must be a positive integer.")
  .transform((value) => Number(value))
  .pipe(z.number().int().min(1))
  .optional()
  .default(1);

export const staffEnrollmentQuerySchema = z.object({
  q: optionalTrimmedString,
  status: z.enum(EnrollmentStatus).optional(),
  courseId: optionalId,
  teacherId: optionalId,
  page: pageSchema,
});

export const teacherEnrollmentQuerySchema = z.object({
  q: optionalTrimmedString,
  courseId: optionalId,
});

export type StaffEnrollmentQueryInput = {
  q?: string;
  status?: EnrollmentStatus;
  courseId?: string;
  teacherId?: string;
  page: number;
};

export type TeacherEnrollmentQueryInput = {
  q?: string;
  courseId?: string;
};
