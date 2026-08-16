import Link from "next/link";

import { ArrowRight, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function CustomTripCta() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[32px] bg-slate-950 px-6 py-14 text-white sm:px-10 lg:px-16 lg:py-20">
          {/* Decorative background */}
          <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-32 right-32 size-80 rounded-full bg-white/[0.03]" />

          <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-white/60">
                <Sparkles className="size-4" />

                <p className="text-sm font-semibold uppercase tracking-[0.2em]">
                  Your trip, your way
                </p>
              </div>

              <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Can&apos;t find the journey
                <br className="hidden sm:block" /> you&apos;re looking for?
              </h2>

              <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                Tell us where you want to go, when you want to travel, your
                budget, and what matters most to you. We&apos;ll help turn it
                into a personalized Sri Lanka journey.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/tourist/requests/new"
                className={buttonVariants({
                  variant: "secondary",
                  size: "lg",
                })}
              >
                Create custom trip
                <ArrowRight className="size-4" />
              </Link>

              <Link
                href="/packages"
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/20 px-6 text-sm font-medium text-white transition hover:bg-white/10"
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