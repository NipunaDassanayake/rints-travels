import type { Metadata } from "next";

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

export default async function PackagesPage() {
  const data = await getPackages();

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

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.items.map((travelPackage) => (
          <PackageCard
            key={travelPackage.id}
            travelPackage={travelPackage}
          />
        ))}
      </div>

      {data.items.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">
          No travel packages are currently available.
        </div>
      )}
    </div>
  );
}