import Link from "next/link";

import { CalendarCheck2 } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";

import { LoadingState } from "@/components/patterns/loading-state";

import { buttonVariants } from "@/components/ui/button";

import type { Booking } from "@/features/bookings/booking.types";

import { TouristBookingCard } from "./tourist-booking-card";

interface TouristBookingsListProps {
  bookings: Booking[];
  isLoading?: boolean;
}

export function TouristBookingsList({
  bookings,
  isLoading = false,
}: TouristBookingsListProps) {
  if (isLoading) {
    return <LoadingState variant="skeleton" rows={2} label="Loading your bookings" />;
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        headingLevel="h2"
        icon={CalendarCheck2}
        title="No bookings yet"
        description="Your confirmed trips will appear here after you accept a quotation and complete the payment."
        action={
          <Link href="/tourist/requests" className={buttonVariants({ variant: "outline" })}>
            View my journeys
          </Link>
        }
        className="py-14"
      />
    );
  }

  return (
    <ul className="space-y-4 sm:space-y-5">
      {bookings.map((booking) => (
        <li key={booking.id}>
          <TouristBookingCard booking={booking} />
        </li>
      ))}
    </ul>
  );
}
