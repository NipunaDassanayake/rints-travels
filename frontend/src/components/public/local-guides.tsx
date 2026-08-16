import Link from "next/link";

import { ArrowRight, Languages, MapPin, Star, UserRound } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { getTourGuides } from "@/features/tour-guides/tour-guide.api";

export async function LocalGuides() {
  const guides = await getTourGuides();

  const featuredGuides = guides
    .filter((guide) => guide.isAvailable)
    .slice(0, 3);

  if (featuredGuides.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Local experts
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Meet the people behind the journey
            </h2>

            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Discover experienced local guides who know Sri Lanka&apos;s
              landscapes, culture, stories, and hidden places beyond the usual
              tourist trail.
            </p>
          </div>

          <Link
            href="/guides"
            className={buttonVariants({
              variant: "outline",
            })}
          >
            View all guides
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredGuides.map((guide) => {
            const fullName = `${guide.user.firstName} ${guide.user.lastName}`;

            const rating = Number(guide.averageRating) || 0;

            return (
              <article
                key={guide.id}
                className="group overflow-hidden rounded-[24px] border bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                  <div className="flex size-28 items-center justify-center rounded-full bg-white shadow-sm">
                    <UserRound className="size-14 text-slate-400" />
                  </div>

                  <div className="absolute left-4 top-4">
                    <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-950 shadow-sm">
                      Available
                    </span>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <div>
                    <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                      {fullName}
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {guide.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-4" />

                          {guide.location}
                        </span>
                      )}

                      <span className="flex items-center gap-1.5">
                        <Star className="size-4" />

                        {rating.toFixed(1)}

                        {guide.totalReviews > 0 && (
                          <span>({guide.totalReviews})</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {guide.bio ||
                      "An experienced local guide ready to help you explore Sri Lanka."}
                  </p>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Experience
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-950">
                      {guide.experienceYears}{" "}
                      {guide.experienceYears === 1 ? "year" : "years"}
                    </p>
                  </div>

                  {guide.languages.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2">
                        <Languages className="size-4 text-muted-foreground" />

                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Languages
                        </p>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {guide.languages.slice(0, 4).map((language) => (
                          <span
                            key={language}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {guide.specializations.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Specializes in
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {guide.specializations
                          .slice(0, 3)
                          .map((specialization) => (
                            <span
                              key={specialization}
                              className="rounded-full border px-3 py-1 text-xs text-slate-700"
                            >
                              {specialization}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-end justify-between gap-4 border-t pt-5">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Daily rate
                      </p>

                      <p className="mt-1 font-semibold text-slate-950">
                        {guide.dailyRate
                          ? `$${guide.dailyRate}`
                          : "Contact for rate"}
                      </p>
                    </div>

                    <Link
                      href={`/guides/${guide.id}`}
                      className="group/link inline-flex items-center gap-2 text-sm font-semibold text-slate-950"
                    >
                      View guide
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