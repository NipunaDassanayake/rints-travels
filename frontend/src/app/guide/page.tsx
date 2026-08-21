"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Route,
  UserRound,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import { getMyGuideBookings } from "@/features/bookings/guide-booking.api";

import type { Booking } from "@/features/bookings/booking.types";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getDestination(booking: Booking) {
  return (
    booking.tourRequest.destinationPreferences ||
    booking.quotation.description ||
    "Sri Lanka"
  );
}

export default function GuideDashboardPage() {
  const {
    data: bookings = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["guide", "bookings"],

    queryFn: getMyGuideBookings,
  });

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">
            Unable to load assigned tours
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Your assigned bookings could not be loaded.
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
      </main>
    );
  }

  const upcomingBookings = bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );

  const inProgressBookings = bookings.filter(
    (booking) => booking.status === "IN_PROGRESS",
  );

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === "CANCELLED",
  );

  const activeBookings = [...inProgressBookings, ...upcomingBookings];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Tour guide portal
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          My assigned tours
        </h1>

        <p className="mt-3 max-w-2xl text-muted-foreground">
          View your upcoming journeys, active tours, tourist information and
          assigned itineraries.
        </p>
      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Upcoming"
          value={upcomingBookings.length}
          icon={CalendarDays}
        />

        <SummaryCard
          title="In progress"
          value={inProgressBookings.length}
          icon={Route}
        />

        <SummaryCard
          title="Completed"
          value={completedBookings.length}
          icon={CheckCircle2}
        />

        <SummaryCard
          title="Total assigned"
          value={bookings.length}
          icon={UserRound}
        />
      </div>

      {/* =====================================================
          ACTIVE / UPCOMING TOURS
      ===================================================== */}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Current & upcoming tours
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Tours that are currently active or confirmed for the future.
            </p>
          </div>
        </div>

        {activeBookings.length > 0 ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {activeBookings.map((booking) => (
              <GuideBookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed p-8 text-center">
            <CalendarDays className="mx-auto size-8 text-muted-foreground" />

            <h3 className="mt-4 font-semibold">No active tours</h3>

            <p className="mt-2 text-sm text-muted-foreground">
              You currently have no upcoming or in-progress tours assigned.
            </p>
          </div>
        )}
      </section>

      {/* =====================================================
          COMPLETED TOURS
      ===================================================== */}

      {completedBookings.length > 0 && (
        <section className="mt-12">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Completed tours
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Tours you have already completed.
            </p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {completedBookings.map((booking) => (
              <GuideBookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}

      {/* =====================================================
          CANCELLED TOURS
      ===================================================== */}

      {cancelledBookings.length > 0 && (
        <section className="mt-12">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Cancelled tours
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Previously assigned bookings that were cancelled.
            </p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {cancelledBookings.map((booking) => (
              <GuideBookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

interface SummaryCardProps {
  title: string;
  value: number;
  icon: typeof CalendarDays;
}

function SummaryCard({ title, value, icon: Icon }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>

          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>

        <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function GuideBookingCard({ booking }: { booking: Booking }) {
  const touristName = `${booking.tourist.firstName} ${booking.tourist.lastName}`;

  const destination = getDestination(booking);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {booking.bookingReference}
            </p>

            <CardTitle className="mt-2 text-xl">
              {booking.quotation.title}
            </CardTitle>
          </div>

          <span className="rounded-full border px-3 py-1 text-xs font-medium">
            {formatStatus(booking.status)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Travel dates</p>

              <p className="mt-1 text-sm font-medium">
                {formatDate(booking.startDate)}

                {" → "}

                {formatDate(booking.endDate)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <UserRound className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Tourist</p>

              <p className="mt-1 text-sm font-medium">{touristName}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Users className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Travelers</p>

              <p className="mt-1 text-sm font-medium">
                {booking.quotation.adultCount} adult
                {booking.quotation.adultCount !== 1 ? "s" : ""}
                {" · "}
                {booking.quotation.childCount} child
                {booking.quotation.childCount !== 1 ? "ren" : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Journey</p>

              <p className="mt-1 line-clamp-1 text-sm font-medium">
                {destination}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="size-4" />
              {booking.quotation.itineraries.length} itinerary{" "}
              {booking.quotation.itineraries.length === 1 ? "day" : "days"}
            </div>

            <Link
              href={`/guide/bookings/${booking.id}`}
              className={buttonVariants({
                variant: "outline",
              })}
            >
              View tour
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}