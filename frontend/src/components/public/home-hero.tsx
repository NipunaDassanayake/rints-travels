import Link from "next/link";

import { CalendarDays, MapPin, Search, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/home/sri-lanka-hero.jpg')",
        }}
      />

      <div className="absolute inset-0 bg-black/45" />

      <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col justify-center px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/80">
            Discover Sri Lanka
          </p>

          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Your journey,
            <br />
            your way.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 sm:text-xl">
            Curated journeys, trusted local guides, and travel experiences
            designed around you.
          </p>
        </div>

        <div className="mt-10 rounded-2xl bg-white p-3 shadow-2xl">
          <div className="grid gap-3 lg:grid-cols-[1.25fr_1fr_1fr_auto]">
            <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
              <MapPin className="size-5 shrink-0 text-muted-foreground" />

              <div>
                <p className="text-xs text-muted-foreground">Destination</p>

                <p className="font-medium">Where do you want to go?</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
              <CalendarDays className="size-5 shrink-0 text-muted-foreground" />

              <div>
                <p className="text-xs text-muted-foreground">Travel dates</p>

                <p className="font-medium">Choose your dates</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border px-4 py-3">
              <Users className="size-5 shrink-0 text-muted-foreground" />

              <div>
                <p className="text-xs text-muted-foreground">Travelers</p>

                <p className="font-medium">2 travelers</p>
              </div>
            </div>

            <Link
              href="/packages"
              className={`${buttonVariants({
                size: "lg",
              })} min-h-14 px-7`}
            >
              <Search className="size-5" />
              Explore
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <Link
            href="/tourist/requests/new"
            className="text-sm font-medium text-white underline-offset-4 hover:underline"
          >
            Prefer something unique? Plan a custom trip →
          </Link>
        </div>
      </div>
    </section>
  );
}