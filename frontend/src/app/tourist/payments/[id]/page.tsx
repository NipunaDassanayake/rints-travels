"use client";

import Link from "next/link";

import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  LoaderCircle,
  ReceiptText,
  Wallet,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import { getPaymentById } from "@/features/payments/payment.api";

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TouristPaymentDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

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
  });

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (isError || !payment) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">Unable to load payment</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            The payment could not be loaded or you may not have permission to
            view it.
          </p>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className={buttonVariants({
                variant: "outline",
              })}
            >
              Try again
            </button>

            <Link
              href="/tourist/payments"
              className={buttonVariants({
                variant: "ghost",
              })}
            >
              Back to payments
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Link
          href="/tourist/payments"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to payments
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              Payment
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {payment.quotation.title}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {payment.paymentReference}
            </p>
          </div>

          <span className="rounded-full border px-4 py-2 text-sm font-medium">
            {formatStatus(payment.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment summary</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="flex gap-3">
                <Wallet className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>

                  <p className="mt-1 text-xl font-semibold">
                    {payment.currency} {payment.amount}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CreditCard className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Method</p>

                  <p className="mt-1 font-medium">
                    {payment.paymentMethod
                      ? formatStatus(payment.paymentMethod)
                      : "Not specified"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <CalendarDays className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Created</p>

                  <p className="mt-1 font-medium">
                    {formatDateTime(payment.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <ReceiptText className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Status</p>

                  <p className="mt-1 font-medium">
                    {formatStatus(payment.status)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Related quotation</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <p className="font-semibold">{payment.quotation.title}</p>

              <p className="text-sm text-muted-foreground">
                {payment.quotation.quotationNumber}
              </p>

              <Link
                href={`/tourist/quotations/${payment.quotation.id}`}
                className={buttonVariants({
                  variant: "outline",
                })}
              >
                View quotation
              </Link>
            </CardContent>
          </Card>

          {payment.failureReason && (
            <Card>
              <CardHeader>
                <CardTitle>Failure information</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-destructive">
                  {payment.failureReason}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>References</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Payment reference
                </p>

                <p className="mt-1 break-all font-medium">
                  {payment.paymentReference}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Gateway reference
                </p>

                <p className="mt-1 break-all font-medium">
                  {payment.gatewayReference ?? "Not available"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Paid on</p>

                <p className="mt-1 font-medium">
                  {formatDateTime(payment.paidAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          {payment.status === "SUCCESS" && (
            <Card>
              <CardContent className="pt-6">
                <p className="font-semibold">Payment completed</p>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Your payment was completed successfully. Your confirmed
                  booking is available under My Bookings.
                </p>

                <Link
                  href="/tourist/bookings"
                  className={`${buttonVariants()} mt-4 w-full`}
                >
                  View bookings
                </Link>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </main>
  );
}