"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";

import { ArrowRight, MapPin, Search } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import {
  MAX_DESTINATION_LENGTH,
  POPULAR_DESTINATIONS,
  packagesForDestination,
} from "./destination-data";

/*
 * Hero destination search (CR-029). A real GET form to
 * /packages?destination=..., so it works before hydration and
 * without JavaScript; once hydrated it trims the value and drops
 * an empty search (an empty search simply browses every package).
 * No autocomplete: the API has no destination list to suggest from.
 */

export function DestinationSearch() {
  const router = useRouter();

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-xl sm:p-6">
      <form
        role="search"
        aria-label="Find packages by destination"
        action="/packages"
        method="get"
        onSubmit={(event) => {
          event.preventDefault();

          const value = new FormData(event.currentTarget).get("destination");

          router.push(packagesForDestination(typeof value === "string" ? value : ""));
        }}
      >
        <label htmlFor="hero-destination" className="text-label text-foreground">
          Where in Sri Lanka?
        </label>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <MapPin
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            />

            <Input
              id="hero-destination"
              name="destination"
              type="search"
              placeholder="Try Ella, Kandy or Galle"
              autoComplete="off"
              enterKeyHint="search"
              maxLength={MAX_DESTINATION_LENGTH}
              className="h-12 rounded-xl pl-12 text-body sm:h-14 md:text-body"
            />
          </div>

          <Button type="submit" size="lg" className="h-12 rounded-xl px-6 sm:h-14 sm:px-8">
            <Search aria-hidden="true" />
            Find packages
          </Button>
        </div>
      </form>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span id="popular-destinations" className="shrink-0 text-caption text-muted-foreground">
            Popular
          </span>

          <ul
            aria-labelledby="popular-destinations"
            className="-my-1 flex min-w-0 gap-2 overflow-x-auto py-1 pr-6 [mask-image:linear-gradient(to_right,black_80%,transparent)] [scrollbar-width:none] sm:pr-0 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden"
          >
            {POPULAR_DESTINATIONS.map((destination) => (
              <li key={destination} className="shrink-0">
                <Link
                  href={packagesForDestination(destination)}
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-background px-3.5 text-label text-foreground transition-colors duration-fast hover:border-tea-300 hover:bg-tea-50"
                >
                  {destination}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/tourist/requests/new"
          className="group inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm text-label text-tea-700 hover:text-tea-800"
        >
          Plan a custom trip
          <ArrowRight
            aria-hidden="true"
            className="size-4 transition-transform duration-fast group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </div>
    </div>
  );
}
