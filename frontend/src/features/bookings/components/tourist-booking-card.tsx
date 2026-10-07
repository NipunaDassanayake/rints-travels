import Link from "next/link";

import { CalendarDays, CheckCircle2, CreditCard, UserRound, Users, Wallet } from "lucide-react";

import { DescriptionList } from "@/components/patterns/description-list";

import { StatusBadge } from "@/components/patterns/status-badge";

import { buttonVariants } from "@/components/ui/button";

import { formatDate, formatMoney } from "@/lib/format";

import type { Booking } from "@/features/bookings/booking.types";

/**
 * A booking in the traveler's booking list (CR-030 Stage 2
 * normalization): reference, trip, status, dates, travelers, total,
 * payment, guide and confirmation date -- no internal ids.
 */
export function TouristBookingCard({ booking }: { booking: Booking }) {
  const guide = booking.quotation.guide;

  const { adultCount, childCount } = booking.quotation;

  const titleId = `booking-${booking.id}-title`;

  return (
    <article aria-labelledby={titleId} className="rounded-card border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-caption font-medium tracking-wide text-muted-foreground">
            {booking.bookingReference}
          </p>

          <h2 id={titleId} className="mt-1 text-heading-md text-foreground">
            {booking.quotation.title}
          </h2>

          <p className="mt-1 text-caption text-muted-foreground">
            Quotation {booking.quotation.quotationNumber}
          </p>
        </div>

        <StatusBadge entity="booking" status={booking.status} />
      </div>

      <DescriptionList
        columns={3}
        className="mt-5"
        items={[
          {
            term: "Travel dates",
            icon: CalendarDays,
            value: `${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`,
          },
          {
            term: "Travelers",
            icon: Users,
            value: `${adultCount} adult${adultCount !== 1 ? "s" : ""} · ${childCount} child${childCount !== 1 ? "ren" : ""}`,
          },
          {
            term: "Total",
            icon: Wallet,
            value: formatMoney(booking.totalAmount, booking.currency),
          },
          {
            term: "Payment",
            icon: CreditCard,
            value: (
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge entity="payment" status={booking.payment.status} />
                <span className="text-caption font-normal text-muted-foreground">
                  {booking.payment.paymentReference}
                </span>
              </span>
            ),
          },
          {
            term: "Tour guide",
            icon: UserRound,
            value: guide ? `${guide.user.firstName} ${guide.user.lastName}` : "Not assigned",
          },
          {
            term: "Confirmed on",
            icon: CheckCircle2,
            value: formatDate(booking.confirmedAt),
          },
        ]}
      />

      <div className="mt-5 flex justify-end border-t pt-4">
        <Link
          href={`/tourist/bookings/${booking.id}`}
          className={`${buttonVariants({ variant: "outline" })} w-full sm:w-auto`}
        >
          View booking
          <span className="sr-only">
            {" "}
            {booking.bookingReference}: {booking.quotation.title}
          </span>
        </Link>
      </div>
    </article>
  );
}
