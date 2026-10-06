import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { DescriptionList, type DescriptionItem } from "@/components/patterns/description-list";

import { StatusBadge } from "@/components/patterns/status-badge";

import { buttonVariants } from "@/components/ui/button";

import { formatDate, formatMoney } from "@/lib/format";

import { cn } from "@/lib/utils";

import { getJourneyGroup, getJourneyNameContexts, type Journey } from "../journey";

import { JourneySteps } from "./journey-steps";

function travelersFor(journey: Journey) {
  const source = journey.booking?.quotation ?? journey.quotation ?? journey.request;

  if (!source) {
    return null;
  }

  const adults = `${source.adultCount} adult${source.adultCount === 1 ? "" : "s"}`;

  const children = source.childCount
    ? ` · ${source.childCount} ${source.childCount === 1 ? "child" : "children"}`
    : "";

  return `${adults}${children}`;
}

function datesFor(journey: Journey) {
  if (!journey.startDate) {
    return null;
  }

  return journey.endDate
    ? `${formatDate(journey.startDate)} – ${formatDate(journey.endDate)}`
    : formatDate(journey.startDate);
}

/** Where the journey's own page lives (the request is its root). */
function detailHref(journey: Journey) {
  if (journey.request) {
    return `/tourist/requests/${journey.request.id}`;
  }

  if (journey.booking) {
    return `/tourist/bookings/${journey.booking.id}`;
  }

  return journey.quotation ? `/tourist/quotations/${journey.quotation.id}` : "/tourist/requests";
}

/**
 * One journey in "My journeys" (CR-030 Stage 2): identity, current
 * state, what happens next, then the essential context. Shows only
 * fields the traveler APIs already return, never internal ids.
 */
export function JourneyCard({
  journey,
  nameContext,
}: {
  journey: Journey;
  /** From getJourneyNameContexts over the whole list (keeps names unique). */
  nameContext?: string;
}) {
  const { quotation, booking, action } = journey;

  const isActive = getJourneyGroup(journey) === "active";

  const dates = datesFor(journey);

  const travelers = travelersFor(journey);

  const facts: DescriptionItem[] = [];

  if (dates) {
    facts.push({ term: "Dates", value: dates });
  }

  if (travelers) {
    facts.push({ term: "Travelers", value: travelers });
  }

  if (booking) {
    facts.push({ term: "Booking reference", value: booking.bookingReference });
  } else if (quotation) {
    facts.push({
      term: "Quotation",
      value:
        journey.quotationCount > 1
          ? `${quotation.quotationNumber} · Revision ${quotation.revisionNumber}`
          : quotation.quotationNumber,
    });
  }

  const total = booking
    ? formatMoney(booking.totalAmount, booking.currency)
    : quotation
      ? formatMoney(quotation.totalAmount, quotation.currency)
      : null;

  if (total) {
    facts.push({ term: "Total", value: total });
  }

  if (journey.guide) {
    facts.push({ term: "Guide", value: `${journey.guide.firstName} ${journey.guide.lastName}` });
  }

  const titleId = `journey-${journey.id}-title`;

  // Repeated titles (e.g. two requests for one package) stay
  // distinguishable to screen readers; see getJourneyNameContexts.
  const context = nameContext ?? getJourneyNameContexts([journey]).get(journey.id) ?? "";

  return (
    <article
      aria-labelledby={titleId}
      data-testid="journey-card"
      data-group={getJourneyGroup(journey)}
      className="rounded-card border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 id={titleId} className="text-heading-md text-foreground">
            <Link
              href={detailHref(journey)}
              className="rounded-sm underline-offset-4 hover:underline"
            >
              {journey.title}
              {context && <span className="sr-only">{context}</span>}
            </Link>
          </h3>

          {journey.destination && (
            <p className="mt-1 text-body-sm text-foreground-secondary">{journey.destination}</p>
          )}
        </div>

        <StatusBadge entity={journey.status.entity} status={journey.status.value} />
      </div>

      {isActive && <JourneySteps stepIndex={journey.stepIndex} className="mt-4" />}

      {journey.waitingMessage && (
        <p className="mt-3 text-body-sm text-foreground-secondary">{journey.waitingMessage}</p>
      )}

      {/* Two columns even on phones, so the facts do not stack into a tall list. */}
      {facts.length > 0 && (
        <DescriptionList items={facts} columns={3} className="mt-4 grid-cols-2 gap-x-4" />
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-caption text-muted-foreground">
          Updated {formatDate(new Date(journey.lastActivityAt).toISOString())}
        </p>

        {action && (
          <Link
            href={action.href}
            className={cn(
              buttonVariants({ variant: action.needsTraveler ? "default" : "outline" }),
              "w-full sm:w-auto",
            )}
          >
            {action.label}
            <span className="sr-only">
              : {journey.title}
              {context}
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}
