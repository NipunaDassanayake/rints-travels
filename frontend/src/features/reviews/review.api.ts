import axios from "axios";

import { apiClient } from "@/lib/api/client";

import type {
  CreateReviewPayload,
  GuideReviewSummary,
  Review,
} from "./review.types";

/**
 * =========================================================
 * Tourist - Create Review
 * =========================================================
 *
 * POST /reviews
 */

export async function createReview(data: CreateReviewPayload): Promise<Review> {
  const response = await apiClient.post("/reviews", data);

  return response.data.data;
}

/**
 * =========================================================
 * Tourist - My Reviews
 * =========================================================
 *
 * GET /reviews/me
 */

export async function getMyReviews(): Promise<Review[]> {
  const response = await apiClient.get("/reviews/me");

  return response.data.data;
}

/**
 * =========================================================
 * Tourist - Review For Booking
 * =========================================================
 *
 * GET /reviews/booking/:bookingId
 *
 * If the tourist has not reviewed this booking,
 * the backend may return 404.
 * In that case we return null.
 */

export async function getReviewByBooking(
  bookingId: string,
): Promise<Review | null> {
  try {
    const response = await apiClient.get(
      `/reviews/booking/${encodeURIComponent(bookingId)}`,
    );

    return response.data.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

/**
 * =========================================================
 * Public - Guide Reviews
 * =========================================================
 *
 * GET /reviews/guide/:guideId
 */

export async function getGuideReviews(
  guideId: string,
): Promise<GuideReviewSummary> {
  const response = await apiClient.get(
    `/reviews/guide/${encodeURIComponent(guideId)}`,
  );

  return response.data.data;
}