import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import { notFound } from "next/navigation";

import { Check, Clock3, MapPin, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

import { getPackageImageUrl } from "@/features/packages/admin-package.api";

import { getPackageBySlug } from "@/features/packages/package.api";

type PackagePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const getValidPrimaryImage = (
  images: {
    id: number;
    imageUrl: string;
    isPrimary: boolean;
    displayOrder: number;
    altText?: string | null;
  }[],
) => {
  return (
    images.find(
      (image) => image.isPrimary && !image.imageUrl.includes("example.com"),
    ) ?? images.find((image) => !image.imageUrl.includes("example.com"))
  );
};

export async function generateMetadata({
  params,
}: PackagePageProps): Promise<Metadata> {
  const { slug } = await params;

  const travelPackage = await getPackageBySlug(slug);

  if (!travelPackage) {
    return {
      title: "Package Not Found",
    };
  }

  const primaryImage = getValidPrimaryImage(travelPackage.images);

  const primaryImageUrl = primaryImage
    ? getPackageImageUrl(primaryImage.imageUrl)
    : null;

  return {
    title: travelPackage.title,

    description: travelPackage.description.slice(0, 160),

    openGraph: {
      title: travelPackage.title,

      description: travelPackage.description.slice(0, 160),

      images: primaryImageUrl ? [primaryImageUrl] : [],
    },
  };
}

export default async function PackagePage({ params }: PackagePageProps) {
  const { slug } = await params;

  const travelPackage = await getPackageBySlug(slug);

  if (!travelPackage) {
    notFound();
  }

  /**
   * Main package image.
   */
  const primaryImage = getValidPrimaryImage(travelPackage.images);

  const primaryImageUrl = primaryImage
    ? getPackageImageUrl(primaryImage.imageUrl)
    : null;

  /**
   * Other package images.
   *
   * We exclude the primary image,
   * order by displayOrder,
   * then use the first two for the
   * hero gallery.
   */
  const secondaryImages = [...travelPackage.images]
    .filter(
      (image) =>
        image.id !== primaryImage?.id &&
        !image.imageUrl.includes("example.com"),
    )
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 2);

  const sortedItineraries = [...travelPackage.itineraries].sort(
    (a, b) => a.dayNumber - b.dayNumber,
  );

  return (
    <>
      {/* =====================================================
          PACKAGE HERO
      ===================================================== */}

      <section className="border-b">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          {/* =================================================
              IMAGE GALLERY
          ================================================= */}

          <div>
            {primaryImage && primaryImageUrl ? (
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                {/* Primary image */}

                <div className="relative min-h-[420px] overflow-hidden rounded-[24px] bg-muted sm:min-h-[520px]">
                  <Image
                    src={primaryImageUrl}
                    alt={primaryImage.altText ?? travelPackage.title}
                    fill
                    unoptimized
                    priority
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="object-cover"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                </div>

                {/* Secondary images */}

                <div className="grid gap-3">
                  {secondaryImages.length > 0 ? (
                    secondaryImages.map((image, index) => {
                      const imageUrl = getPackageImageUrl(image.imageUrl);

                      return (
                        <div
                          key={image.id}
                          className="relative min-h-[200px] overflow-hidden rounded-[24px] bg-muted sm:min-h-0"
                        >
                          <Image
                            src={imageUrl}
                            alt={
                              image.altText ??
                              `${travelPackage.title} image ${index + 2}`
                            }
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 100vw, 25vw"
                            className="object-cover transition duration-500 hover:scale-105"
                          />
                        </div>
                      );
                    })
                  ) : (
                    <>
                      <div className="rounded-[24px] bg-muted" />

                      <div className="rounded-[24px] bg-muted" />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[520px] items-center justify-center rounded-[24px] bg-muted text-muted-foreground">
                No image available
              </div>
            )}
          </div>

          {/* =================================================
              PACKAGE INFORMATION
          ================================================= */}

          <div className="flex flex-col justify-center">
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-primary">
              Sri Lanka Journey
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              {travelPackage.title}
            </h1>

            <div className="mt-5 flex flex-wrap gap-5 text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="size-5 shrink-0" />

                {travelPackage.destination}
              </div>

              <div className="flex items-center gap-2">
                <Clock3 className="size-5 shrink-0" />
                {travelPackage.durationDays}{" "}
                {travelPackage.durationDays === 1 ? "day" : "days"}
              </div>
            </div>

            <p className="mt-6 max-w-xl leading-7 text-muted-foreground">
              {travelPackage.description}
            </p>

            <div className="mt-8">
              <p className="text-sm text-muted-foreground">Starting from</p>

              <p className="mt-1 text-3xl font-bold">${travelPackage.price}</p>

              <p className="mt-1 text-xs text-muted-foreground">
                Final pricing is customized based on your dates, accommodation,
                transport and selected experiences.
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

      {/* =====================================================
          FULL IMAGE GALLERY
      ===================================================== */}

      {travelPackage.images.length > 3 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Journey gallery
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                A glimpse of the journey
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...travelPackage.images]
              .filter(
                (image) =>
                  image.id !== primaryImage?.id &&
                  !secondaryImages.some(
                    (secondaryImage) => secondaryImage.id === image.id,
                  ) &&
                  !image.imageUrl.includes("example.com"),
              )
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((image) => {
                const imageUrl = getPackageImageUrl(image.imageUrl);

                return (
                  <div
                    key={image.id}
                    className="group relative aspect-[16/10] overflow-hidden rounded-[20px] bg-muted"
                  >
                    <Image
                      src={imageUrl}
                      alt={image.altText ?? travelPackage.title}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* =====================================================
          ITINERARY
      ===================================================== */}

      {sortedItineraries.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Day by day
            </p>

            <h2 className="mt-2 text-3xl font-bold">Your journey</h2>
          </div>

          <div className="mt-8 space-y-6">
            {sortedItineraries.map((item) => (
              <div
                key={item.id}
                className="grid gap-4 border-l-2 pl-6 sm:grid-cols-[100px_1fr]"
              >
                <p className="font-semibold text-primary">
                  Day {item.dayNumber}
                </p>

                <div>
                  <h3 className="font-semibold">{item.title}</h3>

                  <p className="mt-2 leading-7 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================
          INCLUSIONS / EXCLUSIONS
      ===================================================== */}

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2">
          {/* Inclusions */}

          <div>
            <h2 className="text-2xl font-bold">What&apos;s included</h2>

            {travelPackage.inclusions.length > 0 ? (
              <div className="mt-6 space-y-3">
                {travelPackage.inclusions.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <Check className="mt-0.5 size-5 shrink-0 text-primary" />

                    <span>{item.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Inclusions have not been added yet.
              </p>
            )}
          </div>

          {/* Exclusions */}

          <div>
            <h2 className="text-2xl font-bold">What&apos;s not included</h2>

            {travelPackage.exclusions.length > 0 ? (
              <div className="mt-6 space-y-3">
                {travelPackage.exclusions.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <X className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

                    <span>{item.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Exclusions have not been added yet.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          FAQ
      ===================================================== */}

      {travelPackage.faqs.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Need to know
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Frequently asked questions
            </h2>
          </div>

          <div className="mt-8 divide-y border-y">
            {[...travelPackage.faqs]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((faq) => (
                <div key={faq.id} className="py-6">
                  <h3 className="font-semibold">{faq.question}</h3>

                  <p className="mt-2 leading-7 text-muted-foreground">
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