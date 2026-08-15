"use client";

import Link from "next/link";

import {
  useParams,
} from "next/navigation";

import {
  useQuery,
} from "@tanstack/react-query";

import {
  ArrowLeft,
  CalendarDays,
  Hotel,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  buttonVariants,
} from "@/components/ui/button";

import {
  getTourRequestById,
} from "@/features/tour-requests/tour-request.api";

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

export default function AdminTourRequestDetailsPage() {
  const params =
    useParams<{
      id: string;
    }>();

  const requestId =
    params.id;

  const {
    data: request,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "admin",
      "tour-request",
      requestId,
    ],

    queryFn: () =>
      getTourRequestById(
        requestId
      ),

    enabled:
      Boolean(requestId),
  });

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (
    isError ||
    !request
  ) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">
            Unable to load request
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            The request could not be loaded.
          </p>

          <Link
            href="/admin/tour-requests"
            className={`${buttonVariants({
              variant: "outline",
            })} mt-5`}
          >
            Back to tour requests
          </Link>
        </div>
      </main>
    );
  }

  const title =
    request.travelPackage?.title ??
    request.title ??
    "Custom Tour Request";

  const destination =
    request.travelPackage?.destination ??
    request.destinationPreferences ??
    "Not specified";

  const tourist =
    request.tourist;

  const preferredGuide =
    request.preferredGuide;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <Link
          href="/admin/tour-requests"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />

          Back to tour requests
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              {request.requestType ===
              "PACKAGE_BASED"
                ? "Package Based Request"
                : "Custom Tour Request"}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Request ID:{" "}
              {request.id}
            </p>
          </div>

          <span className="rounded-full border px-4 py-2 text-sm font-medium">
            {formatStatus(
              request.status
            )}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Tourist details
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <UserRound className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Name
                    </p>

                    <p className="mt-1 font-medium">
                      {tourist
                        ? `${tourist.firstName} ${tourist.lastName}`
                        : "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Mail className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Email
                    </p>

                    <p className="mt-1 font-medium">
                      {tourist?.email ??
                        "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Phone className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Phone
                    </p>

                    <p className="mt-1 font-medium">
                      {tourist?.phone ??
                        "Not available"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <MessageCircle className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Preferred contact method
                    </p>

                    <p className="mt-1 font-medium">
                      {request.contactMethod
                        ? formatStatus(
                            request.contactMethod
                          )
                        : "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Travel details
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <MapPin className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Destination
                    </p>

                    <p className="mt-1 font-medium">
                      {destination}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CalendarDays className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Travel dates
                    </p>

                    <p className="mt-1 font-medium">
                      {formatDate(
                        request.preferredStartDate
                      )}

                      {" → "}

                      {formatDate(
                        request.preferredEndDate
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Users className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Travelers
                    </p>

                    <p className="mt-1 font-medium">
                      {request.adultCount} adult
                      {request.adultCount !==
                      1
                        ? "s"
                        : ""}

                      {" · "}

                      {request.childCount} child
                      {request.childCount !==
                      1
                        ? "ren"
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Wallet className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Budget
                    </p>

                    <p className="mt-1 font-medium">
                      {request.budget
                        ? `${request.currency} ${request.budget}`
                        : "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Preferences
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <Hotel className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Hotel preference
                    </p>

                    <p className="mt-1 font-medium">
                      {request.hotelPreference ||
                        "Not specified"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Transport preference
                  </p>

                  <p className="mt-1 font-medium">
                    {request.transportPreference ||
                      "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">
                    Preferred guide
                  </p>

                  <p className="mt-1 font-medium">
                    {preferredGuide
                      ? `${preferredGuide.user.firstName} ${preferredGuide.user.lastName}`
                      : "No preference"}
                  </p>
                </div>
              </div>

              <div className="mt-6 border-t pt-6">
                <p className="text-sm text-muted-foreground">
                  Special requirements
                </p>

                <p className="mt-2 leading-7">
                  {request.specialRequirements ||
                    "No special requirements provided."}
                </p>
              </div>
            </CardContent>
          </Card>

          {request.requestType ===
            "CUSTOM" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Custom trip details
                </CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Destination preferences
                </p>

                <p className="mt-2 leading-7">
                  {request.destinationPreferences ||
                    "Not specified"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Request management
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Current status
                </p>

                <p className="mt-1 font-medium">
                  {formatStatus(
                    request.status
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Assigned admin
                </p>

                <p className="mt-1 font-medium">
                  {request.assignedAdminId
                    ? "Assigned"
                    : "Not assigned"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Submitted
                </p>

                <p className="mt-1 font-medium">
                  {formatDate(
                    request.createdAt
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Admin actions
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Status management, editing, admin assignment, and quotation
                actions will be added here next.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}