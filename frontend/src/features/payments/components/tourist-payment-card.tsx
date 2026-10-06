import Link from "next/link";

import { ArrowRight, CalendarDays, CreditCard, Wallet } from "lucide-react";

import { DescriptionList } from "@/components/patterns/description-list";

import { StatusBadge } from "@/components/patterns/status-badge";

import { buttonVariants } from "@/components/ui/button";

import { formatDate, formatMoney, formatStatusLabel } from "@/lib/format";

import type { Payment } from "@/features/payments/payment.types";

/**
 * A started payment the traveler can continue: still PENDING, for
 * an accepted quotation, with no booking yet. "Resume payment"
 * only links to that quotation, where the traveler chooses to pay
 * (the existing checkout flow reuses an open session); nothing is
 * started from here.
 */
export function canResumePayment(payment: Payment) {
  return (
    payment.status === "PENDING" &&
    payment.quotation?.status === "ACCEPTED" &&
    !payment.booking
  );
}

/**
 * A payment in the traveler's payment list (CR-030 Stage 2
 * normalization): reference, quotation, status, amount, method and
 * date -- no internal ids.
 */
export function TouristPaymentCard({ payment }: { payment: Payment }) {
  const titleId = `payment-${payment.id}-title`;

  const identity = `${payment.paymentReference}: ${payment.quotation.title}`;

  return (
    <article aria-labelledby={titleId} className="rounded-card border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-caption font-medium tracking-wide text-muted-foreground">
            {payment.paymentReference}
          </p>

          <h2 id={titleId} className="mt-1 text-heading-md text-foreground">
            {payment.quotation.title}
          </h2>

          <p className="mt-1 text-caption text-muted-foreground">
            {payment.quotation.quotationNumber}
          </p>
        </div>

        <StatusBadge entity="payment" status={payment.status} />
      </div>

      <DescriptionList
        columns={3}
        className="mt-5"
        items={[
          {
            term: "Amount",
            icon: Wallet,
            value: formatMoney(payment.amount, payment.currency),
          },
          {
            term: "Payment method",
            icon: CreditCard,
            value: payment.paymentMethod ? formatStatusLabel(payment.paymentMethod) : "Not specified",
          },
          {
            term: "Created",
            icon: CalendarDays,
            value: formatDate(payment.createdAt, { fallback: "Not available" }),
          },
        ]}
      />

      <div className="mt-5 flex flex-wrap justify-end gap-3 border-t pt-4">
        {canResumePayment(payment) && (
          <Link
            href={`/tourist/quotations/${payment.quotationId}`}
            className={`${buttonVariants()} w-full sm:w-auto`}
          >
            Resume payment
            <span className="sr-only"> {identity}</span>
            <ArrowRight aria-hidden="true" />
          </Link>
        )}

        <Link
          href={`/tourist/payments/${payment.id}`}
          className={`${buttonVariants({ variant: "outline" })} w-full sm:w-auto`}
        >
          View payment
          <span className="sr-only"> {identity}</span>
        </Link>
      </div>
    </article>
  );
}
