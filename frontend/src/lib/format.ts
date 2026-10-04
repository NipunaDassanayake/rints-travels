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

const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const usdCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Plain non-negative decimal, as the API serializes Prisma Decimals ("1650", "680.5"). */
const DECIMAL_STRING = /^\d+(\.\d+)?$/;

/**
 * Public package price in USD (CR-029): "$1,650", "$680",
 * "$680.50", "$1,234.56". Whole amounts show no decimals;
 * anything with cents shows exactly two.
 *
 * Unlike formatMoney (kept byte-identical for portal pages), this
 * is a deliberate, locale-aware public format. Packages carry no
 * currency field; USD is the existing package convention.
 *
 * Returns null for anything that is not a finite, non-negative
 * amount (empty, non-numeric, "0x10", "1e5", NaN, Infinity) so
 * callers can omit the price instead of showing "$NaN".
 */
export function formatUsdPrice(amount: string | number | null | undefined): string | null {
  let value = Number.NaN;

  if (typeof amount === "number") {
    value = amount;
  } else if (typeof amount === "string" && DECIMAL_STRING.test(amount.trim())) {
    value = Number(amount.trim());
  }

  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  const cents = Math.round(value * 100);

  return cents % 100 === 0 ? usdWhole.format(cents / 100) : usdCents.format(cents / 100);
}
