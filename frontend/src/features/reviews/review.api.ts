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
 */

export async function createReview(data: CreateReviewPayload): Promise<Review> {
  const response = await apiClient.post("/reviews", data);

  return response.data.data;
}

/**
 * =========================================================
 * Tourist - My Reviews
 * =========================================================
 */

export async function getMyReviews(): Promise<Review[]> {
  const response = await apiClient.get("/reviews/me");

  return response.data.data;
}

/**
 * =========================================================
 * Tourist - Review For Booking
 * =========================================================
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
 * Guide - My Reviews
 * =========================================================
 */

export async function getMyGuideReviews(): Promise<GuideReviewSummary> {
  const response = await apiClient.get("/reviews/guide/me");

  return response.data.data;
}

/**
 * =========================================================
 * Public - Guide Reviews
 * =========================================================
 */

export async function getGuideReviews(
  guideId: string,
): Promise<GuideReviewSummary> {
  const response = await apiClient.get(
    `/reviews/guide/${encodeURIComponent(guideId)}`,
  );

  return response.data.data;
}