"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  Route,
  Star,
  UserRound,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import { getMyGuideBookings } from "@/features/bookings/guide-booking.api";

import { getMyGuideReviews } from "@/features/reviews/review.api";

import type { Booking } from "@/features/bookings/booking.types";

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

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

/**
 * =========================================================
 * Dashboard
 * =========================================================
 */

export default function GuideDashboardPage() {
  /**
   * =======================================================
   * Bookings
   * =======================================================
   */

  const {
    data: bookings = [],
    isLoading: bookingsLoading,
    isError: bookingsError,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ["guide", "bookings"],

    queryFn: getMyGuideBookings,
  });

  /**
   * =======================================================
   * Reviews
   * =======================================================
   */

  const {
    data: reviewSummary,
    isLoading: reviewsLoading,
    isError: reviewsError,
    refetch: refetchReviews,
  } = useQuery({
    queryKey: ["guide", "reviews"],

    queryFn: getMyGuideReviews,
  });

  const isLoading = bookingsLoading || reviewsLoading;

  const isError = bookingsError || reviewsError;

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="size-7 animate-spin text-muted-foreground" />

          <p className="text-sm text-muted-foreground">
            Loading your guide dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">
            Unable to load guide dashboard
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Some guide information could not be retrieved.
          </p>

          <button
            type="button"
            onClick={() => {
              void refetchBookings();
              void refetchReviews();
            }}
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

  /**
   * =======================================================
   * Booking statistics
   * =======================================================
   */

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

  /**
   * =======================================================
   * Review statistics
   * =======================================================
   */

  const averageRating = Number(reviewSummary?.guide.averageRating ?? 0);

  const totalReviews = reviewSummary?.guide.totalReviews ?? 0;

  /**
   * =======================================================
   * Current / next booking
   * =======================================================
   */

  const currentBooking = inProgressBookings[0] ?? null;

  const nextBooking =
    [...upcomingBookings].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )[0] ?? null;

  /**
   * =======================================================
   * Recent completed
   * =======================================================
   */

  const recentCompleted = [...completedBookings]
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.updatedAt).getTime() -
        new Date(a.completedAt ?? a.updatedAt).getTime(),
    )
    .slice(0, 4);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Tour guide portal
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            My guide dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            Manage assigned tours, follow your upcoming journeys, and keep track
            of traveler feedback.
          </p>
        </div>

        <Link
          href="/guide/reviews"
          className={buttonVariants({
            variant: "outline",
          })}
        >
          <Star className="size-4" />
          My reviews
        </Link>
      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Upcoming"
          value={upcomingBookings.length}
          description="Confirmed tours ahead"
          icon={CalendarDays}
        />

        <SummaryCard
          title="In progress"
          value={inProgressBookings.length}
          description="Tours currently active"
          icon={Route}
        />

        <SummaryCard
          title="Completed"
          value={completedBookings.length}
          description="Tours successfully finished"
          icon={CheckCircle2}
        />

        <SummaryCard
          title="Average rating"
          value={averageRating > 0 ? averageRating.toFixed(1) : "—"}
          description={`${totalReviews} ${
            totalReviews === 1 ? "review" : "reviews"
          }`}
          icon={Star}
        />
      </section>

      {/* =====================================================
          CURRENT / NEXT TOUR
      ===================================================== */}

      <section className="mt-10">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Priority
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Current & next tour
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Focus on the tour that needs your attention first.
          </p>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Current
                  </p>

                  <CardTitle className="mt-2">Active tour</CardTitle>
                </div>

                <Route className="size-6 text-muted-foreground" />
              </div>
            </CardHeader>

            <CardContent>
              {currentBooking ? (
                <PriorityBooking
                  booking={currentBooking}
                  actionLabel="Manage active tour"
                />
              ) : (
                <EmptyState
                  title="No active tour"
                  description="You currently have no tour in progress."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Next
                  </p>

                  <CardTitle className="mt-2">Upcoming tour</CardTitle>
                </div>

                <CalendarDays className="size-6 text-muted-foreground" />
              </div>
            </CardHeader>

            <CardContent>
              {nextBooking ? (
                <PriorityBooking
                  booking={nextBooking}
                  actionLabel="View upcoming tour"
                />
              ) : (
                <EmptyState
                  title="No upcoming tour"
                  description="You currently have no confirmed tours scheduled."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* =====================================================
          ASSIGNED TOURS
      ===================================================== */}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Assignments
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Current & upcoming tours
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Confirmed and active tours currently assigned to you.
            </p>
          </div>
        </div>

        {[...inProgressBookings, ...upcomingBookings].length > 0 ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {[...inProgressBookings, ...upcomingBookings].map((booking) => (
              <GuideBookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed p-10 text-center">
            <CalendarDays className="mx-auto size-8 text-muted-foreground" />

            <h3 className="mt-4 font-semibold">No assigned tours</h3>

            <p className="mt-2 text-sm text-muted-foreground">
              You currently have no confirmed or active tours assigned.
            </p>
          </div>
        )}
      </section>

      {/* =====================================================
          COMPLETED TOURS
      ===================================================== */}

      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
              History
            </p>

            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Recent completed tours
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Your latest successfully completed journeys.
            </p>
          </div>

          {totalReviews > 0 && (
            <Link
              href="/guide/reviews"
              className="flex items-center gap-1 text-sm font-medium hover:underline"
            >
              View reviews
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>

        {recentCompleted.length > 0 ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {recentCompleted.map((booking) => (
              <GuideBookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed p-10 text-center">
            <CheckCircle2 className="mx-auto size-8 text-muted-foreground" />

            <h3 className="mt-4 font-semibold">No completed tours yet</h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Tours you complete will appear here.
            </p>
          </div>
        )}
      </section>

      {/* =====================================================
          CANCELLED
      ===================================================== */}

      {cancelledBookings.length > 0 && (
        <section className="mt-12">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Cancelled tours
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Previous assignments that were cancelled.
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

/**
 * =========================================================
 * Summary Card
 * =========================================================
 */

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;

  value: number | string;

  description: string;

  icon: typeof CalendarDays;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>

            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>

          <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
            <Icon className="size-5" />
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

/**
 * =========================================================
 * Priority Booking
 * =========================================================
 */

function PriorityBooking({
  booking,
  actionLabel,
}: {
  booking: Booking;

  actionLabel: string;
}) {
  const touristName = `${booking.tourist.firstName} ${booking.tourist.lastName}`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{booking.quotation.title}</h3>

          <p className="mt-2 text-sm text-muted-foreground">
            {booking.bookingReference}
          </p>
        </div>

        <span className="rounded-full border px-3 py-1 text-xs font-medium">
          {formatStatus(booking.status)}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
      </div>

      <Link
        href={`/guide/bookings/${booking.id}`}
        className={`${buttonVariants({
          variant: "outline",
        })} mt-6`}
      >
        {actionLabel}

        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

/**
 * =========================================================
 * Guide Booking Card
 * =========================================================
 */

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

/**
 * =========================================================
 * Empty State
 * =========================================================
 */

function EmptyState({
  title,
  description,
}: {
  title: string;

  description: string;
}) {
  return (
    <div className="py-6 text-center">
      <Route className="mx-auto size-8 text-muted-foreground" />

      <h3 className="mt-4 font-semibold">{title}</h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}