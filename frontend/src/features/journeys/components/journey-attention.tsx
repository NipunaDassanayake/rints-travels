import Link from "next/link";

import { ArrowRight, BellRing, CreditCard, ReceiptText, Star } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { formatDate, formatMoney } from "@/lib/format";

import { cn } from "@/lib/utils";

import type { Journey, JourneyActionKind } from "../journey";

const ACTION_COPY: Partial<
  Record<JourneyActionKind, { overline: string; icon: typeof BellRing; describe: (journey: Journey) => string }>
> = {
  RESUME_PAYMENT: {
    overline: "Payment started",
    icon: CreditCard,
    describe: () =>
      "You started a payment for this trip. Resume it to confirm your booking.",
  },
  PAY: {
    overline: "Payment due",
    icon: CreditCard,
    describe: () =>
      "You accepted this quotation. Complete the payment to confirm your booking.",
  },
  REVIEW_QUOTATION: {
    overline: "Quotation ready",
    icon: ReceiptText,
    describe: () =>
      "Your quotation is ready. Review the itinerary and price, then accept or decline it.",
  },
  LEAVE_REVIEW: {
    overline: "Trip completed",
    icon: Star,
    describe: (journey) =>
      journey.guide
        ? `How was your trip with ${journey.guide.firstName}? Your review helps other travelers choose their guide.`
        : "How was your trip? Your review helps other travelers.",
  },
};

function amountFor(journey: Journey) {
  const { quotation } = journey;

  if (!quotation || journey.action?.kind === "LEAVE_REVIEW") {
    return null;
  }

  return formatMoney(quotation.totalAmount, quotation.currency);
}

/**
 * "Needs your attention": the most urgent traveler action is shown
 * prominently, any others as a compact list (CR-030).
 */
export function JourneyAttention({ journeys }: { journeys: Journey[] }) {
  const [primary, ...others] = journeys;

  if (!primary?.action) {
    return null;
  }

  const copy = ACTION_COPY[primary.action.kind];

  const Icon = copy?.icon ?? BellRing;

  const amount = amountFor(primary);

  const validUntil =
    primary.action.kind === "REVIEW_QUOTATION" ? primary.quotation?.validUntil : null;

  return (
    <section aria-labelledby="attention-heading" data-testid="journey-attention">
      <h2 id="attention-heading" className="text-overline text-cinnamon-800">
        Needs your attention
      </h2>

      <div className="mt-3 rounded-card border border-cinnamon-200 bg-cinnamon-50 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <span
              aria-hidden="true"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-cinnamon-800"
            >
              <Icon className="size-5" />
            </span>

            <div className="min-w-0">
              {copy && <p className="text-label text-cinnamon-800">{copy.overline}</p>}

              <h3 className="mt-1 text-heading-md text-foreground">{primary.title}</h3>

              {copy && (
                <p className="mt-1 max-w-reading text-body-sm text-foreground-secondary">
                  {copy.describe(primary)}
                </p>
              )}

              {(amount || validUntil) && (
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body-sm">
                  {amount && (
                    <span>
                      <span className="text-foreground-secondary">Total </span>
                      <span className="font-semibold text-foreground">{amount}</span>
                    </span>
                  )}

                  {validUntil && (
                    <span className="text-foreground-secondary">
                      Valid until {formatDate(validUntil)}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <Link
            href={primary.action.href}
            className={cn(buttonVariants({ size: "lg" }), "w-full shrink-0 sm:w-auto")}
          >
            {primary.action.label}
            <span className="sr-only">: {primary.title}</span>
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </div>

      {others.length > 0 && (
        <ul aria-label="Other actions" className="mt-3 divide-y rounded-card border bg-card">
          {others.map((journey) =>
            journey.action ? (
              <li
                key={journey.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <span className="min-w-0 text-body-sm">
                  <span className="font-medium text-foreground">{journey.title}</span>
                  {ACTION_COPY[journey.action.kind] && (
                    <span className="text-foreground-secondary">
                      {" "}
                      · {ACTION_COPY[journey.action.kind]!.overline}
                    </span>
                  )}
                </span>

                <Link
                  href={journey.action.href}
                  className={buttonVariants({ variant: "outline" })}
                >
                  {journey.action.label}
                  <span className="sr-only">: {journey.title}</span>
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </section>
  );
}
