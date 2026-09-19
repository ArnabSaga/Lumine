import "server-only";

import type { PaymentProvider, PaymentProviderInitResult } from "./payment-provider";

// Demo payment simulation — always succeeds immediately
// Visibly labeled as "Demo" in the UI; replace with real gateway for production
export const mockPaymentProvider: PaymentProvider = {
  name: "demo-mock",
  isMock: true,

  async initiatePayment({ reference }): Promise<PaymentProviderInitResult> {
    // Generate a deterministic but unique mock payment ID
    const mockId = `MOCK-${reference}-${Date.now()}`;
    return {
      providerPaymentId: mockId,
      // Return null — mock payments auto-confirm via the webhook endpoint
      checkoutUrl: null,
      isMock: true,
    };
  },

  async verifyWebhookPayload(payload: unknown) {
    // Mock webhook payload: { providerPaymentId, amount (decimal string), currency, success }
    // success must be explicitly true; anything else never finalizes.
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("providerPaymentId" in payload) ||
      !("amount" in payload) ||
      !("currency" in payload)
    ) {
      return null;
    }
    const p = payload as Record<string, unknown>;
    const rawAmount = p.amount;
    const amountStr =
      typeof rawAmount === "string"
        ? rawAmount
        : typeof rawAmount === "number"
          ? String(rawAmount)
          : null;
    if (amountStr === null || amountStr.trim() === "") {
      return null;
    }
    return {
      providerPaymentId: String(p.providerPaymentId),
      success: p.success === true,
      amount: amountStr,
      currency: String(p.currency),
    };
  },
};
