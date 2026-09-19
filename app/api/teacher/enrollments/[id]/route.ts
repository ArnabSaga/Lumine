import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { getTeacherEnrollmentDetail } from "@/lib/server/services/teacher.service";

// GET /api/teacher/enrollments/[id] — get details of an assigned approved enrollment

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireApiRole([UserRole.TEACHER]);
  if (error || !session) return error;

  const { id } = await params;
  const detail = await getTeacherEnrollmentDetail(session.user.id, id);

  if (!detail) {
    return NextResponse.json(
      { error: "Enrollment not found or access denied." },
      { status: 404 }
    );
  }

  return NextResponse.json({ enrollment: detail });
}
