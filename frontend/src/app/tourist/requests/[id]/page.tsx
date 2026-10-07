"use client";

import Image from "next/image";
import Link from "next/link";

import { useParams } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Circle,
  CircleCheck,
  Clock3,
  Hotel,
  MapPin,
  MessageCircle,
  Route,
  Users,
  Wallet,
} from "lucide-react";

import { ErrorState } from "@/components/patterns/error-state";

import { LoadingState } from "@/components/patterns/loading-state";

import { StatusBadge } from "@/components/patterns/status-badge";

import { buttonVariants } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { isQuotationExpired, type Journey } from "@/features/journeys/journey";

import { useTravelerJourneys } from "@/features/journeys/use-traveler-journeys";

import { getPackageImageUrl } from "@/features/packages/admin-package.api";

import { getPackageBySlug } from "@/features/packages/package.api";

import {
  cancelTourRequest,
  getTourRequestById,
} from "@/features/tour-requests/tour-request.api";

import { getTourRequestQuotations } from "@/features/quotations/quotation.api";

import {
  CANCELLABLE_TOUR_REQUEST_STATUSES,
  type TourRequest,
  type TourRequestStatus,
} from "@/features/tour-requests/tour-request.types";

import { formatDate, formatMoney, formatStatusLabel, formatUsdPrice } from "@/lib/format";

import type { StatusEntity } from "@/lib/status";

import { cn } from "@/lib/utils";

const STATUS_ORDER: TourRequestStatus[] = [
  "PENDING_REVIEW",
  "UNDER_DISCUSSION",
  "READY_FOR_QUOTATION",
  "QUOTATION_SENT",
  "ACCEPTED",
  "BOOKED",
];

const CONTACT_METHODS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  PHONE: "Phone",
  EMAIL: "Email",
};

/** Caption under the tracker's last reached step once a booking exists. */
const BOOKING_STAGE: Record<string, string> = {
  CONFIRMED: "Trip confirmed",
  IN_PROGRESS: "Trip underway",
  COMPLETED: "Trip completed",
};

function formatTravelDate(value: string | null) {
  return formatDate(value, { fallback: "Flexible" });
}

function getProgressIndex(status: TourRequestStatus) {
  return STATUS_ORDER.indexOf(status);
}

/**
 * The line under the title. Once a booking exists it speaks for the
 * trip (CR-030 Stage 6): cancelling a booking leaves the request
 * BOOKED, so the request status alone would still read as booked.
 * Without the booking (still loading, or the lists failed) a BOOKED
 * request only states the stage it reached.
 */
function describeRequest(request: TourRequest, journey: Journey | null) {
  const booking = journey?.booking;

  if (booking) {
    switch (booking.status) {
      case "CONFIRMED":
        return "Your trip is confirmed.";
      case "IN_PROGRESS":
        return "Your trip is underway.";
      case "COMPLETED":
        return "Your trip is complete.";
      case "CANCELLED":
        return "This trip's booking was cancelled. This booking is no longer active.";
    }
  }

  if (request.status === "BOOKED") {
    return "This journey reached the booking stage.";
  }

  if (request.status === "QUOTATION_SENT" && journey?.quotationExpired) {
    return "Your quotation has expired. Any updated quotation from Travora will appear here.";
  }

  switch (request.status) {
    case "PENDING_REVIEW":
      return "Your request has been submitted and is waiting for our travel team to review it.";
    case "UNDER_DISCUSSION":
      return "Our team is currently reviewing and discussing your travel requirements.";
    case "READY_FOR_QUOTATION":
      return "Your travel requirements are ready for quotation preparation.";
    case "QUOTATION_SENT":
      return "A quotation has been prepared for your request.";
    case "ACCEPTED":
      return "Your quotation has been accepted and the booking process can continue.";
    case "REJECTED":
    case "CANCELLED":
      return "This request is no longer progressing through the standard booking process.";
    default:
      return "Track the progress of your travel request here.";
  }
}

/** The badge beside the title: the booking once there is one, else the request. */
function headerStatus(
  request: TourRequest,
  journey: Journey | null,
): { entity: StatusEntity; value: string } | null {
  if (journey?.booking) {
    return { entity: "booking", value: journey.booking.status };
  }

  if (request.status === "QUOTATION_SENT" && journey?.quotationExpired) {
    return { entity: "quotation", value: "EXPIRED" };
  }

  // A BOOKED request without its booking cannot say how the trip
  // stands now, so it shows no current-state badge.
  if (request.status === "BOOKED") {
    return null;
  }

  return { entity: "tourRequest", value: request.status };
}

interface NextStep {
  title: string;
  text: string;
  label: string;
  href: string;
  primary: boolean;
}

/**
 * Where to go from the request, from the shared journey model's own
 * action (never a second lifecycle). Payment and checkout stay on
 * the quotation and payment pages; this only links there.
 */
function nextStepFor(journey: Journey): NextStep | null {
  const { booking, action } = journey;

  if (booking) {
    if (action?.kind === "LEAVE_REVIEW") {
      return {
        title: "Next step",
        text: "Your trip is complete. Tell other travelers how it went.",
        label: action.label,
        href: action.href,
        primary: true,
      };
    }

    return {
      title: "Your booking",
      text:
        booking.status === "CANCELLED"
          ? "See the details of the cancelled booking."
          : "See your booking for dates, itinerary and guide details.",
      label: "View booking",
      href: `/tourist/bookings/${booking.id}`,
      primary: false,
    };
  }

  if (!action) {
    return null;
  }

  switch (action.kind) {
    case "REVIEW_QUOTATION":
      return {
        title: "Next step",
        text: "Your quotation is ready. Review it to accept or decline.",
        label: action.label,
        href: action.href,
        primary: true,
      };
    case "PAY":
      return {
        title: "Next step",
        text: "You accepted the quotation. Complete the payment to confirm your booking.",
        label: action.label,
        href: action.href,
        primary: true,
      };
    case "RESUME_PAYMENT":
      return {
        title: "Next step",
        text: "You started a payment. Resume it to confirm your booking.",
        label: action.label,
        href: action.href,
        primary: true,
      };
    case "CHECK_PAYMENT":
      return {
        title: "Your payment",
        text:
          journey.paymentState === "PAID"
            ? "Your payment has been received. Travora is finalizing your booking."
            : "Your payment is being processed.",
        label: action.label,
        href: action.href,
        primary: false,
      };
    default:
      return {
        title: "Your booking",
        text: "See your booking for dates, itinerary and guide details.",
        label: action.label,
        href: action.href,
        primary: false,
      };
  }
}

export default function TourRequestDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

  const requestId = params.id;

  const queryClient = useQueryClient();

  const {
    data: request,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["tour-request", requestId],

    queryFn: () => getTourRequestById(requestId),

    enabled: Boolean(requestId),
  });

  // The quotation, payment, booking and review of this journey, from
  // the same shared lists the dashboard and My journeys use.
  const journeys = useTravelerJourneys();

  const journey = journeys.journeys.find((candidate) => candidate.id === requestId) ?? null;

  const cancelMutation = useMutation({
    mutationFn: () => cancelTourRequest(requestId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["tour-request", requestId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["tour-requests", "me"],
      });
    },
  });

  const {
    data: quotations,
    isLoading: areQuotationsLoading,
    isError: areQuotationsError,
    refetch: refetchQuotations,
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

  const backLink = (
    <Link
      href="/tourist/requests"
      className="inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back to my journeys
    </Link>
  );

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <LoadingState label="Loading your request" className="min-h-[50vh]" />
      </main>
    );
  }

  if (isError || !request) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <ErrorState
          headingLevel="h1"
          title="Unable to load request"
          description="The request could not be loaded or you may not have permission to view it."
          onRetry={() => void refetch()}
        />

        <div className="mt-4 text-center">{backLink}</div>
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

  const booking = journey?.booking ?? null;

  const bookingCancelled = booking?.status === "CANCELLED";

  const status = headerStatus(request, journey);

  const nextStep = journey ? nextStepFor(journey) : null;

  const currentStageCaption = booking
    ? (BOOKING_STAGE[booking.status] ?? "Current stage")
    : request.status === "BOOKED"
      ? "Stage reached"
      : "Current stage";

  const canCancel = CANCELLABLE_TOUR_REQUEST_STATUSES.includes(
    request.status,
  );

  const packagePrice = request.travelPackage
    ? formatUsdPrice(request.travelPackage.price)
    : null;

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
        {backLink}

        <div className="mt-3 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.15em] text-primary">
              {request.requestType === "PACKAGE_BASED"
                ? "Package Based Request"
                : "Custom Tour Request"}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>

            <p
              data-testid="request-summary"
              className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground"
            >
              {describeRequest(request, journey)}
            </p>
          </div>

          {status && <StatusBadge entity={status.entity} status={status.value} />}
        </div>
      </div>

      {/* =====================================================
          NEXT STEP (CR-030 Stage 6)
      ===================================================== */}

      {journeys.isLoading ? (
        <LoadingState
          label="Checking the latest status of this trip"
          className="mb-8 min-h-24 rounded-2xl border bg-card"
        />
      ) : journeys.isError ? (
        <ErrorState
          headingLevel="h2"
          title="We couldn't load this trip's latest status"
          description="Your request details are below. Try again to see its quotation, payment and booking."
          onRetry={journeys.retry}
          className="mb-8 py-6"
        />
      ) : nextStep ? (
        <section
          aria-labelledby="request-next-step"
          data-testid="request-next-step"
          className="mb-8 flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"
        >
          <div className="min-w-0">
            <h2 id="request-next-step" className="text-lg font-semibold">
              {nextStep.title}
            </h2>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">{nextStep.text}</p>
          </div>

          <Link
            href={nextStep.href}
            className={cn(
              buttonVariants({ variant: nextStep.primary ? "default" : "outline" }),
              "w-full shrink-0 sm:w-auto",
            )}
          >
            {nextStep.label}
            <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      ) : null}

      {/* =====================================================
          PACKAGE PREVIEW
      ===================================================== */}

      {request.requestType === "PACKAGE_BASED" && request.travelPackage && (
        <section className="mb-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="grid md:grid-cols-[300px_1fr]">
            <div className="relative min-h-[220px] bg-muted">
              {isPackageLoading ? (
                <LoadingState label="Loading package details" className="min-h-[220px]" />
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
                  <MapPin aria-hidden="true" className="size-4" />

                  {request.travelPackage.destination}
                </span>

                <span className="flex items-center gap-1.5">
                  <Clock3 aria-hidden="true" className="size-4" />
                  {request.travelPackage.durationDays}{" "}
                  {request.travelPackage.durationDays === 1 ? "day" : "days"}
                </span>
              </div>

              <p className="mt-4 line-clamp-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {request.travelPackage.description}
              </p>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t pt-5">
                {packagePrice && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Starting package price
                    </p>

                    <p data-testid="package-price" className="mt-1 text-xl font-bold">
                      {packagePrice}
                    </p>
                  </div>
                )}

                <Link
                  href={`/packages/${request.travelPackage.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold"
                >
                  View original package
                  <ArrowUpRight aria-hidden="true" className="size-4" />
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
                  <MapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">Destination</p>

                    <p className="mt-1 font-medium">{destination}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CalendarDays aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Travel dates
                    </p>

                    <p className="mt-1 font-medium">
                      {formatTravelDate(request.preferredStartDate)}

                      {" → "}

                      {formatTravelDate(request.preferredEndDate)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Users aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />

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
                  <Wallet aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">Budget</p>

                    <p data-testid="request-budget" className="mt-1 font-medium">
                      {request.budget
                        ? formatMoney(request.budget, request.currency)
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
                  <Hotel aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />

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
                  <Route aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />

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
                  <MessageCircle aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Contact method
                    </p>

                    <p className="mt-1 font-medium">
                      {request.contactMethod
                        ? (CONTACT_METHODS[request.contactMethod] ??
                          formatStatusLabel(request.contactMethod))
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
              {bookingCancelled ? (
                <div
                  data-testid="request-booking-cancelled"
                  className="rounded-xl border bg-sand-100 p-4"
                >
                  <p className="font-medium">Booking cancelled</p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    This trip&apos;s booking was cancelled. This booking is no
                    longer active.
                  </p>
                </div>
              ) : isTerminalStatus ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="font-medium">{formatStatusLabel(request.status)}</p>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    This request is no longer progressing through the standard
                    booking flow.
                  </p>
                </div>
              ) : (
                <div data-testid="request-tracker">
                  {STATUS_ORDER.map((step, index) => {
                    const completed = index <= progressIndex;

                    const current = index === progressIndex;

                    const isLast = index === STATUS_ORDER.length - 1;

                    return (
                      <div
                        key={step}
                        className="relative flex gap-3 pb-6 last:pb-0"
                      >
                        {!isLast && (
                          <div
                            aria-hidden="true"
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
                              aria-hidden="true"
                              className={`size-5 shrink-0 ${
                                current ? "text-primary" : ""
                              }`}
                            />
                          ) : (
                            <Circle aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
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
                            {formatStatusLabel(step)}
                          </p>

                          {current && (
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                              {currentStageCaption}
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

          {/* Manage request */}

          {canCancel && (
            <Card>
              <CardHeader>
                <CardTitle>Manage request</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm leading-6 text-muted-foreground">
                  Changed your mind? You can cancel this request as long as it
                  hasn&apos;t been booked yet.
                </p>

                <AlertDialog>
                  <AlertDialogTrigger
                    className={`${buttonVariants({
                      variant: "destructive",
                    })} w-full`}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending
                      ? "Cancelling..."
                      : "Cancel request"}
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Cancel this request?
                      </AlertDialogTitle>

                      <AlertDialogDescription>
                        This marks your request as cancelled and cannot be
                        undone. You&apos;ll need to submit a new request if you
                        want to continue.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    {/* The dialog stays open when cancelling fails, so the
                        error is announced here, where the traveler is. */}
                    {cancelMutation.isError && (
                      <p role="alert" className="text-sm text-destructive">
                        Unable to cancel this request. Please try again.
                      </p>
                    )}

                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep request</AlertDialogCancel>

                      <AlertDialogAction
                        variant="destructive"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate()}
                      >
                        Yes, cancel request
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {cancelMutation.isError && (
                  <p className="text-sm text-destructive">
                    Unable to cancel this request. Please try again.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quotations */}

          <Card>
            <CardHeader>
              <CardTitle>Quotations</CardTitle>
            </CardHeader>

            <CardContent>
              {areQuotationsLoading ? (
                <LoadingState label="Loading quotations" className="min-h-24" />
              ) : areQuotationsError ? (
                <ErrorState
                  headingLevel="h3"
                  title="Unable to load quotations"
                  description="Your quotations for this request could not be retrieved."
                  onRetry={() => void refetchQuotations()}
                  className="px-4 py-6"
                />
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

                        <StatusBadge
                          entity="quotation"
                          status={isQuotationExpired(quotation) ? "EXPIRED" : quotation.status}
                        />
                      </div>

                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">Total</p>

                        <p data-testid="request-quotation-total" className="text-2xl font-bold">
                          {formatMoney(quotation.totalAmount, quotation.currency)}
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
