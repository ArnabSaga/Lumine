import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { revokeRegistrationQr } from "@/lib/server/services/admission.service";

// POST /api/bdm/registration-qrs/[id]/revoke — revoke an ACTIVE QR.
// BDM role + owner scoped; REGISTERED/used/revoked QRs are rejected.

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error, session } = await requireApiRole([UserRole.BDM]);
  if (error || !session) return error;

  const result = await revokeRegistrationQr(session.user.id, id);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json({ revoked: result.data });
}
