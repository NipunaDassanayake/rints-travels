"use client";

import { useState } from "react";

import Link from "next/link";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ArrowLeft,
  BriefcaseBusiness,
  LoaderCircle,
  Search,
  Star,
  UserRound,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import {
  deactivateAdminTourGuide,
  getAdminTourGuides,
  updateAdminTourGuideAvailability,
} from "@/features/tour-guides/admin-tour-guide.api";

import { AdminTourGuideCard } from "@/features/tour-guides/components/admin-tour-guide-card";

import type { TourGuide } from "@/features/tour-guides/tour-guide.types";

type AvailabilityFilter = "" | "available" | "unavailable";

export default function AdminGuidesPage() {
  const queryClient = useQueryClient();

  /**
   * =========================================================
   * Filters
   * =========================================================
   */

  const [search, setSearch] = useState("");

  const [availability, setAvailability] = useState<AvailabilityFilter>("");

  const normalizedSearch = search.trim();

  /**
   * =========================================================
   * Guide Query
   * =========================================================
   */

  const {
    data: guides = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin", "guides", normalizedSearch, availability],

    queryFn: () =>
      getAdminTourGuides({
        search: normalizedSearch || undefined,

        isAvailable:
          availability === "" ? undefined : availability === "available",
      }),
  });

  /**
   * =========================================================
   * Availability Mutation
   * =========================================================
   */

  const availabilityMutation = useMutation({
    mutationFn: ({
      guide,
      isAvailable,
    }: {
      guide: TourGuide;
      isAvailable: boolean;
    }) => updateAdminTourGuideAvailability(guide.id, isAvailable),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "guides"],
      });
    },
  });

  /**
   * =========================================================
   * Deactivate Mutation
   * =========================================================
   */

  const deactivateMutation = useMutation({
    mutationFn: (guide: TourGuide) => deactivateAdminTourGuide(guide.id),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "guides"],
      });
    },
  });

  const hasFilters = Boolean(normalizedSearch || availability);

  const clearFilters = () => {
    setSearch("");

    setAvailability("");
  };

  const availableGuides = guides.filter((guide) => guide.isAvailable);

  const unavailableGuides = guides.filter((guide) => !guide.isAvailable);

  const totalReviews = guides.reduce(
    (total, guide) => total + guide.totalReviews,
    0,
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
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

        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Travora administration
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Tour guides
            </h1>

            <p className="mt-3 max-w-2xl text-muted-foreground">
              View guide availability, experience, ratings, locations and
              assigned guide information.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          SUMMARY
      ====================================================== */}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          icon={UserRound}
        />

        <SummaryCard title="Total reviews" value={totalReviews} icon={Star} />
      </section>

      {/* =====================================================
          FILTER PANEL
      ====================================================== */}

      <div className="mt-8 rounded-2xl border bg-card p-5">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_auto]">
          <div className="space-y-2">
            <label htmlFor="guide-search" className="text-sm font-medium">
              Search guides
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                id="guide-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email or location..."
                className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

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

        <div className="mt-5 border-t pt-5">
          <p className="mb-3 text-sm font-medium">Availability</p>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { label: "All", value: "" },
                { label: "Available", value: "available" },
                { label: "Unavailable", value: "unavailable" },
              ] as { label: string; value: AvailabilityFilter }[]
            ).map((filter) => {
              const active = availability === filter.value;

              return (
                <button
                  key={filter.value || "ALL"}
                  type="button"
                  onClick={() => setAvailability(filter.value)}
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
          LOADING
      ====================================================== */}

      {isLoading && (
        <div className="mt-10 flex min-h-64 items-center justify-center">
          <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* =====================================================
          ERROR
      ====================================================== */}

      {isError && (
        <div className="mt-10 rounded-2xl border border-destructive/40 p-6">
          <h2 className="font-semibold">Unable to load tour guides</h2>

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
      )}

      {/* =====================================================
          GUIDE LIST
      ====================================================== */}

      {!isLoading && !isError && guides.length > 0 && (
        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          {guides.map((guide) => (
            <AdminTourGuideCard
              key={guide.id}
              guide={guide}
              isUpdatingAvailability={
                availabilityMutation.isPending &&
                availabilityMutation.variables?.guide.id === guide.id
              }
              isDeactivating={
                deactivateMutation.isPending &&
                deactivateMutation.variables?.id === guide.id
              }
              onAvailabilityChange={(selectedGuide, isAvailable) =>
                availabilityMutation.mutate({
                  guide: selectedGuide,
                  isAvailable,
                })
              }
              onDeactivate={(selectedGuide) =>
                deactivateMutation.mutate(selectedGuide)
              }
            />
          ))}
        </section>
      )}

      {/* =====================================================
          EMPTY STATE
      ====================================================== */}

      {!isLoading && !isError && guides.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed p-10 text-center">
          <UserRound className="mx-auto size-9 text-muted-foreground" />

          <h3 className="mt-4 font-semibold">
            {hasFilters ? "No matching guides" : "No tour guides found"}
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            {hasFilters
              ? "No tour guides match the selected search and filters. Try changing or clearing them."
              : "Tour guides will appear here once they are added."}
          </p>
        </div>
      )}
    </main>
  );
}

/**
 * =========================================================
 * Summary card
 * =========================================================
 */

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
