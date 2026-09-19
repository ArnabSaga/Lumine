import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { getDashboardRouteForRole } from "@/lib/shared/role-routes";
import { RegisterForm } from "./register-form";

export const metadata = {
  title: "Create Account — Luminedge",
  description: "Start your learning journey with Luminedge",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const session = await getCurrentSession();
  const params = await searchParams;
  const courseHint = params.course;

  if (session?.user) {
    const role = session.user.role;
    if (role === "STUDENT") {
      const studentProfile = await prisma.student.findUnique({
        where: { userId: session.user.id },
      });

      if (studentProfile) {
        redirect(
          courseHint
            ? `/student/dashboard?course=${encodeURIComponent(courseHint)}`
            : "/student/dashboard"
        );
      } else {
        redirect(
          courseHint
            ? `/student/complete-profile?course=${encodeURIComponent(courseHint)}`
            : "/student/complete-profile"
        );
      }
    } else {
      redirect(getDashboardRouteForRole(role));
    }
  }

  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
