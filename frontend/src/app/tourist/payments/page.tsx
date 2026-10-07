"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import { CreditCard } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";

import { ErrorState } from "@/components/patterns/error-state";

import { LoadingState } from "@/components/patterns/loading-state";

import { PageHeader } from "@/components/patterns/page-header";

import { buttonVariants } from "@/components/ui/button";

import { getMyPayments } from "@/features/payments/payment.api";

import { TouristPaymentCard } from "@/features/payments/components/tourist-payment-card";

/**
 * Traveler payment list (CR-030 Stage 2 normalization): the same
 * payments in the same order, on CR-028 patterns.
 */
export default function TouristPaymentsPage() {
  const {
    data: payments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["payments", "me"],
    queryFn: getMyPayments,
  });

  let content: React.ReactNode;

  if (isLoading) {
    content = <LoadingState variant="skeleton" rows={2} label="Loading your payments" />;
  } else if (isError) {
    content = (
      <ErrorState
        headingLevel="h2"
        title="Unable to load payments"
        description="We couldn't retrieve your payments. Please try again."
        onRetry={() => void refetch()}
      />
    );
  } else if (payments.length === 0) {
    content = (
      <EmptyState
        headingLevel="h2"
        icon={CreditCard}
        title="No payments yet"
        description="Payments will appear here after you accept a quotation and start the payment process."
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
      <ul className="space-y-4 sm:space-y-5">
        {payments.map((payment) => (
          <li key={payment.id}>
            <TouristPaymentCard payment={payment} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <PageHeader
        editorial
        title="My Payments"
        description="Your payment history: references, amounts, methods and statuses."
      />

      <div className="mt-8">{content}</div>
    </main>
  );
}
