import { apiClient } from "@/lib/api/client";

import type {
  CustomTourRequestPayload,
  PackageBasedTourRequestPayload,
  TourRequest,
} from "./tour-request.types";

export async function createPackageBasedTourRequest(
  data: PackageBasedTourRequestPayload
) {
  const response = await apiClient.post(
    "/tour-requests/package-based",
    data
  );

  return response.data.data;
}

export async function createCustomTourRequest(
  data: CustomTourRequestPayload
) {
  const response = await apiClient.post(
    "/tour-requests/custom",
    data
  );

  return response.data.data;
}

export async function getMyTourRequests(): Promise<
  TourRequest[]
> {
  const response = await apiClient.get(
    "/tour-requests/me"
  );

  return response.data.data;
}

export async function getTourRequestById(
  id: string
): Promise<TourRequest> {
  const response = await apiClient.get(
    `/tour-requests/${id}`
  );

  return response.data.data;
}