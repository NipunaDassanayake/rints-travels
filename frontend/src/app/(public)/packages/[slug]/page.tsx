import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Check,
  Clock3,
  MapPin,
  X,
} from "lucide-react";

import {
  buttonVariants,
} from "@/components/ui/button";

import {
  getPackageBySlug,
} from "@/features/packages/package.api";

type PackagePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: PackagePageProps): Promise<Metadata> {
  const { slug } = await params;

  const travelPackage =
    await getPackageBySlug(slug);

  if (!travelPackage) {
    return {
      title: "Package Not Found",
    };
  }

  const primaryImage =
    travelPackage.images.find(
      (image) => image.isPrimary
    ) ?? travelPackage.images[0];

  return {
    title: travelPackage.title,

    description:
      travelPackage.description.slice(
        0,
        160
      ),

    openGraph: {
      title: travelPackage.title,

      description:
        travelPackage.description.slice(
          0,
          160
        ),

      images: primaryImage
        ? [primaryImage.imageUrl]
        : [],
    },
  };
}

export default async function PackagePage({
  params,
}: PackagePageProps) {
  const { slug } = await params;

  const travelPackage =
    await getPackageBySlug(slug);

  if (!travelPackage) {
    notFound();
  }

  const primaryImage =
    travelPackage.images.find(
      (image) => image.isPrimary
    ) ?? travelPackage.images[0];

  const sortedItineraries = [
    ...travelPackage.itineraries,
  ].sort(
    (a, b) =>
      a.dayNumber - b.dayNumber
  );

  return (
    <>
      <section className="border-b">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="overflow-hidden rounded-2xl bg-muted">
            {primaryImage ? (
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={primaryImage.imageUrl}
                  alt={
                    primaryImage.altText ??
                    travelPackage.title
                  }
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground">
                No image available
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              Sri Lanka Journey
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              {travelPackage.title}
            </h1>

            <div className="mt-5 flex flex-wrap gap-5 text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="size-5" />

                {travelPackage.destination}
              </div>

              <div className="flex items-center gap-2">
                <Clock3 className="size-5" />

                {travelPackage.durationDays} days
              </div>
            </div>

            <p className="mt-6 leading-7 text-muted-foreground">
              {travelPackage.description}
            </p>

            <div className="mt-8">
              <p className="text-sm text-muted-foreground">
                Starting from
              </p>

              <p className="text-3xl font-bold">
                ${travelPackage.price}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/tourist/requests/new?packageId=${travelPackage.id}`}
                className={buttonVariants({
                  size: "lg",
                })}
              >
                Customize this tour
              </Link>

              <Link
                href="/packages"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                })}
              >
                Explore packages
              </Link>
            </div>
          </div>
        </div>
      </section>

      {sortedItineraries.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold">
            Your journey
          </h2>

          <div className="mt-8 space-y-6">
            {sortedItineraries.map(
              (item) => (
                <div
                  key={item.id}
                  className="grid gap-4 border-l-2 pl-6 sm:grid-cols-[100px_1fr]"
                >
                  <p className="font-semibold text-primary">
                    Day {item.dayNumber}
                  </p>

                  <div>
                    <h3 className="font-semibold">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold">
              What&apos;s included
            </h2>

            <div className="mt-6 space-y-3">
              {travelPackage.inclusions.map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex gap-3"
                  >
                    <Check className="mt-0.5 size-5 shrink-0 text-primary" />

                    <span>
                      {item.title}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">
              What&apos;s not included
            </h2>

            <div className="mt-6 space-y-3">
              {travelPackage.exclusions.map(
                (item) => (
                  <div
                    key={item.id}
                    className="flex gap-3"
                  >
                    <X className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

                    <span>
                      {item.title}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {travelPackage.faqs.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-bold">
            Frequently asked questions
          </h2>

          <div className="mt-8 divide-y border-y">
            {[...travelPackage.faqs]
              .sort(
                (a, b) =>
                  a.displayOrder -
                  b.displayOrder
              )
              .map((faq) => (
                <div
                  key={faq.id}
                  className="py-6"
                >
                  <h3 className="font-semibold">
                    {faq.question}
                  </h3>

                  <p className="mt-2 text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              ))}
          </div>
        </section>
      )}
    </>
  );
}