import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { setModuleProgressSchema } from "@/lib/shared/validations/progress";
import { setStudentModuleCompletion } from "@/lib/server/services/course-progress.service";

// PUT /api/student/enrollments/[enrollmentId]/modules/[moduleId]/progress
// Sets the desired final state (idempotent). STUDENT only, own APPROVED enrollment only.

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  const { id: enrollmentId, moduleId } = await params;
  const { error, session } = await requireApiRole([UserRole.STUDENT]);
  if (error || !session) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = setModuleProgressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const result = await setStudentModuleCompletion(session.user.id, enrollmentId, moduleId, parsed.data.completed);

  if (!result.ok) {
    if (result.reason === "not-approved") {
      return NextResponse.json({ error: "Learning progress is available after staff approval." }, { status: 403 });
    }
    return NextResponse.json({ error: "Enrollment or module not found." }, { status: 404 });
  }

  return NextResponse.json({
    moduleId: result.moduleId,
    completed: result.completed,
    completedAt: result.completedAt,
  });
}
