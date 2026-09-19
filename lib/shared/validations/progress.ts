import { z } from "zod";

export const setModuleProgressSchema = z.object({
  completed: z.boolean(),
});

export type SetModuleProgressInput = z.infer<typeof setModuleProgressSchema>;
