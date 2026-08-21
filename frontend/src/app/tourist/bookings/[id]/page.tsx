"use client";

import Link from "next/link";

import { useParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  MapPin,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import { getBookingById } from "@/features/bookings/booking.api";

import { BookingReviewSection } from "@/features/reviews/components/booking-review-section";

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

export default function TouristBookingDetailsPage() {
  const params = useParams<{
    id: string;
  }>();

  const bookingId = params.id;

  const {
    data: booking,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["booking", bookingId],

    queryFn: () => getBookingById(bookingId),

    enabled: Boolean(bookingId),
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
            The booking could not be loaded or you may not have permission to
            view it.
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
              href="/tourist/bookings"
              className={buttonVariants({
                variant: "ghost",
              })}
            >
              Back to bookings
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const guide = booking.quotation.guide;

  const guideName = guide
    ? `${guide.user.firstName} ${guide.user.lastName}`
    : "Not assigned";

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-8">
        <Link
          href="/tourist/bookings"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to bookings
        </Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="size-5" />

              <p className="text-sm font-medium uppercase tracking-wide">
                Your booking
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

              <p>Quotation: {booking.quotation.quotationNumber}</p>
            </div>
          </div>

          <span className="rounded-full border px-4 py-2 text-sm font-medium">
            {formatStatus(booking.status)}
          </span>
        </div>
      </div>

      {/* =====================================================
          MAIN LAYOUT
      ===================================================== */}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ===================================================
            MAIN COLUMN
        =================================================== */}

        <div className="space-y-6">
          {/* Trip overview */}

          <Card>
            <CardHeader>
              <CardTitle>Trip overview</CardTitle>
            </CardHeader>

            <CardContent>
              {booking.quotation.description && (
                <p className="mb-6 leading-7 text-muted-foreground">
                  {booking.quotation.description}
                </p>
              )}

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex gap-3">
                  <CalendarDays className="mt-1 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="text-sm text-muted-foreground">
                      Travel dates
                    </p>

                    <p className="mt-1 font-medium">
                      {formatDate(booking.startDate)}

                      {" → "}

                      {formatDate(booking.endDate)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Users className="mt-1 size-5 shrink-0 text-muted-foreground" />

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
              </div>
            </CardContent>
          </Card>

          {/* ===================================================
              ITINERARY
          =================================================== */}

          <Card>
            <CardHeader>
              <CardTitle>Your itinerary</CardTitle>
            </CardHeader>

            <CardContent>
              {booking.quotation.itineraries.length > 0 ? (
                <div className="space-y-7">
                  {[...booking.quotation.itineraries]
                    .sort((a, b) => a.dayNumber - b.dayNumber)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="grid gap-3 border-l-2 pl-5 sm:grid-cols-[90px_1fr]"
                      >
                        <div>
                          <span className="inline-flex rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                            Day {item.dayNumber}
                          </span>
                        </div>

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
                  No itinerary has been added to this booking.
                </p>
              )}
            </CardContent>
          </Card>

          {/* ===================================================
              INCLUDED / NOT INCLUDED
          =================================================== */}

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
                    No inclusions were specified.
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
                    No exclusions were specified.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ===================================================
              GUIDE
          =================================================== */}

          <Card>
            <CardHeader>
              <CardTitle>Your tour guide</CardTitle>
            </CardHeader>

            <CardContent>
              {guide ? (
                <div className="space-y-5">
                  <div className="flex gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
                      <UserRound className="size-6 text-muted-foreground" />
                    </div>

                    <div>
                      <h3 className="font-semibold">{guideName}</h3>

                      {guide.location && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="size-3.5" />

                          {guide.location}
                        </div>
                      )}

                      <p className="mt-1 text-sm text-muted-foreground">
                        {guide.experienceYears} years of experience
                      </p>
                    </div>
                  </div>

                  {guide.bio && (
                    <p className="leading-7 text-muted-foreground">
                      {guide.bio}
                    </p>
                  )}

                  {guide.languages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Languages</p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {guide.languages.map((language) => (
                          <span
                            key={language}
                            className="rounded-full bg-muted px-3 py-1 text-xs"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {guide.specializations.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Specializations</p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {guide.specializations.map((specialization) => (
                          <span
                            key={specialization}
                            className="rounded-full border px-3 py-1 text-xs"
                          >
                            {specialization}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-3">
                  <UserRound className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="font-medium">Guide not assigned yet</p>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Your tour guide information will appear here once a guide
                      has been assigned.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===================================================
              REVIEW
          =================================================== */}

          <BookingReviewSection booking={booking} />

          {/* ===================================================
              NOTES
          =================================================== */}

          {(booking.quotation.notes || booking.quotation.termsConditions) && (
            <Card>
              <CardHeader>
                <CardTitle>Additional information</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {booking.quotation.notes && (
                  <div>
                    <p className="text-sm font-medium">Notes</p>

                    <p className="mt-2 whitespace-pre-line leading-7 text-muted-foreground">
                      {booking.quotation.notes}
                    </p>
                  </div>
                )}

                {booking.quotation.termsConditions && (
                  <div>
                    <p className="text-sm font-medium">
                      Terms &amp; conditions
                    </p>

                    <p className="mt-2 whitespace-pre-line leading-7 text-muted-foreground">
                      {booking.quotation.termsConditions}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ===================================================
            RIGHT SIDEBAR
        =================================================== */}

        <aside className="space-y-6">
          {/* Booking details */}

          <Card>
            <CardHeader>
              <CardTitle>Booking details</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div>
                <p className="text-sm text-muted-foreground">
                  Booking reference
                </p>

                <p className="mt-1 break-all font-semibold">
                  {booking.bookingReference}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>

                <div className="mt-1 flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" />

                  <p className="font-medium">{formatStatus(booking.status)}</p>
                </div>
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

          {/* Payment */}

          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-1 size-5 shrink-0 text-muted-foreground" />

                <div>
                  <p className="text-sm text-muted-foreground">
                    Payment status
                  </p>

                  <p className="mt-1 font-semibold">
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
                <p className="text-sm text-muted-foreground">Payment method</p>

                <p className="mt-1 font-medium">
                  {booking.payment.paymentMethod
                    ? formatStatus(booking.payment.paymentMethod)
                    : "Not specified"}
                </p>
              </div>

              {booking.payment.gatewayReference && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Gateway reference
                  </p>

                  <p className="mt-1 break-all font-medium">
                    {booking.payment.gatewayReference}
                  </p>
                </div>
              )}

              {booking.payment.paidAt && (
                <div>
                  <p className="text-sm text-muted-foreground">Paid on</p>

                  <p className="mt-1 font-medium">
                    {formatDateTime(booking.payment.paidAt)}
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-end justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="size-4 text-muted-foreground" />

                    <span className="font-medium">Total paid</span>
                  </div>

                  <span className="text-2xl font-bold">
                    {booking.currency} {booking.totalAmount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Travelers */}

          <Card>
            <CardHeader>
              <CardTitle>Travelers</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Adults</p>

                <p className="mt-1 font-medium">
                  {booking.quotation.adultCount}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Children</p>

                <p className="mt-1 font-medium">
                  {booking.quotation.childCount}
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}