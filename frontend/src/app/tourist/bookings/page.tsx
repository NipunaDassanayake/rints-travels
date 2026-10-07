"use client";

import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "@/components/patterns/error-state";

import { PageHeader } from "@/components/patterns/page-header";

import { getMyBookings } from "@/features/bookings/booking.api";

import { TouristBookingsList } from "@/features/bookings/components/tourist-bookings-list";

/**
 * Traveler booking list (CR-030 Stage 2 normalization): the same
 * bookings in the same order, on CR-028 patterns.
 */
export default function TouristBookingsPage() {
  const {
    data: bookings = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["bookings", "me"],
    queryFn: getMyBookings,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <PageHeader
        editorial
        title="My Bookings"
        description="Your confirmed trips with their dates, guide, payment and tour details."
      />

      <div className="mt-8">
        {isError ? (
          <ErrorState
            headingLevel="h2"
            title="Unable to load bookings"
            description="We couldn't retrieve your bookings. Please try again."
            onRetry={() => void refetch()}
          />
        ) : (
          <TouristBookingsList bookings={bookings} isLoading={isLoading} />
        )}
      </div>
    </main>
  );
}
