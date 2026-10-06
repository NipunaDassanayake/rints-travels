"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import { ReceiptText } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";

import { ErrorState } from "@/components/patterns/error-state";

import { LoadingState } from "@/components/patterns/loading-state";

import { PageHeader } from "@/components/patterns/page-header";

import { buttonVariants } from "@/components/ui/button";

import { getMyQuotations } from "@/features/quotations/quotation.api";

import { TouristQuotationCard } from "@/features/quotations/components/tourist-quotation-card";

/**
 * Traveler quotation list (CR-030 Stage 2 normalization): the same
 * quotations in the same order, on CR-028 patterns.
 */
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

  let content: React.ReactNode;

  if (isLoading) {
    content = <LoadingState variant="skeleton" rows={2} label="Loading your quotations" />;
  } else if (isError) {
    content = (
      <ErrorState
        headingLevel="h2"
        title="Unable to load quotations"
        description="Your quotations could not be retrieved."
        onRetry={() => void refetch()}
      />
    );
  } else if (quotations.length === 0) {
    content = (
      <EmptyState
        headingLevel="h2"
        icon={ReceiptText}
        title="No quotations yet"
        description="Once the Travora team prepares a proposal for one of your journeys, it will appear here."
        action={
          <Link href="/tourist/requests" className={buttonVariants({ variant: "outline" })}>
            View my journeys
          </Link>
        }
        className="py-14"
      />
    );
  } else {
    content = (
      <ul className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        {quotations.map((quotation) => (
          <li key={quotation.id}>
            <TouristQuotationCard quotation={quotation} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <PageHeader
        editorial
        title="My quotations"
        description="Personalized travel proposals prepared for your journeys. Open one to review the itinerary, pricing, guide and included services."
      />

      <div className="mt-8">{content}</div>
    </main>
  );
}
