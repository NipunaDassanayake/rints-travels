"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import {
  ArrowLeft,
  CalendarDays,
  LoaderCircle,
  MessageSquareText,
  Star,
  UserRound,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import { getMyGuideReviews } from "@/features/reviews/review.api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function RatingStars({
  rating,
  size = "normal",
}: {
  rating: number;
  size?: "normal" | "large";
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size === "large" ? "size-6" : "size-4"} ${
            star <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function GuideReviewsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["guide", "reviews"],

    queryFn: getMyGuideReviews,
  });

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">Unable to load reviews</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Your traveler reviews could not be loaded.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className={buttonVariants({
                variant: "outline",
              })}
            >
              Try again
            </button>

            <Link
              href="/guide"
              className={buttonVariants({
                variant: "ghost",
              })}
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const averageRating = Number(data.guide.averageRating) || 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}

      <div className="mb-8">
        <Link
          href="/guide"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Tour guide portal
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Traveler reviews
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            See ratings and feedback from travelers who completed tours with
            you.
          </p>
        </div>
      </div>

      {/* Summary */}

      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Average rating</p>

            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold">
                {averageRating.toFixed(1)}
              </span>

              <span className="pb-1 text-muted-foreground">/ 5</span>
            </div>

            <div className="mt-3">
              <RatingStars rating={averageRating} size="large" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total reviews</p>

            <p className="mt-3 text-4xl font-bold">{data.guide.totalReviews}</p>

            <p className="mt-3 text-sm text-muted-foreground">
              Verified completed-tour reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Guide</p>

            <div className="mt-3 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-muted">
                <UserRound className="size-5" />
              </div>

              <div>
                <p className="font-semibold">
                  {data.guide.firstName} {data.guide.lastName}
                </p>

                <p className="text-sm text-muted-foreground">Tour guide</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews */}

      <section className="mt-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Reviews received
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Feedback submitted by travelers after completed tours.
          </p>
        </div>

        {data.reviews.length > 0 ? (
          <div className="mt-6 space-y-5">
            {data.reviews.map((review) => {
              const touristName = review.tourist
                ? `${review.tourist.firstName} ${review.tourist.lastName}`
                : "Traveler";

              return (
                <Card key={review.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{touristName}</CardTitle>

                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <RatingStars rating={review.rating} />

                          <span className="text-sm font-medium">
                            {review.rating}
                            /5
                          </span>
                        </div>
                      </div>

                      <span className="text-sm text-muted-foreground">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {review.comment ? (
                      <div className="flex gap-3">
                        <MessageSquareText className="mt-1 size-5 shrink-0 text-muted-foreground" />

                        <p className="leading-7 text-muted-foreground">
                          {review.comment}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No written feedback was provided.
                      </p>
                    )}

                    {review.booking && (
                      <div className="border-t pt-5">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Tour
                            </p>

                            <p className="mt-1 text-sm font-medium">
                              {review.booking.quotation.title}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">
                              Booking
                            </p>

                            <p className="mt-1 text-sm font-medium">
                              {review.booking.bookingReference}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />

                            <div>
                              <p className="text-xs text-muted-foreground">
                                Tour date
                              </p>

                              <p className="mt-1 text-sm font-medium">
                                {formatDate(review.booking.startDate)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed p-10 text-center">
            <Star className="mx-auto size-9 text-muted-foreground" />

            <h3 className="mt-4 font-semibold">No reviews yet</h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Traveler reviews will appear here after completed tours receive
              feedback.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}