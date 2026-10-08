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
 * Starts a confirmed tour with the traveler's
 * confirmation code (CR-032).
 *
 * CONFIRMED -> IN_PROGRESS
 *
 * POST /bookings/guide/:id/start
 */
export async function startGuideTour(
  bookingId: string,
  code: string,
): Promise<Booking> {
  const response = await apiClient.post(`/bookings/guide/${bookingId}/start`, {
    code,
  });

  return response.data.data;
}

/**
 * =========================================================
 * Guide - Complete Tour
 * =========================================================
 */

/**
 * Completes an active tour with the traveler's
 * confirmation code (CR-032).
 *
 * IN_PROGRESS -> COMPLETED
 *
 * POST /bookings/guide/:id/complete
 */
export async function completeGuideTour(
  bookingId: string,
  code: string,
): Promise<Booking> {
  const response = await apiClient.post(
    `/bookings/guide/${bookingId}/complete`,
    { code },
  );

  return response.data.data;
}
