"use client";

import { CalendarDays, LoaderCircle } from "lucide-react";

import { TouristBookingCard } from "./tourist-booking-card";

import type { Booking } from "@/features/bookings/booking.types";

interface TouristBookingsListProps {
  bookings: Booking[];
  isLoading?: boolean;
}

export function TouristBookingsList({
  bookings,
  isLoading = false,
}: TouristBookingsListProps) {
  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <CalendarDays className="size-6 text-muted-foreground" />
        </div>

        <h2 className="mt-4 text-lg font-semibold">No bookings yet</h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Your confirmed trips will appear here after you accept a quotation and
          complete the payment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {bookings.map((booking) => (
        <TouristBookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
}