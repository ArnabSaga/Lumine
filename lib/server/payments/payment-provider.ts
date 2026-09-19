import "server-only";

// Payment provider abstraction — swap mock for SSLCommerz/bKash/Stripe later
export interface PaymentProviderInitResult {
  providerPaymentId: string;
  checkoutUrl: string | null;
  isMock: boolean;
}

export interface PaymentProvider {
  readonly name: string;
  readonly isMock: boolean;
  initiatePayment(params: {
    enrollmentId: string;
    reference: string;
    amount: number;
    currency: string;
    studentName: string;
    studentEmail: string;
  }): Promise<PaymentProviderInitResult>;
  verifyWebhookPayload(payload: unknown): Promise<{
    providerPaymentId: string;
    success: boolean;
    amount: number;
    currency: string;
  } | null>;
}
