import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { admissionQuerySchema } from "@/lib/shared/validations/admission";
import { listAdmissions } from "@/lib/server/services/admission.service";

export async function GET(req: Request) {
  const { error, session } = await requireApiRole([UserRole.BDM]);
  if (error || !session) return error;

  const url = new URL(req.url);
  const parsed = admissionQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
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
    visibility: { role: UserRole.BDM, userId: session.user.id },
  });
  return NextResponse.json(data);
}
