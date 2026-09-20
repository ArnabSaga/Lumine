import { z } from "zod";

export const studentRegistrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(100, "Full name must be under 100 characters."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(150, "Email must be under 150 characters."),
  phone: z
    .string()
    .trim()
    .min(6, "Phone number must be at least 6 digits.")
    .max(25, "Phone number must be under 25 digits."),
  address: z
    .string()
    .trim()
    .min(3, "Address is required.")
    .max(300, "Address must be under 300 characters."),
  education: z
    .string()
    .trim()
    .min(2, "Educational background is required.")
    .max(300, "Educational background must be under 300 characters."),
  additionalInfo: z
    .string()
    .trim()
    .max(500, "Additional information must be under 500 characters.")
    .optional()
    .or(z.literal("")),
});

export type StudentRegistrationInput = z.infer<typeof studentRegistrationSchema>;
