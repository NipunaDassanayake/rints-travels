"use client";

import Link from "next/link";

import { useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { ArrowLeft, LoaderCircle, PackageOpen, Plus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { getAdminPackages } from "@/features/packages/admin-package.api";

import { AdminPackageCard } from "@/features/packages/components/admin-package-card";

type StatusFilter = "" | "ACTIVE" | "INACTIVE";

const filters: {
  label: string;
  value: StatusFilter;
}[] = [
  {
    label: "All",
    value: "",
  },
  {
    label: "Active",
    value: "ACTIVE",
  },
  {
    label: "Inactive",
    value: "INACTIVE",
  },
];

export default function AdminPackagesPage() {
  const [status, setStatus] = useState<StatusFilter>("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "packages", status],

    queryFn: () =>
      getAdminPackages({
        status,
        limit: 50,
      }),
  });

  const packages = data?.items ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <PackageOpen className="size-5" />

              <p className="text-sm font-medium uppercase tracking-wide">
                Package management
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Travel Packages
            </h1>

            <p className="mt-2 max-w-2xl text-muted-foreground">
              Create and manage package details, images, itineraries,
              inclusions, exclusions, FAQs, pricing and visibility.
            </p>
          </div>

          <Link href="/admin/packages/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Create Package
          </Link>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {filters.map((filter) => {
            const active = status === filter.value;

            return (
              <button
                key={filter.value || "ALL"}
                type="button"
                onClick={() => setStatus(filter.value)}
                className={
                  active
                    ? buttonVariants()
                    : buttonVariants({
                        variant: "outline",
                      })
                }
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {!isLoading && !isError && (
          <p className="text-sm text-muted-foreground">
            {data?.pagination.total ?? packages.length} packages
          </p>
        )}
      </div>

      {isLoading && (
        <div className="flex min-h-64 items-center justify-center">
          <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h2 className="font-semibold">Unable to load packages</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t retrieve the package list.
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
      )}

      {!isLoading && !isError && packages.length > 0 && (
        <div className="grid gap-5">
          {packages.map((travelPackage) => (
            <AdminPackageCard
              key={travelPackage.id}
              travelPackage={travelPackage}
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && packages.length === 0 && (
        <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
          <PackageOpen className="mx-auto size-9 text-muted-foreground" />

          <h2 className="mt-4 text-lg font-semibold">No packages found</h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {status
              ? `There are currently no ${status.toLowerCase()} packages.`
              : "Create your first travel package to start building the Travora catalogue."}
          </p>

          {!status && (
            <Link
              href="/admin/packages/new"
              className={`${buttonVariants()} mt-6`}
            >
              <Plus className="size-4" />
              Create Package
            </Link>
          )}
        </div>
      )}
    </main>
  );
}