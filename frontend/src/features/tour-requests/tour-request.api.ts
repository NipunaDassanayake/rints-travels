import { apiClient } from "@/lib/api/client";

import type {
  ContactMethod,
  CustomTourRequestPayload,
  PackageBasedTourRequestPayload,
  TourRequest,
  TourRequestPreferredGuide,
  TourRequestStatus,
  TourRequestTourist,
  TourRequestType,
} from "./tour-request.types";

/**
 * =========================================================
 * Tourist Tour Requests
 * =========================================================
 */

export async function createPackageBasedTourRequest(
  data: PackageBasedTourRequestPayload,
): Promise<TourRequest> {
  const response = await apiClient.post("/tour-requests/package-based", data);

  return response.data.data;
}

export async function createCustomTourRequest(
  data: CustomTourRequestPayload,
): Promise<TourRequest> {
  const response = await apiClient.post("/tour-requests/custom", data);

  return response.data.data;
}

export async function getMyTourRequests(): Promise<TourRequest[]> {
  const response = await apiClient.get("/tour-requests/me");

  return response.data.data;
}

export async function getTourRequestById(id: string): Promise<TourRequest> {
  const response = await apiClient.get(`/tour-requests/${id}`);

  return response.data.data;
}

/**
 * =========================================================
 * Admin Tour Requests
 * =========================================================
 */

export type AdminTourRequest = Omit<
  TourRequest,
  "tourist" | "preferredGuide"
> & {
  tourist: TourRequestTourist;

  preferredGuide: TourRequestPreferredGuide | null;
};

export interface AdminTourRequestFilters {
  status?: TourRequestStatus | "";

  requestType?: TourRequestType | "";
}

export async function getAdminTourRequests(
  filters: AdminTourRequestFilters = {},
): Promise<AdminTourRequest[]> {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.requestType) {
    params.set("requestType", filters.requestType);
  }

  const queryString = params.toString();

  const response = await apiClient.get(
    queryString ? `/tour-requests?${queryString}` : "/tour-requests",
  );

  return response.data.data;
}

export async function updateTourRequestStatus(
  id: string,
  status: TourRequestStatus,
): Promise<TourRequest> {
  const response = await apiClient.patch(`/tour-requests/${id}/status`, {
    status,
  });

  return response.data.data;
}

export interface AdminEditTourRequestPayload {
  preferredStartDate?: string;

  preferredEndDate?: string | null;

  adultCount?: number;

  childCount?: number;

  destinationPreferences?: string | null;

  budget?: number | null;

  currency?: string;

  preferredGuideId?: string | null;

  hotelPreference?: string | null;

  transportPreference?: string | null;

  specialRequirements?: string | null;

  contactMethod?: ContactMethod | null;
}

export async function adminEditTourRequest(
  id: string,
  data: AdminEditTourRequestPayload,
): Promise<TourRequest> {
  const response = await apiClient.patch(
    `/tour-requests/${id}/admin-edit`,
    data,
  );

  return response.data.data;
}