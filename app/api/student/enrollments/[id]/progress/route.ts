import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { getStudentEnrollmentProgress } from "@/lib/server/services/course-progress.service";

// GET /api/student/enrollments/[enrollmentId]/progress — own APPROVED enrollment only.

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: enrollmentId } = await params;
  const { error, session } = await requireApiRole([UserRole.STUDENT]);
  if (error || !session) return error;

  const result = await getStudentEnrollmentProgress(session.user.id, enrollmentId);

  if (!result.ok) {
    if (result.reason === "not-approved") {
      return NextResponse.json({ error: "Learning progress is available after staff approval." }, { status: 403 });
    }
    return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
  }

  return NextResponse.json({ progress: result.summary });
}
