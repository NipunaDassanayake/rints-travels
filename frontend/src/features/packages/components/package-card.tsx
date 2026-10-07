import Image from "next/image";
import Link from "next/link";

import { ArrowRight, Clock3, ImageOff, MapPin } from "lucide-react";

import { formatUsdPrice } from "@/lib/format";

import { getPackageImageUrl } from "../admin-package.api";

import type { TravelPackage } from "../package.types";

/*
 * Public package card (CR-029): one link per card (the title,
 * stretched over the whole card), so keyboard users reach each
 * package with a single Tab stop. When that link has keyboard
 * focus the whole card shows the CR-028 ring (outside the card,
 * on the page background) instead of a ring around the title.
 */
export function PackageCard({
  travelPackage,
  headingLevel: Heading = "h2",
}: {
  travelPackage: TravelPackage;
  headingLevel?: "h2" | "h3";
}) {
  /**
   * Prefer the primary image.
   *
   * If there is no primary image,
   * use the first valid package image.
   */
  const primaryImage =
    travelPackage.images.find(
      (image) =>
        image.isPrimary &&
        image.imageUrl &&
        !image.imageUrl.includes("example.com"),
    ) ??
    travelPackage.images.find(
      (image) => image.imageUrl && !image.imageUrl.includes("example.com"),
    );

  /**
   * Database stores:
   *
   * /uploads/packages/image-name.jpg
   *
   * Browser needs:
   *
   * http://localhost:5000/uploads/packages/image-name.jpg
   *
   * getPackageImageUrl() handles that conversion.
   */
  const imageSrc = primaryImage
    ? getPackageImageUrl(primaryImage.imageUrl)
    : null;

  const price = formatUsdPrice(travelPackage.price);

  const durationLabel = `${travelPackage.durationDays} ${
    travelPackage.durationDays === 1 ? "day" : "days"
  }`;

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-card shadow-sm transition-shadow duration-base ease-standard hover:shadow-lg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-ring motion-reduce:transition-none">
      {/* Package Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-[calc(var(--radius-2xl)-1px)] bg-sand-100">
        {primaryImage && imageSrc ? (
          <Image
            src={imageSrc}
            alt={primaryImage.altText ?? travelPackage.title}
            fill
            unoptimized
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 90vw"
            className="object-cover transition-transform duration-slower ease-standard group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-body-sm text-muted-foreground">
            <ImageOff aria-hidden="true" className="size-6" />
            No image available
          </div>
        )}

        <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1 text-label text-foreground shadow-sm">
          <Clock3 aria-hidden="true" className="size-4" />
          {durationLabel}
        </span>
      </div>

      {/* Package Content */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="flex items-start gap-1.5 text-caption text-muted-foreground">
          <MapPin aria-hidden="true" className="mt-px size-4 shrink-0" />
          {/* Long routes may wrap; never beyond two lines. */}
          <span className="line-clamp-2">{travelPackage.destination}</span>
        </p>

        <Heading className="mt-2 font-display text-heading-md text-foreground">
          <Link
            href={`/packages/${travelPackage.slug}`}
            className="rounded-sm after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none"
          >
            {travelPackage.title}
          </Link>
        </Heading>

        <p className="mt-3 line-clamp-2 text-body-sm text-foreground-secondary">
          {travelPackage.description}
        </p>

        {/* Price (omitted rather than shown as "$NaN" if the value is unusable) */}
        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
            {price && (
              <div>
                <p className="text-caption text-muted-foreground">Starting from</p>

                <p className="text-heading-sm text-foreground">{price}</p>
              </div>
            )}

            <span
              aria-hidden="true"
              className="ml-auto inline-flex items-center gap-1.5 text-label text-tea-700"
            >
              View package
              <ArrowRight className="size-4 transition-transform duration-fast group-hover:translate-x-1 motion-reduce:transition-none" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
