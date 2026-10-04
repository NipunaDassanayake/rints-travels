import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

/*
 * Final custom-trip CTA (CR-029). Solid Rainforest Ink with a Tea
 * Green glow until a licensed background photograph is supplied.
 * The primary action keeps the existing /tourist/requests/new
 * behaviour (RoleGuard sends guests to sign in first).
 */

export function CustomTripCta() {
  return (
    <section aria-labelledby="custom-trip-heading" className="bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-wide px-4 sm:px-6 lg:px-8">
        <div
          data-surface="dark"
          className="relative isolate overflow-hidden rounded-3xl bg-ink-950 px-6 py-14 sm:px-10 lg:px-16 lg:py-20"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(60%_90%_at_100%_0%,color-mix(in_oklch,var(--color-tea-700)_55%,transparent),transparent_70%),radial-gradient(45%_70%_at_0%_100%,color-mix(in_oklch,var(--color-cinnamon-500)_22%,transparent),transparent_70%)]"
          />

          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-2xl">
              <p className="text-overline text-tea-300">Your trip, your way</p>

              <h2
                id="custom-trip-heading"
                className="mt-4 font-display text-display-md text-ivory"
              >
                Have a trip in mind? Let&apos;s shape it together.
              </h2>

              <p className="mt-5 text-body-lg text-ink-200">
                Share your dates, pace and the places you&apos;re curious about.
                We&apos;ll come back with an itinerary and a quotation, and you
                only pay once it feels right.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/tourist/requests/new"
                className={buttonVariants({ variant: "inverse", size: "lg" })}
              >
                Plan a custom trip
                <ArrowRight aria-hidden="true" />
              </Link>

              <Link
                href="/packages"
                className={`${buttonVariants({ variant: "ghost", size: "lg" })} border border-white/25 text-ivory hover:bg-white/10 hover:text-ivory`}
              >
                Browse packages
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
