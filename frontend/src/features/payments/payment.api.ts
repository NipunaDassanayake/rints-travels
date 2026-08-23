import { apiClient } from "@/lib/api/client";

import type { InitiatePaymentPayload, Payment } from "./payment.types";

export interface CreateCheckoutSessionPayload {
  quotationId: string;
}

export interface CheckoutSessionResponse {
  payment: Payment;

  checkoutSessionId: string;

  checkoutUrl: string;
}

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
 * Legacy Payment Initiation
 * =========================================================
 *
 * Temporary.
 *
 * Remove this after the Stripe migration
 * is completely finished.
 */

export async function initiatePayment(
  data: InitiatePaymentPayload,
): Promise<Payment> {
  const response = await apiClient.post("/payments/initiate", data);

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