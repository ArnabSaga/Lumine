import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { approveEnrollment } from "@/lib/server/services/enrollment.service";
import { approveEnrollmentSchema } from "@/lib/shared/validations/enrollment";

// POST /api/staff/enrollments/[id]/approve — approve enrollment with QR proof
// Accessible by BDM and ACCOUNTS

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error, session } = await requireApiRole([UserRole.BDM, UserRole.ACCOUNTS]);
  if (error || !session) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = approveEnrollmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const result = await approveEnrollment({
    enrollmentId: id,
    approverId: session.user.id,
    assignedTeacherId: parsed.data.assignedTeacherId,
    qrToken: parsed.data.qrToken,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
