"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import { Map as MapIcon, Plus } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";

import { ErrorState } from "@/components/patterns/error-state";

import { LoadingState } from "@/components/patterns/loading-state";

import { PageHeader } from "@/components/patterns/page-header";

import { buttonVariants } from "@/components/ui/button";

import { getMyBookings } from "@/features/bookings/booking.api";

import { CurrentTripCard } from "@/features/journeys/components/current-trip-card";

import { JourneyAttention } from "@/features/journeys/components/journey-attention";

import { JourneyProgressCard } from "@/features/journeys/components/journey-progress-card";

import { RecentJourneys } from "@/features/journeys/components/recent-journeys";

import { buildJourneys, summarizeJourneys } from "@/features/journeys/journey";

import { getMyPayments } from "@/features/payments/payment.api";

import { getMyQuotations } from "@/features/quotations/quotation.api";

import { getMyReviews } from "@/features/reviews/review.api";

import { getMyTourRequests } from "@/features/tour-requests/tour-request.api";

import { useAuth } from "@/providers/auth-provider";

/**
 * =========================================================
 * Traveler dashboard (CR-030 Stage 1)
 * =========================================================
 *
 * Answers, in order: what needs me now, what is my current or
 * next trip, where does my latest request stand, and what
 * happened recently -- derived from the traveler's own lists
 * (see features/journeys/journey.ts).
 */
export default function TouristDashboard() {
  const { user } = useAuth();

  const requests = useQuery({
    queryKey: ["tour-requests", "me"],
    queryFn: getMyTourRequests,
  });

  const quotations = useQuery({
    queryKey: ["quotations", "me"],
    queryFn: getMyQuotations,
  });

  const payments = useQuery({
    queryKey: ["payments", "me"],
    queryFn: getMyPayments,
  });

  const bookings = useQuery({
    queryKey: ["bookings", "me"],
    queryFn: getMyBookings,
  });

  // Only decides whether to ask for a review; a failure here
  // degrades to "View trip" instead of failing the dashboard.
  const reviews = useQuery({
    queryKey: ["reviews", "me"],
    queryFn: getMyReviews,
  });

  const required = [requests, quotations, payments, bookings];

  const isLoading = required.some((query) => query.isLoading) || reviews.isLoading;

  const failed = required.filter((query) => query.isError);

  const header = (showPlanAction: boolean) => (
    <PageHeader
      editorial
      overline={user?.firstName ? `Welcome back, ${user.firstName}` : "My Travora"}
      title="My travel dashboard"
      description="Your Sri Lanka journeys in one place: what needs you now, your next trip and how your requests are moving."
      actions={
        showPlanAction ? (
          <Link href="/tourist/requests/new" className={buttonVariants({ variant: "outline" })}>
            <Plus aria-hidden="true" />
            Plan a new trip
          </Link>
        ) : undefined
      }
    />
  );

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {header(false)}

        <LoadingState
          variant="skeleton"
          rows={3}
          label="Loading your travel dashboard"
          className="mt-8"
        />
      </main>
    );
  }

  if (failed.length > 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {header(false)}

        <ErrorState
          headingLevel="h2"
          title="Unable to load your dashboard"
          description="Some travel information could not be retrieved."
          onRetry={() => {
            failed.forEach((query) => void query.refetch());
          }}
          className="mt-8"
        />
      </main>
    );
  }

  const journeys = buildJourneys({
    requests: requests.data ?? [],
    quotations: quotations.data ?? [],
    payments: payments.data ?? [],
    bookings: bookings.data ?? [],
    reviews: reviews.isError ? null : (reviews.data ?? []),
  });

  if (journeys.length === 0) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {header(false)}

        <EmptyState
          headingLevel="h2"
          icon={MapIcon}
          title="Plan your first Sri Lanka journey"
          description="Start from one of our travel packages or describe the trip you have in mind. Travora reviews every request and sends you a personalized quotation before anything is booked or paid."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/tourist/requests/new" className={buttonVariants({ size: "lg" })}>
                <Plus aria-hidden="true" />
                Plan a trip
              </Link>

              <Link href="/packages" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Browse packages
              </Link>
            </div>
          }
          className="mt-8 py-14"
        />
      </main>
    );
  }

  const { attention, currentTrip, latestJourney, recent } = summarizeJourneys(journeys);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {header(true)}

      <div className="mt-8 space-y-8">
        {attention.length > 0 ? (
          <JourneyAttention journeys={attention} />
        ) : (
          <p
            data-testid="journey-all-clear"
            className="rounded-card border border-tea-100 bg-tea-50 px-5 py-4 text-body-sm text-tea-800"
          >
            Nothing needs your attention right now.
          </p>
        )}

        {(currentTrip || latestJourney) && (
          <div className="grid gap-6 lg:grid-cols-2">
            {currentTrip && <CurrentTripCard journey={currentTrip} />}

            {latestJourney && <JourneyProgressCard journey={latestJourney} />}
          </div>
        )}

        {recent.length > 0 && <RecentJourneys journeys={recent} />}
      </div>
    </main>
  );
}
