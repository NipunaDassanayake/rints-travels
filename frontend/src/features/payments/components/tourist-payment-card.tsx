import Link from "next/link";

import { CreditCard, CalendarDays, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import type { Payment } from "@/features/payments/payment.types";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
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

export function TouristPaymentCard({ payment }: { payment: Payment }) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {payment.paymentReference}
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              {payment.quotation.title}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {payment.quotation.quotationNumber}
            </p>
          </div>

          <span className="rounded-full border px-3 py-1 text-xs font-medium">
            {formatStatus(payment.status)}
          </span>
        </div>

        <div className="grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex gap-2">
            <Wallet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">Amount</p>

              <p className="font-medium">
                {payment.currency} {payment.amount}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <CreditCard className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">Payment method</p>

              <p className="font-medium">
                {payment.paymentMethod
                  ? formatStatus(payment.paymentMethod)
                  : "Not specified"}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">Created</p>

              <p className="font-medium">{formatDate(payment.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Payment ID: {payment.id}
          </p>

          <Link
            href={`/tourist/payments/${payment.id}`}
            className={buttonVariants({
              variant: "outline",
            })}
          >
            View payment
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}