import { apiClient } from "@/lib/api/client";

import type {
  Booking,
  BookingLifecycleAction,
  LifecycleConfirmationCode,
} from "./booking.types";

export async function getMyBookings(): Promise<Booking[]> {
  const response = await apiClient.get("/bookings/me");

  return response.data.data;
}

export async function getBookingById(id: string): Promise<Booking> {
  const response = await apiClient.get(`/bookings/${id}`);

  return response.data.data;
}

/**
 * Generates a tour confirmation code for the traveler's own
 * booking (CR-032). Any earlier open code for the same action is
 * invalidated by the backend. The response is never cached, and
 * the code must only be kept in component memory.
 *
 * POST /bookings/:id/lifecycle-challenges
 */
export async function generateLifecycleConfirmationCode(
  bookingId: string,
  action: BookingLifecycleAction,
): Promise<LifecycleConfirmationCode> {
  const response = await apiClient.post(`/bookings/${bookingId}/lifecycle-challenges`, {
    action,
  });

  const data = response.data.data;

  return {
    action: data.action,
    code: data.code,
    expiresAt: data.expiresAt,
    guide: data.guide ?? null,
    serverTime: response.data.meta?.timestamp ?? null,
  };
}
