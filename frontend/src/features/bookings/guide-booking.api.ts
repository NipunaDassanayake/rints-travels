import { apiClient } from "@/lib/api/client";

import type { Booking } from "./booking.types";

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
 * Get a single booking.
 *
 * The backend must ensure that the logged-in
 * guide is allowed to view this booking.
 *
 * GET /bookings/:id
 */
export async function getGuideBookingById(bookingId: string): Promise<Booking> {
  const response = await apiClient.get(`/bookings/${bookingId}`);

  return response.data.data;
}