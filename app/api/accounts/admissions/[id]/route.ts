import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { getAccountsAdmissionDetail } from "@/lib/server/services/admission.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await requireApiRole([UserRole.ACCOUNTS]);
  if (error) return error;

  const admission = await getAccountsAdmissionDetail(id);
  if (!admission) {
    return NextResponse.json({ error: "Admission not found." }, { status: 404 });
  }

  return NextResponse.json({ admission });
}
