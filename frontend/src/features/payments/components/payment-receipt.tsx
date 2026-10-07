import Link from "next/link";

import { CircleCheck, CircleX, Clock3, Wallet } from "lucide-react";

import { DescriptionList } from "@/components/patterns/description-list";

import { StatusBadge } from "@/components/patterns/status-badge";

import { buttonVariants } from "@/components/ui/button";

import { formatMoment } from "@/features/quotations/quotation-validity";

import { formatMoney, formatStatusLabel } from "@/lib/format";

import { cn } from "@/lib/utils";

import type { Payment } from "../payment.types";

import { canResumePayment } from "./tourist-payment-card";

type Tone = "success" | "neutral" | "warning";

interface Explanation {
  title: string;
  message: string;
  tone: Tone;
  icon: typeof Wallet;
  action?: { label: string; href: string; primary?: boolean };
}

/**
 * What a payment means for the traveler, in plain words
 * (CR-030 Stage 4). Never claims a booking before one exists and
 * never repeats provider details (gateway ids, raw failure text).
 */
function explain(payment: Payment): Explanation {
  const quotationHref = `/tourist/quotations/${payment.quotationId}`;

  switch (payment.status) {
    case "SUCCESS":
      return payment.booking
        ? {
            title: "Payment received · Booking confirmed",
            message: "Your payment was received and your booking is confirmed.",
            tone: "success",
            icon: CircleCheck,
            action: { label: "View booking", href: `/tourist/bookings/${payment.booking.id}`, primary: true },
          }
        : {
            title: "Payment received",
            message:
              "Your payment was received and your booking is being finalized. You don't need to pay again; this page updates when the booking is ready.",
            tone: "success",
            icon: CircleCheck,
          };
    case "PENDING":
      return canResumePayment(payment)
        ? {
            title: "Payment not completed yet",
            message:
              "You started this payment but it hasn't been completed. You can resume it from your quotation whenever you're ready.",
            tone: "warning",
            icon: Clock3,
            action: { label: "Resume payment", href: quotationHref, primary: true },
          }
        : {
            title: "Payment not completed",
            message: "This payment hasn't been completed.",
            tone: "warning",
            icon: Clock3,
          };
    case "PROCESSING":
      return {
        title: "Payment processing",
        message: "Your payment is being processed. You don't need to pay again.",
        tone: "neutral",
        icon: Clock3,
      };
    case "FAILED":
      return {
        title: "Payment didn't go through",
        message: "This payment attempt was not successful, so no booking was made. You can try again from your quotation.",
        tone: "warning",
        icon: CircleX,
        action: { label: "Return to quotation", href: quotationHref, primary: true },
      };
    case "CANCELLED":
      return {
        title: "Payment cancelled",
        message: "This payment was cancelled before it was completed.",
        tone: "neutral",
        icon: CircleX,
        action: { label: "Return to quotation", href: quotationHref },
      };
    case "REFUNDED":
      return {
        title: "Payment refunded",
        message: "This payment was refunded.",
        tone: "neutral",
        icon: Wallet,
      };
    default:
      return { title: formatStatusLabel(payment.status), message: "", tone: "neutral", icon: Wallet };
  }
}

const TONE_CLASSES: Record<Tone, string> = {
  success: "border-success-border bg-success-soft",
  neutral: "border-sand-300 bg-sand-50",
  warning: "border-warning-border bg-warning-soft",
};

const ICON_CLASSES: Record<Tone, string> = {
  success: "text-success-ink",
  neutral: "text-muted-foreground",
  warning: "text-warning-ink",
};

/**
 * A calm receipt for one payment (CR-030 Stage 4): amount and state
 * first, then the traveler-useful details.
 */
export function PaymentReceipt({ payment }: { payment: Payment }) {
  const explanation = explain(payment);

  const Icon = explanation.icon;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-8">
      <div className="space-y-6">
        <section aria-labelledby="payment-state" className={cn("rounded-card border p-5 sm:p-6", TONE_CLASSES[explanation.tone])}>
          <p className="text-body-sm text-muted-foreground">Amount</p>

          <p className="mt-1 text-display-md font-display text-foreground" data-testid="payment-amount">
            {formatMoney(payment.amount, payment.currency)}
          </p>

          <div className="mt-5 flex gap-3" role="status">
            <Icon aria-hidden="true" className={cn("mt-0.5 size-5 shrink-0", ICON_CLASSES[explanation.tone])} />

            <div>
              <h2 id="payment-state" className="text-heading-md text-foreground">
                {explanation.title}
              </h2>

              {explanation.message && (
                <p className="mt-1 text-body-sm text-foreground-secondary">{explanation.message}</p>
              )}
            </div>
          </div>

          {explanation.action && (
            <Link
              href={explanation.action.href}
              className={cn(
                buttonVariants({ variant: explanation.action.primary ? "default" : "outline" }),
                "mt-5 w-full sm:w-auto",
              )}
            >
              {explanation.action.label}
            </Link>
          )}
        </section>

        <section aria-labelledby="payment-details" className="rounded-card border bg-card p-5 sm:p-6">
          <h2 id="payment-details" className="text-heading-md text-foreground">
            Payment details
          </h2>

          <DescriptionList
            className="mt-4"
            items={[
              { term: "Payment reference", value: payment.paymentReference },
              {
                term: "Payment method",
                value: payment.paymentMethod ? formatStatusLabel(payment.paymentMethod) : "Not specified",
              },
              { term: "Started", value: formatMoment(payment.createdAt) },
              ...(payment.paidAt ? [{ term: "Paid", value: formatMoment(payment.paidAt) }] : []),
            ]}
          />
        </section>
      </div>

      <aside aria-labelledby="payment-for" className="space-y-4">
        <section className="rounded-card border bg-card p-5">
          <h2 id="payment-for" className="text-heading-sm text-foreground">
            Payment for
          </h2>

          <p className="mt-2 font-medium text-foreground">{payment.quotation.title}</p>

          <p className="mt-1 text-caption text-muted-foreground">Quotation {payment.quotation.quotationNumber}</p>

          <div className="mt-3">
            <StatusBadge entity="quotation" status={payment.quotation.status} />
          </div>

          <Link
            href={`/tourist/quotations/${payment.quotationId}`}
            className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}
          >
            View quotation
          </Link>
        </section>
      </aside>
    </div>
  );
}
