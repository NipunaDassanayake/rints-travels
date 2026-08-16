import Link from "next/link";

import {
  CalendarDays,
  CreditCard,
  Mail,
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

function getStatusClass(status: Booking["status"]) {
  switch (status) {
    case "CONFIRMED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "IN_PROGRESS":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "COMPLETED":
      return "border-green-200 bg-green-50 text-green-700";

    case "CANCELLED":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "";
  }
}

export function AdminBookingCard({ booking }: { booking: Booking }) {
  const touristName = `${booking.tourist.firstName} ${booking.tourist.lastName}`;

  const guide = booking.quotation.guide;

  const guideName = guide
    ? `${guide.user.firstName} ${guide.user.lastName}`
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

          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
              booking.status,
            )}`}
          >
            {formatStatus(booking.status)}
          </span>
        </div>

        <div className="grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex gap-2">
            <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

            <div>
              <p className="text-muted-foreground">Tourist</p>

              <p className="font-medium">{touristName}</p>

              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Mail className="size-3" />

                {booking.tourist.email}
              </div>
            </div>
          </div>

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
              <p className="text-muted-foreground">Booking amount</p>

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
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Confirmed {formatDate(booking.confirmedAt)}
          </p>

          <Link
            href={`/admin/bookings/${booking.id}`}
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