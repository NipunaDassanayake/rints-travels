"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import { ArrowLeft, CalendarCheck2, LoaderCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { getMyBookings } from "@/features/bookings/booking.api";

import { TouristBookingsList } from "@/features/bookings/components/tourist-bookings-list";

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

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Link
          href="/tourist"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <CalendarCheck2 className="size-5" />

              <p className="text-sm font-medium uppercase tracking-wide">
                Trips
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              My Bookings
            </h1>

            <p className="mt-2 max-w-2xl text-muted-foreground">
              View your confirmed trips, payment information, travel dates, and
              tour details.
            </p>
          </div>

          {!isError && (
            <div className="rounded-full border px-4 py-2 text-sm">
              {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
            </div>
          )}
        </div>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h2 className="font-semibold">Unable to load bookings</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t retrieve your bookings. Please try again.
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            className={`${buttonVariants({
              variant: "outline",
            })} mt-5`}
          >
            Try again
          </button>
        </div>
      ) : (
        <TouristBookingsList bookings={bookings} />
      )}
    </main>
  );
}