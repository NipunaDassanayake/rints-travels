import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { PublicSection } from "./public-section";

/*
 * "Ceylon, considered" (CR-029). Evergreen planning context, not
 * a weather service: long-standing monsoon patterns (Department of
 * Meteorology seasons: southwest monsoon May-September, northeast
 * monsoon December-February), always phrased as "generally".
 */

const regions = [
  {
    name: "South and west coasts",
    places: "Galle · Mirissa",
    note: "Generally driest from December to March.",
  },
  {
    name: "East coast",
    places: "Beaches facing the Bay of Bengal",
    note: "Generally driest from May to September.",
  },
  {
    name: "Cultural Triangle and hill country",
    places: "Sigiriya · Kandy · Ella · Nuwara Eliya",
    note: "Good to visit year-round. Showers are more frequent in the hills during the southwest monsoon, May to September.",
  },
];

export function CeylonConsidered() {
  return (
    <PublicSection
      id="ceylon-considered"
      overline="When to go"
      title="Ceylon, considered."
      description={
        <>
          <span className="block font-display text-heading-sm text-foreground">
            An island of two monsoons.
          </span>

          <span className="mt-3 block">
            Sri Lanka is compact, but its weather runs on two monsoons that reach
            different coasts at different times of year. Deciding where to go, and
            when, is the first choice of a good trip, and the one we&apos;ll help
            you make.
          </span>
        </>
      }
    >
      <ul className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
        {regions.map((region) => (
          <li
            key={region.name}
            className="rounded-2xl border border-border bg-card p-6 shadow-xs"
          >
            <span aria-hidden="true" className="block h-1 w-10 rounded-full bg-cinnamon-400" />

            <h3 className="mt-5 font-display text-heading-sm text-foreground">{region.name}</h3>

            <p className="mt-1 text-caption text-muted-foreground">{region.places}</p>

            <p className="mt-4 text-body text-foreground-secondary">{region.note}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-muted-foreground">
          General seasonal patterns, not a forecast. Weather can vary year to year.
        </p>

        <Link href="/tourist/requests/new" className={buttonVariants({ variant: "outline" })}>
          Plan around your dates
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </PublicSection>
  );
}
