/**
 * =========================================================
 * Shared display formatting (CR-028)
 * =========================================================
 *
 * Output is byte-identical to the per-page helpers it will
 * replace (pages adopt these progressively in CR-029..031), so
 * text that E2E tests assert on does not change.
 */

/**
 * Enum value -> label, e.g. "QUOTATION_SENT" -> "Quotation Sent",
 * "READY_FOR_QUOTATION" -> "Ready For Quotation".
 */
export function formatStatusLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export interface FormatDateOptions {
  /** Text shown for a missing value (pages use "Not specified", "Flexible", ...). */
  fallback?: string;
  /** "short" -> "Oct 3, 2026" (default), "long" -> "October 3, 2026". */
  month?: "short" | "long";
  /** Dates are stored as UTC calendar dates; keep UTC unless told otherwise. */
  timeZone?: string;
}

export function formatDate(
  value: string | null | undefined,
  { fallback = "Not specified", month = "short", timeZone = "UTC" }: FormatDateOptions = {},
) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month,
    year: "numeric",
    timeZone,
  }).format(new Date(value));
}

/**
 * Money exactly as pages render it today: "<CURRENCY> <amount>",
 * e.g. "USD 1275.00". Locale-aware formatting is a later,
 * test-coordinated change.
 */
export function formatMoney(
  amount: string | number | null | undefined,
  currency: string | null | undefined,
) {
  return `${currency ?? ""} ${amount ?? ""}`.trim();
}
