import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await params;
  const { error } = await requireApiRole([UserRole.STUDENT]);
  if (error) return error;

  return NextResponse.json(
    { error: "Student checkout is retired. Accounts approval creates the manual admission payment." },
    { status: 410 }
  );
}
