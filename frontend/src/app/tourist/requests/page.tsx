"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import {
  CalendarDays,
  FileText,
  LoaderCircle,
  MapPin,
  Plus,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import { getMyTourRequests } from "@/features/tour-requests/tour-request.api";

import type { TourRequest } from "@/features/tour-requests/tour-request.types";

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

function getRequestTitle(request: TourRequest) {
  if (request.requestType === "PACKAGE_BASED") {
    return request.travelPackage?.title ?? "Package based request";
  }

  return request.title ?? "Custom tour request";
}

function getDestination(request: TourRequest) {
  return (
    request.destinationPreferences ||
    request.travelPackage?.destination ||
    "Not specified"
  );
}

/**
 * =========================================================
 * Tourist Requests Page
 * =========================================================
 */

export default function TouristRequestsPage() {
  const {
    data: requests = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["tour-requests", "me"],

    queryFn: getMyTourRequests,
  });

  /**
   * =======================================================
   * Loading
   * =======================================================
   */

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  /**
   * =======================================================
   * Error
   * =======================================================
   */

  if (isError) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">
            Unable to load your requests
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Your tour requests could not be retrieved.
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

  /**
   * =======================================================
   * Summary Statistics
   * =======================================================
   */

  const pendingCount = requests.filter(
    (request) => request.status === "PENDING_REVIEW",
  ).length;

  const discussionCount = requests.filter(
    (request) => request.status === "UNDER_DISCUSSION",
  ).length;

  const quotationCount = requests.filter(
    (request) =>
      request.status === "READY_FOR_QUOTATION" ||
      request.status === "QUOTATION_SENT",
  ).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-wrap items-end justify-between gap-5 sm:gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary sm:text-sm">
            My journeys
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Tour requests
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Track your trip requests, discussions and quotation progress.
          </p>
        </div>

        <Link href="/tourist/requests/new" className={buttonVariants()}>
          <Plus className="size-4" />
          Plan a new trip
        </Link>
      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <section className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4">
        <SummaryCard
          title="Total requests"
          value={requests.length}
          icon={FileText}
        />

        <SummaryCard
          title="Pending review"
          value={pendingCount}
          icon={FileText}
        />

        <SummaryCard
          title="Under discussion"
          value={discussionCount}
          icon={UserRound}
        />

        <SummaryCard
          title="Quotation stage"
          value={quotationCount}
          icon={Wallet}
        />
      </section>

      {/* =====================================================
          REQUESTS
      ===================================================== */}

      <section className="mt-8 sm:mt-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Your requests
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            View the latest status and details for every journey you have
            requested.
          </p>
        </div>

        {requests.length > 0 ? (
          <div className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed p-8 text-center sm:p-12">
            <FileText className="mx-auto size-8 text-muted-foreground sm:size-9" />

            <h3 className="mt-4 font-semibold">No tour requests yet</h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Start planning your Sri Lanka journey and our travel team will
              prepare a personalized quotation.
            </p>

            <Link
              href="/tourist/requests/new"
              className={`${buttonVariants()} mt-6`}
            >
              <Plus className="size-4" />
              Plan your first trip
            </Link>
          </div>
        )}
      </section>
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
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof FileText;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-[105px] items-center justify-between gap-2 p-3.5 sm:min-h-0 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs leading-4 text-muted-foreground sm:text-sm">
            {title}
          </p>

          <p className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">{value}</p>
        </div>

        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted sm:size-11 sm:rounded-xl">
          <Icon className="size-4 sm:size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * =========================================================
 * Request Card
 * =========================================================
 */

function RequestCard({ request }: { request: TourRequest }) {
  const destination = getDestination(request);

  return (
    <Card>
      {/* ===================================================
          REQUEST HEADER
      =================================================== */}

      <CardHeader className="border-b p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-xs sm:tracking-[0.16em]">
              {request.requestType === "PACKAGE_BASED"
                ? "Package based"
                : "Custom request"}
            </p>

            <CardTitle className="mt-2 text-lg sm:text-xl">
              {getRequestTitle(request)}
            </CardTitle>

            <p className="mt-2 break-all text-[11px] leading-5 text-muted-foreground sm:text-xs">
              Request ID: {request.id}
            </p>
          </div>

          <span className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium">
            {formatStatus(request.status)}
          </span>
        </div>
      </CardHeader>

      {/* ===================================================
          REQUEST DETAILS
      =================================================== */}

      <CardContent className="p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {/* Destination */}

          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Destination</p>

              <p className="mt-1 break-words text-sm font-medium">
                {destination}
              </p>
            </div>
          </div>

          {/* Travel dates */}

          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Travel dates</p>

              <p className="mt-1 text-sm font-medium">
                {formatDate(request.preferredStartDate)}

                {request.preferredEndDate && (
                  <>
                    {" → "}

                    {formatDate(request.preferredEndDate)}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Travelers */}

          <div className="flex gap-3">
            <Users className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Travelers</p>

              <p className="mt-1 text-sm font-medium">
                {request.adultCount} adult
                {request.adultCount !== 1 ? "s" : ""}
                {" · "}
                {request.childCount} child
                {request.childCount !== 1 ? "ren" : ""}
              </p>
            </div>
          </div>

          {/* Budget */}

          <div className="flex gap-3">
            <Wallet className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Budget</p>

              <p className="mt-1 text-sm font-medium">
                {request.budget
                  ? `${request.currency} ${request.budget}`
                  : "Not specified"}
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            REQUEST FOOTER
        ================================================= */}

        <div className="mt-5 flex flex-col gap-4 border-t pt-4 sm:mt-6 sm:flex-row sm:items-center sm:justify-between sm:pt-5">
          <p className="text-xs text-muted-foreground">
            Submitted {formatDate(request.createdAt)}
          </p>

          <Link
            href={`/tourist/requests/${request.id}`}
            className={`${buttonVariants({
              variant: "outline",
            })} w-full sm:w-auto`}
          >
            View request
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}