import type { Ref } from "react";

import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

import { formatMoment } from "@/features/quotations/quotation-validity";

import type { Review } from "../review.types";

/** Words for each star rating, shared by the form and the submitted review. */
export const RATING_WORDS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent",
};

export function ratingLabel(rating: number) {
  return `${rating} star${rating === 1 ? "" : "s"} – ${RATING_WORDS[rating] ?? ""}`.trim();
}

interface SubmittedReviewProps {
  review: Review;

  guideName: string;

  /** The review already existed when the traveler tried to submit one. */
  alreadySubmitted?: boolean;

  headingRef?: Ref<HTMLHeadingElement>;
}

/**
 * The traveler's review as the server has it (CR-030 Stage 5). The
 * comment wraps anywhere, so even one long unbroken word cannot push
 * the page sideways.
 */
export function SubmittedReview({ review, guideName, alreadySubmitted = false, headingRef }: SubmittedReviewProps) {
  return (
    <section
      aria-labelledby="your-review"
      data-testid="submitted-review"
      className="min-w-0 rounded-card border bg-card p-5 sm:p-6"
    >
      <h2
        id="your-review"
        ref={headingRef}
        tabIndex={-1}
        className="text-heading-md text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Your review
      </h2>

      <p className="mt-1 text-body-sm text-foreground-secondary">Your feedback for {guideName}</p>

      {alreadySubmitted && (
        <p className="mt-3 rounded-md border border-info-border bg-info-soft px-3 py-2 text-body-sm text-info-ink">
          You had already reviewed this trip, so here is the review we have on file.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span aria-hidden="true" className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                "size-5",
                star <= review.rating ? "fill-cinnamon-500 text-cinnamon-600" : "text-ink-300",
              )}
            />
          ))}
        </span>

        <span data-testid="submitted-rating" className="text-body-sm font-medium text-foreground">
          {review.rating}/5
        </span>

        <span className="text-body-sm text-foreground-secondary">{RATING_WORDS[review.rating]}</span>
      </div>

      {review.comment && (
        <p
          data-testid="submitted-comment"
          className="mt-4 whitespace-pre-line text-body-sm leading-7 text-foreground-secondary [overflow-wrap:anywhere]"
        >
          {review.comment}
        </p>
      )}

      <p className="mt-4 text-caption text-muted-foreground">Submitted {formatMoment(review.createdAt)}</p>
    </section>
  );
}
