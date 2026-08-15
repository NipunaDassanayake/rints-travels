"use client";

import Link from "next/link";

import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import {
  ArrowLeft,
  CalendarDays,
  Circle,
  CircleCheck,
  Hotel,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Users,
  Wallet,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getTourRequestById } from "@/features/tour-requests/tour-request.api";

import { getTourRequestQuotations } from "@/features/quotations/quotation.api";

import type { TourRequestStatus } from "@/features/tour-requests/tour-request.types";

const STATUS_ORDER: TourRequestStatus[] = [
  "PENDING_REVIEW",
  "UNDER_DISCUSSION",
  "READY_FOR_QUOTATION",
  "QUOTATION_SENT",
  "ACCEPTED",
  "BOOKED",
];

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Flexible";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function getProgressIndex(status: TourRequestStatus) {
  return STATUS_ORDER.indexOf(status);
}

export default function TourRequestDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

  const requestId = params.id;

  const {
    data: request,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tour-request", requestId],

    queryFn: () => getTourRequestById(requestId),

    enabled: Boolean(requestId),
  });

  const {
    data: quotations,
    isLoading: areQuotationsLoading,
    isError: areQuotationsError,
  } = useQuery({
    queryKey: ["tour-request", requestId, "quotations"],

    queryFn: () => getTourRequestQuotations(requestId),

    enabled: Boolean(requestId),
  });

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (isError || !request) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">Unable to load request</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            The request could not be loaded or you may not have permission to
            view it.
          </p>

          <Link
            href="/tourist"
            className={`${buttonVariants({
              variant: "outline",
            })} mt-5`}
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const title =
    request.travelPackage?.title ?? request.title ?? "Custom Tour Request";

  const destination =
    request.travelPackage?.destination ??
    request.destinationPreferences ??
    "Not specified";

  const progressIndex = getProgressIndex(request.status);

  const isTerminalStatus =
    request.status === "REJECTED" || request.status === "CANCELLED";

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

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              {request.requestType === "PACKAGE_BASED"
                ? "Package Based Request"
                : "Custom Tour Request"}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Request ID: {request.id}
            </p>
          </div>

          <span className="rounded-full border px-4 py-2 text-sm font-medium">
            {formatStatus(request.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Travel details</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <MapPin className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">Destination</p>

                    <p className="mt-1 font-medium">{destination}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CalendarDays className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Travel dates
                    </p>

                    <p className="mt-1 font-medium">
                      {formatDate(request.preferredStartDate)}

                      {" → "}

                      {formatDate(request.preferredEndDate)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Users className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">Travelers</p>

                    <p className="mt-1 font-medium">
                      {request.adultCount} adult
                      {request.adultCount !== 1 ? "s" : ""}
                      {" · "}
                      {request.childCount} child
                      {request.childCount !== 1 ? "ren" : ""}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Wallet className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>

                    <p className="mt-1 font-medium">
                      {request.budget
                        ? `${request.currency} ${request.budget}`
                        : "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <Hotel className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Hotel preference
                    </p>

                    <p className="mt-1 font-medium">
                      {request.hotelPreference || "Not specified"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Transport preference
                  </p>

                  <p className="mt-1 font-medium">
                    {request.transportPreference || "Not specified"}
                  </p>
                </div>

                <div className="flex gap-3">
                  <MessageCircle className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Contact method
                    </p>

                    <p className="mt-1 font-medium">
                      {request.contactMethod
                        ? formatStatus(request.contactMethod)
                        : "Not specified"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Preferred guide
                  </p>

                  <p className="mt-1 font-medium">
                    {request.preferredGuideId ? "Selected" : "No preference"}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t pt-6">
                <p className="text-sm text-muted-foreground">
                  Special requirements
                </p>

                <p className="mt-2 leading-7">
                  {request.specialRequirements ||
                    "No special requirements provided."}
                </p>
              </div>
            </CardContent>
          </Card>

          {request.requestType === "CUSTOM" && (
            <Card>
              <CardHeader>
                <CardTitle>Custom trip details</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Destination preferences
                </p>

                <p className="mt-2 leading-7">
                  {request.destinationPreferences || "Not specified"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request progress</CardTitle>
            </CardHeader>

            <CardContent>
              {isTerminalStatus ? (
                <div className="rounded-xl border p-4">
                  <p className="font-medium">{formatStatus(request.status)}</p>

                  <p className="mt-2 text-sm text-muted-foreground">
                    This request is no longer progressing through the standard
                    booking flow.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {STATUS_ORDER.map((status, index) => {
                    const completed = index <= progressIndex;

                    return (
                      <div key={status} className="flex gap-3">
                        {completed ? (
                          <CircleCheck className="mt-0.5 size-5 shrink-0" />
                        ) : (
                          <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                        )}

                        <div>
                          <p
                            className={
                              completed
                                ? "font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {formatStatus(status)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quotations</CardTitle>
            </CardHeader>

            <CardContent>
              {areQuotationsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Loading quotations...
                </div>
              ) : areQuotationsError ? (
                <p className="text-sm text-destructive">
                  Unable to load quotations.
                </p>
              ) : quotations && quotations.length > 0 ? (
                <div className="space-y-4">
                  {quotations.map((quotation) => (
                    <div key={quotation.id} className="rounded-xl border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {quotation.quotationNumber}
                          </p>

                          <h3 className="mt-1 font-semibold">
                            {quotation.title}
                          </h3>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Revision {quotation.revisionNumber}
                          </p>
                        </div>

                        <span className="rounded-full border px-3 py-1 text-xs font-medium">
                          {formatStatus(quotation.status)}
                        </span>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">Total</p>

                        <p className="text-2xl font-bold">
                          {quotation.currency} {quotation.totalAmount}
                        </p>
                      </div>

                      <Link
                        href={`/tourist/quotations/${quotation.id}`}
                        className={`${buttonVariants({
                          variant: "outline",
                        })} mt-4 w-full`}
                      >
                        View quotation
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  No quotations have been received for this request yet.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
