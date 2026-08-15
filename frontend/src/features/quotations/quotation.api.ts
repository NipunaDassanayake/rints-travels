import { apiClient } from "@/lib/api/client";

import type { CreateQuotationPayload, Quotation } from "./quotation.types";

export async function getTourRequestQuotations(
  tourRequestId: string,
): Promise<Quotation[]> {
  const response = await apiClient.get(
    `/tour-requests/${tourRequestId}/quotations`,
  );

  return response.data.data;
}

export async function getQuotationById(
  quotationId: string,
): Promise<Quotation> {
  const response = await apiClient.get(`/quotations/${quotationId}`);

  return response.data.data;
}

export async function createQuotation(
  tourRequestId: string,
  data: CreateQuotationPayload,
): Promise<Quotation> {
  const response = await apiClient.post(
    `/tour-requests/${tourRequestId}/quotations`,
    data,
  );

  return response.data.data;
}

export async function updateQuotation(
  quotationId: string,
  data: Partial<CreateQuotationPayload>,
): Promise<Quotation> {
  const response = await apiClient.patch(`/quotations/${quotationId}`, data);

  return response.data.data;
}

export async function sendQuotation(quotationId: string): Promise<Quotation> {
  const response = await apiClient.post(`/quotations/${quotationId}/send`);

  return response.data.data;
}

export async function acceptQuotation(quotationId: string): Promise<Quotation> {
  const response = await apiClient.post(`/quotations/${quotationId}/accept`);

  return response.data.data;
}

export async function rejectQuotation(
  quotationId: string,
  reason?: string,
): Promise<Quotation> {
  const response = await apiClient.post(`/quotations/${quotationId}/reject`, {
    reason: reason?.trim() || null,
  });

  return response.data.data;
}
