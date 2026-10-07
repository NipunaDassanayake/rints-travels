import { apiClient } from "@/lib/api/client";

import type { Booking, BookingStatus } from "./booking.types";

export interface AdminBookingFilters {
  status?: BookingStatus | "";
  touristId?: string;
}

export async function getAdminBookings(
  filters: AdminBookingFilters = {},
): Promise<Booking[]> {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.touristId) {
    params.set("touristId", filters.touristId);
  }

  const queryString = params.toString();

  const response = await apiClient.get(
    queryString ? `/bookings?${queryString}` : "/bookings",
  );

  return response.data.data;
}

export async function getAdminBookingById(id: string): Promise<Booking> {
  const response = await apiClient.get(`/bookings/${id}`);

  return response.data.data;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<Booking> {
  const response = await apiClient.patch(`/bookings/${id}/status`, {
    status,
  });

  return response.data.data;
}

/**
 * =========================================================
 * Guide Assignment
 * =========================================================
 */

export async function assignBookingGuide(
  bookingId: string,
  guideId: string,
): Promise<Booking> {
  const response = await apiClient.patch(`/bookings/${bookingId}/guide`, {
    guideId,
  });

  return response.data.data;
}