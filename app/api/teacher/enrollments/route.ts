import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";

// GET /api/teacher/enrollments — list enrollments assigned to this teacher (APPROVED only)

export async function GET() {
  const { error, session } = await requireApiRole([UserRole.TEACHER]);
  if (error || !session) return error;

  const enrollments = await prisma.enrollment.findMany({
    where: {
      assignedTeacherId: session.user.id,
      status: "APPROVED",
    },
    orderBy: { approvedAt: "desc" },
    select: {
      id: true,
      reference: true,
      approvedAt: true,
      course: {
        select: {
          id: true,
          name: true,
          slug: true,
          modules: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, description: true, order: true },
          },
        },
      },
      student: {
        select: {
          id: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json({ enrollments });
}
