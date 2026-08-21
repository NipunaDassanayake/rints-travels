"use client";

import { useQuery } from "@tanstack/react-query";

import {
  CalendarDays,
  LoaderCircle,
  MessageSquareText,
  Star,
  UserRound,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { getGuideReviews } from "@/features/reviews/review.api";

interface GuideReviewsSectionProps {
  guideId: string;
}

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

export function GuideReviewsSection({ guideId }: GuideReviewsSectionProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["guide", "public-reviews", guideId],

    queryFn: () => getGuideReviews(guideId),
  });

  if (isLoading) {
    return (
      <section className="mt-14 border-t pt-12">
        <div className="flex min-h-40 items-center justify-center">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="mt-14 border-t pt-12">
        <div className="rounded-2xl border border-destructive/30 p-6">
          <p className="font-medium">Unable to load traveler reviews</p>

          <p className="mt-2 text-sm text-muted-foreground">
            Reviews could not be loaded at the moment.
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 text-sm font-medium underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  const averageRating = Number(data.guide.averageRating) || 0;

  return (
    <section className="mt-14 border-t pt-12">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Traveler experiences
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight">Reviews</h2>
        </div>

        {data.guide.totalReviews > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-3xl font-bold">{averageRating.toFixed(1)}</p>

              <p className="text-sm text-muted-foreground">
                {data.guide.totalReviews}{" "}
                {data.guide.totalReviews === 1 ? "review" : "reviews"}
              </p>
            </div>

            <RatingStars rating={averageRating} size="large" />
          </div>
        )}
      </div>

      {data.reviews.length > 0 ? (
        <div className="mt-8 space-y-5">
          {data.reviews.map((review) => {
            const touristName = review.tourist
              ? `${review.tourist.firstName} ${review.tourist.lastName}`
              : "Travora traveler";

            return (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        <UserRound className="size-5 text-muted-foreground" />
                      </div>

                      <div>
                        <p className="font-semibold">{touristName}</p>

                        <div className="mt-2 flex items-center gap-3">
                          <RatingStars rating={review.rating} />

                          <span className="text-sm font-medium">
                            {review.rating}/5
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="text-sm text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>

                  {review.comment ? (
                    <div className="mt-5 flex gap-3">
                      <MessageSquareText className="mt-1 size-5 shrink-0 text-muted-foreground" />

                      <p className="leading-7 text-muted-foreground">
                        {review.comment}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-muted-foreground">
                      This traveler left a rating without a written review.
                    </p>
                  )}

                  {review.booking && (
                    <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-5 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {review.booking.quotation.title}
                      </span>

                      <span className="flex items-center gap-2">
                        <CalendarDays className="size-4" />

                        {formatDate(review.booking.startDate)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed p-10 text-center">
          <Star className="mx-auto size-9 text-muted-foreground" />

          <h3 className="mt-4 font-semibold">No traveler reviews yet</h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Reviews from travelers who complete a journey with this guide will
            appear here.
          </p>
        </div>
      )}
    </section>
  );
}