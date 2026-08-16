import Image from "next/image";
import Link from "next/link";

import { Clock3, MapPin, Pencil, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import { getPackageImageUrl } from "@/features/packages/admin-package.api";

import type { TravelPackage } from "@/features/packages/package.types";

function getStatusClass(status: string) {
  if (status === "ACTIVE") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

export function AdminPackageCard({
  travelPackage,
}: {
  travelPackage: TravelPackage;
}) {
  const primaryImage =
    travelPackage.images.find((image) => image.isPrimary) ??
    travelPackage.images[0];

  const imageSrc = primaryImage
    ? getPackageImageUrl(primaryImage.imageUrl)
    : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-[220px_1fr]">
          <div className="relative min-h-[180px] bg-muted">
            {primaryImage && imageSrc ? (
              <Image
                src={imageSrc}
                alt={primaryImage.altText ?? travelPackage.title}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 220px"
                className="object-cover"
              />
            ) : (
              <div className="flex size-full min-h-[180px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                No package image
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-6 p-6">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Package #{travelPackage.id}
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    {travelPackage.title}
                  </h2>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {travelPackage.description}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                    travelPackage.status,
                  )}`}
                >
                  {travelPackage.status}
                </span>
              </div>

              <div className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                <div className="flex gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-muted-foreground">Destination</p>

                    <p className="font-medium">{travelPackage.destination}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-muted-foreground">Duration</p>

                    <p className="font-medium">
                      {travelPackage.durationDays}{" "}
                      {travelPackage.durationDays === 1 ? "day" : "days"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Wallet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-muted-foreground">Starting price</p>

                    <p className="font-medium">USD {travelPackage.price}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {travelPackage.images.length}{" "}
                {travelPackage.images.length === 1 ? "image" : "images"}
                {" · "}
                {travelPackage.itineraries.length}{" "}
                {travelPackage.itineraries.length === 1
                  ? "itinerary day"
                  : "itinerary days"}
              </p>

              <div className="flex flex-wrap gap-2">
                {travelPackage.status === "ACTIVE" && (
                  <Link
                    href={`/packages/${travelPackage.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: "outline",
                    })}
                  >
                    View public page
                  </Link>
                )}

                <Link
                  href={`/admin/packages/${travelPackage.id}/edit`}
                  className={buttonVariants()}
                >
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
