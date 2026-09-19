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
    // Mock webhook payload: { providerPaymentId, amount, currency }
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
    return {
      providerPaymentId: String(p.providerPaymentId),
      success: true,
      amount: Number(p.amount),
      currency: String(p.currency),
    };
  },
};
