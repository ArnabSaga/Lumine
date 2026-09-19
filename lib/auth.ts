import { prisma } from "@/lib/db";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: ["STUDENT", "BDM", "ACCOUNTS", "TEACHER"],
        defaultValue: "STUDENT",
        input: false,
      },
    },
  },
});
