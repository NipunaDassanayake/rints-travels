"use client";

import { useCallback, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ErrorState } from "@/components/patterns/error-state";

import { LoadingState } from "@/components/patterns/loading-state";

import type { Booking } from "@/features/bookings/booking.types";

import { getReviewByBooking } from "../review.api";

import { ReviewForm, type ReviewOutcome } from "./review-form";

import { SubmittedReview } from "./submitted-review";

interface BookingReviewSectionProps {
  booking: Booking;
}

/**
 * Review for a completed trip (CR-030 Stage 5). Only a COMPLETED
 * booking with a guide can be reviewed. What is shown always comes
 * from the server: after a submit -- or a 409 saying a review
 * already exists -- the saved review is fetched again, and focus
 * moves to its heading.
 */
export function BookingReviewSection({ booking }: BookingReviewSectionProps) {
  const guide = booking.quotation?.guide ?? null;

  const eligible = booking.status === "COMPLETED" && Boolean(guide);

  const queryClient = useQueryClient();

  const queryKey = ["review", "booking", booking.id];

  const reviewQuery = useQuery({
    queryKey,

    queryFn: () => getReviewByBooking(booking.id),

    enabled: eligible,
  });

  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [focusReview, setFocusReview] = useState(false);

  // Runs when the saved review mounts, and again once a submit asks
  // for focus, so focus lands on "Your review" whichever comes first.
  const headingRef = useCallback(
    (node: HTMLHeadingElement | null) => {
      if (node && focusReview) {
        node.focus();
      }
    },
    [focusReview],
  );

  const review = reviewQuery.data;

  if (!eligible || !guide) {
    return null;
  }

  const guideName = `${guide.user.firstName} ${guide.user.lastName}`;

  const onSubmitted = async (outcome: ReviewOutcome) => {
    const result = await reviewQuery.refetch();

    let shown = Boolean(result.data);

    if (!shown && outcome.kind === "created") {
      // The server accepted the review but it could not be read back
      // yet; show the review the server returned instead.
      queryClient.setQueryData(queryKey, outcome.review);

      shown = true;
    }

    if (shown) {
      setAlreadySubmitted(outcome.kind === "conflict");

      setFocusReview(true);

      void queryClient.invalidateQueries({ queryKey: ["reviews", "me"] });

      void queryClient.invalidateQueries({ queryKey: ["bookings", "me"] });
    }

    return shown;
  };

  if (reviewQuery.isLoading) {
    return <LoadingState label="Checking your review" className="min-h-32 rounded-card border bg-card" />;
  }

  // Only a failed first lookup replaces the section; a failed refetch
  // after submitting is reported by the form, which keeps the draft.
  if (reviewQuery.isError && review === undefined) {
    return (
      <ErrorState
        headingLevel="h2"
        title="We couldn't check your review"
        description="Your trip is complete, but we couldn't load your review status."
        onRetry={() => void reviewQuery.refetch()}
      />
    );
  }

  if (review) {
    return (
      <SubmittedReview
        review={review}
        guideName={guideName}
        alreadySubmitted={alreadySubmitted}
        headingRef={headingRef}
      />
    );
  }

  return <ReviewForm bookingId={booking.id} guideName={guideName} onSubmitted={onSubmitted} />;
}
