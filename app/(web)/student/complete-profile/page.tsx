import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { UserRole } from "@/generated/prisma/client";
import CompleteProfileForm from "./complete-profile-form";

export const metadata = { title: "Complete Profile — Luminedge" };

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const params = await searchParams;
  const courseHint = params.course ?? null;

  const session = await requirePageRole(
    [UserRole.STUDENT],
    courseHint ? `/student/login?course=${encodeURIComponent(courseHint)}` : "/student/login"
  );

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (student) {
    redirect(
      courseHint
        ? `/student/dashboard?course=${encodeURIComponent(courseHint)}`
        : "/student/dashboard"
    );
  }

  return <CompleteProfileForm courseHint={courseHint} />;
}
