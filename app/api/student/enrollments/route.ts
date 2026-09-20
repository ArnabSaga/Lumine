import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";

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
    // Deterministic tie-breaker: equal createdAt values order repeatably.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
  await req.text().catch(() => "");
  return NextResponse.json(
    { error: "Student self enrollment is retired. Registration starts from a BDM issued QR." },
    { status: 410 }
  );
}
