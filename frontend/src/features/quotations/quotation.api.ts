import { apiClient } from "@/lib/api/client";

import type { CreateQuotationPayload, Quotation } from "./quotation.types";

/**
 * =========================================================
 * Tour Request Quotations
 * =========================================================
 */

export async function getTourRequestQuotations(
  tourRequestId: string,
): Promise<Quotation[]> {
  const response = await apiClient.get(
    `/quotations/tour-request/${tourRequestId}`,
  );

  return response.data.data;
}

export async function createQuotation(
  tourRequestId: string,
  data: CreateQuotationPayload,
): Promise<Quotation> {
  const response = await apiClient.post(
    `/quotations/tour-request/${tourRequestId}`,
    data,
  );

  return response.data.data;
}

/**
 * =========================================================
 * Individual Quotation
 * =========================================================
 */

export async function getQuotationById(
  quotationId: string,
): Promise<Quotation> {
  const response = await apiClient.get(`/quotations/${quotationId}`);

  return response.data.data;
}

/**
 * Only DRAFT quotations can be updated.
 */
export async function updateQuotation(
  quotationId: string,
  data: Partial<CreateQuotationPayload>,
): Promise<Quotation> {
  const response = await apiClient.patch(`/quotations/${quotationId}`, data);

  return response.data.data;
}

/**
 * =========================================================
 * Send Quotation
 * =========================================================
 */

export async function sendQuotation(quotationId: string): Promise<Quotation> {
  const response = await apiClient.post(`/quotations/${quotationId}/send`);

  return response.data.data;
}

/**
 * =========================================================
 * Tourist Actions
 * =========================================================
 */

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

/**
 * =========================================================
 * Quotation Revision
 * =========================================================
 */

export async function createQuotationRevision(
  quotationId: string,
  data: Partial<CreateQuotationPayload>,
): Promise<Quotation> {
  const response = await apiClient.post(
    `/quotations/${quotationId}/revisions`,
    data,
  );

  return response.data.data;
}