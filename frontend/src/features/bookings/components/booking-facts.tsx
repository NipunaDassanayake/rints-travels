import Link from "next/link";

import { ChevronRight } from "lucide-react";

import { formatMoney } from "@/lib/format";

import { formatMoment } from "@/features/quotations/quotation-validity";

import { formatTripDates } from "../booking-countdown";

import type { Booking } from "../booking.types";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function formatTravelers({ adultCount, childCount }: { adultCount: number; childCount: number }) {
  const adults = plural(adultCount, "adult", "adults");

  return childCount > 0 ? `${adults} · ${plural(childCount, "child", "children")}` : adults;
}

const LINK = "flex min-h-10 items-center justify-between gap-3 rounded-md px-2 -mx-2 text-body-sm font-medium text-tea-800 hover:bg-tea-50 hover:text-tea-900";

/**
 * The booking's key facts (CR-030 Stage 5): dates, travelers,
 * reference, the amount paid and when the booking changed state,
 * plus links back to the journey, quotation and payment receipt.
 * Payment provider internals (gateway references, intent ids) are
 * never shown here; the receipt is the place for payment details.
 */
export function BookingFacts({ booking }: { booking: Booking }) {
  const cancelled = booking.status === "CANCELLED";

  const quotation = booking.quotation;

  const payment = booking.payment;

  const facts: { term: string; value: string; testId?: string }[] = [
    { term: cancelled ? "Planned dates" : "Trip dates", value: formatTripDates(booking) },
  ];

  if (quotation) {
    facts.push({ term: "Travelers", value: formatTravelers(quotation) });
  }

  facts.push({ term: "Booking reference", value: booking.bookingReference });

  facts.push({
    term: "Amount paid",
    value: formatMoney(payment?.amount ?? booking.totalAmount, payment?.currency ?? booking.currency),
    testId: "amount-paid",
  });

  if (payment?.paymentReference) {
    facts.push({ term: "Payment reference", value: payment.paymentReference });
  }

  facts.push({ term: "Confirmed", value: formatMoment(booking.confirmedAt) });

  if (booking.completedAt) {
    facts.push({ term: "Completed", value: formatMoment(booking.completedAt) });
  }

  if (booking.cancelledAt) {
    facts.push({ term: "Cancelled", value: formatMoment(booking.cancelledAt) });
  }

  const links = [
    { href: `/tourist/requests/${booking.tourRequestId}`, label: "View journey" },
    { href: `/tourist/quotations/${booking.quotationId}`, label: "View quotation" },
    { href: `/tourist/payments/${booking.paymentId}`, label: "View payment receipt" },
  ];

  return (
    <div className="space-y-4">
      <section aria-labelledby="booking-facts" data-testid="booking-facts" className="rounded-card border bg-card p-5 sm:p-6">
        <h2 id="booking-facts" className="text-heading-md text-foreground">
          Booking details
        </h2>

        <dl className="mt-4 space-y-3 text-body-sm">
          {facts.map((fact) => (
            <div key={fact.term} className="flex justify-between gap-4" data-testid={fact.testId}>
              <dt className="shrink-0 text-muted-foreground">{fact.term}</dt>
              <dd className="min-w-0 text-right font-medium break-words text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <nav aria-label="Related to this booking" className="rounded-card border bg-card px-5 py-3 sm:px-6">
        <ul>
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={LINK}>
                {link.label}
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
