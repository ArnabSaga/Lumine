import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { mockPaymentProvider } from "@/lib/server/payments/mock-provider";
import { processPaymentWebhook } from "@/lib/server/services/payment.service";

// POST /api/payments/webhook — payment provider callback

export async function POST(req: Request) {
  // Secret/signature check if configured
  const webhookSecret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET;
  if (webhookSecret) {
    const reqHeaders = await headers();
    const signature =
      reqHeaders.get("x-webhook-secret") || reqHeaders.get("x-signature");
    if (signature !== webhookSecret) {
      return NextResponse.json({ error: "Invalid webhook secret." }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const provider = mockPaymentProvider;

  const verified = await provider.verifyWebhookPayload(payload);
  if (!verified || !verified.providerPaymentId) {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const result = await processPaymentWebhook({
    providerPaymentId: verified.providerPaymentId,
    amountReceived: String(verified.amount),
    currency: verified.currency,
  });

  if (!result.ok) {
    if (result.error === "Payment record not found") {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true, alreadyProcessed: result.alreadyProcessed ?? false });
}
