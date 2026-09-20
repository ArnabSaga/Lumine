import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { getBdmAdmissionDetail } from "@/lib/server/services/admission.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requireApiRole([UserRole.BDM]);
  if (error || !session) return error;

  const admission = await getBdmAdmissionDetail(id, session.user.id);
  if (!admission) {
    return NextResponse.json({ error: "Admission not found." }, { status: 404 });
  }

  return NextResponse.json({ admission });
}
