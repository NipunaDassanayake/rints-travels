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

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  buttonVariants,
} from "@/components/ui/button";

import {
  getMyTourRequests,
} from "@/features/tour-requests/tour-request.api";

import type {
  TourRequest,
} from "@/features/tour-requests/tour-request.types";

function formatDate(
  value: string | null | undefined,
) {
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
    .replace(
      /\b\w/g,
      (char) => char.toUpperCase(),
    );
}

function getRequestTitle(
  request: TourRequest,
) {
  if (
    request.requestType ===
    "PACKAGE_BASED"
  ) {
    return (
      request.travelPackage?.title ??
      "Package based request"
    );
  }

  return (
    request.title ??
    "Custom tour request"
  );
}

function getDestination(
  request: TourRequest,
) {
  return (
    request.destinationPreferences ||
    request.travelPackage?.destination ||
    "Not specified"
  );
}

export default function TouristRequestsPage() {
  const {
    data: requests = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "tour-requests",
      "me",
    ],

    queryFn: getMyTourRequests,
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

  const pendingCount =
    requests.filter(
      (request) =>
        request.status ===
        "PENDING_REVIEW",
    ).length;

  const discussionCount =
    requests.filter(
      (request) =>
        request.status ===
        "UNDER_DISCUSSION",
    ).length;

  const quotationCount =
    requests.filter(
      (request) =>
        request.status ===
          "READY_FOR_QUOTATION" ||
        request.status ===
          "QUOTATION_SENT",
    ).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            My journeys
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Tour requests
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            Track your trip requests, discussions and quotation progress.
          </p>
        </div>

        <Link
          href="/tourist/requests/new"
          className={buttonVariants()}
        >
          <Plus className="size-4" />
          Plan a new trip
        </Link>
      </div>

      {/* Summary */}

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Requests */}

      <section className="mt-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Your requests
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            View the latest status and details for every journey you have
            requested.
          </p>
        </div>

        {requests.length > 0 ? (
          <div className="mt-6 space-y-5">
            {requests.map(
              (request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                />
              ),
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed p-12 text-center">
            <FileText className="mx-auto size-9 text-muted-foreground" />

            <h3 className="mt-4 font-semibold">
              No tour requests yet
            </h3>

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
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold">
            {value}
          </p>
        </div>

        <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function RequestCard({
  request,
}: {
  request: TourRequest;
}) {
  const destination =
    getDestination(request);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {request.requestType ===
              "PACKAGE_BASED"
                ? "Package based"
                : "Custom request"}
            </p>

            <CardTitle className="mt-2 text-xl">
              {getRequestTitle(request)}
            </CardTitle>

            <p className="mt-2 text-xs text-muted-foreground">
              Request ID: {request.id}
            </p>
          </div>

          <span className="rounded-full border px-3 py-1 text-xs font-medium">
            {formatStatus(
              request.status,
            )}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">
                Destination
              </p>

              <p className="mt-1 text-sm font-medium">
                {destination}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">
                Travel dates
              </p>

              <p className="mt-1 text-sm font-medium">
                {formatDate(
                  request.preferredStartDate,
                )}

                {request.preferredEndDate && (
                  <>
                    {" → "}

                    {formatDate(
                      request.preferredEndDate,
                    )}
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Users className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">
                Travelers
              </p>

              <p className="mt-1 text-sm font-medium">
                {request.adultCount} adult
                {request.adultCount !== 1
                  ? "s"
                  : ""}

                {" · "}

                {request.childCount} child
                {request.childCount !== 1
                  ? "ren"
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Wallet className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">
                Budget
              </p>

              <p className="mt-1 text-sm font-medium">
                {request.budget
                  ? `${request.currency} ${request.budget}`
                  : "Not specified"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
          <p className="text-xs text-muted-foreground">
            Submitted{" "}
            {formatDate(
              request.createdAt,
            )}
          </p>

          <Link
            href={`/tourist/requests/${request.id}`}
            className={buttonVariants({
              variant: "outline",
            })}
          >
            View request
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}