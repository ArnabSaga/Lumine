import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const { error } = await requireApiRole([UserRole.BDM, UserRole.ACCOUNTS]);
  if (error) return error;

  return NextResponse.json(
    { error: "Legacy staff enrollment approval is retired. Accounts must approve Admissions." },
    { status: 410 }
  );
}
