import Link from "next/link";

import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { buttonVariants } from "@/components/ui/button";

import type { Booking } from "@/features/bookings/booking.types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function TouristBookingCard({ booking }: { booking: Booking }) {
  const guideName = booking.quotation.guide
    ? `${booking.quotation.guide.user.firstName} ${booking.quotation.guide.user.lastName}`
    : "Not assigned";

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {booking.bookingReference}
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              {booking.quotation.title}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Quotation {booking.quotation.quotationNumber}
            </p>
          </div>

          <span className="rounded-full border px-3 py-1 text-xs font-medium">
            {formatStatus(booking.status)}
          </span>
        </div>

        <div className="grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">Travel dates</p>

              <p className="font-medium">{formatDate(booking.startDate)}</p>

              <p className="text-xs text-muted-foreground">
                to {formatDate(booking.endDate)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">Travelers</p>

              <p className="font-medium">
                {booking.quotation.adultCount} adult
                {booking.quotation.adultCount !== 1 ? "s" : ""}
                {" · "}
                {booking.quotation.childCount} child
                {booking.quotation.childCount !== 1 ? "ren" : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Wallet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">Total</p>

              <p className="font-medium">
                {booking.currency} {booking.totalAmount}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <CreditCard className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">Payment</p>

              <p className="font-medium">
                {formatStatus(booking.payment.status)}
              </p>

              <p className="text-xs text-muted-foreground">
                {booking.payment.paymentReference}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">Tour guide</p>

              <p className="font-medium">{guideName}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">Confirmed on</p>

              <p className="font-medium">{formatDate(booking.confirmedAt)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Booking ID: {booking.id}
          </p>

          <Link
            href={`/tourist/bookings/${booking.id}`}
            className={buttonVariants({
              variant: "outline",
            })}
          >
            View booking
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}