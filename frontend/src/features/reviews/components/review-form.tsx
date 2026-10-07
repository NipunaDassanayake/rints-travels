"use client";

import { useRef, useState, type FormEvent } from "react";

import axios from "axios";

import { useMutation } from "@tanstack/react-query";

import { Send, Star } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Spinner } from "@/components/ui/spinner";

import { Textarea } from "@/components/ui/textarea";

import { cn } from "@/lib/utils";

import { createReview } from "../review.api";

import type { Review } from "../review.types";

import { RATING_WORDS, ratingLabel } from "./submitted-review";

/** Matches the backend's limit for a review comment. */
export const REVIEW_COMMENT_MAX = 2000;

const RATINGS = [1, 2, 3, 4, 5];

const count = new Intl.NumberFormat("en-US");

export type ReviewOutcome = { kind: "created"; review: Review } | { kind: "conflict" };

interface ReviewFormProps {
  bookingId: string;

  guideName: string;

  /**
   * Resolves the saved review once the server has accepted it, or
   * after a 409 says one already exists. Returns false when the
   * saved review could not be shown.
   */
  onSubmitted: (outcome: ReviewOutcome) => Promise<boolean>;
}

/**
 * Review form for a completed trip (CR-030 Stage 5).
 *
 * The rating is a native radio group (arrow keys, one tab stop);
 * each transparent radio sits over its star, so a click lands on
 * the real control.
 * Submit stays enabled: without a rating it explains why and moves
 * focus to the group. A second click while a review is being sent
 * is ignored.
 */
export function ReviewForm({ bookingId, guideName, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);

  const [hoveredRating, setHoveredRating] = useState(0);

  const [comment, setComment] = useState("");

  const [ratingError, setRatingError] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  const sending = useRef(false);

  const firstOption = useRef<HTMLInputElement>(null);

  const reviewMutation = useMutation({ mutationFn: createReview });

  const displayRating = hoveredRating || rating;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (sending.current) {
      return;
    }

    if (rating < 1 || rating > 5) {
      setRatingError(true);

      firstOption.current?.focus();

      return;
    }

    sending.current = true;

    setBusy(true);

    setSubmitError(null);

    try {
      const review = await reviewMutation.mutateAsync({
        bookingId,
        rating,
        comment: comment.trim() || undefined,
      });

      await onSubmitted({ kind: "created", review });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const shown = await onSubmitted({ kind: "conflict" });

        if (!shown) {
          setSubmitError("We couldn't load your review just now. Please try again.");
        }
      } else {
        setSubmitError("We couldn't submit your review. Please try again.");
      }
    } finally {
      sending.current = false;

      setBusy(false);
    }
  };

  const atLimit = comment.length >= REVIEW_COMMENT_MAX;

  return (
    <section aria-labelledby="rate-guide" data-testid="review-form" className="rounded-card border bg-card p-5 sm:p-6">
      <h2 id="rate-guide" className="text-heading-md text-foreground">
        Rate your tour guide
      </h2>

      <p className="mt-1 text-body-sm text-foreground-secondary">
        How was your trip with {guideName}? Your review helps other travelers choose their guide.
      </p>

      <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-6">
        <fieldset
          role="radiogroup"
          aria-labelledby="review-rating-legend"
          aria-required="true"
          aria-invalid={ratingError || undefined}
          aria-describedby={ratingError ? "review-rating-error" : undefined}
        >
          <legend id="review-rating-legend" className="text-label text-foreground">
            Your rating
          </legend>

          <div className="mt-2 flex flex-wrap items-center gap-1" onMouseLeave={() => setHoveredRating(0)}>
            {RATINGS.map((value) => {
              const id = `review-rating-${value}`;

              return (
                <div key={value} className="relative" onMouseEnter={() => setHoveredRating(value)}>
                  <input
                    ref={value === 1 ? firstOption : undefined}
                    id={id}
                    type="radio"
                    name="review-rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => {
                      setRating(value);

                      setHoveredRating(0);

                      setRatingError(false);
                    }}
                    className="peer absolute inset-0 z-10 size-full cursor-pointer appearance-none opacity-0"
                  />

                  <label
                    htmlFor={id}
                    className="flex size-11 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-sand-100 peer-checked:bg-tea-50 peer-checked:ring-1 peer-checked:ring-tea-300 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
                  >
                    <Star
                      aria-hidden="true"
                      className={cn(
                        "size-7",
                        value <= displayRating ? "fill-cinnamon-500 text-cinnamon-600" : "text-ink-400",
                      )}
                    />

                    <span className="sr-only">{ratingLabel(value)}</span>
                  </label>
                </div>
              );
            })}

            <span aria-hidden="true" data-testid="rating-caption" className="ml-2 text-body-sm text-foreground-secondary">
              {rating ? RATING_WORDS[rating] : ""}
            </span>
          </div>

          {ratingError && (
            <p id="review-rating-error" role="alert" className="mt-2 text-body-sm font-medium text-destructive">
              Choose a rating
            </p>
          )}
        </fieldset>

        <div>
          <label htmlFor="review-comment" className="text-label text-foreground">
            Tell us about your experience
            <span className="font-normal text-muted-foreground"> (optional)</span>
          </label>

          <Textarea
            id="review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value.slice(0, REVIEW_COMMENT_MAX))}
            maxLength={REVIEW_COMMENT_MAX}
            rows={5}
            aria-describedby="review-comment-count"
            placeholder={`What made the trip with ${guideName} memorable?`}
            className="mt-2 max-h-80 min-h-32 resize-y [overflow-wrap:anywhere]"
          />

          <p
            id="review-comment-count"
            data-testid="comment-count"
            className={cn("mt-1 text-right text-caption", atLimit ? "text-foreground" : "text-muted-foreground")}
          >
            {count.format(comment.length)} / {count.format(REVIEW_COMMENT_MAX)} characters
            {atLimit && <span className="sr-only"> – limit reached</span>}
          </p>
        </div>

        {submitError && (
          <p role="alert" className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-body-sm text-danger-ink">
            {submitError}
          </p>
        )}

        <Button type="submit" aria-disabled={busy || undefined} className="w-full sm:w-auto">
          {busy ? (
            <>
              <Spinner size="sm" className="text-current" />
              Submitting…
            </>
          ) : (
            <>
              <Send aria-hidden="true" />
              Submit review
            </>
          )}
        </Button>
      </form>
    </section>
  );
}
