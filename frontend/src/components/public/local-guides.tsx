import Link from "next/link";

import { ArrowRight, MapPin, Star } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { getTourGuides } from "@/features/tour-guides/tour-guide.api";

import type { TourGuide } from "@/features/tour-guides/tour-guide.types";

import { GuideMonogram } from "./guide-monogram";

import { PublicSection } from "./public-section";

import { SnapRow } from "./snap-row";

/*
 * Meet local guides (CR-029): up to three available guides, from
 * public guide data only (no portraits, credentials or trip
 * counts). Hidden when there are no guides or the request fails.
 */

export async function LocalGuides() {
  let guides: TourGuide[] = [];

  try {
    guides = await getTourGuides();
  } catch (error) {
    console.error("Unable to load featured tour guides:", error);

    /**
     * The homepage should still render even if
     * the backend is temporarily unavailable
     * during build/prerender.
     */
    return null;
  }

  const featuredGuides = guides
    .filter((guide: TourGuide) => guide.isAvailable)
    .slice(0, 3);

  if (featuredGuides.length === 0) {
    return null;
  }

  const single = featuredGuides.length === 1;

  return (
    <PublicSection
      id="local-guides"
      overline="Local guides"
      title="Travel with people who know the island"
      description="Our local guides bring the stories, routes and quiet corners that make a trip feel personal."
      action={
        <Link href="/guides" className={buttonVariants({ variant: "outline" })}>
          Meet all our guides
          <ArrowRight aria-hidden="true" />
        </Link>
      }
    >
      {single ? (
        /* One guide: a single wide card, no scrolling row. */
        <ul className="mt-10 max-w-3xl">
          <li>
            <GuideCard guide={featuredGuides[0]} wide />
          </li>
        </ul>
      ) : (
        <SnapRow
          className={cn(
            "mt-10 -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6",
            "md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {featuredGuides.map((guide) => (
            <li key={guide.id} className="w-[85%] shrink-0 snap-start md:w-auto">
              <GuideCard guide={guide} wide={false} />
            </li>
          ))}
        </SnapRow>
      )}
    </PublicSection>
  );
}

function GuideCard({ guide, wide }: { guide: TourGuide; wide: boolean }) {
  const { firstName, lastName } = guide.user;

  const rating = Number(guide.averageRating) || 0;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-xs transition-shadow duration-base ease-standard hover:shadow-md motion-reduce:transition-none",
        wide && "sm:flex-row sm:gap-8 sm:p-8",
      )}
    >
      <GuideMonogram
        firstName={firstName}
        lastName={lastName}
        size={wide ? "lg" : "md"}
      />

      <div className="mt-5 flex flex-1 flex-col sm:mt-0">
        <h3 className={cn("font-display text-heading-md text-foreground", !wide && "sm:mt-5")}>
          <Link
            href={`/guides/${guide.id}`}
            className="rounded-sm after:absolute after:inset-0 after:content-['']"
          >
            {firstName} {lastName}
          </Link>
        </h3>

        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
          {guide.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-4" />
              {guide.location}
            </span>
          )}

          <span>
            {guide.experienceYears} {guide.experienceYears === 1 ? "year" : "years"} guiding
          </span>

          {guide.totalReviews > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star aria-hidden="true" className="size-4 fill-cinnamon-400 text-cinnamon-400" />
              {rating.toFixed(1)} · {guide.totalReviews}{" "}
              {guide.totalReviews === 1 ? "review" : "reviews"}
            </span>
          )}
        </p>

        {guide.bio && (
          <p className="mt-4 line-clamp-2 text-body-sm text-foreground-secondary">{guide.bio}</p>
        )}

        {guide.languages.length > 0 && (
          <ul aria-label="Languages" className="mt-4 flex flex-wrap gap-2">
            {guide.languages.slice(0, 3).map((language) => (
              <li
                key={language}
                className="rounded-full bg-sand-100 px-3 py-1 text-caption text-foreground"
              >
                {language}
              </li>
            ))}
          </ul>
        )}

        {guide.specializations.length > 0 && (
          <p className="mt-3 text-caption text-muted-foreground">
            {guide.specializations.slice(0, 3).join(" · ")}
          </p>
        )}

        <span
          aria-hidden="true"
          className="mt-auto inline-flex items-center gap-1.5 pt-5 text-label text-tea-700"
        >
          Meet {firstName}
          <ArrowRight className="size-4 transition-transform duration-fast group-hover:translate-x-1 motion-reduce:transition-none" />
        </span>
      </div>
    </article>
  );
}
