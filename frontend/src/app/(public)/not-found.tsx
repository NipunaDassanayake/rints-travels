import Link from "next/link";

import { Compass } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

/**
 * Shown when a public page calls notFound() -- e.g. a package
 * slug or guide that does not exist or is no longer public.
 */
export default function PublicNotFound() {
  return (
    <section className="mx-auto flex max-w-content flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-full bg-tea-50 text-tea-700"
      >
        <Compass className="size-7" />
      </span>

      <p className="mt-6 text-overline text-tea-700">Page not found</p>

      <h1 className="mt-3 font-display text-display-md text-foreground">
        We couldn&apos;t find that page
      </h1>

      <p className="mt-4 max-w-reading text-body-lg text-foreground-secondary">
        It may have moved, or the journey or guide you were looking for is no
        longer available.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/packages" className={buttonVariants({ size: "lg" })}>
          Browse travel packages
        </Link>

        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Back to home
        </Link>
      </div>
    </section>
  );
}
