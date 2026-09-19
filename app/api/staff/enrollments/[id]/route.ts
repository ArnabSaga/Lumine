import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { getStaffEnrollmentDetail } from "@/lib/server/services/staff-enrollment.service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireApiRole([UserRole.BDM, UserRole.ACCOUNTS]);
  if (error) return error;

  const { id } = await params;
  const enrollment = await getStaffEnrollmentDetail(id);

  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment not found." }, { status: 404 });
  }

  return NextResponse.json({ enrollment });
}
