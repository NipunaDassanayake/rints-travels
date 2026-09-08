"use client";

import Link from "next/link";

import {
  BriefcaseBusiness,
  Languages,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Star,
  UserRound,
  Wallet,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

import type { TourGuide } from "@/features/tour-guides/tour-guide.types";

interface AdminTourGuideCardProps {
  guide: TourGuide;

  isUpdatingAvailability?: boolean;

  isDeactivating?: boolean;

  availabilityError?: string | null;

  deactivateError?: string | null;

  onAvailabilityChange: (guide: TourGuide, isAvailable: boolean) => void;

  onDeactivate: (guide: TourGuide) => void;
}

function formatRating(value: string | number) {
  return (Number(value) || 0).toFixed(1);
}

export function AdminTourGuideCard({
  guide,
  isUpdatingAvailability = false,
  isDeactivating = false,
  availabilityError = null,
  deactivateError = null,
  onAvailabilityChange,
  onDeactivate,
}: AdminTourGuideCardProps) {
  const fullName = `${guide.user.firstName} ${guide.user.lastName}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <UserRound className="size-6 text-muted-foreground" />
            </div>

            <div>
              <CardTitle className="text-xl">{fullName}</CardTitle>

              {guide.user.email && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4" />

                  {guide.user.email}
                </div>
              )}

              {guide.location && (
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-4" />

                  {guide.location}
                </div>
              )}
            </div>
          </div>

          <span
            className={
              guide.isAvailable
                ? "rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                : "rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
            }
          >
            {guide.isAvailable ? "Available" : "Unavailable"}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-6">
        {guide.bio && (
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {guide.bio}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3">
            <BriefcaseBusiness className="mt-0.5 size-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Experience</p>

              <p className="mt-1 text-sm font-medium">
                {guide.experienceYears}{" "}
                {guide.experienceYears === 1 ? "year" : "years"}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Star className="mt-0.5 size-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Rating</p>

              <p className="mt-1 text-sm font-medium">
                {guide.totalReviews > 0
                  ? `${formatRating(
                      guide.averageRating,
                    )} · ${guide.totalReviews} ${
                      guide.totalReviews === 1 ? "review" : "reviews"
                    }`
                  : "No reviews yet"}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Languages className="mt-0.5 size-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Languages</p>

              <p className="mt-1 text-sm font-medium">
                {guide.languages.length > 0
                  ? guide.languages.join(", ")
                  : "Not specified"}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Wallet className="mt-0.5 size-5 text-muted-foreground" />

            <div>
              <p className="text-xs text-muted-foreground">Daily rate</p>

              <p className="mt-1 text-sm font-medium">
                {guide.dailyRate ? `USD ${guide.dailyRate}` : "Not specified"}
              </p>
            </div>
          </div>
        </div>

        {guide.specializations.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Specializations</p>

            <div className="mt-2 flex flex-wrap gap-2">
              {guide.specializations
                .slice(0, 5)
                .map((specialization: string) => (
                  <span
                    key={specialization}
                    className="rounded-full bg-muted px-3 py-1 text-xs"
                  >
                    {specialization}
                  </span>
                ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/guides/${guide.id}/edit`}
              className={buttonVariants({
                variant: "outline",
              })}
            >
              <Pencil className="size-4" />
              Edit
            </Link>

            <Link
              href={`/guides/${guide.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                variant: "ghost",
              })}
            >
              View public profile
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isUpdatingAvailability || isDeactivating}
              onClick={() => onAvailabilityChange(guide, !guide.isAvailable)}
            >
              {isUpdatingAvailability && (
                <LoaderCircle className="size-4 animate-spin" />
              )}

              {guide.isAvailable ? "Mark unavailable" : "Mark available"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger
                className={buttonVariants({
                  variant: "destructive",
                })}
                disabled={isUpdatingAvailability || isDeactivating}
              >
                {isDeactivating && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}
                Deactivate
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deactivate this guide?</AlertDialogTitle>

                  <AlertDialogDescription>
                    {`"${fullName}" will no longer appear publicly or be
                    assignable to new bookings, and will lose account access.
                    Historical bookings and reviews are preserved. This is
                    blocked if the guide has an active (confirmed or
                    in-progress) booking.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>

                  <AlertDialogAction onClick={() => onDeactivate(guide)}>
                    Deactivate guide
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {(availabilityError || deactivateError) && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
            <p className="text-sm font-medium text-destructive">
              {deactivateError ?? availabilityError}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}