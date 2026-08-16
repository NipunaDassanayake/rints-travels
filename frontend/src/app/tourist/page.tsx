"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import {
  CalendarCheck2,
  CreditCard,
  FileText,
  LoaderCircle,
  Plus,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import { getMyTourRequests } from "@/features/tour-requests/tour-request.api";

import { TourRequestCard } from "@/features/tour-requests/components/tour-request-card";

export default function TouristDashboard() {
  const {
    data: tourRequests,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["tour-requests", "me"],

    queryFn: getMyTourRequests,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Tourist dashboard
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            My travel dashboard
          </h1>

          <p className="mt-2 max-w-2xl text-muted-foreground">
            Track your tour requests, quotations, payments, and confirmed
            bookings in one place.
          </p>
        </div>

        <Link href="/tourist/requests/new" className={buttonVariants()}>
          <Plus className="size-4" />
          New request
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/tourist" className="block">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <FileText className="size-5" />
              </div>

              <CardTitle className="mt-3">My Tour Requests</CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                View your submitted requests, quotations, and current progress.
              </p>

              {!isLoading && !isError && tourRequests && (
                <p className="mt-4 text-sm font-medium">
                  {tourRequests.length}{" "}
                  {tourRequests.length === 1 ? "request" : "requests"}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/tourist/payments" className="block">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <CreditCard className="size-5" />
              </div>

              <CardTitle className="mt-3">My Payments</CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Review your payment history, payment references, and payment
                statuses.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/tourist/bookings" className="block">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <CalendarCheck2 className="size-5" />
              </div>

              <CardTitle className="mt-3">My Bookings</CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                View confirmed trips, travel dates, payment details, itinerary,
                and tour guide information.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <section className="mt-12">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            My tour requests
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Your latest travel requests and their current progress.
          </p>
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

        {!isLoading && !isError && tourRequests && (
          <>
            {tourRequests.length > 0 ? (
              <div className="mt-6 grid gap-5">
                {tourRequests.map((request) => (
                  <TourRequestCard key={request.id} request={request} />
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-dashed p-12 text-center">
                <h2 className="text-lg font-semibold">No tour requests yet</h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  Start by choosing a travel package or creating a custom
                  journey.
                </p>

                <Link href="/packages" className={`${buttonVariants()} mt-6`}>
                  Explore packages
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}