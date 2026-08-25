import { apiClient } from "@/lib/api/client";

import type {
  CheckoutSessionResponse,
  CreateCheckoutSessionPayload,
  Payment,
} from "./payment.types";

/**
 * =========================================================
 * Stripe Checkout
 * =========================================================
 */

export async function createCheckoutSession(
  data: CreateCheckoutSessionPayload,
): Promise<CheckoutSessionResponse> {
  const response = await apiClient.post("/payments/checkout-session", data);

  return response.data.data;
}

/**
 * =========================================================
 * Tourist Payments
 * =========================================================
 */

export async function getMyPayments(): Promise<Payment[]> {
  const response = await apiClient.get("/payments/me");

  return response.data.data;
}

/**
 * =========================================================
 * Payment Details
 * =========================================================
 */

export async function getPaymentById(paymentId: string): Promise<Payment> {
  const response = await apiClient.get(`/payments/${paymentId}`);

  return response.data.data;
}