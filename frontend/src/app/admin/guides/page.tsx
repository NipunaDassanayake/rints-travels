"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import {
  BriefcaseBusiness,
  Languages,
  LoaderCircle,
  MapPin,
  Star,
  UserRound,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import { getTourGuides } from "@/features/tour-guides/tour-guide.api";

import type { TourGuide } from "@/features/tour-guides/tour-guide.types";

function formatRating(value: string | number) {
  const rating = Number(value) || 0;

  return rating.toFixed(1);
}

export default function AdminGuidesPage() {
  const {
    data: guides = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "guides"],

    queryFn: getTourGuides,
  });

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">Unable to load tour guides</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Tour guide information could not be retrieved.
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            className={`${buttonVariants({
              variant: "outline",
            })} mt-5`}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  const availableGuides = guides.filter((guide) => guide.isAvailable);

  const unavailableGuides = guides.filter((guide) => !guide.isAvailable);

  const totalReviews = guides.reduce(
    (total, guide) => total + guide.totalReviews,
    0,
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Travora administration
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Tour guides
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            View guide availability, experience, ratings, locations and assigned
            guide information.
          </p>
        </div>

        <Link
          href="/admin"
          className={buttonVariants({
            variant: "outline",
          })}
        >
          Back to dashboard
        </Link>
      </div>

      {/* Summary */}

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total guides"
          value={guides.length}
          icon={UserRound}
        />

        <SummaryCard
          title="Available"
          value={availableGuides.length}
          icon={BriefcaseBusiness}
        />

        <SummaryCard
          title="Unavailable"
          value={unavailableGuides.length}
          icon={MapPin}
        />

        <SummaryCard title="Total reviews" value={totalReviews} icon={Star} />
      </section>

      {/* Guide list */}

      <section className="mt-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Guide directory</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            All registered Travora tour guides.
          </p>
        </div>

        {guides.length > 0 ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {guides.map((guide) => (
              <GuideAdminCard key={guide.id} guide={guide} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed p-10 text-center">
            <UserRound className="mx-auto size-9 text-muted-foreground" />

            <h3 className="mt-4 font-semibold">No tour guides found</h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Tour guides will appear here once they are added.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof UserRound;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>

          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>

        <div className="flex size-11 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function GuideAdminCard({ guide }: { guide: TourGuide }) {
  const fullName = `${guide.user.firstName} ${guide.user.lastName}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">{fullName}</CardTitle>

            {guide.location && (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4" />

                {guide.location}
              </div>
            )}
          </div>

          <span className="rounded-full border px-3 py-1 text-xs font-medium">
            {guide.isAvailable ? "Available" : "Unavailable"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6">
        {guide.bio && (
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {guide.bio}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3">
            <BriefcaseBusiness className="mt-0.5 size-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Experience</p>

              <p className="mt-1 text-sm font-medium">
                {guide.experienceYears}{" "}
                {guide.experienceYears === 1 ? "year" : "years"}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Star className="mt-0.5 size-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Rating</p>

              <p className="mt-1 text-sm font-medium">
                {guide.totalReviews > 0
                  ? `${formatRating(guide.averageRating)} · ${guide.totalReviews} ${
                      guide.totalReviews === 1 ? "review" : "reviews"
                    }`
                  : "No reviews yet"}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Languages className="mt-0.5 size-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Languages</p>

              <p className="mt-1 text-sm font-medium">
                {guide.languages.length > 0
                  ? guide.languages.join(", ")
                  : "Not specified"}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Wallet className="mt-0.5 size-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Daily rate</p>

              <p className="mt-1 text-sm font-medium">
                {guide.dailyRate ? `USD ${guide.dailyRate}` : "Not specified"}
              </p>
            </div>
          </div>
        </div>

        {guide.specializations.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Specializations</p>

            <div className="mt-2 flex flex-wrap gap-2">
              {guide.specializations.slice(0, 4).map((specialization) => (
                <span
                  key={specialization}
                  className="rounded-full bg-muted px-3 py-1 text-xs"
                >
                  {specialization}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end border-t pt-5">
          <Link
            href={`/guides/${guide.id}`}
            className={buttonVariants({
              variant: "outline",
            })}
          >
            View public profile
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}