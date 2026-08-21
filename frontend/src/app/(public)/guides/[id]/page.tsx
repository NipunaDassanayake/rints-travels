import type { Metadata } from "next";

import Link from "next/link";

import { notFound } from "next/navigation";

import { BriefcaseBusiness, Languages, MapPin, Star } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { GuideReviewsSection } from "@/features/reviews/components/guide-reviews-section";

import { getTourGuideById } from "@/features/tour-guides/tour-guide.api";

type TourGuidePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: TourGuidePageProps): Promise<Metadata> {
  const { id } = await params;

  const guide = await getTourGuideById(id);

  if (!guide) {
    return {
      title: "Tour Guide Not Found",
    };
  }

  const fullName = `${guide.user.firstName} ${guide.user.lastName}`;

  return {
    title: `${fullName} - Sri Lanka Tour Guide`,

    description:
      guide.bio?.slice(0, 160) ??
      `Explore the profile of ${fullName}, a Travora tour guide in Sri Lanka.`,
  };
}

export default async function TourGuidePage({ params }: TourGuidePageProps) {
  const { id } = await params;

  const guide = await getTourGuideById(id);

  if (!guide) {
    notFound();
  }

  const fullName = `${guide.user.firstName} ${guide.user.lastName}`;

  const averageRating = Number(guide.averageRating) || 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        {/* ===================================================
            MAIN CONTENT
        =================================================== */}

        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
            Travora Tour Guide
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {fullName}
          </h1>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
            {guide.location && (
              <div className="flex items-center gap-2">
                <MapPin className="size-5" />

                {guide.location}
              </div>
            )}

            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="size-5" />
              {guide.experienceYears}{" "}
              {guide.experienceYears === 1 ? "year" : "years"} experience
            </div>

            <div className="flex items-center gap-2">
              <Star
                className={
                  averageRating > 0
                    ? "size-5 fill-yellow-400 text-yellow-400"
                    : "size-5"
                }
              />

              {guide.totalReviews > 0 ? (
                <>
                  <span className="font-medium text-foreground">
                    {averageRating.toFixed(1)}
                  </span>

                  <span>
                    ({guide.totalReviews}{" "}
                    {guide.totalReviews === 1 ? "review" : "reviews"})
                  </span>
                </>
              ) : (
                <span>No reviews yet</span>
              )}
            </div>
          </div>

          {guide.bio && (
            <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">
              {guide.bio}
            </p>
          )}

          {/* Languages */}

          <section className="mt-12">
            <div className="flex items-center gap-2">
              <Languages className="size-5" />

              <h2 className="text-2xl font-semibold">Languages</h2>
            </div>

            {guide.languages.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {guide.languages.map((language) => (
                  <span
                    key={language}
                    className="rounded-full bg-muted px-4 py-2 text-sm"
                  >
                    {language}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Languages have not been specified.
              </p>
            )}
          </section>

          {/* Specializations */}

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Specializations</h2>

            {guide.specializations.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {guide.specializations.map((specialization) => (
                  <span
                    key={specialization}
                    className="rounded-full border px-4 py-2 text-sm"
                  >
                    {specialization}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No specializations have been listed yet.
              </p>
            )}
          </section>

          {/* Traveler reviews */}

          <GuideReviewsSection guideId={guide.id} />
        </div>

        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside>
          <div className="sticky top-24 rounded-2xl border p-6">
            <p className="text-sm text-muted-foreground">Daily rate</p>

            <p className="mt-1 text-3xl font-bold">
              {guide.dailyRate ? `$${guide.dailyRate}` : "Contact us"}
            </p>

            {guide.totalReviews > 0 && (
              <div className="mt-5 border-t pt-5">
                <div className="flex items-center gap-2">
                  <Star className="size-5 fill-yellow-400 text-yellow-400" />

                  <span className="font-semibold">
                    {averageRating.toFixed(1)}
                  </span>

                  <span className="text-sm text-muted-foreground">
                    · {guide.totalReviews}{" "}
                    {guide.totalReviews === 1 ? "review" : "reviews"}
                  </span>
                </div>
              </div>
            )}

            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Select this guide as your preferred guide when creating your
              personalized Travora journey.
            </p>

            <Link
              href={`/tourist/requests/new?preferredGuideId=${guide.id}`}
              className={`${buttonVariants({
                size: "lg",
              })} mt-6 w-full`}
            >
              Plan a trip with {guide.user.firstName}
            </Link>

            <Link
              href="/guides"
              className={`${buttonVariants({
                variant: "outline",
                size: "lg",
              })} mt-3 w-full`}
            >
              View other guides
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}