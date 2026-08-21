"use client";

import { useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CheckCircle2, LoaderCircle, Send, Star } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { createReview } from "../review.api";

interface ReviewFormProps {
  bookingId: string;

  guideName: string;

  onSuccess?: () => void;
}

export function ReviewForm({
  bookingId,
  guideName,
  onSuccess,
}: ReviewFormProps) {
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);

  const [hoveredRating, setHoveredRating] = useState(0);

  const [comment, setComment] = useState("");

  const [submitted, setSubmitted] = useState(false);

  const reviewMutation = useMutation({
    mutationFn: () =>
      createReview({
        bookingId,
        rating,
        comment: comment.trim() || undefined,
      }),

    onSuccess: async () => {
      setSubmitted(true);

      await queryClient.invalidateQueries({
        queryKey: ["review", "booking", bookingId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["reviews", "me"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["bookings", "me"],
      });

      onSuccess?.();
    },
  });

  const displayRating = hoveredRating || rating;

  const handleSubmit = () => {
    if (rating < 1 || rating > 5) {
      return;
    }

    reviewMutation.mutate();
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="size-7 text-primary" />
            </div>

            <h3 className="mt-4 text-xl font-semibold">
              Thank you for your review
            </h3>

            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Your feedback about {guideName} has been submitted successfully.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate your tour guide</CardTitle>

        <CardDescription>
          How was your experience with {guideName}? Your feedback helps other
          travelers choose the right guide.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-medium">Your rating</p>

          <div
            className="flex items-center gap-1"
            onMouseLeave={() => setHoveredRating(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= displayRating;

              return (
                <button
                  key={star}
                  type="button"
                  className="rounded-md p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onMouseEnter={() => setHoveredRating(star)}
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} out of 5`}
                >
                  <Star
                    className={`size-8 ${
                      active
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {rating > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {rating === 1 && "Poor experience"}

              {rating === 2 && "Could be better"}

              {rating === 3 && "Good"}

              {rating === 4 && "Very good"}

              {rating === 5 && "Excellent"}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="review-comment" className="text-sm font-medium">
            Tell us about your experience
          </label>

          <textarea
            id="review-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            rows={5}
            placeholder={`Share your experience with ${guideName}...`}
            className="mt-2 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
          />

          <div className="mt-1 flex justify-end">
            <span className="text-xs text-muted-foreground">
              {comment.length}/1000
            </span>
          </div>
        </div>

        {reviewMutation.isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              Unable to submit your review. Please try again.
            </p>
          </div>
        )}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={rating === 0 || reviewMutation.isPending}
          className="w-full sm:w-auto"
        >
          {reviewMutation.isPending ? (
            <>
              <LoaderCircle className="mr-2 size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 size-4" />
              Submit review
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}