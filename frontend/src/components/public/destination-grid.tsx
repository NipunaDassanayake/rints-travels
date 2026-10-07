import Image from "next/image";

import Link from "next/link";

import { ArrowRight, ArrowUpRight, Mountain } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { cn } from "@/lib/utils";

import {
  DESTINATIONS,
  packagesForDestination,
  type Destination,
} from "./destination-data";

import { PublicSection } from "./public-section";

import { SnapRow } from "./snap-row";

/*
 * "Where would you like to begin?" (CR-029). Desktop: a 3x2 grid.
 * Below `lg`: a horizontal snap row with the next card peeking in,
 * instead of six tall cards stacked. Each card is a single link;
 * keyboard focus scrolls the row naturally.
 */

export function DestinationGrid() {
  return (
    <PublicSection
      id="destinations"
      overline="Explore by destination"
      title="Where would you like to begin?"
      description="Six places that shape a first journey through Sri Lanka. Each one opens the packages that visit it."
      action={
        <Link href="/packages" className={buttonVariants({ variant: "outline" })}>
          Browse all packages
          <ArrowRight aria-hidden="true" />
        </Link>
      }
    >
      <SnapRow
        className={cn(
          // py-2 (with mt-8, same position as before) keeps the cards' focus ring inside the scroll container.
          "mt-8 -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 py-2 sm:-mx-6 sm:scroll-px-6 sm:px-6",
          "lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {DESTINATIONS.map((destination) => (
          <li
            key={destination.name}
            className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-auto"
          >
            <DestinationCard destination={destination} />
          </li>
        ))}
      </SnapRow>
    </PublicSection>
  );
}

function DestinationCard({ destination }: { destination: Destination }) {
  const captionId = `destination-${destination.query.toLowerCase().replace(/\s+/g, "-")}-caption`;

  return (
    <Link
      href={packagesForDestination(destination.query)}
      aria-label={`${destination.name}: view packages`}
      aria-describedby={captionId}
      className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl bg-ink-950 p-5 sm:p-6"
    >
      {destination.image ? (
        <Image
          src={destination.image}
          alt={destination.imageAlt}
          fill
          placeholder="blur"
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 44vw, 78vw"
          className="-z-20 object-cover transition-transform duration-slower ease-standard group-hover:scale-105 motion-reduce:transition-none"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[radial-gradient(120%_80%_at_80%_0%,var(--color-tea-700),transparent_60%),linear-gradient(160deg,var(--color-tea-900),var(--color-ink-950))]"
        >
          <Mountain className="absolute right-6 top-6 size-16 text-tea-300/30" />
        </div>
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/95 via-ink-950/65 via-45% to-ink-950/0"
      />

      <p className="text-overline text-tea-200">{destination.region}</p>

      <div className="mt-2 flex items-end justify-between gap-4">
        <h3 className="font-display text-heading-xl text-ivory">{destination.name}</h3>

        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ivory text-ink-950 transition-transform duration-base ease-standard group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
        >
          <ArrowUpRight className="size-5" />
        </span>
      </div>

      <p id={captionId} className="mt-2 text-body-sm text-ink-100">
        {destination.caption}
      </p>
    </Link>
  );
}
