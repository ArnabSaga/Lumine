import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { prisma } from "@/lib/server/db";
import { scanQrSchema } from "@/lib/shared/validations/enrollment";

// POST /api/staff/enrollments/scan — scan a QR token and return enrollment preview
// Accessible by BDM and ACCOUNTS only

export async function POST(req: Request) {
  const { error } = await requireApiRole([UserRole.BDM, UserRole.ACCOUNTS]);
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = scanQrSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const qr = await prisma.enrollmentQr.findUnique({
    where: { token: parsed.data.token },
    include: {
      enrollment: {
        include: {
          course: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              currency: true,
            },
          },
          student: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
          payments: {
            where: { status: "SUCCEEDED" },
            orderBy: { verifiedAt: "desc" },
            take: 1,
            select: {
              id: true,
              amount: true,
              currency: true,
              verifiedAt: true,
            },
          },
          assignedTeacher: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  // Use 404 for invalid tokens to avoid leaking existence
  if (!qr || qr.revokedAt) {
    return NextResponse.json({ error: "QR code not found or revoked." }, { status: 404 });
  }

  const { enrollment } = qr;

  return NextResponse.json({
    enrollment: {
      id: enrollment.id,
      reference: enrollment.reference,
      status: enrollment.status,
      priceAtEnrollment: enrollment.priceAtEnrollment,
      currencyAtEnrollment: enrollment.currencyAtEnrollment,
      course: enrollment.course,
      // Accounts-safe fields only: name + email, no address/education
      student: {
        id: enrollment.student.id,
        name: enrollment.student.user.name,
        email: enrollment.student.user.email,
      },
      payment: enrollment.payments[0] ?? null,
      assignedTeacher: enrollment.assignedTeacher,
    },
    qrToken: qr.token,
  });
}
