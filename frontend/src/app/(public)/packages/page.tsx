import type { Metadata } from "next";

import Link from "next/link";

import { MapPin, X } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";

import { buttonVariants } from "@/components/ui/button";

import {
  getPackages,
} from "@/features/packages/package.api";

import {
  PackageCard,
} from "@/features/packages/components/package-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sri Lanka Travel Packages",
  description:
    "Explore personalized Sri Lanka travel packages and create a journey tailored to your dates, budget, and preferences.",
};

/** Matches the API's limit on the destination field. */
const MAX_DESTINATION_LENGTH = 100;

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { destination: rawDestination } = await searchParams;

  const destination =
    typeof rawDestination === "string"
      ? rawDestination.trim().slice(0, MAX_DESTINATION_LENGTH)
      : "";

  const data = await getPackages(destination ? { destination } : {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Discover Sri Lanka
        </p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Travel packages built to inspire your journey
        </h1>

        <p className="mt-4 text-muted-foreground">
          Browse our travel templates and customize your dates,
          destinations, guide, budget, and travel preferences.
        </p>
      </div>

      {/* Destination search context (CR-029 Stage 2) */}

      {destination && (
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-card border border-border bg-card px-4 py-3">
          <MapPin aria-hidden="true" className="size-5 shrink-0 text-tea-700" />

          <p className="text-body text-foreground">
            Packages in <strong className="font-semibold">&ldquo;{destination}&rdquo;</strong>
            <span className="text-muted-foreground">
              {" "}
              · {data.pagination.total} {data.pagination.total === 1 ? "result" : "results"}
            </span>
          </p>

          <Link
            href="/packages"
            className={`${buttonVariants({ variant: "ghost", size: "sm" })} ml-auto`}
          >
            <X aria-hidden="true" />
            Clear search
          </Link>
        </div>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.items.map((travelPackage) => (
          <PackageCard
            key={travelPackage.id}
            travelPackage={travelPackage}
          />
        ))}
      </div>

      {data.items.length === 0 &&
        (destination ? (
          <EmptyState
            headingLevel="h2"
            title={<>No packages visit &ldquo;{destination}&rdquo; yet</>}
            description="We can still plan a trip there around your dates, or you can browse every package we offer."
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/tourist/requests/new" className={buttonVariants()}>
                  Plan a custom trip
                </Link>

                <Link href="/packages" className={buttonVariants({ variant: "outline" })}>
                  See all packages
                </Link>
              </div>
            }
          />
        ) : (
          <div className="py-20 text-center text-muted-foreground">
            No travel packages are currently available.
          </div>
        ))}
    </div>
  );
}
