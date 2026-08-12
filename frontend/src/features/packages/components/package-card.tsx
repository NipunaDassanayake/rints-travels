import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock3, MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type { TravelPackage } from "../package.types";

export function PackageCard({
  travelPackage,
}: {
  travelPackage: TravelPackage;
}) {
  const primaryImage =
    travelPackage.images.find((image) => image.isPrimary) ??
    travelPackage.images[0];

  return (
    <Card className="overflow-hidden p-0">
      <div className="aspect-[16/10] overflow-hidden bg-muted">
        {primaryImage ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden">
            <Image
              src={primaryImage.imageUrl}
              alt={primaryImage.altText ?? travelPackage.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image available
          </div>
        )}
      </div>

      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-xl font-semibold">{travelPackage.title}</h2>

          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-4" />

              {travelPackage.destination}
            </span>

            <span className="flex items-center gap-1">
              <Clock3 className="size-4" />
              {travelPackage.durationDays} days
            </span>
          </div>
        </div>

        <p className="line-clamp-3 text-sm text-muted-foreground">
          {travelPackage.description}
        </p>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Starting from</p>

            <p className="text-xl font-bold">${travelPackage.price}</p>
          </div>

          <Link
            href={`/packages/${travelPackage.slug}`}
            className="flex items-center gap-1 text-sm font-medium"
          >
            View package
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
