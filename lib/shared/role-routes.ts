import type { UserRole } from "@/generated/prisma/client";

export const ROLE_DASHBOARD_ROUTES: Record<UserRole, string> = {
  STUDENT: "/student/dashboard",
  BDM: "/bdm/dashboard",
  ACCOUNTS: "/accounts/dashboard",
  TEACHER: "/teacher/dashboard",
};

export function getDashboardRouteForRole(role?: string | null): string {
  if (role === "STUDENT") return ROLE_DASHBOARD_ROUTES.STUDENT;
  if (role === "BDM") return ROLE_DASHBOARD_ROUTES.BDM;
  if (role === "ACCOUNTS") return ROLE_DASHBOARD_ROUTES.ACCOUNTS;
  if (role === "TEACHER") return ROLE_DASHBOARD_ROUTES.TEACHER;
  return "/login";
}

export function getLoginRouteForRole(role?: string | null): string {
  if (role === "STUDENT") return "/student/login";
  return "/staff/login";
}

