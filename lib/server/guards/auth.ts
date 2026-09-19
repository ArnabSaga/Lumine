import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/lib/server/auth";
import type { UserRole } from "@/generated/prisma/client";
import { getDashboardRouteForRole } from "@/lib/shared/role-routes";

export async function getCurrentSession() {
  const reqHeaders = await headers();
  return await auth.api.getSession({
    headers: reqHeaders,
  });
}

export async function requirePageRole(
  allowedRoles: UserRole[],
  loginPath: string = "/staff/login"
) {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect(loginPath);
  }

  const userRole = session.user.role as UserRole;
  if (!allowedRoles.includes(userRole)) {
    const targetRoute = getDashboardRouteForRole(userRole);
    redirect(targetRoute);
  }

  return session;
}

export async function requireApiRole(allowedRoles: UserRole[]) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  const userRole = session.user.role as UserRole;
  if (!allowedRoles.includes(userRole)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: Insufficient permissions for this action." },
        { status: 403 }
      ),
      session: null,
    };
  }

  return {
    error: null,
    session,
  };
}
