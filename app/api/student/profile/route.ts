import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { studentProfileSchema } from "@/lib/shared/validations/profile";

// POST /api/student/profile — create student profile for authenticated STUDENT
// GET /api/student/profile — get own profile

export async function GET() {
  const { error, session } = await requireApiRole([UserRole.STUDENT]);
  if (error || !session) return error;

  const student = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      phone: true,
      address: true,
      education: true,
      additionalInfo: true,
      createdAt: true,
    },
  });

  if (!student) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }

  return NextResponse.json({ profile: student });
}

export async function POST(req: Request) {
  const { error, session } = await requireApiRole([UserRole.STUDENT]);
  if (error || !session) return error;

  // Idempotent: return existing profile if already created
  const existing = await prisma.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true, phone: true, address: true, education: true, additionalInfo: true },
  });
  if (existing) {
    return NextResponse.json({ profile: existing });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = studentProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { phone, address, education, additionalInfo } = parsed.data;

  const student = await prisma.student.upsert({
    where: { userId: session.user.id },
    update: {},
    create: {
      userId: session.user.id, // derives userId exclusively from session
      phone,
      address,
      education,
      additionalInfo,
    },
    select: { id: true, phone: true, address: true, education: true, additionalInfo: true },
  });

  return NextResponse.json({ profile: student }, { status: 201 });
}
