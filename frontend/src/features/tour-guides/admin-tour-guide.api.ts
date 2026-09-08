import { apiClient } from "@/lib/api/client";

import type { TourGuide } from "./tour-guide.types";

/**
 * =========================================================
 * Filters
 * =========================================================
 */

export interface AdminTourGuideFilters {
  isAvailable?: boolean;

  search?: string;
}

/**
 * =========================================================
 * Create Payload
 * =========================================================
 */

export interface CreateTourGuidePayload {
  firstName: string;

  lastName: string;

  email: string;

  phone?: string | null;

  password: string;

  bio?: string | null;

  experienceYears: number;

  languages: string[];

  specializations: string[];

  location?: string | null;

  dailyRate?: number | null;

  isAvailable: boolean;
}

/**
 * =========================================================
 * Update Payload
 * =========================================================
 */

export interface UpdateTourGuidePayload {
  firstName?: string;

  lastName?: string;

  phone?: string | null;

  bio?: string | null;

  experienceYears?: number;

  languages?: string[];

  specializations?: string[];

  location?: string | null;

  dailyRate?: number | null;
}

/**
 * =========================================================
 * Admin - Guide List
 * =========================================================
 *
 * GET /api/tour-guides/admin
 */

export async function getAdminTourGuides(
  filters: AdminTourGuideFilters = {},
): Promise<TourGuide[]> {
  const params = new URLSearchParams();

  if (typeof filters.isAvailable === "boolean") {
    params.set("isAvailable", String(filters.isAvailable));
  }

  const search = filters.search?.trim();

  if (search) {
    params.set("search", search);
  }

  const queryString = params.toString();

  const response = await apiClient.get(
    queryString ? `/tour-guides/admin?${queryString}` : "/tour-guides/admin",
  );

  return response.data.data as TourGuide[];
}

/**
 * =========================================================
 * Admin - Guide Details
 * =========================================================
 */

export async function getAdminTourGuideById(
  guideId: string,
): Promise<TourGuide> {
  const response = await apiClient.get(
    `/tour-guides/${encodeURIComponent(guideId)}`,
  );

  return response.data.data as TourGuide;
}

/**
 * =========================================================
 * Admin - Create Guide
 * =========================================================
 */

export async function createAdminTourGuide(
  data: CreateTourGuidePayload,
): Promise<TourGuide> {
  const response = await apiClient.post("/tour-guides", data);

  return response.data.data as TourGuide;
}

/**
 * =========================================================
 * Admin - Update Guide
 * =========================================================
 */

export async function updateAdminTourGuide(
  guideId: string,
  data: UpdateTourGuidePayload,
): Promise<TourGuide> {
  const response = await apiClient.patch(
    `/tour-guides/${encodeURIComponent(guideId)}`,
    data,
  );

  return response.data.data as TourGuide;
}

/**
 * =========================================================
 * Availability
 * =========================================================
 */

export async function updateAdminTourGuideAvailability(
  guideId: string,
  isAvailable: boolean,
): Promise<TourGuide> {
  const response = await apiClient.patch(
    `/tour-guides/${encodeURIComponent(guideId)}/availability`,
    {
      isAvailable,
    },
  );

  return response.data.data as TourGuide;
}

/**
 * =========================================================
 * Safe Deactivation
 * =========================================================
 */

export async function deactivateAdminTourGuide(
  guideId: string,
): Promise<TourGuide> {
  const response = await apiClient.delete(
    `/tour-guides/${encodeURIComponent(guideId)}`,
  );

  return response.data.data as TourGuide;
}