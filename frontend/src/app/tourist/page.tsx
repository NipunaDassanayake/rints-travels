"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import {
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  LoaderCircle,
  MapPin,
  Plus,
  ReceiptText,
  Route,
  UserRound,
  WalletCards,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import { getMyTourRequests } from "@/features/tour-requests/tour-request.api";

import { getMyQuotations } from "@/features/quotations/quotation.api";

import { getMyPayments } from "@/features/payments/payment.api";

import { getMyBookings } from "@/features/bookings/booking.api";

import type { TourRequest } from "@/features/tour-requests/tour-request.types";

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
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getRequestTitle(request: TourRequest) {
  if (request.requestType === "PACKAGE_BASED") {
    return request.travelPackage?.title ?? "Package based journey";
  }

  return request.title ?? "Custom Sri Lanka journey";
}

function getRequestDestination(request: TourRequest) {
  return (
    request.destinationPreferences ||
    request.travelPackage?.destination ||
    "Sri Lanka"
  );
}

/**
 * =========================================================
 * Tourist Dashboard
 * =========================================================
 */

export default function TouristDashboard() {
  /**
   * =======================================================
   * Tour Requests
   * =======================================================
   */

  const {
    data: tourRequests = [],
    isLoading: requestsLoading,
    isError: requestsError,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ["tour-requests", "me"],

    queryFn: getMyTourRequests,
  });

  /**
   * =======================================================
   * Quotations
   * =======================================================
   */

  const {
    data: quotations = [],
    isLoading: quotationsLoading,
    isError: quotationsError,
    refetch: refetchQuotations,
  } = useQuery({
    queryKey: ["quotations", "me"],

    queryFn: getMyQuotations,
  });

  /**
   * =======================================================
   * Payments
   * =======================================================
   */

  const {
    data: payments = [],
    isLoading: paymentsLoading,
    isError: paymentsError,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ["payments", "me"],

    queryFn: getMyPayments,
  });

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
    queryKey: ["bookings", "me"],

    queryFn: getMyBookings,
  });

  /**
   * =======================================================
   * Loading
   * =======================================================
   */

  const isLoading =
    requestsLoading || quotationsLoading || paymentsLoading || bookingsLoading;

  if (isLoading) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="size-7 animate-spin text-muted-foreground" />

          <p className="text-sm text-muted-foreground">
            Loading your travel dashboard...
          </p>
        </div>
      </main>
    );
  }

  /**
   * =======================================================
   * Error
   * =======================================================
   */

  const isError =
    requestsError || quotationsError || paymentsError || bookingsError;

  if (isError) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">
            Unable to load your dashboard
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Some travel information could not be retrieved.
          </p>

          <button
            type="button"
            onClick={() => {
              void refetchRequests();

              void refetchQuotations();

              void refetchPayments();

              void refetchBookings();
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
   * Request Statistics
   * =======================================================
   */

  const activeRequests = tourRequests.filter(
    (request) => !["BOOKED", "CANCELLED", "REJECTED"].includes(request.status),
  );

  /**
   * =======================================================
   * Quotation Statistics
   * =======================================================
   */

  const awaitingQuotations = quotations.filter(
    (quotation) => quotation.status === "SENT",
  );

  const acceptedQuotations = quotations.filter(
    (quotation) => quotation.status === "ACCEPTED",
  );

  /**
   * =======================================================
   * Payment Statistics
   * =======================================================
   */

  const pendingPayments = payments.filter(
    (payment) => payment.status === "PENDING",
  );

  const successfulPayments = payments.filter(
    (payment) => payment.status === "SUCCESS",
  );

  /**
   * =======================================================
   * Booking Statistics
   * =======================================================
   */

  const upcomingBookings = bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );

  const activeBookings = bookings.filter(
    (booking) => booking.status === "IN_PROGRESS",
  );

  const completedBookings = bookings.filter(
    (booking) => booking.status === "COMPLETED",
  );

  /**
   * =======================================================
   * Recent Request
   * =======================================================
   */

  const recentRequest = [...tourRequests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  /**
   * =======================================================
   * Next / Active Booking
   * =======================================================
   */

  const nextBooking =
    activeBookings[0] ??
    [...upcomingBookings].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )[0];

  /**
   * =======================================================
   * Recent Payment
   * =======================================================
   */

  const recentPayment = [...payments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            My Travora
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            My travel dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            Follow your requests, review quotations, manage payments and keep
            track of your upcoming Sri Lanka journeys.
          </p>
        </div>

        <Link
          href="/tourist/requests/new"
          className={buttonVariants({
            size: "lg",
          })}
        >
          <Plus className="size-4" />
          Plan a new trip
        </Link>
      </div>

      {/* =====================================================
          MAIN STATISTICS
      ===================================================== */}

      <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title="Tour requests"
          value={tourRequests.length}
          description={`${activeRequests.length} currently active`}
          href="/tourist/requests"
          icon={FileText}
        />

        <DashboardCard
          title="Quotations"
          value={quotations.length}
          description={`${awaitingQuotations.length} awaiting your response`}
          href="/tourist/quotations"
          icon={ReceiptText}
        />

        <DashboardCard
          title="Payments"
          value={payments.length}
          description={`${successfulPayments.length} successful`}
          href="/tourist/payments"
          icon={CreditCard}
        />

        <DashboardCard
          title="Bookings"
          value={bookings.length}
          description={`${upcomingBookings.length} upcoming`}
          href="/tourist/bookings"
          icon={CalendarCheck2}
        />
      </section>

      {/* =====================================================
          ATTENTION SECTION
      ===================================================== */}

      {(awaitingQuotations.length > 0 || pendingPayments.length > 0) && (
        <section className="mt-8">
          <div className="rounded-2xl border bg-muted/20 p-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
                  Needs your attention
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  You have travel actions waiting
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  Review your latest travel proposal or complete any pending
                  payment.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {awaitingQuotations.length > 0 && (
                  <Link href="/tourist/quotations" className={buttonVariants()}>
                    <ReceiptText className="size-4" />
                    Review quotation
                  </Link>
                )}

                {pendingPayments.length > 0 && (
                  <Link
                    href="/tourist/payments"
                    className={buttonVariants({
                      variant: "outline",
                    })}
                  >
                    <WalletCards className="size-4" />
                    View payment
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          CURRENT JOURNEY / RECENT REQUEST
      ===================================================== */}

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        {/* NEXT JOURNEY */}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Your journey
                </p>

                <CardTitle className="mt-2">
                  {nextBooking
                    ? nextBooking.status === "IN_PROGRESS"
                      ? "Current tour"
                      : "Upcoming trip"
                    : "Upcoming trip"}
                </CardTitle>
              </div>

              <Route className="size-6 text-muted-foreground" />
            </div>
          </CardHeader>

          <CardContent>
            {nextBooking ? (
              <UpcomingBooking booking={nextBooking} />
            ) : (
              <EmptyState
                title="No upcoming trip"
                description="Once your quotation is accepted and payment is completed, your confirmed journey will appear here."
                href="/packages"
                action="Explore packages"
              />
            )}
          </CardContent>
        </Card>

        {/* RECENT REQUEST */}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  Recent activity
                </p>

                <CardTitle className="mt-2">Latest tour request</CardTitle>
              </div>

              <FileText className="size-6 text-muted-foreground" />
            </div>
          </CardHeader>

          <CardContent>
            {recentRequest ? (
              <RecentRequest request={recentRequest} />
            ) : (
              <EmptyState
                title="No requests yet"
                description="Start planning your journey by choosing a package or creating a custom trip."
                href="/tourist/requests/new"
                action="Create request"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* =====================================================
          TRIP PROGRESS
      ===================================================== */}

      <section className="mt-10">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Travel overview
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Your journey at a glance
          </h2>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            title="Active requests"
            value={activeRequests.length}
            icon={FileText}
          />

          <StatusCard
            title="Accepted quotations"
            value={acceptedQuotations.length}
            icon={CheckCircle2}
          />

          <StatusCard
            title="Trips in progress"
            value={activeBookings.length}
            icon={Route}
          />

          <StatusCard
            title="Completed trips"
            value={completedBookings.length}
            icon={CalendarCheck2}
          />
        </div>
      </section>

      {/* =====================================================
          RECENT PAYMENT
      ===================================================== */}

      {recentPayment && (
        <section className="mt-10">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Latest transaction
                  </p>

                  <CardTitle className="mt-2">Recent payment</CardTitle>
                </div>

                <Link
                  href="/tourist/payments"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "sm",
                  })}
                >
                  View payments
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </CardHeader>

            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {recentPayment.paymentReference}
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {recentPayment.currency} {recentPayment.amount}
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatDate(recentPayment.createdAt)}
                  </p>
                </div>

                <span className="rounded-full border px-4 py-2 text-sm font-medium">
                  {formatStatus(recentPayment.status)}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* =====================================================
          QUICK ACTIONS
      ===================================================== */}

      <section className="mt-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quick actions</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Everything you need to manage your Travora journey.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            title="Plan a trip"
            description="Create a new personalized travel request."
            href="/tourist/requests/new"
            icon={Plus}
          />

          <QuickAction
            title="My quotations"
            description="Review offers prepared by the Travora team."
            href="/tourist/quotations"
            icon={ReceiptText}
          />

          <QuickAction
            title="My bookings"
            description="View confirmed and completed journeys."
            href="/tourist/bookings"
            icon={CalendarCheck2}
          />

          <QuickAction
            title="Browse guides"
            description="Discover experienced local tour guides."
            href="/guides"
            icon={UserRound}
          />
        </div>
      </section>
    </main>
  );
}

/**
 * =========================================================
 * Dashboard Card
 * =========================================================
 */

function DashboardCard({
  title,
  value,
  description,
  href,
  icon: Icon,
}: {
  title: string;

  value: number;

  description: string;

  href: string;

  icon: typeof FileText;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>

              <p className="mt-2 text-3xl font-bold">{value}</p>
            </div>

            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Icon className="size-5" />
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * =========================================================
 * Status Card
 * =========================================================
 */

function StatusCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;

  value: number;

  icon: typeof FileText;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>

          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>

        <Icon className="size-6 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

/**
 * =========================================================
 * Upcoming Booking
 * =========================================================
 */

function UpcomingBooking({ booking }: { booking: Booking }) {
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

      <div className="mt-6 space-y-4">
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

        {booking.quotation.guide && (
          <div className="flex gap-3">
            <UserRound className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Tour guide</p>

              <p className="mt-1 text-sm font-medium">
                {booking.quotation.guide.user.firstName}{" "}
                {booking.quotation.guide.user.lastName}
              </p>
            </div>
          </div>
        )}
      </div>

      <Link
        href={`/tourist/bookings/${booking.id}`}
        className={`${buttonVariants({
          variant: "outline",
        })} mt-6`}
      >
        View booking
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

/**
 * =========================================================
 * Recent Request
 * =========================================================
 */

function RecentRequest({ request }: { request: TourRequest }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">{getRequestTitle(request)}</h3>

          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4" />

            {getRequestDestination(request)}
          </div>
        </div>

        <span className="rounded-full border px-3 py-1 text-xs font-medium">
          {formatStatus(request.status)}
        </span>
      </div>

      <div className="mt-5 text-sm text-muted-foreground">
        Submitted {formatDate(request.createdAt)}
      </div>

      <Link
        href={`/tourist/requests/${request.id}`}
        className={`${buttonVariants({
          variant: "outline",
        })} mt-6`}
      >
        View request
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

/**
 * =========================================================
 * Quick Action
 * =========================================================
 */

function QuickAction({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;

  description: string;

  href: string;

  icon: typeof FileText;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-sm">
        <CardContent className="p-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
            <Icon className="size-5" />
          </div>

          <h3 className="mt-4 font-semibold">{title}</h3>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {description}
          </p>

          <div className="mt-4 flex items-center gap-1 text-sm font-medium">
            Open
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
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
  href,
  action,
}: {
  title: string;

  description: string;

  href: string;

  action: string;
}) {
  return (
    <div className="py-5 text-center">
      <Route className="mx-auto size-8 text-muted-foreground" />

      <h3 className="mt-4 font-semibold">{title}</h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      <Link
        href={href}
        className={`${buttonVariants({
          variant: "outline",
        })} mt-5`}
      >
        {action}
      </Link>
    </div>
  );
}