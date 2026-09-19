import { z } from "zod";

export const studentProfileSchema = z.object({
  phone: z.string().min(7, "Phone number is required").max(20),
  address: z.string().min(5, "Address is required").max(500),
  education: z.string().min(2, "Education background is required").max(200),
  additionalInfo: z.string().max(1000).optional(),
});

export type StudentProfileInput = z.infer<typeof studentProfileSchema>;
