import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { mockPaymentProvider } from "@/lib/server/payments/mock-provider";
import { processPaymentWebhook } from "@/lib/server/services/payment.service";

// POST /api/payments/webhook — payment provider callback.
// Fail-closed: zero database mutation before secret/signature verification.

export async function POST(req: Request) {
  const webhookSecret = process.env.MOCK_PAYMENT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const reqHeaders = await headers();
  const signature = reqHeaders.get("x-webhook-secret") || reqHeaders.get("x-signature");
  if (!signature || signature !== webhookSecret) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const verified = await mockPaymentProvider.verifyWebhookPayload(payload);
  if (!verified || !verified.providerPaymentId) {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  // A provider event that reports failure must never finalize a payment.
  if (verified.success !== true) {
    return NextResponse.json({ error: "Provider reported unsuccessful payment." }, { status: 400 });
  }

  const result = await processPaymentWebhook({
    providerPaymentId: verified.providerPaymentId,
    amountReceived: verified.amount,
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
