import Link from "next/link";

import { ArrowRight, MapPin } from "lucide-react";

import { StatusBadge } from "@/components/patterns/status-badge";

import { buttonVariants } from "@/components/ui/button";

import { formatDate } from "@/lib/format";

import type { Journey } from "../journey";

import { JourneySteps } from "./journey-steps";

/**
 * Where the latest trip request stands: the existing status badge,
 * a four-step tracker and either the next action or what Travora
 * is doing (CR-030). Step state is conveyed by icon and text, not
 * by color alone.
 */
export function JourneyProgressCard({ journey }: { journey: Journey }) {
  const { request, action } = journey;

  return (
    <section
      aria-labelledby="journey-progress-heading"
      data-testid="journey-progress"
      className="flex h-full flex-col rounded-card border bg-card p-5 sm:p-6"
    >
      <h2 id="journey-progress-heading" className="text-overline text-tea-700">
        Latest trip request
      </h2>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 text-heading-md text-foreground">{journey.title}</h3>

        <StatusBadge entity={journey.status.entity} status={journey.status.value} />
      </div>

      {journey.destination && (
        <p className="mt-1 flex items-center gap-1.5 text-body-sm text-foreground-secondary">
          <MapPin aria-hidden="true" className="size-4 shrink-0" />
          {journey.destination}
        </p>
      )}

      <JourneySteps stepIndex={journey.stepIndex} className="mt-5" />

      {journey.waitingMessage && (
        <p className="mt-5 text-body-sm text-foreground-secondary">{journey.waitingMessage}</p>
      )}

      {request && (
        <p className="mt-2 text-caption text-muted-foreground">
          Submitted {formatDate(request.createdAt)}
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-3 pt-6">
        {action && !action.needsTraveler && (
          <Link href={action.href} className={buttonVariants({ variant: "outline" })}>
            {action.label}
            <ArrowRight aria-hidden="true" />
          </Link>
        )}

        {request && (
          <Link
            href={`/tourist/requests/${request.id}`}
            className={buttonVariants({ variant: action && !action.needsTraveler ? "ghost" : "outline" })}
          >
            View request
            <ArrowRight aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
