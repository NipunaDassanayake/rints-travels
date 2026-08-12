import Link from "next/link";

import {
  CalendarDays,
  MapPin,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  buttonVariants,
} from "@/components/ui/button";

import type {
  TourRequest,
  TourRequestStatus,
} from "../tour-request.types";

function formatStatus(
  status: TourRequestStatus
) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Flexible";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }
  ).format(
    new Date(value)
  );
}

export function TourRequestCard({
  request,
}: {
  request: TourRequest;
}) {
  const title =
    request.travelPackage?.title ??
    request.title ??
    "Custom Tour Request";

  const destination =
    request.travelPackage?.destination ??
    request.destinationPreferences;

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {request.requestType ===
              "PACKAGE_BASED"
                ? "Package Based"
                : "Custom Request"}
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              {title}
            </h2>
          </div>

          <span className="rounded-full border px-3 py-1 text-xs font-medium">
            {formatStatus(
              request.status
            )}
          </span>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          {destination && (
            <div className="flex items-center gap-2">
              <MapPin className="size-4" />

              {destination}
            </div>
          )}

          <div className="flex items-center gap-2">
            <CalendarDays className="size-4" />

            {formatDate(
              request.preferredStartDate
            )}

            {" → "}

            {formatDate(
              request.preferredEndDate
            )}
          </div>

          <div className="flex items-center gap-2">
            <Users className="size-4" />

            {request.adultCount} adult
            {request.adultCount !== 1
              ? "s"
              : ""}

            {" · "}

            {request.childCount} child
            {request.childCount !== 1
              ? "ren"
              : ""}
          </div>

          <div>
            Budget:{" "}
            {request.budget
              ? `${request.currency} ${request.budget}`
              : "Not specified"}
          </div>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Link
            href={`/tourist/requests/${request.id}`}
            className={buttonVariants({
              variant: "outline",
            })}
          >
            View request
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}