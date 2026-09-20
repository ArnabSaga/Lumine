import { AdmissionStatus } from "@/generated/prisma/client";
import { z } from "zod";

export const admissionPreflightSchema = z.object({
  token: z.string().min(16, "Registration token is required."),
  email: z.string().email("A valid email is required.").toLowerCase(),
});

export const completeAdmissionRegistrationSchema = z.object({
  token: z.string().min(16, "Registration token is required."),
  phone: z.string().min(3, "Phone is required.").max(80),
  address: z.string().min(3, "Address is required.").max(500),
  education: z.string().min(2, "Education is required.").max(250),
  additionalInfo: z.string().max(1000).optional().nullable(),
});

export const submitAdmissionSchema = z.object({
  courseId: z.string().min(1, "Course is required."),
  admissionAmount: z.coerce.number().positive("Admission amount must be greater than zero."),
  paidAmount: z.coerce.number().min(0, "Paid amount cannot be negative."),
  classStartingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
  assignedTeacherId: z.string().min(1, "Teacher is required."),
}).refine((data) => data.paidAmount <= data.admissionAmount, {
  message: "Paid amount cannot be greater than admission amount.",
  path: ["paidAmount"],
});

export const admissionQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.nativeEnum(AdmissionStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type AdmissionPreflightInput = z.infer<typeof admissionPreflightSchema>;
export type CompleteAdmissionRegistrationInput = z.infer<typeof completeAdmissionRegistrationSchema>;
export type SubmitAdmissionInput = z.infer<typeof submitAdmissionSchema>;
export type AdmissionQueryInput = z.infer<typeof admissionQuerySchema>;
