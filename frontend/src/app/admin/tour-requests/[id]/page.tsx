"use client";

import Image from "next/image";
import Link from "next/link";

import { useParams } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Circle,
  CircleCheck,
  Clock3,
  Hotel,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Route,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button, buttonVariants } from "@/components/ui/button";

import { getPackageImageUrl } from "@/features/packages/admin-package.api";

import { getPackageBySlug } from "@/features/packages/package.api";

import { getTourRequestById } from "@/features/tour-requests/tour-request.api";

import { updateTourRequestStatus } from "@/features/tour-requests/admin-tour-request.api";

import { getTourRequestQuotations } from "@/features/quotations/quotation.api";

import { AdminQuotationCard } from "@/features/quotations/components/admin-quotation-card";

import { CreateQuotationForm } from "@/features/quotations/components/create-quotation-form";

import { AdminEditTourRequestDialog } from "@/features/tour-requests/components/admin-edit-tour-request-dialog";

import type { TourRequestStatus } from "@/features/tour-requests/tour-request.types";

/**
 * =========================================================
 * Request workflow
 * =========================================================
 */

const STATUS_ORDER: TourRequestStatus[] = [
  "PENDING_REVIEW",
  "UNDER_DISCUSSION",
  "READY_FOR_QUOTATION",
  "QUOTATION_SENT",
  "ACCEPTED",
  "BOOKED",
];

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

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getProgressIndex(status: TourRequestStatus) {
  return STATUS_ORDER.indexOf(status);
}

export default function AdminTourRequestDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

  const requestId = params.id;

  const queryClient = useQueryClient();

  /**
   * =========================================================
   * Request
   * =========================================================
   */

  const {
    data: request,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "tour-request", requestId],

    queryFn: () => getTourRequestById(requestId),

    enabled: Boolean(requestId),
  });

  /**
   * =========================================================
   * Quotations
   * =========================================================
   */

  const {
    data: quotations,
    isLoading: areQuotationsLoading,
    isError: areQuotationsError,
  } = useQuery({
    queryKey: ["tour-request", requestId, "quotations"],

    queryFn: () => getTourRequestQuotations(requestId),

    enabled: Boolean(requestId),
  });

  /**
   * =========================================================
   * Related package
   * =========================================================
   */

  const packageSlug =
    request?.requestType === "PACKAGE_BASED"
      ? request.travelPackage?.slug
      : undefined;

  const { data: fullPackage, isLoading: isPackageLoading } = useQuery({
    queryKey: ["admin", "tour-request", requestId, "package", packageSlug],

    queryFn: () => getPackageBySlug(packageSlug!),

    enabled: Boolean(packageSlug),
  });

  /**
   * =========================================================
   * Status update
   * =========================================================
   */

  const statusMutation = useMutation({
    mutationFn: (status: TourRequestStatus) =>
      updateTourRequestStatus(requestId, status),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "tour-request", requestId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["admin", "tour-requests"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["tour-request", requestId],
      });
    },
  });

  /**
   * =========================================================
   * Loading
   * =========================================================
   */

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  /**
   * =========================================================
   * Error
   * =========================================================
   */

  if (isError || !request) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">Unable to load request</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            The request could not be loaded.
          </p>

          <Link
            href="/admin/tour-requests"
            className={`${buttonVariants({
              variant: "outline",
            })} mt-5`}
          >
            Back to tour requests
          </Link>
        </div>
      </main>
    );
  }

  /**
   * =========================================================
   * Derived values
   * =========================================================
   */

  const title =
    request.travelPackage?.title ?? request.title ?? "Custom Tour Request";

  const destination =
    request.travelPackage?.destination ??
    request.destinationPreferences ??
    "Not specified";

  const tourist = request.tourist;

  const preferredGuide = request.preferredGuide;

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
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="mb-8">
        <Link
          href="/admin/tour-requests"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to tour requests
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

            <p className="mt-2 text-sm text-muted-foreground">
              Review the traveler&apos;s requirements, manage the request
              workflow and prepare quotations.
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
          SELECTED PACKAGE
      ===================================================== */}

      {request.requestType === "PACKAGE_BASED" && request.travelPackage && (
        <section className="mb-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="grid md:grid-cols-[300px_1fr]">
            {/* Package image */}

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

            {/* Package information */}

            <div className="flex flex-col justify-center p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Selected package
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

              <p className="mt-4 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
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
                  View package
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          MAIN WORKSPACE
      ===================================================== */}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ===================================================
            LEFT
        =================================================== */}

        <div className="space-y-6">
          {/* Tourist details */}

          <Card>
            <CardHeader>
              <CardTitle>Tourist details</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <UserRound className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>

                    <p className="mt-1 font-medium">
                      {tourist
                        ? `${tourist.firstName} ${tourist.lastName}`
                        : "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Mail className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>

                    <p className="mt-1 font-medium">
                      {tourist?.email ?? "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Phone className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>

                    <p className="mt-1 font-medium">
                      {tourist?.phone ?? "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <MessageCircle className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Preferred contact method
                    </p>

                    <p className="mt-1 font-medium">
                      {request.contactMethod
                        ? formatStatus(request.contactMethod)
                        : "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

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

                <div>
                  <p className="text-sm text-muted-foreground">
                    Preferred guide
                  </p>

                  <p className="mt-1 font-medium">
                    {preferredGuide
                      ? `${preferredGuide.user.firstName} ${preferredGuide.user.lastName}`
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

          {/* Custom trip */}

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

          {/* =================================================
              QUOTATIONS
          ================================================= */}

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
                    <AdminQuotationCard
                      key={quotation.id}
                      quotation={quotation}
                      requestId={requestId}
                    />
                  ))}
                </div>
              ) : request.status === "READY_FOR_QUOTATION" ? (
                <CreateQuotationForm request={request} requestId={requestId} />
              ) : (
                <div className="rounded-xl border border-dashed p-5">
                  <p className="font-medium">No quotations yet</p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Move this request to Ready for Quotation before preparing
                    the first quotation.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ===================================================
            RIGHT SIDEBAR
        =================================================== */}

        <aside className="space-y-6">
          {/* =================================================
              REQUEST WORKFLOW
          ================================================= */}

          <Card>
            <CardHeader>
              <CardTitle>Request workflow</CardTitle>
            </CardHeader>

            <CardContent>
              {isTerminalStatus ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="font-medium">{formatStatus(request.status)}</p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    This request is no longer progressing through the normal
                    booking workflow.
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
                        {/* Connecting line */}

                        {!isLast && (
                          <div
                            className={`absolute left-[9px] top-5 h-[calc(100%-4px)] w-px ${
                              index < progressIndex
                                ? "bg-foreground"
                                : "bg-border"
                            }`}
                          />
                        )}

                        {/* Status icon */}

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

                        {/* Status */}

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
                            <p className="mt-1 text-xs text-muted-foreground">
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

          {/* =================================================
              REQUEST MANAGEMENT
          ================================================= */}

          <Card>
            <CardHeader>
              <CardTitle>Request management</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Current status</p>

                <p className="mt-1 font-medium">
                  {formatStatus(request.status)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Assigned admin</p>

                <p className="mt-1 font-medium">
                  {request.assignedAdminId ? "Assigned" : "Not assigned"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>

                <p className="mt-1 font-medium">
                  {formatDate(request.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* =================================================
              ADMIN ACTIONS
          ================================================= */}

          <Card>
            <CardHeader>
              <CardTitle>Admin actions</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* PENDING */}

              {request.status === "PENDING_REVIEW" && (
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Review the tourist&apos;s submitted information before
                    beginning discussions.
                  </p>

                  <Button
                    className="w-full"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("UNDER_DISCUSSION")}
                  >
                    {statusMutation.isPending
                      ? "Starting discussion..."
                      : "Start discussion"}
                  </Button>
                </div>
              )}

              {/* UNDER DISCUSSION */}

              {request.status === "UNDER_DISCUSSION" && (
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Review and edit the tourist&apos;s requirements before
                    preparing the quotation.
                  </p>

                  <AdminEditTourRequestDialog
                    request={request}
                    requestId={requestId}
                  />

                  <Button
                    className="w-full"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("READY_FOR_QUOTATION")}
                  >
                    {statusMutation.isPending
                      ? "Updating..."
                      : "Mark ready for quotation"}
                  </Button>
                </div>
              )}

              {/* READY */}

              {request.status === "READY_FOR_QUOTATION" && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="font-medium">Ready for quotation</p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Prepare the quotation using the Quotations section on this
                    page.
                  </p>
                </div>
              )}

              {/* SENT */}

              {request.status === "QUOTATION_SENT" && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="font-medium">Waiting for tourist</p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    The quotation has been sent and is waiting for the
                    tourist&apos;s response.
                  </p>
                </div>
              )}

              {/* ACCEPTED */}

              {request.status === "ACCEPTED" && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="font-medium">Quotation accepted</p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    The tourist accepted the quotation. Continue to the payment
                    and booking stage.
                  </p>
                </div>
              )}

              {/* REJECTED */}

              {request.status === "REJECTED" && (
                <p className="text-sm leading-6 text-muted-foreground">
                  This request or quotation has been rejected.
                </p>
              )}

              {/* CANCELLED */}

              {request.status === "CANCELLED" && (
                <p className="text-sm leading-6 text-muted-foreground">
                  This request has been cancelled.
                </p>
              )}

              {/* BOOKED */}

              {request.status === "BOOKED" && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="font-medium">Booking completed</p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    This request has completed the quotation and payment process
                    and is now booked.
                  </p>
                </div>
              )}

              {/* Mutation error */}

              {statusMutation.isError && (
                <p className="text-sm text-destructive">
                  Unable to update the request status.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}