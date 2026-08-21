import Link from "next/link";

import { Languages, MapPin, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import type { TourGuide } from "../tour-guide.types";

export function TourGuideCard({ guide }: { guide: TourGuide }) {
  const fullName = `${guide.user.firstName} ${guide.user.lastName}`;

  const averageRating = Number(guide.averageRating) || 0;

  const hasReviews = guide.totalReviews > 0;

  return (
    <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex h-full flex-col p-6">
        {/* Header */}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{fullName}</h2>

            {guide.location && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" />

                {guide.location}
              </div>
            )}
          </div>

          {/* Rating */}

          <div className="shrink-0">
            {hasReviews ? (
              <div className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Star className="size-4 fill-yellow-400 text-yellow-400" />

                  <span className="font-semibold">
                    {averageRating.toFixed(1)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {guide.totalReviews}{" "}
                  {guide.totalReviews === 1 ? "review" : "reviews"}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="size-4" />
                No reviews
              </div>
            )}
          </div>
        </div>

        {/* Bio */}

        {guide.bio && (
          <p className="mt-5 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {guide.bio}
          </p>
        )}

        {/* Languages */}

        <div className="mt-5">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Languages className="mt-0.5 size-4 shrink-0" />

            <span>
              {guide.languages.length > 0
                ? guide.languages.join(", ")
                : "Languages not specified"}
            </span>
          </div>
        </div>

        {/* Specializations */}

        {guide.specializations.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {guide.specializations.slice(0, 3).map((specialization) => (
              <span
                key={specialization}
                className="rounded-full bg-muted px-3 py-1 text-xs"
              >
                {specialization}
              </span>
            ))}

            {guide.specializations.length > 3 && (
              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                +{guide.specializations.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}

        <div className="mt-auto pt-6">
          <div className="flex items-end justify-between gap-4 border-t pt-4">
            <div>
              <p className="text-xs text-muted-foreground">Experience</p>

              <p className="font-semibold">
                {guide.experienceYears}{" "}
                {guide.experienceYears === 1 ? "year" : "years"}
              </p>
            </div>

            <Link
              href={`/guides/${guide.id}`}
              className={buttonVariants({
                variant: "outline",
              })}
            >
              View profile
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}