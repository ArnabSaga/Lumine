import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { getStaffEnrollments } from "@/lib/server/services/staff-enrollment.service";
import { staffEnrollmentQuerySchema } from "@/lib/shared/validations/enrollment-query";

export async function GET(req: Request) {
  const { error } = await requireApiRole([UserRole.ACCOUNTS]);
  if (error) return error;

  const url = new URL(req.url);
  const parsed = staffEnrollmentQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    courseId: url.searchParams.get("courseId") ?? undefined,
    teacherId: url.searchParams.get("teacherId") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const result = await getStaffEnrollments(parsed.data);
  return NextResponse.json(result);
}
