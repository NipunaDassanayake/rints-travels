import { apiClient } from "@/lib/api/client";

import type { Booking } from "./booking.types";

export async function getMyBookings(): Promise<Booking[]> {
  const response = await apiClient.get("/bookings/me");

  return response.data.data;
}

export async function getBookingById(id: string): Promise<Booking> {
  const response = await apiClient.get(`/bookings/${id}`);

  return response.data.data;
}