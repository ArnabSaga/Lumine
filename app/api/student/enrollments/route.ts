import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { createEnrollmentSchema } from "@/lib/shared/validations/enrollment";
import { createEnrollment } from "@/lib/server/services/enrollment.service";

// GET /api/student/enrollments — list own enrollments
// POST /api/student/enrollments — create new enrollment

export async function GET() {
  const { error, session } = await requireApiRole([UserRole.STUDENT]);
  if (error || !session) return error;

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!student) {
    return NextResponse.json({ enrollments: [] });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      status: true,
      priceAtEnrollment: true,
      currencyAtEnrollment: true,
      createdAt: true,
      course: {
        select: { id: true, name: true, slug: true, description: true },
      },
      qr: {
        select: { token: true, createdAt: true },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, amount: true, currency: true, verifiedAt: true },
      },
      assignedTeacher: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ enrollments });
}

export async function POST(req: Request) {
  const { error, session } = await requireApiRole([UserRole.STUDENT]);
  if (error || !session) return error;

  // Student must have a profile
  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!student) {
    return NextResponse.json(
      { error: "Student profile not found. Please complete your profile first." },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createEnrollmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Duplicate enrollment check
  const existing = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: student.id, courseId: parsed.data.courseId } },
    select: { id: true, reference: true, status: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You are already enrolled in this course.", enrollment: existing },
      { status: 409 }
    );
  }

  try {
    const { enrollment } = await createEnrollment({
      studentId: student.id,
      courseId: parsed.data.courseId,
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create enrollment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
