import type {
  Metadata,
} from "next";

import {
  getTourGuides,
} from "@/features/tour-guides/tour-guide.api";

import {
  TourGuideCard,
} from "@/features/tour-guides/components/tour-guide-card";

export const metadata: Metadata = {
  title: "Sri Lanka Tour Guides",

  description:
    "Discover experienced Sri Lanka tour guides and find a guide who matches your language, interests, and travel style.",
};

export default async function GuidesPage() {
  const guides = await getTourGuides();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Travel with local expertise
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Meet our tour guides
        </h1>

        <p className="mt-4 leading-7 text-muted-foreground">
          Discover experienced guides who can
          personalize your Sri Lanka journey
          around your interests, language,
          destinations, and travel style.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <TourGuideCard
            key={guide.id}
            guide={guide}
          />
        ))}
      </div>

      {guides.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">
          No tour guides are currently available.
        </div>
      )}
    </div>
  );
}