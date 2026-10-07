import { apiClient } from "@/lib/api/client";

import type { Booking } from "./booking.types";

/**
 * =========================================================
 * Guide - Assigned Bookings
 * =========================================================
 */

/**
 * Get bookings assigned to the currently
 * authenticated tour guide.
 *
 * GET /bookings/guide/me
 */
export async function getMyGuideBookings(): Promise<Booking[]> {
  const response = await apiClient.get("/bookings/guide/me");

  return response.data.data;
}

/**
 * =========================================================
 * Guide - Booking Details
 * =========================================================
 */

/**
 * Get a single booking assigned to the
 * currently authenticated guide.
 *
 * Backend authorization checks that the
 * guide is actually assigned to this booking.
 *
 * GET /bookings/:id
 */
export async function getGuideBookingById(bookingId: string): Promise<Booking> {
  const response = await apiClient.get(`/bookings/${bookingId}`);

  return response.data.data;
}

/**
 * =========================================================
 * Guide - Start Tour
 * =========================================================
 */

/**
 * Starts a confirmed tour.
 *
 * CONFIRMED -> IN_PROGRESS
 *
 * PATCH /bookings/guide/:id/start
 */
export async function startGuideTour(bookingId: string): Promise<Booking> {
  const response = await apiClient.patch(`/bookings/guide/${bookingId}/start`);

  return response.data.data;
}

/**
 * =========================================================
 * Guide - Complete Tour
 * =========================================================
 */

/**
 * Completes an active tour.
 *
 * IN_PROGRESS -> COMPLETED
 *
 * PATCH /bookings/guide/:id/complete
 */
export async function completeGuideTour(bookingId: string): Promise<Booking> {
  const response = await apiClient.patch(
    `/bookings/guide/${bookingId}/complete`,
  );

  return response.data.data;
}
