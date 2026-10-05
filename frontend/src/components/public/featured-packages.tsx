import Link from "next/link";

import { ArrowRight, Compass } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import { PackageCard } from "@/features/packages/components/package-card";

import { getPackages } from "@/features/packages/package.api";

import type { TravelPackage } from "@/features/packages/package.types";

import { PublicSection } from "./public-section";

import { SnapRow } from "./snap-row";

/*
 * Featured packages (CR-029): the three newest ACTIVE packages.
 *   3+     -> three cards
 *   1-2    -> the real cards plus a custom-trip panel (not a package)
 *   0/fail -> a custom-trip prompt only
 * A failed request is logged and never breaks the homepage or the
 * build; visitors see no error text on a marketing page.
 */

async function loadFeaturedPackages(): Promise<TravelPackage[]> {
  try {
    const data = await getPackages();

    return data.items
      .filter((travelPackage) => travelPackage.status === "ACTIVE")
      .slice(0, 3);
  } catch (error) {
    console.error("Unable to load featured packages:", error);

    return [];
  }
}

export async function FeaturedPackages() {
  const featuredPackages = await loadFeaturedPackages();

  const hasPackages = featuredPackages.length > 0;

  return (
    <PublicSection
      id="featured-packages"
      tone="sand"
      overline="Featured packages"
      title="Journeys to start from"
      description="Curated itineraries you can take as they are, or reshape with us: dates, pace, stays and guide."
      action={
        hasPackages ? (
          <Link href="/packages" className={buttonVariants({ variant: "outline" })}>
            Browse all packages
            <ArrowRight aria-hidden="true" />
          </Link>
        ) : undefined
      }
    >
      {hasPackages ? (
        /*
         * Snap row below `lg` (no 2+1 orphan on tablets), 3-column
         * grid from `lg`. The py-2 keeps the cards' outside focus
         * ring inside the scroll container.
         */
        <SnapRow
          className={cn(
            "mt-8 -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 py-2 sm:-mx-6 sm:scroll-px-6 sm:px-6",
            "lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {featuredPackages.map((travelPackage) => (
            <li key={travelPackage.id} className="w-[85%] shrink-0 snap-start sm:w-[44%] lg:w-auto">
              <PackageCard travelPackage={travelPackage} headingLevel="h3" />
            </li>
          ))}

          {featuredPackages.length < 3 && (
            <li className="w-[85%] shrink-0 snap-start sm:w-[44%] lg:w-auto">
              <CustomTripPanel className="h-full" />
            </li>
          )}
        </SnapRow>
      ) : (
        <CustomTripPanel className="mt-10" wide />
      )}
    </PublicSection>
  );
}

function CustomTripPanel({ className, wide = false }: { className?: string; wide?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center rounded-2xl border border-dashed border-sand-300 bg-card p-6 sm:p-8",
        wide && "sm:flex-row sm:items-center sm:justify-between sm:gap-8",
        className,
      )}
    >
      <div className={cn(wide && "sm:max-w-xl")}>
        <span
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-full bg-tea-50 text-tea-700"
        >
          <Compass className="size-5" />
        </span>

        <h3 className="mt-4 font-display text-heading-md text-foreground">
          {wide ? "Start with a custom trip" : "Have something else in mind?"}
        </h3>

        <p className="mt-2 text-body-sm text-foreground-secondary">
          Tell us where and when you&apos;d like to travel, and we&apos;ll shape a
          journey around you.
        </p>
      </div>

      <Link
        href="/tourist/requests/new"
        className={cn(buttonVariants(), "mt-5 self-start", wide && "sm:mt-0 sm:self-center")}
      >
        Plan a custom trip
      </Link>
    </div>
  );
}
