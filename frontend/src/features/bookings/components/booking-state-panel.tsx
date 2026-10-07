import { CalendarClock, CircleMinus, Compass, Flag, UserRound } from "lucide-react";

import { formatStatusLabel } from "@/lib/format";

import { cn } from "@/lib/utils";

import { formatMoment } from "@/features/quotations/quotation-validity";

import { calendarDaysUntil, describeCountdown, formatTripDates } from "../booking-countdown";

import type { Booking } from "../booking.types";

const completedDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/**
 * Where the booking stands, in the traveler's words (CR-030 Stage 5).
 *
 * Driven only by the status the API returns: dates never move a trip
 * to "underway" or "completed" on their own. A cancelled booking gets
 * neutral framing -- no success colour, nothing upcoming, and no
 * promise about money.
 */
export function BookingStatePanel({ booking, now = new Date() }: { booking: Booking; now?: Date }) {
  const guide = booking.quotation?.guide ?? null;

  const guideName = guide ? `${guide.user.firstName} ${guide.user.lastName}` : null;

  const view = (() => {
    switch (booking.status) {
      case "CONFIRMED":
        return {
          icon: CalendarClock,
          tone: "active" as const,
          title: "Your upcoming trip",
          lead: describeCountdown(booking.startDate, now),
          dates: formatTripDates(booking),
          note: guideName
            ? `Your guide: ${guideName}`
            : calendarDaysUntil(booking.startDate, now) >= 1
              ? "Your guide will be assigned before your trip."
              : "Your guide hasn't been assigned yet.",
        };
      case "IN_PROGRESS":
        return {
          icon: Compass,
          tone: "active" as const,
          title: "Your trip is underway",
          lead: null,
          dates: formatTripDates(booking),
          note: guideName ? `Your guide: ${guideName}` : null,
        };
      case "COMPLETED":
        return {
          icon: Flag,
          tone: "done" as const,
          title: "Trip completed",
          lead: booking.completedAt ? `Completed on ${completedDay.format(new Date(booking.completedAt))}` : null,
          dates: formatTripDates(booking),
          note: null,
        };
      case "CANCELLED":
        return {
          icon: CircleMinus,
          tone: "inactive" as const,
          title: "This booking was cancelled",
          lead: booking.cancelledAt ? `Cancelled on ${formatMoment(booking.cancelledAt)}` : null,
          dates: `Planned for ${formatTripDates(booking)}`,
          note: "This booking is no longer active.",
        };
      default:
        // A status this page does not know yet: state it plainly.
        return {
          icon: CalendarClock,
          tone: "inactive" as const,
          title: formatStatusLabel(String(booking.status)),
          lead: null,
          dates: formatTripDates(booking),
          note: null,
        };
    }
  })();

  const Icon = view.icon;

  return (
    <section
      aria-labelledby="booking-state"
      data-testid="booking-state"
      data-state={booking.status}
      className={cn(
        "rounded-card border p-5 sm:p-6",
        view.tone === "active" && "border-tea-200 bg-tea-50",
        view.tone === "done" && "border-sand-300 bg-sand-50",
        view.tone === "inactive" && "border-border bg-sand-100",
      )}
    >
      <div className="flex gap-4">
        <span
          aria-hidden="true"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            view.tone === "inactive" ? "bg-card text-muted-foreground" : "bg-card text-tea-700",
          )}
        >
          <Icon className="size-5" />
        </span>

        <div className="min-w-0">
          <h2 id="booking-state" className="text-heading-md text-foreground">
            {view.title}
          </h2>

          {view.lead && (
            <p data-testid="booking-state-lead" className="mt-1 text-heading-sm text-foreground">
              {view.lead}
            </p>
          )}

          <p className="mt-2 text-body-sm text-foreground-secondary">{view.dates}</p>

          {view.note && (
            <p className="mt-2 flex items-start gap-2 text-body-sm text-foreground-secondary">
              {view.tone !== "inactive" && <UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
              {view.note}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
