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
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary sm:text-sm">
          Travel proposals
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          My quotations
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Review personalized travel proposals prepared for your requested
          journeys.
        </p>
      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <section className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4">
        <SummaryCard title="Total quotations" value={quotations.length} />

        <SummaryCard title="Awaiting response" value={sentCount} />

        <SummaryCard title="Accepted" value={acceptedCount} />

        <SummaryCard title="Rejected" value={rejectedCount} />
      </section>

      {/* =====================================================
          QUOTATIONS
      ===================================================== */}

      <section className="mt-8 sm:mt-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Your quotations
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Open a quotation to review the itinerary, pricing, guide and
            included services.
          </p>
        </div>

        {quotations.length > 0 ? (
          <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-5 lg:grid-cols-2">
            {quotations.map((quotation) => (
              <QuotationCard key={quotation.id} quotation={quotation} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed p-8 text-center sm:p-12">
            <FileText className="mx-auto size-8 text-muted-foreground sm:size-9" />

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

/**
 * =========================================================
 * Summary Card
 * =========================================================
 */

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3.5 sm:p-5">
        <p className="text-xs leading-4 text-muted-foreground sm:text-sm">
          {title}
        </p>

        <p className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}

/**
 * =========================================================
 * Quotation Card
 * =========================================================
 */

function QuotationCard({ quotation }: { quotation: Quotation }) {
  const guide = quotation.guide;

  const guideName = guide
    ? `${guide.user.firstName} ${guide.user.lastName}`
    : "Not assigned";

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="break-all text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-xs sm:tracking-[0.16em]">
              {quotation.quotationNumber}
            </p>

            <h3 className="mt-2 text-lg font-semibold sm:text-xl">
              {quotation.title}
            </h3>

            <p className="mt-2 text-xs text-muted-foreground">
              Revision {quotation.revisionNumber}
            </p>
          </div>

          <span className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium">
            {formatStatus(quotation.status)}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-5">
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

        <div className="mt-5 flex border-t pt-4 sm:mt-6 sm:justify-end sm:pt-5">
          <Link
            href={`/tourist/quotations/${quotation.id}`}
            className={`${buttonVariants({
              variant: "outline",
            })} w-full sm:w-auto`}
          >
            View quotation
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}