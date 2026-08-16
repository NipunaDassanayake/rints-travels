"use client";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";

import { ArrowLeft, CreditCard, LoaderCircle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { getMyPayments } from "@/features/payments/payment.api";

import { TouristPaymentCard } from "@/features/payments/components/tourist-payment-card";

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

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Link
          href="/tourist"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <CreditCard className="size-5" />

              <p className="text-sm font-medium uppercase tracking-wide">
                Payments
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              My Payments
            </h1>

            <p className="mt-2 max-w-2xl text-muted-foreground">
              View your payment history, payment references, methods, and
              payment statuses.
            </p>
          </div>

          {!isError && (
            <div className="rounded-full border px-4 py-2 text-sm">
              {payments.length} {payments.length === 1 ? "payment" : "payments"}
            </div>
          )}
        </div>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h2 className="font-semibold">Unable to load payments</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t retrieve your payments. Please try again.
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
      ) : payments.length > 0 ? (
        <div className="space-y-5">
          {payments.map((payment) => (
            <TouristPaymentCard key={payment.id} payment={payment} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
          <CreditCard className="mx-auto size-8 text-muted-foreground" />

          <h2 className="mt-4 text-lg font-semibold">No payments yet</h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Payments will appear here after you accept a quotation and start the
            payment process.
          </p>
        </div>
      )}
    </main>
  );
}