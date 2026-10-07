"use client";

import Link from "next/link";

import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { ArrowLeft } from "lucide-react";

import { ErrorState } from "@/components/patterns/error-state";

import { LoadingState } from "@/components/patterns/loading-state";

import { PageHeader } from "@/components/patterns/page-header";

import { StatusBadge } from "@/components/patterns/status-badge";

import { buttonVariants } from "@/components/ui/button";

import { getPaymentById } from "@/features/payments/payment.api";

import { PaymentReceipt } from "@/features/payments/components/payment-receipt";

/** While a received payment's booking is being created, check again. */
const BOOKING_POLL_MS = 5_000;

export default function TouristPaymentDetailsPage() {
  const params = useParams<{ id: string }>();

  const paymentId = params.id;

  const {
    data: payment,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["payment", paymentId],
    queryFn: () => getPaymentById(paymentId),
    enabled: Boolean(paymentId),
    refetchInterval: (query) =>
      query.state.data?.status === "SUCCESS" && !query.state.data.booking ? BOOKING_POLL_MS : false,
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <LoadingState label="Loading your payment" className="min-h-[50vh]" />
      </main>
    );
  }

  if (isError || !payment) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <ErrorState
          headingLevel="h1"
          title="Unable to load payment"
          description="The payment could not be loaded or you may not have permission to view it."
          onRetry={() => void refetch()}
        />

        <div className="mt-4 text-center">
          <Link href="/tourist/payments" className={buttonVariants({ variant: "ghost" })}>
            Back to payments
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/tourist/payments"
        className="inline-flex min-h-10 items-center gap-2 text-body-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to payments
      </Link>

      <PageHeader
        editorial
        className="mt-2"
        overline="Payment"
        title={payment.quotation.title}
        description={payment.paymentReference}
        actions={<StatusBadge entity="payment" status={payment.status} />}
      />

      <div className="mt-8">
        <PaymentReceipt payment={payment} />
      </div>
    </main>
  );
}
