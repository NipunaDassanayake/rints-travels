"use client";

import { useState } from "react";

import Image from "next/image";
import Link from "next/link";

import {
  CircleOff,
  CirclePlay,
  Clock3,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Pencil,
  Wallet,
} from "lucide-react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  getPackageImageUrl,
  updateAdminPackage,
} from "@/features/packages/admin-package.api";

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
  const queryClient = useQueryClient();

  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  const primaryImage =
    travelPackage.images.find((image) => image.isPrimary) ??
    travelPackage.images[0];

  const imageSrc = primaryImage
    ? getPackageImageUrl(primaryImage.imageUrl)
    : null;

  const isActive = travelPackage.status === "ACTIVE";

  /**
   * =========================================================
   * Activate / Deactivate
   * =========================================================
   */

  const statusMutation = useMutation({
    mutationFn: () =>
      updateAdminPackage(travelPackage.id, {
        status: isActive ? "INACTIVE" : "ACTIVE",
      }),

    onSuccess: async (updatedPackage) => {
      /**
       * Refresh admin package list.
       */
      await queryClient.invalidateQueries({
        queryKey: ["admin", "packages"],
      });

      /**
       * Keep edit page cache updated.
       */
      queryClient.setQueryData(
        ["admin", "package", travelPackage.id],
        updatedPackage,
      );

      /**
       * Refresh public package queries.
       */
      await queryClient.invalidateQueries({
        queryKey: ["packages"],
      });
    },
  });

  /**
   * =========================================================
   * Confirm Status Change
   * =========================================================
   */

  const handleStatusChange = () => {
    /**
     * Close the dialog immediately.
     *
     * This prevents the dialog from
     * changing from "Deactivate" to
     * "Activate" while the mutation
     * refreshes the package.
     */
    setIsStatusDialogOpen(false);

    statusMutation.mutate();
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid md:grid-cols-[220px_1fr]">
          {/* =================================================
              IMAGE
          ================================================= */}

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

          {/* =================================================
              CONTENT
          ================================================= */}

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

              {/* =================================================
                  PACKAGE INFO
              ================================================= */}

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

            {/* =================================================
                FOOTER
            ================================================= */}

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
                {/* Public Page */}

                {isActive && (
                  <Link
                    href={`/packages/${travelPackage.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: "outline",
                    })}
                  >
                    View public page
                    <ExternalLink className="size-4" />
                  </Link>
                )}

                {/* Edit */}

                <Link
                  href={`/admin/packages/${travelPackage.id}/edit`}
                  className={buttonVariants()}
                >
                  <Pencil className="size-4" />
                  Edit
                </Link>

                {/* Activate / Deactivate */}

                <AlertDialog
                  open={isStatusDialogOpen}
                  onOpenChange={setIsStatusDialogOpen}
                >
                  <AlertDialogTrigger
                    className={buttonVariants({
                      variant: isActive ? "outline" : "default",
                    })}
                    disabled={statusMutation.isPending}
                  >
                    {statusMutation.isPending ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Updating...
                      </>
                    ) : isActive ? (
                      <>
                        <CircleOff className="size-4" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <CirclePlay className="size-4" />
                        Activate
                      </>
                    )}
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {isActive
                          ? "Deactivate this package?"
                          : "Activate this package?"}
                      </AlertDialogTitle>

                      <AlertDialogDescription>
                        {isActive
                          ? `"${travelPackage.title}" will no longer be visible to travellers. Existing tour requests, quotations, payments and bookings will remain unchanged.`
                          : `"${travelPackage.title}" will become visible to travellers again and can be selected for new trips.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="rounded-xl border bg-muted/40 p-4">
                      <p className="font-medium">{travelPackage.title}</p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {travelPackage.destination}
                        {" · "}
                        {travelPackage.durationDays}{" "}
                        {travelPackage.durationDays === 1 ? "day" : "days"}
                      </p>
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>

                      <AlertDialogAction onClick={handleStatusChange}>
                        {isActive ? "Deactivate package" : "Activate package"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* =================================================
                STATUS UPDATE ERROR
            ================================================= */}

            {statusMutation.isError && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
                <p className="text-sm font-medium text-destructive">
                  Unable to update package status
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Please try again. Existing requests, quotations, payments and
                  bookings have not been changed.
                </p>
              </div>
            )}

            {/* =================================================
                INACTIVE NOTICE
            ================================================= */}

            {!isActive && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3">
                <p className="text-sm font-medium">This package is inactive</p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  It is hidden from travellers, but historical tour requests,
                  quotations, payments and bookings remain available.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
