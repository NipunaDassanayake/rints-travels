import { formatDate } from "@/lib/format";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whole calendar days from the traveler's "today" to a trip date.
 *
 * Trip dates are calendar dates stored as UTC midnight, so the trip
 * day is read from its UTC parts; "today" is the traveler's own
 * calendar day in their time zone. Comparing the two as dates (not
 * elapsed hours) keeps "tomorrow" right late in the evening.
 */
export function calendarDaysUntil(tripDate: string, now: Date = new Date()): number {
  const trip = new Date(tripDate);

  const tripDay = Date.UTC(trip.getUTCFullYear(), trip.getUTCMonth(), trip.getUTCDate());

  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.round((tripDay - today) / DAY_MS);
}

/**
 * Countdown for a CONFIRMED booking (CR-030 Stage 5). Once the start
 * date has passed, only the status the API returns may say a trip is
 * underway, so a past start date reads as "Scheduled for <date>".
 */
export function describeCountdown(startDate: string, now: Date = new Date()): string {
  const days = calendarDaysUntil(startDate, now);

  if (days > 1) return `Starts in ${days} days`;

  if (days === 1) return "Starts tomorrow";

  if (days === 0) return "Starts today";

  return `Scheduled for ${formatDate(startDate)}`;
}

/** Trip dates are calendar dates, so they are shown in UTC. */
export function formatTripDates(booking: { startDate: string; endDate: string }) {
  return `${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`;
}
