import Link from "next/link";

import { ArrowRight, CalendarDays, MapPin, UserRound } from "lucide-react";

import { DescriptionList } from "@/components/patterns/description-list";

import { StatusBadge } from "@/components/patterns/status-badge";

import { buttonVariants } from "@/components/ui/button";

import { formatDate } from "@/lib/format";

import type { Journey } from "../journey";

/**
 * The trip in progress, or the next confirmed one (CR-030).
 * No imagery: the traveler APIs carry no package photos, and the
 * dashboard never invents destination photography.
 */
export function CurrentTripCard({ journey }: { journey: Journey }) {
  const { booking, action } = journey;

  const isCurrent = journey.phase === "current";

  return (
    <section
      aria-labelledby="current-trip-heading"
      data-testid="current-trip"
      className="flex h-full flex-col rounded-card border bg-card p-5 sm:p-6"
    >
      <h2 id="current-trip-heading" className="text-overline text-tea-700">
        {isCurrent ? "Your current trip" : "Your upcoming trip"}
      </h2>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 font-display text-heading-lg text-foreground">{journey.title}</h3>

        {booking && <StatusBadge entity="booking" status={booking.status} />}
      </div>

      {booking && (
        <p className="mt-1 text-caption text-muted-foreground">
          Booking reference {booking.bookingReference}
        </p>
      )}

      <DescriptionList
        className="mt-5"
        items={[
          {
            term: "Travel dates",
            icon: CalendarDays,
            value: `${formatDate(journey.startDate)} – ${formatDate(journey.endDate)}`,
          },
          ...(journey.destination
            ? [{ term: "Destination", icon: MapPin, value: journey.destination }]
            : []),
          {
            term: "Tour guide",
            icon: UserRound,
            value: journey.guide
              ? `${journey.guide.firstName} ${journey.guide.lastName}`
              : "Not assigned yet",
          },
        ]}
      />

      {action && (
        <div className="mt-auto pt-6">
          <Link href={action.href} className={buttonVariants({ variant: "outline" })}>
            {action.label}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}
