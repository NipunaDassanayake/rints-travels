import Image from "next/image";

import Link from "next/link";

import { Clock3, MapPin } from "lucide-react";

import { getPackageImageUrl } from "@/features/packages/admin-package.api";

import type { TravelPackage } from "@/features/packages/package.types";

import { formatUsdPrice } from "@/lib/format";

import { cn } from "@/lib/utils";

/**
 * The package a request starts from (CR-030 Stage 3), using only
 * what the public package list returns: primary image, title,
 * destination, duration, starting price and a short description.
 */
export function PackageContextCard({
  travelPackage,
  className,
}: {
  travelPackage: TravelPackage;
  className?: string;
}) {
  const image =
    travelPackage.images.find((candidate) => candidate.isPrimary) ?? travelPackage.images[0];

  const price = formatUsdPrice(travelPackage.price);

  return (
    <div
      data-testid="package-context"
      className={cn("overflow-hidden rounded-card border bg-card", className)}
    >
      {image && (
        // Compact on phones: the photo and description show from lg up.
        <div className="relative hidden aspect-[16/9] bg-sand-100 lg:block">
          <Image
            src={getPackageImageUrl(image.imageUrl)}
            alt={image.altText ?? travelPackage.title}
            fill
            unoptimized
            sizes="(min-width: 1024px) 360px, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="p-4 sm:p-5">
        <p className="text-overline text-tea-700">Your starting point</p>

        <h2 className="mt-1 text-heading-sm text-foreground">{travelPackage.title}</h2>

        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-body-sm text-foreground-secondary">
          <li className="flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {travelPackage.destination}
          </li>

          <li className="flex items-center gap-1.5">
            <Clock3 aria-hidden="true" className="size-4 shrink-0" />
            {travelPackage.durationDays} {travelPackage.durationDays === 1 ? "day" : "days"}
          </li>
        </ul>

        {travelPackage.description && (
          <div className="hidden lg:block">
            <p className="mt-3 line-clamp-2 text-body-sm text-muted-foreground">{travelPackage.description}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t pt-3">
          {price && (
            <p className="text-body-sm text-muted-foreground">
              From <span className="text-heading-sm text-foreground">{price}</span>
            </p>
          )}

          <Link
            href={`/packages/${travelPackage.slug}`}
            className="inline-flex min-h-10 items-center text-label text-tea-700 underline underline-offset-4"
          >
            View package<span className="sr-only">: {travelPackage.title}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
