import { NextResponse } from "next/server";
import { AdmissionStatus, UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { admissionQuerySchema } from "@/lib/shared/validations/admission";
import { listAdmissions } from "@/lib/server/services/admission.service";

export async function GET(req: Request) {
  const { error } = await requireApiRole([UserRole.ACCOUNTS]);
  if (error) return error;

  const url = new URL(req.url);
  const parsed = admissionQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? AdmissionStatus.PENDING_ACCOUNTS_APPROVAL,
    page: url.searchParams.get("page") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = await listAdmissions({
    query: parsed.data,
    visibility: { role: UserRole.ACCOUNTS },
  });
  return NextResponse.json(data);
}
