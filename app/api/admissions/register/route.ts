import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { requireApiRole } from "@/lib/server/guards/auth";
import { completeAdmissionRegistrationSchema } from "@/lib/shared/validations/admission";
import { completeAdmissionRegistration } from "@/lib/server/services/admission.service";

export async function POST(req: Request) {
  const { error, session } = await requireApiRole([UserRole.STUDENT]);
  if (error || !session) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = completeAdmissionRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const result = await completeAdmissionRegistration({
      userId: session.user.id,
      input: parsed.data,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (err: unknown) {
    console.error("[admissions/register]", err);
    return NextResponse.json({ error: "Failed to complete registration." }, { status: 500 });
  }
}
