import Link from "next/link";

import { ArrowRight, Clock3, MapPin } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { getPackages } from "@/features/packages/package.api";

export async function FeaturedPackages() {
  const data = await getPackages();

  const featuredPackages = data.items
    .filter((travelPackage) => travelPackage.status === "ACTIVE")
    .slice(0, 3);

  if (featuredPackages.length === 0) {
    return null;
  }

  return (
    <section className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Featured journeys
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Trips worth taking
            </h2>

            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Start with one of our curated Sri Lanka journeys, then customize
              the dates, guide, budget, accommodation, and experiences around
              your travel style.
            </p>
          </div>

          <Link
            href="/packages"
            className={buttonVariants({
              variant: "outline",
            })}
          >
            View all packages
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredPackages.map((travelPackage) => {
            const primaryImage =
              travelPackage.images.find((image) => image.isPrimary) ??
              travelPackage.images[0];

            return (
              <article
                key={travelPackage.id}
                className="group overflow-hidden rounded-[24px] border bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <Link
                  href={`/packages/${travelPackage.slug}`}
                  className="block"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {primaryImage ? (
                      <img
                        src={primaryImage.imageUrl}
                        alt={primaryImage.altText ?? travelPackage.title}
                        className="size-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                        No image available
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

                    <div className="absolute bottom-4 left-4">
                      <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-950 shadow-sm">
                        {travelPackage.durationDays}{" "}
                        {travelPackage.durationDays === 1 ? "day" : "days"}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="space-y-5 p-6">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                      {travelPackage.title}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-4" />

                        {travelPackage.destination}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Clock3 className="size-4" />
                        {travelPackage.durationDays} days
                      </span>
                    </div>
                  </div>

                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {travelPackage.description}
                  </p>

                  <div className="flex items-end justify-between gap-4 border-t pt-5">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Starting from
                      </p>

                      <p className="mt-1 text-2xl font-bold text-slate-950">
                        ${travelPackage.price}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        per journey
                      </p>
                    </div>

                    <Link
                      href={`/packages/${travelPackage.slug}`}
                      className="group/link inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
                    >
                      View journey
                      <ArrowRight className="size-4 transition-transform group-hover/link:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}