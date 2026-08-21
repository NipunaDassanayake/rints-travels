"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import {
  CalendarDays,
  FileText,
  LoaderCircle,
  UserRound,
  Wallet,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import { getMyQuotations } from "@/features/quotations/quotation.api";

import type { Quotation } from "@/features/quotations/quotation.types";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TouristQuotationsPage() {
  const {
    data: quotations = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["quotations", "me"],
    queryFn: getMyQuotations,
  });

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">Unable to load quotations</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Your quotations could not be retrieved.
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
      </main>
    );
  }

  const sentCount = quotations.filter(
    (quotation) => quotation.status === "SENT",
  ).length;

  const acceptedCount = quotations.filter(
    (quotation) => quotation.status === "ACCEPTED",
  ).length;

  const rejectedCount = quotations.filter(
    (quotation) => quotation.status === "REJECTED",
  ).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
          Travel proposals
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          My quotations
        </h1>

        <p className="mt-3 max-w-2xl text-muted-foreground">
          Review personalized travel proposals prepared for your requested
          journeys.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard title="Total quotations" value={quotations.length} />

        <SummaryCard title="Awaiting response" value={sentCount} />

        <SummaryCard title="Accepted" value={acceptedCount} />

        <SummaryCard title="Rejected" value={rejectedCount} />
      </div>

      <section className="mt-10">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your quotations</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Open a quotation to review the itinerary, pricing, guide and
            included services.
          </p>
        </div>

        {quotations.length > 0 ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {quotations.map((quotation) => (
              <QuotationCard key={quotation.id} quotation={quotation} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed p-12 text-center">
            <FileText className="mx-auto size-9 text-muted-foreground" />

            <h3 className="mt-4 font-semibold">No quotations yet</h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Once the Travora team prepares a proposal for one of your tour
              requests, it will appear here.
            </p>

            <Link
              href="/tourist/requests"
              className={`${buttonVariants({
                variant: "outline",
              })} mt-6`}
            >
              View my requests
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>

        <p className="mt-2 text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function QuotationCard({ quotation }: { quotation: Quotation }) {
  const guide = quotation.guide;

  const guideName = guide
    ? `${guide.user.firstName} ${guide.user.lastName}`
    : "Not assigned";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {quotation.quotationNumber}
            </p>

            <h3 className="mt-2 text-xl font-semibold">{quotation.title}</h3>

            <p className="mt-2 text-xs text-muted-foreground">
              Revision {quotation.revisionNumber}
            </p>
          </div>

          <span className="rounded-full border px-3 py-1 text-xs font-medium">
            {formatStatus(quotation.status)}
          </span>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Travel dates</p>

              <p className="mt-1 text-sm font-medium">
                {formatDate(quotation.startDate)}

                {" → "}

                {formatDate(quotation.endDate)}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <UserRound className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Tour guide</p>

              <p className="mt-1 text-sm font-medium">{guideName}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Wallet className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Total</p>

              <p className="mt-1 text-lg font-semibold">
                {quotation.currency} {quotation.totalAmount}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t pt-5">
          <Link
            href={`/tourist/quotations/${quotation.id}`}
            className={buttonVariants({
              variant: "outline",
            })}
          >
            View quotation
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}