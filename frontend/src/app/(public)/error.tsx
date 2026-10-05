"use client";

import Link from "next/link";

import { useEffect } from "react";

import { ErrorState } from "@/components/patterns/error-state";

import { buttonVariants } from "@/components/ui/button";

/**
 * Public-site error boundary (CR-029). Renders inside the public
 * layout, so the header and footer stay available.
 */
export default function PublicError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto max-w-content px-4 py-20 sm:px-6 sm:py-28">
      <ErrorState
        headingLevel="h1"
        title="We couldn't load this page"
        description="Something went wrong on our side. Please try again in a moment."
        onRetry={() => retry()}
      />

      <div className="mt-6 text-center">
        <Link href="/" className={buttonVariants({ variant: "link" })}>
          Back to home
        </Link>
      </div>
    </section>
  );
}
