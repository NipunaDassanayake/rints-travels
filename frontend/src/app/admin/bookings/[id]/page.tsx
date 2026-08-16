"use client";

import Link from "next/link";

import { useParams } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Mail,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  getAdminBookingById,
  updateBookingStatus,
} from "@/features/bookings/admin-booking.api";

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

export default function AdminBookingDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

  const bookingId = params.id;

  const queryClient = useQueryClient();

  const {
    data: booking,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin", "booking", bookingId],

    queryFn: () => getAdminBookingById(bookingId),

    enabled: Boolean(bookingId),
  });

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

  const touristName = `${booking.tourist.firstName} ${booking.tourist.lastName}`;

  const guide = booking.quotation.guide;

  const guideName = guide
    ? `${guide.user.firstName} ${guide.user.lastName}`
    : "Not assigned";

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
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

        <aside className="space-y-6">
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

          <Card>
            <CardHeader>
              <CardTitle>Admin actions</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {booking.status === "CONFIRMED" && (
                <>
                  <Button
                    className="w-full"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("IN_PROGRESS")}
                  >
                    {statusMutation.isPending ? "Updating..." : "Start tour"}
                  </Button>

                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={statusMutation.isPending}
                    onClick={() => statusMutation.mutate("CANCELLED")}
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
                    onClick={() => statusMutation.mutate("CANCELLED")}
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
                <p className="text-sm text-destructive">
                  Unable to update the booking status.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}