"use client";

import Link from "next/link";

import { useState } from "react";

import { useParams } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Languages,
  LoaderCircle,
  Mail,
  MapPin,
  Star,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  assignBookingGuide,
  getAdminBookingById,
  updateBookingStatus,
} from "@/features/bookings/admin-booking.api";

import { getTourGuides } from "@/features/tour-guides/tour-guide.api";

import type { BookingStatus } from "@/features/bookings/booking.types";

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

export default function AdminBookingDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

  const bookingId = params.id;

  const queryClient = useQueryClient();

  const [selectedGuideId, setSelectedGuideId] = useState("");

  /**
   * =========================================================
   * Booking
   * =========================================================
   */

  const {
    data: booking,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "booking", bookingId],

    queryFn: () => getAdminBookingById(bookingId),

    enabled: Boolean(bookingId),
  });

  /**
   * =========================================================
   * Tour Guides
   * =========================================================
   */

  const {
    data: guides = [],
    isLoading: areGuidesLoading,
    isError: areGuidesError,
  } = useQuery({
    queryKey: ["tour-guides"],

    queryFn: getTourGuides,
  });

  /**
   * =========================================================
   * Status Mutation
   * =========================================================
   */

  const statusMutation = useMutation({
    mutationFn: (status: BookingStatus) =>
      updateBookingStatus(bookingId, status),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "booking", bookingId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["admin", "bookings"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["bookings", "me"],
      });
    },
  });

  /**
   * =========================================================
   * Guide Assignment Mutation
   * =========================================================
   */

  const guideMutation = useMutation({
    mutationFn: (guideId: string) => assignBookingGuide(bookingId, guideId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin", "booking", bookingId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["admin", "bookings"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["bookings", "me"],
      });

      setSelectedGuideId("");
    },
  });

  /**
   * =========================================================
   * Loading
   * =========================================================
   */

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-muted-foreground" />
      </main>
    );
  }

  /**
   * =========================================================
   * Error
   * =========================================================
   */

  if (isError || !booking) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/40 p-6">
          <h1 className="text-xl font-semibold">Unable to load booking</h1>

          <p className="mt-2 text-sm text-muted-foreground">
            The booking could not be loaded.
          </p>

          <Link
            href="/admin/bookings"
            className={`${buttonVariants({
              variant: "outline",
            })} mt-5`}
          >
            Back to bookings
          </Link>
        </div>
      </main>
    );
  }

  /**
   * =========================================================
   * Derived Values
   * =========================================================
   */

  const touristName = `${booking.tourist.firstName} ${booking.tourist.lastName}`;

  const guide = booking.quotation.guide;

  const guideName = guide
    ? `${guide.user.firstName} ${guide.user.lastName}`
    : "Not assigned";

  const availableGuides = guides.filter((tourGuide) => tourGuide.isAvailable);

  const selectedGuide = guides.find(
    (tourGuide) => tourGuide.id === selectedGuideId,
  );

  const canAssignGuide =
    booking.status === "CONFIRMED" || booking.status === "IN_PROGRESS";

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-8">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to bookings
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              Booking management
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {booking.quotation.title}
            </h1>

            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
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

      {/* =====================================================
          MAIN GRID
      ===================================================== */}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ===================================================
            LEFT
        =================================================== */}

        <div className="space-y-6">
          {/* Tourist details */}

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

          {/* Trip details */}

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
                <Wallet className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Total amount</p>

                  <p className="mt-1 font-medium">
                    {booking.currency} {booking.totalAmount}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <UserRound className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Tour guide</p>

                  <p className="mt-1 font-medium">{guideName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Itinerary */}

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
                  No itinerary has been added.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Included / Not included */}

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
                        <Check className="mt-0.5 size-5 text-primary" />

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
                        <X className="mt-0.5 size-5 text-muted-foreground" />

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

        {/* ===================================================
            RIGHT SIDEBAR
        =================================================== */}

        <aside className="space-y-6">
          {/* =================================================
              TOUR GUIDE
          ================================================= */}

          <Card>
            <CardHeader>
              <CardTitle>Tour guide</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">Current guide</p>

                <p className="mt-1 text-lg font-semibold">{guideName}</p>
              </div>

              {/* Current guide details */}

              {guide && (
                <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-muted-foreground" />

                    <span>{guide.location || "Location not specified"}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Users className="size-4 text-muted-foreground" />

                    <span>
                      {guide.experienceYears}{" "}
                      {guide.experienceYears === 1 ? "year" : "years"}{" "}
                      experience
                    </span>
                  </div>

                  {guide.languages.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Languages className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                      <span>{guide.languages.join(", ")}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Star className="size-4 text-muted-foreground" />

                    <span>
                      {Number(guide.averageRating).toFixed(1)}

                      {guide.totalReviews > 0
                        ? ` (${guide.totalReviews} reviews)`
                        : " · No reviews yet"}
                    </span>
                  </div>
                </div>
              )}

              {/* Guide assignment */}

              {canAssignGuide ? (
                <>
                  <div className="space-y-2">
                    <label
                      htmlFor="booking-guide"
                      className="text-sm font-medium"
                    >
                      {guide ? "Change guide" : "Assign guide"}
                    </label>

                    {areGuidesLoading ? (
                      <div className="flex h-11 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
                        <LoaderCircle className="size-4 animate-spin" />
                        Loading guides...
                      </div>
                    ) : areGuidesError ? (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                        Unable to load tour guides.
                      </div>
                    ) : (
                      <select
                        id="booking-guide"
                        value={selectedGuideId}
                        onChange={(event) =>
                          setSelectedGuideId(event.target.value)
                        }
                        className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select an available guide</option>

                        {availableGuides.map((tourGuide) => (
                          <option key={tourGuide.id} value={tourGuide.id}>
                            {tourGuide.user.firstName} {tourGuide.user.lastName}
                            {" — "}
                            {tourGuide.experienceYears} yrs
                            {tourGuide.location
                              ? ` — ${tourGuide.location}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Selected guide preview */}

                  {selectedGuide && (
                    <div className="rounded-xl border p-4">
                      <p className="font-medium">
                        {selectedGuide.user.firstName}{" "}
                        {selectedGuide.user.lastName}
                      </p>

                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <p>
                          {selectedGuide.experienceYears}{" "}
                          {selectedGuide.experienceYears === 1
                            ? "year"
                            : "years"}{" "}
                          experience
                        </p>

                        {selectedGuide.location && (
                          <p>{selectedGuide.location}</p>
                        )}

                        {selectedGuide.languages.length > 0 && (
                          <p>{selectedGuide.languages.join(", ")}</p>
                        )}

                        {selectedGuide.dailyRate && (
                          <p>Daily rate: ${selectedGuide.dailyRate}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={!selectedGuideId || guideMutation.isPending}
                    onClick={() => guideMutation.mutate(selectedGuideId)}
                  >
                    {guideMutation.isPending ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Assigning...
                      </>
                    ) : guide ? (
                      "Change guide"
                    ) : (
                      "Assign guide"
                    )}
                  </Button>

                  {guideMutation.isError && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                      <p className="text-sm text-destructive">
                        {getErrorMessage(guideMutation.error)}
                      </p>
                    </div>
                  )}

                  {availableGuides.length === 0 &&
                    !areGuidesLoading &&
                    !areGuidesError && (
                      <p className="text-sm text-muted-foreground">
                        No available tour guides found.
                      </p>
                    )}
                </>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Guide assignment is no longer available because this booking
                  is{" "}
                  <span className="font-medium text-foreground">
                    {formatStatus(booking.status)}
                  </span>
                  .
                </p>
              )}
            </CardContent>
          </Card>

          {/* =================================================
              BOOKING STATUS
          ================================================= */}

          <Card>
            <CardHeader>
              <CardTitle>Booking status</CardTitle>
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

          {/* =================================================
              PAYMENT
          ================================================= */}

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <CreditCard className="mt-1 size-5 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">Status</p>

                  <p className="mt-1 font-medium">
                    {formatStatus(booking.payment.status)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Payment reference
                </p>

                <p className="mt-1 break-all font-medium">
                  {booking.payment.paymentReference}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Method</p>

                <p className="mt-1 font-medium">
                  {booking.payment.paymentMethod
                    ? formatStatus(booking.payment.paymentMethod)
                    : "Not specified"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* =================================================
              ADMIN ACTIONS
          ================================================= */}

          <Card>
            <CardHeader>
              <CardTitle>Admin actions</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {booking.status === "CONFIRMED" && (
                <>
                  {!guide && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      Assign a tour guide before starting this tour.
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={statusMutation.isPending || !guide}
                    onClick={() => statusMutation.mutate("IN_PROGRESS")}
                  >
                    {statusMutation.isPending ? "Updating..." : "Start tour"}
                  </Button>

                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={statusMutation.isPending}
                    onClick={() => {
                      const confirmed = window.confirm(
                        "Are you sure you want to cancel this booking?",
                      );

                      if (confirmed) {
                        statusMutation.mutate("CANCELLED");
                      }
                    }}
                  >
                    Cancel booking
                  </Button>
                </>
              )}

              {booking.status === "IN_PROGRESS" && (
                <>
                  <Button
                    className="w-full"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("COMPLETED")}
                  >
                    {statusMutation.isPending ? "Updating..." : "Complete tour"}
                  </Button>

                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={statusMutation.isPending}
                    onClick={() => {
                      const confirmed = window.confirm(
                        "Are you sure you want to cancel this booking?",
                      );

                      if (confirmed) {
                        statusMutation.mutate("CANCELLED");
                      }
                    }}
                  >
                    Cancel booking
                  </Button>
                </>
              )}

              {booking.status === "COMPLETED" && (
                <div className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 text-primary" />

                  <p className="text-sm leading-6 text-muted-foreground">
                    This tour has been completed. No further status changes are
                    available.
                  </p>
                </div>
              )}

              {booking.status === "CANCELLED" && (
                <div className="flex gap-3">
                  <X className="mt-0.5 size-5 text-muted-foreground" />

                  <p className="text-sm leading-6 text-muted-foreground">
                    This booking has been cancelled. No further status changes
                    are available.
                  </p>
                </div>
              )}

              {statusMutation.isError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">
                    {getErrorMessage(statusMutation.error)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
