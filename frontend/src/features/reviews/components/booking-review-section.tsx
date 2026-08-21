"use client";

import { useQuery } from "@tanstack/react-query";

import { LoaderCircle } from "lucide-react";

import type { Booking } from "@/features/bookings/booking.types";

import { getReviewByBooking } from "../review.api";

import { ReviewForm } from "./review-form";

import { SubmittedReview } from "./submitted-review";

interface BookingReviewSectionProps {
  booking: Booking;
}

export function BookingReviewSection({ booking }: BookingReviewSectionProps) {
  const guide = booking.quotation.guide;

  const {
    data: review,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["review", "booking", booking.id],

    queryFn: () => getReviewByBooking(booking.id),

    enabled: booking.status === "COMPLETED" && Boolean(guide),
  });

  /*
   * Reviews should only be available after
   * the tour has been completed.
   */
  if (booking.status !== "COMPLETED") {
    return null;
  }

  /*
   * A review is specifically for the guide,
   * so there must be an assigned guide.
   */
  if (!guide) {
    return null;
  }

  const guideName = `${guide.user.firstName} ${guide.user.lastName}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border p-10">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 p-4">
        <p className="text-sm text-destructive">
          Unable to check your review status.
        </p>
      </div>
    );
  }

  if (review) {
    return <SubmittedReview review={review} guideName={guideName} />;
  }

  return (
    <ReviewForm
      bookingId={booking.id}
      guideName={guideName}
      onSuccess={() => {
        void refetch();
      }}
    />
  );
}