"use client";

import Link from "next/link";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { ArrowLeft, CalendarCheck2, LoaderCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { AdminBookingCard } from "@/features/bookings/components/admin-booking-card";

import { getAdminBookings } from "@/features/bookings/admin-booking.api";

import type { BookingStatus } from "@/features/bookings/booking.types";

type StatusFilter = BookingStatus | "";

const statusFilters: {
  label: string;
  value: StatusFilter;
}[] = [
  {
    label: "All",
    value: "",
  },
  {
    label: "Confirmed",
    value: "CONFIRMED",
  },
  {
    label: "In Progress",
    value: "IN_PROGRESS",
  },
  {
    label: "Completed",
    value: "COMPLETED",
  },
  {
    label: "Cancelled",
    value: "CANCELLED",
  },
];

export default function AdminBookingsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  const {
    data: bookings = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "bookings", statusFilter],

    queryFn: () =>
      getAdminBookings({
        status: statusFilter,
      }),
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Header */}

      <div className="mb-8">
        <Link
          href="/admin"
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
                Booking management
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Bookings
            </h1>

            <p className="mt-2 max-w-2xl text-muted-foreground">
              Manage confirmed tours, track trips currently in progress, and
              review completed or cancelled bookings.
            </p>
          </div>

          {!isLoading && !isError && (
            <div className="rounded-full border px-4 py-2 text-sm">
              {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
            </div>
          )}
        </div>
      </div>

      {/* Status filters */}

      <div className="mb-8 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          {statusFilters.map((filter) => {
            const isActive = statusFilter === filter.value;

            return (
              <button
                key={filter.value || "ALL"}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={
                  isActive
                    ? buttonVariants()
                    : buttonVariants({
                        variant: "outline",
                      })
                }
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}

      {isLoading && (
        <div className="flex min-h-64 items-center justify-center">
          <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}

      {isError && (
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h2 className="font-semibold">Unable to load bookings</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t retrieve the booking list. Please try again.
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
      )}

      {/* Booking list */}

      {!isLoading && !isError && bookings.length > 0 && (
        <div className="grid gap-5">
          {bookings.map((booking) => (
            <AdminBookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}

      {/* Empty state */}

      {!isLoading && !isError && bookings.length === 0 && (
        <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
          <CalendarCheck2 className="mx-auto size-9 text-muted-foreground" />

          <h2 className="mt-4 text-lg font-semibold">No bookings found</h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {statusFilter
              ? `There are currently no ${statusFilter
                  .replaceAll("_", " ")
                  .toLowerCase()} bookings.`
              : "Bookings will appear here after tourists successfully complete payment."}
          </p>
        </div>
      )}
    </main>
  );
}