import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { createRegistrationQr, listRegistrationQrs } from "@/lib/server/services/admission.service";

export async function GET() {
  const { error, session } = await requireApiRole([UserRole.BDM]);
  if (error || !session) return error;

  const qrs = await listRegistrationQrs(session.user.id);
  return NextResponse.json({ qrs });
}

export async function POST() {
  const { error, session } = await requireApiRole([UserRole.BDM]);
  if (error || !session) return error;

  const qr = await createRegistrationQr(session.user.id);
  return NextResponse.json({ qr }, { status: 201 });
}
