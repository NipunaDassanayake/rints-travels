import Link from "next/link";

import {
  CalendarDays,
  MapPin,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  buttonVariants,
} from "@/components/ui/button";

import type {
  AdminTourRequest,
} from "../admin-tour-request.api";

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

function formatStatus(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}

export function AdminTourRequestCard({
  request,
}: {
  request: AdminTourRequest;
}) {
  const title =
    request.travelPackage?.title ??
    request.title ??
    "Custom Tour Request";

  const destination =
    request.travelPackage?.destination ??
    request.destinationPreferences ??
    "Not specified";

  const touristName =
    `${request.tourist.firstName} ${request.tourist.lastName}`;

  const guideName =
    request.preferredGuide
      ? `${request.preferredGuide.user.firstName} ${request.preferredGuide.user.lastName}`
      : "No preference";

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

            <p className="mt-1 text-sm text-muted-foreground">
              Request ID:{" "}
              {request.id}
            </p>
          </div>

          <span className="rounded-full border px-3 py-1 text-xs font-medium">
            {formatStatus(
              request.status
            )}
          </span>
        </div>

        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex gap-2">
            <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">
                Tourist
              </p>

              <p className="font-medium">
                {touristName}
              </p>

              <p className="text-xs text-muted-foreground">
                {request.tourist.email}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">
                Destination
              </p>

              <p className="font-medium">
                {destination}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">
                Travel dates
              </p>

              <p className="font-medium">
                {formatDate(
                  request.preferredStartDate
                )}
              </p>

              <p className="text-xs text-muted-foreground">
                to{" "}
                {formatDate(
                  request.preferredEndDate
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">
                Travelers
              </p>

              <p className="font-medium">
                {request.adultCount} adult
                {request.adultCount !== 1
                  ? "s"
                  : ""}

                {" · "}

                {request.childCount} child
                {request.childCount !== 1
                  ? "ren"
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Wallet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">
                Budget
              </p>

              <p className="font-medium">
                {request.budget
                  ? `${request.currency} ${request.budget}`
                  : "Not specified"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-muted-foreground">
              Preferred guide
            </p>

            <p className="font-medium">
              {guideName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <div className="text-xs text-muted-foreground">
            Submitted{" "}
            {formatDate(
              request.createdAt
            )}
          </div>

          <Link
            href={`/admin/tour-requests/${request.id}`}
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