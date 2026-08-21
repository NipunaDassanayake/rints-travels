"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import {
  ArrowRight,
  Banknote,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  LoaderCircle,
  MapPin,
  Package,
  Route,
  Users,
  WalletCards,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import {
  getAdminTourRequests,
  type AdminTourRequest,
} from "@/features/tour-requests/admin-tour-request.api";

import { getAdminBookings } from "@/features/bookings/admin-booking.api";

import { getAdminPackages } from "@/features/packages/admin-package.api";

import { getTourGuides } from "@/features/tour-guides/tour-guide.api";

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

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function getRequestTitle(request: AdminTourRequest) {
  if (request.requestType === "PACKAGE_BASED") {
    return request.travelPackage?.title ?? "Package based request";
  }

  return request.title ?? "Custom travel request";
}

function getRequestDestination(request: AdminTourRequest) {
  return (
    request.destinationPreferences ||
    request.travelPackage?.destination ||
    "Not specified"
  );
}

function getTouristName(request: AdminTourRequest) {
  return `${request.tourist.firstName} ${request.tourist.lastName}`;
}

/**
 * =========================================================
 * Dashboard
 * =========================================================
 */

export default function AdminDashboard() {
  /**
   * =======================================================
   * Tour requests
   * =======================================================
   */

  const {
    data: requests = [],
    isLoading: requestsLoading,
    isError: requestsError,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ["admin", "tour-requests"],

    queryFn: () => getAdminTourRequests(),
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
    queryKey: ["admin", "bookings"],

    queryFn: () => getAdminBookings(),
  });

  /**
   * =======================================================
   * Packages
   * =======================================================
   */

  const {
    data: packageData,
    isLoading: packagesLoading,
    isError: packagesError,
    refetch: refetchPackages,
  } = useQuery({
    queryKey: ["admin", "packages", "dashboard"],

    queryFn: () =>
      getAdminPackages({
        page: 1,
        limit: 100,
      }),
  });

  /**
   * =======================================================
   * Guides
   * =======================================================
   */

  const {
    data: guides = [],
    isLoading: guidesLoading,
    isError: guidesError,
    refetch: refetchGuides,
  } = useQuery({
    queryKey: ["admin", "guides", "dashboard"],

    queryFn: getTourGuides,
  });

  /**
   * =======================================================
   * Loading / error
   * =======================================================
   */

  const isLoading =
    requestsLoading || bookingsLoading || packagesLoading || guidesLoading;

  const isError =
    requestsError || bookingsError || packagesError || guidesError;

  if (isLoading) {
    return (
      <main className="flex min-h-[65vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="size-8 animate-spin text-muted-foreground" />

          <p className="text-sm text-muted-foreground">
            Loading admin dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">
            Unable to load admin dashboard
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Some dashboard information could not be retrieved.
          </p>

          <button
            type="button"
            onClick={() => {
              void refetchRequests();

              void refetchBookings();

              void refetchPackages();

              void refetchGuides();
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

  const packages = packageData?.items ?? [];

  /**
   * =======================================================
   * Request statistics
   * =======================================================
   */

  const pendingRequests = requests.filter(
    (request) => request.status === "PENDING_REVIEW",
  );

  const discussionRequests = requests.filter(
    (request) => request.status === "UNDER_DISCUSSION",
  );

  const quotationReadyRequests = requests.filter(
    (request) => request.status === "READY_FOR_QUOTATION",
  );

  const quotationsSent = requests.filter(
    (request) => request.status === "QUOTATION_SENT",
  );

  /**
   * =======================================================
   * Booking statistics
   * =======================================================
   */

  const confirmedBookings = bookings.filter(
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
   * Guide statistics
   * =======================================================
   */

  const availableGuides = guides.filter((guide) => guide.isAvailable);

  const unavailableGuides = guides.filter((guide) => !guide.isAvailable);

  /**
   * =======================================================
   * Package statistics
   * =======================================================
   */

  const activePackages = packages.filter(
    (travelPackage) => travelPackage.status === "ACTIVE",
  );

  const inactivePackages = packages.filter(
    (travelPackage) => travelPackage.status === "INACTIVE",
  );

  /**
   * =======================================================
   * Revenue
   * =======================================================
   */

  const successfulBookings = bookings.filter(
    (booking) => booking.payment?.status === "SUCCESS",
  );

  const totalRevenue = successfulBookings.reduce(
    (total, booking) => total + Number(booking.totalAmount),
    0,
  );

  /**
   * =======================================================
   * Recent activity
   * =======================================================
   */

  const recentRequests = [...requests]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  const recentBookings = [...bookings]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Travora administration
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Admin dashboard
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            Monitor traveler requests, quotations, bookings, payments, packages
            and guide availability from one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/tour-requests"
            className={buttonVariants({
              variant: "outline",
            })}
          >
            Tour requests
          </Link>

          <Link href="/admin/bookings" className={buttonVariants()}>
            Manage bookings
          </Link>
        </div>
      </div>

      {/* =====================================================
          PRIMARY METRICS
      ===================================================== */}

      <section className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric
          title="Total requests"
          value={requests.length}
          description={`${pendingRequests.length} awaiting review`}
          icon={FileText}
          href="/admin/tour-requests"
        />

        <DashboardMetric
          title="Confirmed bookings"
          value={confirmedBookings.length}
          description={`${inProgressBookings.length} active tours`}
          icon={CalendarCheck2}
          href="/admin/bookings"
        />

        <DashboardMetric
          title="Active tours"
          value={inProgressBookings.length}
          description={`${completedBookings.length} tours completed`}
          icon={Route}
          href="/admin/bookings?status=IN_PROGRESS"
        />

        <DashboardMetric
          title="Revenue"
          value={formatMoney(totalRevenue)}
          description={`${successfulBookings.length} successful payments`}
          icon={CircleDollarSign}
        />
      </section>

      {/* =====================================================
          BUSINESS OVERVIEW
      ===================================================== */}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMetric
          title="Available guides"
          value={availableGuides.length}
          description={`${guides.length} registered guides`}
          icon={Users}
          href="/admin/guides"
        />

        <DashboardMetric
          title="Active packages"
          value={activePackages.length}
          description={`${packages.length} total packages`}
          icon={Package}
          href="/admin/packages"
        />

        <DashboardMetric
          title="Pending review"
          value={pendingRequests.length}
          description="Requests needing attention"
          icon={Clock3}
          href="/admin/tour-requests?status=PENDING_REVIEW"
        />

        <DashboardMetric
          title="Completed tours"
          value={completedBookings.length}
          description="Successfully completed journeys"
          icon={CheckCircle2}
          href="/admin/bookings?status=COMPLETED"
        />
      </section>

      {/* =====================================================
          REQUEST PIPELINE
      ===================================================== */}

      <section className="mt-10">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Request pipeline
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Travel request workflow
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Follow tourist requests from initial review through quotation.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PipelineCard
            title="Pending review"
            value={pendingRequests.length}
            href="/admin/tour-requests?status=PENDING_REVIEW"
          />

          <PipelineCard
            title="Under discussion"
            value={discussionRequests.length}
            href="/admin/tour-requests?status=UNDER_DISCUSSION"
          />

          <PipelineCard
            title="Ready for quotation"
            value={quotationReadyRequests.length}
            href="/admin/tour-requests?status=READY_FOR_QUOTATION"
          />

          <PipelineCard
            title="Quotation sent"
            value={quotationsSent.length}
            href="/admin/tour-requests?status=QUOTATION_SENT"
          />
        </div>
      </section>

      {/* =====================================================
          BOOKING OPERATIONS
      ===================================================== */}

      <section className="mt-10">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Operations
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Booking lifecycle
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Monitor confirmed, active, completed and cancelled tours.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatusCard
            title="Confirmed"
            value={confirmedBookings.length}
            icon={CalendarCheck2}
            href="/admin/bookings?status=CONFIRMED"
          />

          <StatusCard
            title="In progress"
            value={inProgressBookings.length}
            icon={Route}
            href="/admin/bookings?status=IN_PROGRESS"
          />

          <StatusCard
            title="Completed"
            value={completedBookings.length}
            icon={CheckCircle2}
            href="/admin/bookings?status=COMPLETED"
          />

          <StatusCard
            title="Cancelled"
            value={cancelledBookings.length}
            icon={Clock3}
            href="/admin/bookings?status=CANCELLED"
          />
        </div>
      </section>

      {/* =====================================================
          RESOURCE OVERVIEW
      ===================================================== */}

      <section className="mt-10">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Resources
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Packages & guides
          </h2>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                    <Package className="size-5" />
                  </div>

                  <h3 className="mt-4 text-lg font-semibold">
                    Travel packages
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Manage the packages shown to travelers.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-3xl font-bold">{packages.length}</p>

                  <p className="mt-1 text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <ResourceStat label="Active" value={activePackages.length} />

                <ResourceStat
                  label="Inactive"
                  value={inactivePackages.length}
                />
              </div>

              <Link
                href="/admin/packages"
                className={`${buttonVariants({
                  variant: "outline",
                })} mt-5 w-full`}
              >
                Manage packages
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
                    <Users className="size-5" />
                  </div>

                  <h3 className="mt-4 text-lg font-semibold">Tour guides</h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Monitor guide availability and profiles.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-3xl font-bold">{guides.length}</p>

                  <p className="mt-1 text-xs text-muted-foreground">Total</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <ResourceStat
                  label="Available"
                  value={availableGuides.length}
                />

                <ResourceStat
                  label="Unavailable"
                  value={unavailableGuides.length}
                />
              </div>

              <Link
                href="/admin/guides"
                className={`${buttonVariants({
                  variant: "outline",
                })} mt-5 w-full`}
              >
                Manage guides
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* =====================================================
          RECENT ACTIVITY
      ===================================================== */}

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        {/* Recent requests */}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Recent tour requests</CardTitle>

                <p className="mt-1 text-sm text-muted-foreground">
                  Latest traveler inquiries.
                </p>
              </div>

              <Link
                href="/admin/tour-requests"
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                })}
              >
                View all
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            {recentRequests.length > 0 ? (
              <div className="divide-y">
                {recentRequests.map((request) => (
                  <RecentRequest key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <EmptyMessage message="No tour requests have been submitted yet." />
            )}
          </CardContent>
        </Card>

        {/* Recent bookings */}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Recent bookings</CardTitle>

                <p className="mt-1 text-sm text-muted-foreground">
                  Latest confirmed traveler trips.
                </p>
              </div>

              <Link
                href="/admin/bookings"
                className={buttonVariants({
                  variant: "ghost",
                  size: "sm",
                })}
              >
                View all
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            {recentBookings.length > 0 ? (
              <div className="divide-y">
                {recentBookings.map((booking) => (
                  <RecentBooking key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <EmptyMessage message="No bookings have been created yet." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* =====================================================
          QUICK ACTIONS
      ===================================================== */}

      <section className="mt-10">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                href="/admin/tour-requests"
                title="Tour requests"
                description="Review traveler requests"
                icon={FileText}
              />

              <QuickAction
                href="/admin/bookings"
                title="Bookings"
                description="Manage confirmed tours"
                icon={CalendarCheck2}
              />

              <QuickAction
                href="/admin/packages"
                title="Packages"
                description="Manage travel packages"
                icon={Package}
              />

              <QuickAction
                href="/admin/guides"
                title="Tour guides"
                description="Manage local guides"
                icon={Users}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

/**
 * =========================================================
 * Metric
 * =========================================================
 */

interface DashboardMetricProps {
  title: string;

  value: number | string;

  description: string;

  icon: typeof FileText;

  href?: string;
}

function DashboardMetric({
  title,
  value,
  description,
  icon: Icon,
  href,
}: DashboardMetricProps) {
  const content = (
    <Card
      className={
        href
          ? "h-full transition-all hover:-translate-y-0.5 hover:shadow-sm"
          : "h-full"
      }
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>

            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          </div>

          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Icon className="size-5" />
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  );
}

/**
 * =========================================================
 * Pipeline
 * =========================================================
 */

function PipelineCard({
  title,
  value,
  href,
}: {
  title: string;

  value: number;

  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>

              <p className="mt-2 text-3xl font-bold">{value}</p>
            </div>

            <ArrowRight className="size-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * =========================================================
 * Booking status
 * =========================================================
 */

function StatusCard({
  title,
  value,
  icon: Icon,
  href,
}: {
  title: string;

  value: number;

  icon: typeof Route;

  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-sm">
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>

            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>

          <Icon className="size-6 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * =========================================================
 * Resource stat
 * =========================================================
 */

function ResourceStat({
  label,
  value,
}: {
  label: string;

  value: number;
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>

      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

/**
 * =========================================================
 * Recent Request
 * =========================================================
 */

function RecentRequest({ request }: { request: AdminTourRequest }) {
  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/admin/tour-requests/${request.id}`}
            className="font-semibold hover:underline"
          >
            {getRequestTitle(request)}
          </Link>

          <p className="mt-1 text-sm text-muted-foreground">
            {getTouristName(request)}
          </p>
        </div>

        <span className="shrink-0 rounded-full border px-3 py-1 text-xs">
          {formatStatus(request.status)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-3.5" />

          {getRequestDestination(request)}
        </span>

        <span>{formatDate(request.createdAt)}</span>
      </div>
    </div>
  );
}

/**
 * =========================================================
 * Recent Booking
 * =========================================================
 */

function RecentBooking({ booking }: { booking: Booking }) {
  const touristName = `${booking.tourist.firstName} ${booking.tourist.lastName}`;

  return (
    <div className="py-5 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/admin/bookings/${booking.id}`}
            className="font-semibold hover:underline"
          >
            {booking.quotation.title}
          </Link>

          <p className="mt-1 text-sm text-muted-foreground">{touristName}</p>
        </div>

        <span className="shrink-0 rounded-full border px-3 py-1 text-xs">
          {formatStatus(booking.status)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span>
          {formatDate(booking.startDate)}

          {" → "}

          {formatDate(booking.endDate)}
        </span>

        <span className="flex items-center gap-1">
          <Banknote className="size-3.5" />
          {booking.currency} {booking.totalAmount}
        </span>
      </div>
    </div>
  );
}

/**
 * =========================================================
 * Quick Action
 * =========================================================
 */

function QuickAction({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;

  title: string;

  description: string;

  icon: typeof WalletCards;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border p-4 transition hover:bg-muted/40"
    >
      <Icon className="size-5 text-muted-foreground transition group-hover:text-foreground" />

      <p className="mt-3 font-semibold">{title}</p>

      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

/**
 * =========================================================
 * Empty state
 * =========================================================
 */

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}