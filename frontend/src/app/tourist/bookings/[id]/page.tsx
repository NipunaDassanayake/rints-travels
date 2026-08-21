"use client";

import Link from "next/link";

import { useParams } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  MapPin,
  Play,
  Route,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  completeGuideTour,
  getGuideBookingById,
  startGuideTour,
} from "@/features/bookings/guide-booking.api";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not specified";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export default function GuideBookingDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

  const bookingId = params.id;

  const queryClient = useQueryClient();

  const {
    data: booking,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["guide", "booking", bookingId],

    queryFn: () => getGuideBookingById(bookingId),

    enabled: Boolean(bookingId),
  });

  const startMutation = useMutation({
    mutationFn: () => startGuideTour(bookingId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["guide", "booking", bookingId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["guide", "bookings"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["bookings", "me"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["admin", "bookings"],
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeGuideTour(bookingId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["guide", "booking", bookingId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["guide", "bookings"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["bookings", "me"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["admin", "bookings"],
      });
    },
  });

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (isError || !booking) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">Unable to load tour</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            This assigned tour could not be loaded.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className={buttonVariants({
                variant: "outline",
              })}
            >
              Try again
            </button>

            <Link
              href="/guide"
              className={buttonVariants({
                variant: "ghost",
              })}
            >
              Back to assigned tours
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const touristName = `${booking.tourist.firstName} ${booking.tourist.lastName}`;

  const destination =
    booking.tourRequest.destinationPreferences ||
    booking.quotation.description ||
    "Sri Lanka";

  const isActionPending = startMutation.isPending || completeMutation.isPending;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/guide"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to assigned tours
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Route className="size-5" />

              <p className="text-sm font-medium uppercase tracking-[0.16em]">
                Assigned tour
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {booking.quotation.title}
            </h1>

            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <p>
                Booking reference:{" "}
                <span className="font-medium text-foreground">
                  {booking.bookingReference}
                </span>
              </p>

              <p>Booking ID: {booking.id}</p>
            </div>
          </div>

          <span className="rounded-full border px-4 py-2 text-sm font-medium">
            {formatStatus(booking.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tourist details</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="flex gap-3">
                <UserRound className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Name</p>

                  <p className="mt-1 font-medium">{touristName}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Mail className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Email</p>

                  <p className="mt-1 font-medium">{booking.tourist.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trip details</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="flex gap-3">
                <CalendarDays className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Travel dates</p>

                  <p className="mt-1 font-medium">
                    {formatDate(booking.startDate)}
                    {" → "}
                    {formatDate(booking.endDate)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Users className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Travelers</p>

                  <p className="mt-1 font-medium">
                    {booking.quotation.adultCount} adult
                    {booking.quotation.adultCount !== 1 ? "s" : ""}
                    {" · "}
                    {booking.quotation.childCount} child
                    {booking.quotation.childCount !== 1 ? "ren" : ""}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <MapPin className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Journey</p>

                  <p className="mt-1 font-medium">{destination}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Wallet className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Booking total</p>

                  <p className="mt-1 font-medium">
                    {booking.currency} {booking.totalAmount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {booking.quotation.description && (
            <Card>
              <CardHeader>
                <CardTitle>Tour overview</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="leading-7 text-muted-foreground">
                  {booking.quotation.description}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Itinerary</CardTitle>
            </CardHeader>

            <CardContent>
              {booking.quotation.itineraries.length > 0 ? (
                <div className="space-y-6">
                  {booking.quotation.itineraries.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-3 border-l-2 pl-5 sm:grid-cols-[90px_1fr]"
                    >
                      <p className="font-semibold text-primary">
                        Day {item.dayNumber}
                      </p>

                      <div>
                        <h3 className="font-semibold">{item.title}</h3>

                        <p className="mt-2 leading-7 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No itinerary has been added for this tour.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Included</CardTitle>
              </CardHeader>

              <CardContent>
                {booking.quotation.inclusions.length > 0 ? (
                  <div className="space-y-3">
                    {booking.quotation.inclusions.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <Check className="mt-0.5 size-5 shrink-0 text-primary" />

                        <span>{item.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No inclusions specified.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Not included</CardTitle>
              </CardHeader>

              <CardContent>
                {booking.quotation.exclusions.length > 0 ? (
                  <div className="space-y-3">
                    {booking.quotation.exclusions.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <X className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

                        <span>{item.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No exclusions specified.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="space-y-6">
          {/* GUIDE ACTIONS */}

          <Card>
            <CardHeader>
              <CardTitle>Tour actions</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {booking.status === "CONFIRMED" && (
                <>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Start the tour when the journey officially begins.
                  </p>

                  <Button
                    className="w-full"
                    disabled={isActionPending}
                    onClick={() => {
                      const confirmed = window.confirm(
                        "Start this tour? The booking will move to In Progress.",
                      );

                      if (confirmed) {
                        startMutation.mutate();
                      }
                    }}
                  >
                    {startMutation.isPending ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="size-4" />
                        Start tour
                      </>
                    )}
                  </Button>
                </>
              )}

              {booking.status === "IN_PROGRESS" && (
                <>
                  <p className="text-sm leading-6 text-muted-foreground">
                    The tour is currently in progress. Complete it after the
                    journey has finished.
                  </p>

                  <Button
                    className="w-full"
                    disabled={isActionPending}
                    onClick={() => {
                      const confirmed = window.confirm(
                        "Complete this tour? This action will mark the booking as completed.",
                      );

                      if (confirmed) {
                        completeMutation.mutate();
                      }
                    }}
                  >
                    {completeMutation.isPending ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        Complete tour
                      </>
                    )}
                  </Button>
                </>
              )}

              {booking.status === "COMPLETED" && (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />

                    <div>
                      <p className="font-medium">Tour completed</p>

                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        This journey has been completed successfully.
                      </p>

                      {booking.completedAt && (
                        <p className="mt-2 text-sm font-medium">
                          {formatDateTime(booking.completedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {booking.status === "CANCELLED" && (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="flex gap-3">
                    <X className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

                    <div>
                      <p className="font-medium">Tour cancelled</p>

                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        No further tour actions are available.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {startMutation.isError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">
                    {getErrorMessage(startMutation.error)}
                  </p>
                </div>
              )}

              {completeMutation.isError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">
                    {getErrorMessage(completeMutation.error)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* STATUS */}

          <Card>
            <CardHeader>
              <CardTitle>Tour status</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Current status</p>

                <p className="mt-1 font-medium">
                  {formatStatus(booking.status)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>

                <p className="mt-1 font-medium">
                  {formatDateTime(booking.confirmedAt)}
                </p>
              </div>

              {booking.completedAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>

                  <p className="mt-1 font-medium">
                    {formatDateTime(booking.completedAt)}
                  </p>
                </div>
              )}

              {booking.cancelledAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Cancelled</p>

                  <p className="mt-1 font-medium">
                    {formatDateTime(booking.cancelledAt)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* TOUR INFO */}

          <Card>
            <CardHeader>
              <CardTitle>Tour information</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Quotation</p>

                <p className="mt-1 break-all font-medium">
                  {booking.quotation.quotationNumber}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Tour price</p>

                <p className="mt-1 font-medium">
                  {booking.quotation.currency} {booking.quotation.totalAmount}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Number of itinerary days
                </p>

                <div className="mt-1 flex items-center gap-2 font-medium">
                  <Clock3 className="size-4 text-muted-foreground" />

                  {booking.quotation.itineraries.length}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NOTES */}

          {(booking.quotation.notes ||
            booking.quotation.termsConditions ||
            booking.tourRequest.specialRequirements) && (
            <Card>
              <CardHeader>
                <CardTitle>Important notes</CardTitle>
              </CardHeader>

              <CardContent className="space-y-5">
                {booking.tourRequest.specialRequirements && (
                  <div>
                    <p className="text-sm font-medium">Tourist requirements</p>

                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {booking.tourRequest.specialRequirements}
                    </p>
                  </div>
                )}

                {booking.quotation.notes && (
                  <div>
                    <p className="text-sm font-medium">Tour notes</p>

                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {booking.quotation.notes}
                    </p>
                  </div>
                )}

                {booking.quotation.termsConditions && (
                  <div>
                    <p className="text-sm font-medium">
                      Terms &amp; conditions
                    </p>

                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {booking.quotation.termsConditions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </main>
  );
}