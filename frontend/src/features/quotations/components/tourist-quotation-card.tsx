import Link from "next/link";

import { CalendarDays, UserRound, Wallet } from "lucide-react";

import { DescriptionList } from "@/components/patterns/description-list";

import { StatusBadge } from "@/components/patterns/status-badge";

import { buttonVariants } from "@/components/ui/button";

import { formatDate, formatMoney } from "@/lib/format";

import type { Quotation } from "../quotation.types";

/**
 * A quotation in the traveler's quotation list (CR-030 Stage 2
 * normalization). Same information as before: number, title,
 * revision, status, dates, guide name (never contact details) and
 * total.
 */
export function TouristQuotationCard({ quotation }: { quotation: Quotation }) {
  const guide = quotation.guide;

  const titleId = `quotation-${quotation.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className="h-full rounded-card border bg-card p-5 sm:p-6"
    >
      {/* One box holding every field, so the card can be located as a unit. */}
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-caption font-medium tracking-wide text-muted-foreground">
              {quotation.quotationNumber}
            </p>

            <h2 id={titleId} className="mt-1 text-heading-md text-foreground">
              {quotation.title}
            </h2>

            <p className="mt-1 text-caption text-muted-foreground">
              Revision {quotation.revisionNumber}
            </p>
          </div>

          <StatusBadge entity="quotation" status={quotation.status} />
        </div>

        <DescriptionList
          className="mt-5"
          items={[
            {
              term: "Travel dates",
              icon: CalendarDays,
              value: `${formatDate(quotation.startDate)} – ${formatDate(quotation.endDate)}`,
            },
            {
              term: "Tour guide",
              icon: UserRound,
              value: guide ? `${guide.user.firstName} ${guide.user.lastName}` : "Not assigned",
            },
            {
              term: "Total",
              icon: Wallet,
              value: formatMoney(quotation.totalAmount, quotation.currency),
            },
          ]}
        />

        <div className="mt-auto flex justify-end pt-5">
          <Link
            href={`/tourist/quotations/${quotation.id}`}
            className={`${buttonVariants({ variant: "outline" })} w-full sm:w-auto`}
          >
            View quotation
            <span className="sr-only">
              {" "}
              {quotation.quotationNumber}: {quotation.title}
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
