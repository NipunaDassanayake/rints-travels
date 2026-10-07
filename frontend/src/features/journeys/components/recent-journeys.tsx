import Link from "next/link";

import { ArrowRight, ChevronRight } from "lucide-react";

import { StatusBadge } from "@/components/patterns/status-badge";

import { buttonVariants } from "@/components/ui/button";

import { formatDate } from "@/lib/format";

import type { Journey } from "../journey";

function hrefFor(journey: Journey) {
  if (journey.request) {
    return `/tourist/requests/${journey.request.id}`;
  }

  return journey.action?.href ?? "/tourist/requests";
}

/**
 * Compact list of the traveler's other recent journeys (CR-030).
 */
export function RecentJourneys({ journeys }: { journeys: Journey[] }) {
  return (
    <section aria-labelledby="recent-heading" data-testid="recent-journeys">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="recent-heading" className="text-heading-md text-foreground">
          Recent activity
        </h2>

        <Link href="/tourist/requests" className={buttonVariants({ variant: "ghost" })}>
          View all journeys
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      <ul className="mt-3 divide-y rounded-card border bg-card">
        {journeys.map((journey) => (
          <li key={journey.id}>
            <Link
              href={hrefFor(journey)}
              className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 transition-colors duration-fast hover:bg-sand-50"
            >
              <span className="min-w-0">
                <span className="block font-medium text-foreground">{journey.title}</span>
                <span className="block text-caption text-muted-foreground">
                  Updated {formatDate(new Date(journey.lastActivityAt).toISOString())}
                </span>
              </span>

              <span className="flex items-center gap-2">
                <StatusBadge entity={journey.status.entity} status={journey.status.value} />
                <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
