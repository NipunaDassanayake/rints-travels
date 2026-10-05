import type { Metadata } from "next";

import Link from "next/link";

import { redirect } from "next/navigation";

import { ArrowRight, MapPinned, SearchX } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";

import { CustomTripCta } from "@/components/public/custom-trip-cta";

import { buttonVariants } from "@/components/ui/button";

import {
  getPackages,
} from "@/features/packages/package.api";

import {
  isCanonicalPackagesQuery,
  packagesHref,
  packagesListingState,
  parsePackageSearch,
  toPackageApiQuery,
} from "@/features/packages/package-query";

import {
  PackageCard,
} from "@/features/packages/components/package-card";

import { PackageResultsSummary } from "@/features/packages/components/package-results-summary";

import { PackageSearchForm } from "@/features/packages/components/package-search-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sri Lanka Travel Packages",
  description:
    "Explore personalized Sri Lanka travel packages and create a journey tailored to your dates, budget, and preferences.",
};

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const rawSearchParams = await searchParams;

  const search = parsePackageSearch(rawSearchParams);

  // Keep the address bar canonical (no empty fields, default sort,
  // repeated or unknown parameters). Works with and without JS.
  if (!isCanonicalPackagesQuery(rawSearchParams, search)) {
    redirect(packagesHref(search));
  }

  const data = await getPackages(toPackageApiQuery(search));

  const listingState = packagesListingState(data.items.length, search);

  const hasResults = listingState === "results";

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-overline text-tea-700">
            Discover Sri Lanka
          </p>

          <h1 className="mt-3 text-balance font-display text-display-lg text-foreground">
            Travel packages built to inspire your journey
          </h1>

          <p className="mt-4 text-body-lg text-foreground-secondary">
            Browse our travel templates and customize your dates,
            destinations, guide, budget, and travel preferences.
          </p>
        </div>

        {listingState === "empty-catalog" ? (
          <EmptyState
            headingLevel="h2"
            icon={MapPinned}
            title="No journeys are listed right now"
            description="New packages will appear here as soon as they are published. Until then, tell us where you would like to go and we will plan a trip around your dates and interests."
            action={
              <Link href="/tourist/requests/new" className={buttonVariants({ size: "lg" })}>
                Plan a custom trip
                <ArrowRight aria-hidden="true" />
              </Link>
            }
            className="mt-10 py-14"
          />
        ) : (
          <>
            {/* Discovery (CR-029 Stage 3A) */}

            <div className="mt-8">
              <PackageSearchForm key={packagesHref(search)} search={search} />
            </div>

            <div className="mt-6">
              <PackageResultsSummary
                total={data.pagination.total}
                shown={data.items.length}
                search={search}
              />
            </div>

            {hasResults ? (
              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.items.map((travelPackage) => (
                  <PackageCard
                    key={travelPackage.id}
                    travelPackage={travelPackage}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                headingLevel="h2"
                icon={SearchX}
                title="No journeys match your search"
                description="Try another destination or package name, or clear your filters to see every journey. We can also plan a trip around the places you have in mind."
                action={
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link href="/packages" className={buttonVariants()}>
                      Clear all filters
                    </Link>

                    <Link
                      href="/tourist/requests/new"
                      className={buttonVariants({ variant: "outline" })}
                    >
                      Plan a custom trip
                    </Link>
                  </div>
                }
                className="mt-8 py-12"
              />
            )}
          </>
        )}
      </div>

      {/* Empty states carry their own custom-trip action instead. */}
      {hasResults && <CustomTripCta showBrowseLink={false} className="pt-4 sm:pt-8" />}
    </>
  );
}
