"use client";

import Link from "next/link";

import { Plus, Route } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";

import { ErrorState } from "@/components/patterns/error-state";

import { LoadingState } from "@/components/patterns/loading-state";

import { PageHeader } from "@/components/patterns/page-header";

import { buttonVariants } from "@/components/ui/button";

import { JourneyCard } from "@/features/journeys/components/journey-card";

import {
  getJourneyNameContexts,
  groupJourneys,
  type JourneyGroup,
} from "@/features/journeys/journey";

import { useTravelerJourneys } from "@/features/journeys/use-traveler-journeys";

const GROUPS: { key: JourneyGroup; title: string; description: string }[] = [
  {
    key: "active",
    title: "Active",
    description: "Journeys being planned, quoted, paid for or underway.",
  },
  {
    key: "past",
    title: "Past",
    description: "Completed trips.",
  },
  {
    key: "closed",
    title: "Closed",
    description: "Cancelled or declined journeys.",
  },
];

/**
 * =========================================================
 * My journeys (CR-030 Stage 2)
 * =========================================================
 *
 * Every journey starts as a tour request, so this route stays
 * /tourist/requests. Each request is shown with the quotation,
 * payment and booking that belong to it (features/journeys).
 */
export default function MyJourneysPage() {
  const { journeys, isLoading, isError, retry } = useTravelerJourneys();

  const header = (
    <PageHeader
      editorial
      title="My journeys"
      description="Every Sri Lanka trip you have planned with Travora, from first request to completed journey."
      actions={
        journeys.length > 0 ? (
          <Link href="/tourist/requests/new" className={buttonVariants({ variant: "outline" })}>
            <Plus aria-hidden="true" />
            Plan a new trip
          </Link>
        ) : undefined
      }
    />
  );

  let content: React.ReactNode;

  if (isLoading) {
    content = <LoadingState variant="skeleton" rows={3} label="Loading your journeys" />;
  } else if (isError) {
    content = (
      <ErrorState
        headingLevel="h2"
        title="Unable to load your journeys"
        description="Your journeys could not be retrieved."
        onRetry={retry}
      />
    );
  } else if (journeys.length === 0) {
    content = (
      <EmptyState
        headingLevel="h2"
        icon={Route}
        title="No journeys yet"
        description="Start from one of our travel packages or describe the trip you have in mind. Travora reviews every request and sends you a personalized quotation."
        action={
          <Link href="/tourist/requests/new" className={buttonVariants({ size: "lg" })}>
            <Plus aria-hidden="true" />
            Plan a trip
          </Link>
        }
        className="py-14"
      />
    );
  } else {
    const groups = groupJourneys(journeys);

    const nameContexts = getJourneyNameContexts(journeys);

    content = (
      <div className="space-y-10">
        {GROUPS.filter(({ key }) => groups[key].length > 0).map(({ key, title, description }) => (
          <section key={key} aria-labelledby={`journeys-${key}`} data-testid={`journeys-${key}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id={`journeys-${key}`} className="text-heading-lg text-foreground">
                {title}
              </h2>

              <p className="text-body-sm text-muted-foreground">
                {groups[key].length} {groups[key].length === 1 ? "journey" : "journeys"}
              </p>
            </div>

            <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>

            <ul className="mt-4 space-y-4">
              {groups[key].map((journey) => (
                <li key={journey.id}>
                  <JourneyCard journey={journey} nameContext={nameContexts.get(journey.id)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {header}

      <div className="mt-8">{content}</div>
    </main>
  );
}
