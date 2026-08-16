"use client";

import Image from "next/image";
import Link from "next/link";

import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Circle,
  CircleCheck,
  Clock3,
  Hotel,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Route,
  Users,
  Wallet,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getPackageImageUrl } from "@/features/packages/admin-package.api";

import { getPackageBySlug } from "@/features/packages/package.api";

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

  const packageSlug =
    request?.requestType === "PACKAGE_BASED"
      ? request.travelPackage?.slug
      : undefined;

  const { data: fullPackage, isLoading: isPackageLoading } = useQuery({
    queryKey: ["tour-request", requestId, "package", packageSlug],

    queryFn: () => getPackageBySlug(packageSlug!),

    enabled: Boolean(packageSlug),
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

  const packagePrimaryImage = fullPackage
    ? (fullPackage.images.find((image) => image.isPrimary) ??
      fullPackage.images[0])
    : null;

  const packageImageUrl = packagePrimaryImage
    ? getPackageImageUrl(packagePrimaryImage.imageUrl)
    : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-8">
        <Link
          href="/tourist"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary">
              {request.requestType === "PACKAGE_BASED"
                ? "Package Based Request"
                : "Custom Tour Request"}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {request.status === "PENDING_REVIEW"
                ? "Your request has been submitted and is waiting for our travel team to review it."
                : request.status === "UNDER_DISCUSSION"
                  ? "Our team is currently reviewing and discussing your travel requirements."
                  : request.status === "READY_FOR_QUOTATION"
                    ? "Your travel requirements are ready for quotation preparation."
                    : request.status === "QUOTATION_SENT"
                      ? "A quotation has been prepared for your request."
                      : request.status === "ACCEPTED"
                        ? "Your quotation has been accepted and the booking process can continue."
                        : request.status === "BOOKED"
                          ? "Your journey has been booked."
                          : isTerminalStatus
                            ? "This request is no longer progressing through the standard booking process."
                            : "Track the progress of your travel request here."}
            </p>

            <p className="mt-2 text-xs text-muted-foreground">
              Request ID: {request.id}
            </p>
          </div>

          <span className="rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-sm">
            {formatStatus(request.status)}
          </span>
        </div>
      </div>

      {/* =====================================================
          PACKAGE PREVIEW
      ===================================================== */}

      {request.requestType === "PACKAGE_BASED" && request.travelPackage && (
        <section className="mb-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="grid md:grid-cols-[300px_1fr]">
            <div className="relative min-h-[220px] bg-muted">
              {isPackageLoading ? (
                <div className="flex size-full min-h-[220px] items-center justify-center">
                  <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : packagePrimaryImage && packageImageUrl ? (
                <Image
                  src={packageImageUrl}
                  alt={
                    packagePrimaryImage.altText ?? request.travelPackage.title
                  }
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 300px"
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full min-h-[220px] items-center justify-center p-6 text-sm text-muted-foreground">
                  No package image available
                </div>
              )}
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Your selected journey
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                {request.travelPackage.title}
              </h2>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" />

                  {request.travelPackage.destination}
                </span>

                <span className="flex items-center gap-1.5">
                  <Clock3 className="size-4" />
                  {request.travelPackage.durationDays}{" "}
                  {request.travelPackage.durationDays === 1 ? "day" : "days"}
                </span>
              </div>

              <p className="mt-4 line-clamp-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {request.travelPackage.description}
              </p>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t pt-5">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Starting package price
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    ${request.travelPackage.price}
                  </p>
                </div>

                <Link
                  href={`/packages/${request.travelPackage.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold"
                >
                  View original package
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Travel details */}

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

          {/* Preferences */}

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

                <div className="flex gap-3">
                  <Route className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Transport preference
                    </p>

                    <p className="mt-1 font-medium">
                      {request.transportPreference || "Not specified"}
                    </p>
                  </div>
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
                    {request.preferredGuide
                      ? `${request.preferredGuide.user.firstName} ${request.preferredGuide.user.lastName}`
                      : request.preferredGuideId
                        ? "Selected"
                        : "No preference"}
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

          {/* Custom request */}

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

        {/* =====================================================
            SIDEBAR
        ===================================================== */}

        <aside className="space-y-6">
          {/* Progress */}

          <Card>
            <CardHeader>
              <CardTitle>Request progress</CardTitle>
            </CardHeader>

            <CardContent>
              {isTerminalStatus ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="font-medium">{formatStatus(request.status)}</p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    This request is no longer progressing through the standard
                    booking flow.
                  </p>
                </div>
              ) : (
                <div>
                  {STATUS_ORDER.map((status, index) => {
                    const completed = index <= progressIndex;

                    const current = index === progressIndex;

                    const isLast = index === STATUS_ORDER.length - 1;

                    return (
                      <div
                        key={status}
                        className="relative flex gap-3 pb-6 last:pb-0"
                      >
                        {!isLast && (
                          <div
                            className={`absolute left-[9px] top-5 h-[calc(100%-4px)] w-px ${
                              index < progressIndex
                                ? "bg-foreground"
                                : "bg-border"
                            }`}
                          />
                        )}

                        <div className="relative z-10 bg-background">
                          {completed ? (
                            <CircleCheck
                              className={`size-5 shrink-0 ${
                                current ? "text-primary" : ""
                              }`}
                            />
                          ) : (
                            <Circle className="size-5 shrink-0 text-muted-foreground" />
                          )}
                        </div>

                        <div className="-mt-0.5">
                          <p
                            className={
                              completed
                                ? "font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {formatStatus(status)}
                          </p>

                          {current && (
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              Current stage
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quotations */}

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
                <div className="rounded-xl border border-dashed p-4">
                  <p className="font-medium">No quotation yet</p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Once our travel team reviews your request and prepares a
                    quotation, it will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}