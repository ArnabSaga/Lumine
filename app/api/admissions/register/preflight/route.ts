import { NextResponse } from "next/server";
import { admissionPreflightSchema } from "@/lib/shared/validations/admission";
import { preflightAdmissionRegistration } from "@/lib/server/services/admission.service";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = admissionPreflightSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const result = await preflightAdmissionRegistration(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
