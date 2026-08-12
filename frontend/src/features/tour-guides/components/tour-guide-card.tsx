import Link from "next/link";

import {
  Languages,
  MapPin,
  Star,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  buttonVariants,
} from "@/components/ui/button";

import type {
  TourGuide,
} from "../tour-guide.types";

export function TourGuideCard({
  guide,
}: {
  guide: TourGuide;
}) {
  const fullName =
    `${guide.user.firstName} ${guide.user.lastName}`;

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {fullName}
              </h2>

              {guide.location && (
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-4" />

                  {guide.location}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 text-sm">
              <Star className="size-4" />

              {guide.averageRating}
            </div>
          </div>
        </div>

        {guide.bio && (
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {guide.bio}
          </p>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Languages className="size-4" />

          <span>
            {guide.languages.join(", ")}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {guide.specializations
            .slice(0, 3)
            .map((specialization) => (
              <span
                key={specialization}
                className="rounded-full bg-muted px-3 py-1 text-xs"
              >
                {specialization}
              </span>
            ))}
        </div>

        <div className="flex items-end justify-between gap-4 border-t pt-4">
          <div>
            <p className="text-xs text-muted-foreground">
              Experience
            </p>

            <p className="font-semibold">
              {guide.experienceYears} years
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
      </CardContent>
    </Card>
  );
}