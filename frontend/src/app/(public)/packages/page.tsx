import Link from "next/link";

export const dynamic = "force-dynamic";

import { buttonVariants } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-[75vh] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="font-medium text-primary">
          Discover Sri Lanka your way
        </p>

        <h1 className="mt-4 text-5xl font-bold tracking-tight sm:text-6xl">
          Your journey.
          <br />
          Designed around you.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Explore inspiring Sri Lanka journeys and customize every detail
          around your dates, budget, interests, and travel style.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/packages"
            className={buttonVariants({
              size: "lg",
            })}
          >
            Explore packages
          </Link>

          <Link
            href="/login"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
            })}
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}