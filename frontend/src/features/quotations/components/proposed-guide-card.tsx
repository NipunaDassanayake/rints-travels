import { MapPin, Star, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { QuotationGuide } from "../quotation.types";

/**
 * The guide Travora proposes in a quotation (CR-030). Shows only
 * the public profile -- name, location, experience, languages,
 * specializations, rating and bio. Contact details are never
 * rendered (CR-009), even if a response were to carry them.
 */
export function ProposedGuideCard({ guide }: { guide: QuotationGuide }) {
  const name = `${guide.user.firstName} ${guide.user.lastName}`;

  const reviews = guide.totalReviews ?? 0;

  const rating = Number(guide.averageRating);

  const languages = guide.languages ?? [];

  const specializations = guide.specializations ?? [];

  return (
    <Card data-testid="proposed-guide">
      <CardHeader>
        <CardTitle as="h2">Your proposed guide</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex gap-4">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-tea-50 text-tea-700"
          >
            <UserRound className="size-6" />
          </span>

          <div className="min-w-0">
            <h3 className="text-heading-sm text-foreground">{name}</h3>

            <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-foreground-secondary">
              {guide.location && (
                <li className="flex items-center gap-1.5">
                  <MapPin aria-hidden="true" className="size-4 shrink-0" />
                  {guide.location}
                </li>
              )}

              {typeof guide.experienceYears === "number" && guide.experienceYears > 0 && (
                <li>
                  {guide.experienceYears} year{guide.experienceYears === 1 ? "" : "s"} of experience
                </li>
              )}

              {reviews > 0 && Number.isFinite(rating) && (
                <li className="flex items-center gap-1.5">
                  <Star aria-hidden="true" className="size-4 shrink-0" />
                  {rating.toFixed(1)} rating from {reviews} review{reviews === 1 ? "" : "s"}
                </li>
              )}
            </ul>
          </div>
        </div>

        {guide.bio && (
          <p className="whitespace-pre-line text-body-sm leading-7 text-foreground-secondary">
            {guide.bio}
          </p>
        )}

        {languages.length > 0 && (
          <div>
            <h4 className="text-label text-foreground">Languages</h4>

            <ul className="mt-2 flex flex-wrap gap-2">
              {languages.map((language) => (
                <li key={language}>
                  <Badge variant="outline">{language}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {specializations.length > 0 && (
          <div>
            <h4 className="text-label text-foreground">Specializations</h4>

            <ul className="mt-2 flex flex-wrap gap-2">
              {specializations.map((specialization) => (
                <li key={specialization}>
                  <Badge variant="outline">{specialization}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
