import type { Quotation } from "./quotation.types";

/**
 * =========================================================
 * Quotation validity (CR-030 Stage 4)
 * =========================================================
 *
 * The API decides expiry when a quotation is accepted:
 * `validUntil <= now` turns a SENT quotation into EXPIRED. The
 * traveler UI mirrors exactly that comparison so it never offers
 * Accept for a quotation the API would refuse -- without changing
 * the quotation's status, which stays whatever the API returned.
 */
export function isPastValidity(
  quotation: Pick<Quotation, "validUntil">,
  now: number = Date.now(),
): boolean {
  if (!quotation.validUntil) {
    return false;
  }

  return new Date(quotation.validUntil).getTime() <= now;
}

/** A SENT quotation whose validity has passed: it can no longer be accepted. */
export function isExpiredForAction(
  quotation: Pick<Quotation, "status" | "validUntil">,
  now: number = Date.now(),
): boolean {
  return quotation.status === "SENT" && isPastValidity(quotation, now);
}

const momentFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

/**
 * A precise moment in the traveler's own time zone, e.g.
 * "Dec 1, 2026, 5:30 AM GMT+5:30" -- used where a date alone would
 * hide when something happens (expiry, payment times).
 */
export function formatMoment(value: string | null | undefined, fallback = "Not available") {
  if (!value) {
    return fallback;
  }

  return momentFormat.format(new Date(value));
}
