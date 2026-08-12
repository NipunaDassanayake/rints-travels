import { apiClient } from "@/lib/api/client";

import type {
  CustomTourRequestPayload,
  PackageBasedTourRequestPayload,
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