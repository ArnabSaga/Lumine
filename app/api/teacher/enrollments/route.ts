import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { getTeacherDashboardEnrollments } from "@/lib/server/services/teacher.service";
import { teacherEnrollmentQuerySchema } from "@/lib/shared/validations/enrollment-query";

// GET /api/teacher/enrollments — list enrollments assigned to this teacher (APPROVED only)

export async function GET(req: Request) {
  const { error, session } = await requireApiRole([UserRole.TEACHER]);
  if (error || !session) return error;

  const url = new URL(req.url);
  const parsed = teacherEnrollmentQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    courseId: url.searchParams.get("courseId") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const rows = await getTeacherDashboardEnrollments(session.user.id, parsed.data);
  const enrollments = rows.map((row) => ({
    id: row.enrollmentId,
    reference: row.reference,
    approvedAt: row.approvedAt,
    course: {
      name: row.courseName,
      slug: row.courseSlug,
      moduleCount: row.moduleCount,
    },
    student: {
      user: {
        name: row.studentName,
        email: row.studentEmail,
      },
    },
  }));

  return NextResponse.json({ enrollments });
}
