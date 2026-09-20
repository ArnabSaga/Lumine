import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { approveAdmissionByAccounts } from "@/lib/server/services/admission.service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requireApiRole([UserRole.ACCOUNTS]);
  if (error || !session) return error;

  try {
    const result = await approveAdmissionByAccounts({
      admissionId: id,
      accountsUserId: session.user.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    return NextResponse.json({ ok: true, enrollmentId: result.data.enrollmentId });
  } catch (err: unknown) {
    console.error("[accounts/admissions/approve]", err);
    return NextResponse.json({ error: "Failed to approve admission." }, { status: 500 });
  }
}
