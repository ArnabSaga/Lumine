import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { getTeacherEnrollmentProgress } from "@/lib/server/services/course-progress.service";

// GET /api/teacher/enrollments/[enrollmentId]/progress — read-only,
// assigned + APPROVED enrollments only (safe 404 otherwise).

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: enrollmentId } = await params;
  const { error, session } = await requireApiRole([UserRole.TEACHER]);
  if (error || !session) return error;

  const view = await getTeacherEnrollmentProgress(session.user.id, enrollmentId);
  if (!view) {
    return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
  }

  return NextResponse.json(view);
}
