import { apiClient } from "@/lib/api/client";

import type {
  PackageImage,
  PackageItinerary,
  PackageListData,
  TravelPackage,
} from "./package.types";

export interface AdminPackageFilters {
  status?: "ACTIVE" | "INACTIVE" | "";
  title?: string;
  destination?: string;
  page?: number;
  limit?: number;
}

export async function getAdminPackages(
  filters: AdminPackageFilters = {},
): Promise<PackageListData> {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.title) {
    params.set("title", filters.title);
  }

  if (filters.destination) {
    params.set("destination", filters.destination);
  }

  if (filters.page) {
    params.set("page", String(filters.page));
  }

  if (filters.limit) {
    params.set("limit", String(filters.limit));
  }

  const queryString = params.toString();

  const response = await apiClient.get(
    queryString ? `/packages/admin?${queryString}` : "/packages/admin",
  );

  return response.data.data;
}

export async function getAdminPackageById(id: number): Promise<TravelPackage> {
  const response = await apiClient.get(`/packages/${id}`);

  return response.data.data;
}

export interface CreatePackagePayload {
  title: string;
  slug: string;
  destination: string;
  description: string;
  durationDays: number;
  price: number;
  status?: "ACTIVE" | "INACTIVE";
}

export type UpdatePackagePayload = Partial<CreatePackagePayload>;

export async function createAdminPackage(
  data: CreatePackagePayload,
): Promise<TravelPackage> {
  const response = await apiClient.post("/packages", data);

  return response.data.data;
}

export async function updateAdminPackage(
  id: number,
  data: UpdatePackagePayload,
): Promise<TravelPackage> {
  const response = await apiClient.put(`/packages/${id}`, data);

  return response.data.data;
}

export async function deleteAdminPackage(id: number): Promise<void> {
  await apiClient.delete(`/packages/${id}`);
}

/**
 * =========================================================
 * Package Images
 * =========================================================
 */

export interface UploadAdminPackageImagePayload {
  file: File;

  altText?: string | null;

  isPrimary?: boolean;

  displayOrder?: number;
}

export interface UpdateAdminPackageImagePayload {
  altText?: string | null;

  isPrimary?: boolean;

  displayOrder?: number;
}

export async function uploadAdminPackageImage(
  packageId: number,
  data: UploadAdminPackageImagePayload,
): Promise<PackageImage> {
  const formData = new FormData();

  formData.append("image", data.file, data.file.name);

  if (data.altText) {
    formData.append("altText", data.altText);
  }

  formData.append("isPrimary", String(data.isPrimary ?? false));

  formData.append("displayOrder", String(data.displayOrder ?? 0));

  const response = await apiClient.post(
    `/packages/${packageId}/images/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data.data;
}

export async function updateAdminPackageImage(
  packageId: number,
  imageId: number,
  data: UpdateAdminPackageImagePayload,
): Promise<PackageImage> {
  const response = await apiClient.patch(
    `/packages/${packageId}/images/${imageId}`,
    data,
  );

  return response.data.data;
}

export async function deleteAdminPackageImage(
  packageId: number,
  imageId: number,
): Promise<void> {
  await apiClient.delete(`/packages/${packageId}/images/${imageId}`);
}

export function getPackageImageUrl(imageUrl: string): string {
  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("blob:")
  ) {
    return imageUrl;
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return imageUrl;
  }

  const backendOrigin = apiBaseUrl.replace(/\/api\/?$/, "");

  return `${backendOrigin}${imageUrl}`;
}

/**
 * =========================================================
 * Package Itineraries
 * =========================================================
 */

export interface CreateAdminPackageItineraryPayload {
  dayNumber: number;
  title: string;
  description: string;
}

export type UpdateAdminPackageItineraryPayload =
  Partial<CreateAdminPackageItineraryPayload>;

export async function addAdminPackageItinerary(
  packageId: number,
  data: CreateAdminPackageItineraryPayload,
): Promise<PackageItinerary> {
  const response = await apiClient.post(
    `/packages/${packageId}/itineraries`,
    data,
  );

  return response.data.data;
}

export async function updateAdminPackageItinerary(
  packageId: number,
  itineraryId: number,
  data: UpdateAdminPackageItineraryPayload,
): Promise<PackageItinerary> {
  const response = await apiClient.patch(
    `/packages/${packageId}/itineraries/${itineraryId}`,
    data,
  );

  return response.data.data;
}

export async function deleteAdminPackageItinerary(
  packageId: number,
  itineraryId: number,
): Promise<void> {
  await apiClient.delete(`/packages/${packageId}/itineraries/${itineraryId}`);
}

/**
 * =========================================================
 * Package Inclusions
 * =========================================================
 */

export interface AdminPackageInclusionPayload {
  title: string;
}

export async function addAdminPackageInclusion(
  packageId: number,
  data: AdminPackageInclusionPayload,
) {
  const response = await apiClient.post(
    `/packages/${packageId}/inclusions`,
    data,
  );

  return response.data.data;
}

export async function updateAdminPackageInclusion(
  packageId: number,
  inclusionId: number,
  data: AdminPackageInclusionPayload,
) {
  const response = await apiClient.patch(
    `/packages/${packageId}/inclusions/${inclusionId}`,
    data,
  );

  return response.data.data;
}

export async function deleteAdminPackageInclusion(
  packageId: number,
  inclusionId: number,
): Promise<void> {
  await apiClient.delete(`/packages/${packageId}/inclusions/${inclusionId}`);
}

/**
 * =========================================================
 * Package Exclusions
 * =========================================================
 */

export interface AdminPackageExclusionPayload {
  title: string;
}

export async function addAdminPackageExclusion(
  packageId: number,
  data: AdminPackageExclusionPayload,
) {
  const response = await apiClient.post(
    `/packages/${packageId}/exclusions`,
    data,
  );

  return response.data.data;
}

export async function updateAdminPackageExclusion(
  packageId: number,
  exclusionId: number,
  data: AdminPackageExclusionPayload,
) {
  const response = await apiClient.patch(
    `/packages/${packageId}/exclusions/${exclusionId}`,
    data,
  );

  return response.data.data;
}

export async function deleteAdminPackageExclusion(
  packageId: number,
  exclusionId: number,
): Promise<void> {
  await apiClient.delete(`/packages/${packageId}/exclusions/${exclusionId}`);
}

/**
 * =========================================================
 * Package FAQs
 * =========================================================
 */

export interface CreateAdminPackageFaqPayload {
  question: string;
  answer: string;
  displayOrder?: number;
}

export type UpdateAdminPackageFaqPayload =
  Partial<CreateAdminPackageFaqPayload>;

export async function addAdminPackageFaq(
  packageId: number,
  data: CreateAdminPackageFaqPayload,
) {
  const response = await apiClient.post(`/packages/${packageId}/faqs`, data);

  return response.data.data;
}

export async function updateAdminPackageFaq(
  packageId: number,
  faqId: number,
  data: UpdateAdminPackageFaqPayload,
) {
  const response = await apiClient.patch(
    `/packages/${packageId}/faqs/${faqId}`,
    data,
  );

  return response.data.data;
}

export async function deleteAdminPackageFaq(
  packageId: number,
  faqId: number,
): Promise<void> {
  await apiClient.delete(`/packages/${packageId}/faqs/${faqId}`);
}