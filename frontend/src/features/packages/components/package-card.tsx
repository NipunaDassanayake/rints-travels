import Image from "next/image";
import Link from "next/link";

import { ArrowRight, Clock3, MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { getPackageImageUrl } from "../admin-package.api";

import type { TravelPackage } from "../package.types";

export function PackageCard({
  travelPackage,
}: {
  travelPackage: TravelPackage;
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

  return (
    <Card className="group overflow-hidden p-0 transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Package Image */}
      <Link href={`/packages/${travelPackage.slug}`} className="block">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {primaryImage && imageSrc ? (
            <Image
              src={imageSrc}
              alt={primaryImage.altText ?? travelPackage.title}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
              No image available
            </div>
          )}
        </div>
      </Link>

      {/* Package Content */}
      <CardContent className="space-y-4 p-5">
        <div>
          <Link href={`/packages/${travelPackage.slug}`}>
            <h2 className="text-xl font-semibold tracking-tight transition-colors hover:text-slate-600">
              {travelPackage.title}
            </h2>
          </Link>

          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {/* Destination */}
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" />

              {travelPackage.destination}
            </span>

            {/* Duration */}
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-4 shrink-0" />
              {travelPackage.durationDays}{" "}
              {travelPackage.durationDays === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {travelPackage.description}
        </p>

        {/* Price + Link */}
        <div className="flex items-end justify-between gap-4 border-t pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Starting from</p>

            <p className="mt-1 text-xl font-bold">${travelPackage.price}</p>

            <p className="text-xs text-muted-foreground">per journey</p>
          </div>

          <Link
            href={`/packages/${travelPackage.slug}`}
            className="group/link flex items-center gap-1.5 text-sm font-medium"
          >
            View package
            <ArrowRight className="size-4 transition-transform group-hover/link:translate-x-1" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}