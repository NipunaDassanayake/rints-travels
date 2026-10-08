"use client";

import { useCallback, useRef, useState } from "react";

import Link from "next/link";

import { useParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ArrowLeft, Check, CheckCircle2, Play, X } from "lucide-react";

import { ErrorState } from "@/components/patterns/error-state";

import { LoadingState } from "@/components/patterns/loading-state";

import { PageHeader } from "@/components/patterns/page-header";

import { StatusBadge } from "@/components/patterns/status-badge";

import { Button, buttonVariants } from "@/components/ui/button";

import { formatStatusLabel } from "@/lib/format";

import { getBookingById } from "@/features/bookings/booking.api";

import type { Booking, BookingLifecycleAction, BookingStatus } from "@/features/bookings/booking.types";

import { BookingFacts } from "@/features/bookings/components/booking-facts";

import { BookingStatePanel } from "@/features/bookings/components/booking-state-panel";

import {
  LIFECYCLE_CONFIRMATION,
  TourConfirmationCodeDialog,
} from "@/features/bookings/components/tour-confirmation-code-dialog";

import { ProposedGuideCard } from "@/features/quotations/components/proposed-guide-card";

import { BookingReviewSection } from "@/features/reviews/components/booking-review-section";

const SECTION = "rounded-card border bg-card p-5 sm:p-6";

const CONTACT_METHODS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  PHONE: "Phone",
  EMAIL: "Email",
};

/**
 * What the traveler asked for when they requested the trip -- only
 * their own preferences, never admin assignment or internal fields.
 */
function getTripPreferences(booking: Booking) {
  const request = booking.tourRequest;

  if (!request) {
    return [];
  }

  const preferences = [
    { term: "Destinations", value: request.destinationPreferences },
    { term: "Hotel", value: request.hotelPreference },
    { term: "Transport", value: request.transportPreference },
    { term: "Special requirements", value: request.specialRequirements },
    {
      term: "Preferred contact",
      value: request.contactMethod ? (CONTACT_METHODS[request.contactMethod] ?? null) : null,
    },
  ];

  return preferences.filter((item): item is { term: string; value: string } => Boolean(item.value?.trim()));
}

/**
 * The confirmation the traveler can give now (CR-032): starting a
 * confirmed trip or completing one underway -- only with an assigned
 * guide, who is the one entering the code.
 */
function lifecycleActionFor(booking: Booking): BookingLifecycleAction | null {
  if (!booking.quotation?.guide) {
    return null;
  }

  if (booking.status === "CONFIRMED") return "START";

  if (booking.status === "IN_PROGRESS") return "COMPLETE";

  return null;
}

function describeStatusChange(status: BookingStatus) {
  switch (status) {
    case "IN_PROGRESS":
      return "Your guide started the tour.";
    case "COMPLETED":
      return "Your tour is complete.";
    case "CANCELLED":
      return "This booking was cancelled.";
    default:
      return `This booking is now ${formatStatusLabel(String(status))}.`;
  }
}

export default function TouristBookingDetailsPage() {
  const params = useParams<{ id: string }>();

  const bookingId = params.id;

  const {
    data: booking,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["booking", bookingId],

    queryFn: () => getBookingById(bookingId),

    enabled: Boolean(bookingId),
  });

  const queryClient = useQueryClient();

  const [confirmAction, setConfirmAction] = useState<BookingLifecycleAction | null>(null);

  const [announcement, setAnnouncement] = useState("");

  const stateHeadingRef = useRef<HTMLHeadingElement>(null);

  const refreshBooking = useCallback(() => refetch(), [refetch]);

  const handleBookingChanged = useCallback(
    (status: BookingStatus) => {
      setConfirmAction(null);

      setAnnouncement(describeStatusChange(status));

      void queryClient.invalidateQueries({ queryKey: ["bookings", "me"] });
    },
    [queryClient],
  );

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <LoadingState label="Loading your booking" className="min-h-[50vh]" />
      </main>
    );
  }

  if (isError || !booking) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <ErrorState
          headingLevel="h1"
          title="Unable to load booking"
          description="The booking could not be loaded or you may not have permission to view it."
          onRetry={() => void refetch()}
        />

        <div className="mt-4 text-center">
          <Link href="/tourist/bookings" className={buttonVariants({ variant: "ghost" })}>
            Back to bookings
          </Link>
        </div>
      </main>
    );
  }

  const quotation = booking.quotation;

  const cancelled = booking.status === "CANCELLED";

  const itinerary = [...(quotation?.itineraries ?? [])].sort((a, b) => a.dayNumber - b.dayNumber);

  const inclusions = quotation?.inclusions ?? [];

  const exclusions = quotation?.exclusions ?? [];

  const guide = quotation?.guide ?? null;

  const preferences = getTripPreferences(booking);

  const lifecycleAction = lifecycleActionFor(booking);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/tourist/bookings"
        className="inline-flex min-h-10 items-center gap-2 text-body-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to bookings
      </Link>

      <PageHeader
        editorial
        className="mt-2"
        overline="Booking"
        title={quotation?.title ?? "Your trip"}
        description={
          <>
            Booking reference <span className="font-medium text-foreground">{booking.bookingReference}</span>
          </>
        }
        actions={<StatusBadge entity="booking" status={booking.status} />}
      />

      {/*
        One column on phones, in reading order: where the booking
        stands (and the review, once the trip is complete), the key
        facts, then the trip itself. From lg the facts become a
        sticky rail beside both.
      */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-1">
          <BookingStatePanel
            booking={booking}
            headingRef={stateHeadingRef}
            action={
              lifecycleAction && (
                <Button
                  onClick={() => {
                    setAnnouncement("");

                    setConfirmAction(lifecycleAction);
                  }}
                >
                  {lifecycleAction === "START" ? (
                    <Play aria-hidden="true" className="size-4" />
                  ) : (
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                  )}
                  {LIFECYCLE_CONFIRMATION[lifecycleAction].trigger}
                </Button>
              )
            }
          />

          <p role="status" className="sr-only">
            {announcement}
          </p>

          <TourConfirmationCodeDialog
            booking={booking}
            action={confirmAction}
            onOpenChange={(open) => {
              if (!open) {
                setConfirmAction(null);
              }
            }}
            refreshBooking={refreshBooking}
            onBookingChanged={handleBookingChanged}
            changeFocusRef={stateHeadingRef}
          />

          <BookingReviewSection booking={booking} />
        </div>

        <aside aria-label="Booking summary" className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-6">
            <BookingFacts booking={booking} />
          </div>
        </aside>

        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2">
          {quotation?.description && (
            <section aria-labelledby="trip-overview" className={SECTION}>
              <h2 id="trip-overview" className="text-heading-md text-foreground">
                About this trip
              </h2>

              <p className="mt-2 whitespace-pre-line text-body text-foreground-secondary">{quotation.description}</p>
            </section>
          )}

          <section aria-labelledby="itinerary" data-testid="itinerary" className={SECTION}>
            <h2 id="itinerary" className="text-heading-md text-foreground">
              {cancelled ? "Planned itinerary" : "Itinerary"}
            </h2>

            {itinerary.length > 0 ? (
              <ol className="mt-4 space-y-5">
                {itinerary.map((item) => (
                  <li key={item.id ?? `${item.dayNumber}-${item.title}`} className="border-l-2 border-tea-200 pl-4">
                    <p className="text-overline text-tea-700">Day {item.dayNumber}</p>

                    <h3 className="mt-1 text-heading-sm text-foreground">{item.title}</h3>

                    {item.description && (
                      <p className="mt-1 whitespace-pre-line text-body-sm text-foreground-secondary">
                        {item.description}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-body-sm text-foreground-secondary">
                Travora hasn&apos;t added a day-by-day plan to this booking.
              </p>
            )}
          </section>

          {(inclusions.length > 0 || exclusions.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              {inclusions.length > 0 && (
                <section aria-labelledby="included" className={SECTION}>
                  <h2 id="included" className="text-heading-md text-foreground">
                    What&apos;s included
                  </h2>

                  <ul className="mt-4 space-y-2">
                    {inclusions.map((item) => (
                      <li key={item.id ?? item.title} className="flex gap-3 text-body-sm text-foreground">
                        <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tea-700" />
                        {item.title}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {exclusions.length > 0 && (
                <section aria-labelledby="not-included" className={SECTION}>
                  <h2 id="not-included" className="text-heading-md text-foreground">
                    What&apos;s not included
                  </h2>

                  <ul className="mt-4 space-y-2">
                    {exclusions.map((item) => (
                      <li key={item.id ?? item.title} className="flex gap-3 text-body-sm text-foreground">
                        <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        {item.title}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {guide && !cancelled && <ProposedGuideCard guide={guide} title="Your tour guide" />}

          {preferences.length > 0 && (
            <section aria-labelledby="trip-preferences" data-testid="trip-preferences" className={SECTION}>
              <h2 id="trip-preferences" className="text-heading-md text-foreground">
                Your trip preferences
              </h2>

              <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {preferences.map((item) => (
                  <div key={item.term} className="min-w-0">
                    <dt className="text-caption text-muted-foreground">{item.term}</dt>
                    <dd className="mt-0.5 whitespace-pre-line text-body-sm break-words text-foreground">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {(quotation?.notes || quotation?.termsConditions) && (
            <section aria-labelledby="notes-terms" className={SECTION}>
              <h2 id="notes-terms" className="text-heading-md text-foreground">
                Notes and terms
              </h2>

              {quotation.notes && (
                <div className="mt-4">
                  <h3 className="text-heading-sm text-foreground">Notes</h3>
                  <p className="mt-1 whitespace-pre-line text-body-sm text-foreground-secondary">{quotation.notes}</p>
                </div>
              )}

              {quotation.termsConditions && (
                <div className="mt-4">
                  <h3 className="text-heading-sm text-foreground">Terms &amp; conditions</h3>
                  <p className="mt-1 whitespace-pre-line text-body-sm text-foreground-secondary">
                    {quotation.termsConditions}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
