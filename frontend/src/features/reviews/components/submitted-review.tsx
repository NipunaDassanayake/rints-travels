import { CheckCircle2, Star } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { Review } from "../review.types";

interface SubmittedReviewProps {
  review: Review;

  guideName: string;
}

export function SubmittedReview({ review, guideName }: SubmittedReviewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Your review</CardTitle>

            <p className="mt-2 text-sm text-muted-foreground">
              Your feedback for {guideName}
            </p>
          </div>

          <CheckCircle2 className="size-5 text-primary" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`size-5 ${
                star <= review.rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/30"
              }`}
            />
          ))}

          <span className="ml-2 text-sm font-medium">{review.rating}/5</span>
        </div>

        {review.comment && (
          <p className="leading-7 text-muted-foreground">{review.comment}</p>
        )}

        <p className="text-xs text-muted-foreground">
          Submitted{" "}
          {new Intl.DateTimeFormat("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(review.createdAt))}
        </p>
      </CardContent>
    </Card>
  );
}