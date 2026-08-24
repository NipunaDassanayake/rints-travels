"use client";

import Link from "next/link";

import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  ArrowLeft,
  LoaderCircle,
  PackageOpen,
  Plus,
  Search,
  X,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { getAdminPackages } from "@/features/packages/admin-package.api";

import { AdminPackageCard } from "@/features/packages/components/admin-package-card";

type StatusFilter = "" | "ACTIVE" | "INACTIVE";

const statusFilters: {
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
  /**
   * =========================================================
   * Filters
   * =========================================================
   */

  const [status, setStatus] = useState<StatusFilter>("");

  const [search, setSearch] = useState("");

  const [destination, setDestination] = useState("");

  const normalizedSearch = search.trim();

  const normalizedDestination = destination.trim();

  /**
   * =========================================================
   * Package Query
   * =========================================================
   */

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "admin",
      "packages",
      status,
      normalizedSearch,
      normalizedDestination,
    ],

    queryFn: () =>
      getAdminPackages({
        status,

        title: normalizedSearch || undefined,

        destination: normalizedDestination || undefined,

        limit: 50,
      }),
  });

  const packages = data?.items ?? [];

  /**
   * =========================================================
   * Destination Suggestions
   * =========================================================
   *
   * Suggestions come from the packages currently returned
   * by the API.
   */

  const destinationSuggestions = useMemo(() => {
    const destinations = packages
      .map((travelPackage) => travelPackage.destination)
      .filter(Boolean);

    return [...new Set(destinations)].sort((a, b) => a.localeCompare(b));
  }, [packages]);

  const hasFilters = Boolean(
    status || normalizedSearch || normalizedDestination,
  );

  const clearFilters = () => {
    setStatus("");

    setSearch("");

    setDestination("");
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* =====================================================
          HEADER
      ====================================================== */}

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

      {/* =====================================================
          FILTER PANEL
      ====================================================== */}

      <div className="mb-8 rounded-2xl border bg-card p-5">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_auto]">
          {/* Search */}

          <div className="space-y-2">
            <label htmlFor="package-search" className="text-sm font-medium">
              Search packages
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                id="package-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by package title..."
                className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Destination */}

          <div className="space-y-2">
            <label
              htmlFor="package-destination"
              className="text-sm font-medium"
            >
              Destination
            </label>

            <input
              id="package-destination"
              list="package-destinations"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="Example: Ella"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />

            <datalist id="package-destinations">
              {destinationSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          {/* Clear */}

          <div className="flex items-end">
            <button
              type="button"
              disabled={!hasFilters}
              onClick={clearFilters}
              className={buttonVariants({
                variant: "outline",
              })}
            >
              <X className="size-4" />
              Clear filters
            </button>
          </div>
        </div>

        {/* Status */}

        <div className="mt-5 border-t pt-5">
          <p className="mb-3 text-sm font-medium">Package status</p>

          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
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
        </div>
      </div>

      {/* =====================================================
          RESULT COUNT
      ====================================================== */}

      {!isLoading && !isError && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {data?.pagination.total ?? packages.length}{" "}
            {(data?.pagination.total ?? packages.length) === 1
              ? "package"
              : "packages"}
            {hasFilters ? " matching your filters" : ""}
          </p>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* =====================================================
          LOADING
      ====================================================== */}

      {isLoading && (
        <div className="flex min-h-64 items-center justify-center">
          <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* =====================================================
          ERROR
      ====================================================== */}

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

      {/* =====================================================
          PACKAGE LIST
      ====================================================== */}

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

      {/* =====================================================
          EMPTY STATE
      ====================================================== */}

      {!isLoading && !isError && packages.length === 0 && (
        <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
          <PackageOpen className="mx-auto size-9 text-muted-foreground" />

          <h2 className="mt-4 text-lg font-semibold">
            {hasFilters ? "No matching packages" : "No packages yet"}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {hasFilters
              ? "No travel packages match the selected search and filters. Try changing or clearing them."
              : "Create your first travel package to start building the Travora catalogue."}
          </p>

          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className={`${buttonVariants({
                variant: "outline",
              })} mt-6`}
            >
              <X className="size-4" />
              Clear filters
            </button>
          ) : (
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