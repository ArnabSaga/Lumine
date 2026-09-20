import "server-only";

import { prisma } from "@/lib/server/db";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    autoSignIn: true,
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
