import { apiClient } from "@/lib/api/client";

import type { InitiatePaymentPayload, Payment } from "./payment.types";

export async function initiatePayment(
  data: InitiatePaymentPayload,
): Promise<Payment> {
  const response = await apiClient.post("/payments/initiate", data);

  return response.data.data;
}

export async function getMyPayments(): Promise<Payment[]> {
  const response = await apiClient.get("/payments/me");

  return response.data.data;
}

export async function getPaymentById(paymentId: string): Promise<Payment> {
  const response = await apiClient.get(`/payments/${paymentId}`);

  return response.data.data;
}