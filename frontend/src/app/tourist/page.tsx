"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import {
  LoaderCircle,
  Plus,
} from "lucide-react";

import {
  buttonVariants,
} from "@/components/ui/button";

import {
  getMyTourRequests,
} from "@/features/tour-requests/tour-request.api";

import {
  TourRequestCard,
} from "@/features/tour-requests/components/tour-request-card";

export default function TouristDashboard() {
  const {
    data: tourRequests,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "tour-requests",
      "me",
    ],

    queryFn:
      getMyTourRequests,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Tourist dashboard
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            My tour requests
          </h1>

          <p className="mt-2 text-muted-foreground">
            Track your travel requests,
            quotations, and booking progress.
          </p>
        </div>

        <Link
          href="/tourist/requests/new"
          className={buttonVariants()}
        >
          <Plus className="size-4" />
          New request
        </Link>
      </div>

      {isLoading && (
        <div className="flex min-h-64 items-center justify-center">
          <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="mt-8 rounded-xl border border-destructive/40 p-5 text-sm text-destructive">
          Unable to load your tour requests.
        </div>
      )}

      {!isLoading &&
        !isError &&
        tourRequests && (
          <>
            {tourRequests.length > 0 ? (
              <div className="mt-8 grid gap-5">
                {tourRequests.map(
                  (request) => (
                    <TourRequestCard
                      key={request.id}
                      request={request}
                    />
                  )
                )}
              </div>
            ) : (
              <div className="mt-10 rounded-2xl border border-dashed p-12 text-center">
                <h2 className="text-lg font-semibold">
                  No tour requests yet
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  Start by choosing a travel
                  package or creating a custom
                  journey.
                </p>

                <Link
                  href="/packages"
                  className={`${buttonVariants()} mt-6`}
                >
                  Explore packages
                </Link>
              </div>
            )}
          </>
        )}
    </main>
  );
}