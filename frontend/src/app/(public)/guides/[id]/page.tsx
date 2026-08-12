import type {
  Metadata,
} from "next";

import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  BriefcaseBusiness,
  Languages,
  MapPin,
  Star,
} from "lucide-react";

import {
  buttonVariants,
} from "@/components/ui/button";

import {
  getTourGuideById,
} from "@/features/tour-guides/tour-guide.api";

type TourGuidePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: TourGuidePageProps): Promise<Metadata> {
  const { id } = await params;

  const guide =
    await getTourGuideById(id);

  if (!guide) {
    return {
      title: "Tour Guide Not Found",
    };
  }

  const fullName =
    `${guide.user.firstName} ${guide.user.lastName}`;

  return {
    title: `${fullName} - Sri Lanka Tour Guide`,

    description:
      guide.bio?.slice(0, 160) ??
      `Explore the profile of ${fullName}, a Travora tour guide in Sri Lanka.`,
  };
}

export default async function TourGuidePage({
  params,
}: TourGuidePageProps) {
  const { id } = await params;

  const guide =
    await getTourGuideById(id);

  if (!guide) {
    notFound();
  }

  const fullName =
    `${guide.user.firstName} ${guide.user.lastName}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Travora Tour Guide
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {fullName}
          </h1>

          <div className="mt-6 flex flex-wrap gap-5 text-sm text-muted-foreground">
            {guide.location && (
              <div className="flex items-center gap-2">
                <MapPin className="size-5" />

                {guide.location}
              </div>
            )}

            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="size-5" />

              {guide.experienceYears} years
              experience
            </div>

            <div className="flex items-center gap-2">
              <Star className="size-5" />

              {guide.averageRating}
              {" "}
              ({guide.totalReviews} reviews)
            </div>
          </div>

          {guide.bio && (
            <p className="mt-8 max-w-3xl text-lg leading-8 text-muted-foreground">
              {guide.bio}
            </p>
          )}

          <section className="mt-12">
            <div className="flex items-center gap-2">
              <Languages className="size-5" />

              <h2 className="text-2xl font-semibold">
                Languages
              </h2>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {guide.languages.map(
                (language) => (
                  <span
                    key={language}
                    className="rounded-full bg-muted px-4 py-2 text-sm"
                  >
                    {language}
                  </span>
                )
              )}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold">
              Specializations
            </h2>

            <div className="mt-5 flex flex-wrap gap-2">
              {guide.specializations.map(
                (specialization) => (
                  <span
                    key={specialization}
                    className="rounded-full border px-4 py-2 text-sm"
                  >
                    {specialization}
                  </span>
                )
              )}
            </div>
          </section>
        </div>

        <aside>
          <div className="sticky top-24 rounded-2xl border p-6">
            <p className="text-sm text-muted-foreground">
              Daily rate
            </p>

            <p className="mt-1 text-3xl font-bold">
              {guide.dailyRate
                ? `$${guide.dailyRate}`
                : "Contact us"}
            </p>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Select this guide as your preferred
              guide when creating a customized
              Travora journey.
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