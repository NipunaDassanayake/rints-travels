import Image from "next/image";

import heroImage from "../../../public/images/home/sri-lanka-hero.jpg";

import { DestinationSearch } from "./destination-search";

/*
 * Homepage hero (CR-029). The photograph is the LCP element:
 * next/image loaded eagerly at high fetch priority (Next 16
 * deprecates `priority`), a blur placeholder and a fixed-height
 * frame (no layout shift). One source serves every width; the
 * focal point moves so phones keep the train and the bridge.
 *
 * Text contrast comes from Rainforest Ink scrims, not from the
 * photograph: a bottom scrim on phones (copy sits low, under the
 * train) and a left scrim from `lg` (copy sits left of the train).
 */

export function HomeHero() {
  return (
    <section aria-labelledby="home-hero-heading" className="relative">
      <div data-surface="dark" className="relative isolate overflow-hidden bg-ink-950">
        <Image
          src={heroImage}
          alt="A blue train crossing the Nine Arch Bridge near Ella at sunrise"
          fill
          loading="eager"
          fetchPriority="high"
          placeholder="blur"
          sizes="100vw"
          className="-z-20 object-cover object-[46%_38%] lg:object-[50%_8%]"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/95 via-ink-950/65 via-45% to-ink-950/5 lg:bg-gradient-to-r lg:from-ink-950/80 lg:via-ink-950/60 lg:via-40% lg:to-ink-950/0 lg:to-75%"
        />

        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 -z-10 hidden h-48 bg-gradient-to-t from-ink-950/70 to-transparent lg:block"
        />

        <div className="mx-auto flex min-h-[40rem] max-w-wide flex-col justify-end px-4 pb-16 pt-48 sm:px-6 lg:min-h-[42rem] lg:justify-start lg:px-8 lg:pb-44 lg:pt-20">
          <div className="max-w-xl">
            <p className="text-overline text-tea-100">Sri Lanka, considered</p>

            <h1
              id="home-hero-heading"
              className="mt-4 text-balance font-display text-display-md text-ivory sm:text-display-lg lg:text-display-xl"
            >
              Sri Lanka, shaped around you.
            </h1>

            <p className="mt-5 max-w-lg text-body-lg text-ink-100">
              Start with one of our journeys or tell us what you have in mind.
              We&apos;ll shape the route, stays and local guide around you.
            </p>
          </div>
        </div>
      </div>

      {/* Discovery panel: bridges the photograph and the page below. */}

      <div className="relative z-10 mx-auto -mt-12 max-w-wide px-4 sm:px-6 lg:-mt-24 lg:px-8">
        <div className="max-w-3xl">
          <DestinationSearch />
        </div>
      </div>
    </section>
  );
}
