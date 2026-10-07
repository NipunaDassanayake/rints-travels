import Link from "next/link";

import { Check } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { PublicSection } from "./public-section";

/*
 * How Travora works (CR-029): the real request -> quotation ->
 * acceptance -> payment -> booking flow, in four steps. Replaces
 * the former "Why Travora" and "How it works" sections.
 * Step numbers are Tea 300 on Ink 950 (11.8:1).
 */

const steps = [
  {
    number: "01",
    title: "Start with a package, or a blank page",
    description:
      "Choose a curated package or describe your own trip: dates, travelers, budget and a preferred guide.",
  },
  {
    number: "02",
    title: "We shape it with you",
    description: "Our team reviews your request and works through the details with you.",
  },
  {
    number: "03",
    title: "Review your quotation",
    description:
      "A clear itinerary, inclusions and price. Ask for changes and we'll send a revised quotation.",
  },
  {
    number: "04",
    title: "Accept, pay and travel",
    description:
      "Accept the quotation, pay securely by card, and we'll confirm your booking and assign your local guide.",
  },
];

const promises = [
  "No payment until you approve the quotation",
  "Requests, quotations and bookings in one account",
  "Local guides who know the island",
];

export function HowTravoraWorks() {
  return (
    <PublicSection
      id="how-it-works"
      tone="ink"
      overline="From first idea to booking"
      title="How Travora works"
      description="A personal trip, planned in the open."
    >
      <ol className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <li
            key={step.number}
            className="grid grid-cols-[3rem_1fr] gap-x-4 border-l border-white/15 pl-5 sm:block sm:border-l-0 sm:border-t sm:pl-0 sm:pt-6"
          >
            <span aria-hidden="true" className="font-display text-heading-xl text-tea-300">
              {step.number}
            </span>

            <div>
              <h3 className="text-heading-sm text-ivory sm:mt-3">
                <span className="sr-only">Step {step.number}: </span>
                {step.title}
              </h3>

              <p className="mt-2 text-body-sm text-ink-200">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 flex flex-col gap-6 border-t border-white/15 pt-8 lg:flex-row lg:items-center lg:justify-between">
        <ul className="grid gap-3 sm:grid-cols-3 sm:gap-6 lg:flex-1">
          {promises.map((promise) => (
            <li key={promise} className="flex gap-2.5 text-body-sm text-ink-100">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-tea-300" />
              {promise}
            </li>
          ))}
        </ul>

        <Link
          href="/tourist/requests/new"
          className={`${buttonVariants({ variant: "inverse", size: "lg" })} self-start lg:self-center`}
        >
          Plan a custom trip
        </Link>
      </div>
    </PublicSection>
  );
}
