import { formatStatusLabel } from "@/lib/format";

/**
 * =========================================================
 * Domain status -> visual tone (CR-028)
 * =========================================================
 *
 * One source of truth for how statuses look. Labels are produced
 * by formatStatusLabel (identical to today's text); the tone only
 * adds color + icon -- meaning never depends on color alone.
 *
 * Keyed by entity because the same value can mean different
 * things (e.g. ACCEPTED request vs ACCEPTED quotation), and so a
 * later CR can make tones role-aware without touching pages.
 */

export type StatusTone =
  | "neutral"
  | "info"
  | "awaiting"
  | "success"
  | "warning"
  | "danger"
  | "muted";

export type StatusEntity = "tourRequest" | "quotation" | "payment" | "booking";

export const STATUS_TONES = {
  tourRequest: {
    PENDING_REVIEW: "neutral",
    UNDER_DISCUSSION: "info",
    READY_FOR_QUOTATION: "info",
    QUOTATION_SENT: "awaiting",
    ACCEPTED: "success",
    REJECTED: "danger",
    CANCELLED: "muted",
    BOOKED: "success",
  },
  quotation: {
    DRAFT: "neutral",
    SENT: "awaiting",
    ACCEPTED: "success",
    REJECTED: "danger",
    EXPIRED: "muted",
    SUPERSEDED: "muted",
  },
  payment: {
    PENDING: "awaiting",
    PROCESSING: "info",
    SUCCESS: "success",
    FAILED: "danger",
    CANCELLED: "muted",
    REFUNDED: "info",
  },
  booking: {
    CONFIRMED: "success",
    IN_PROGRESS: "info",
    COMPLETED: "success",
    CANCELLED: "muted",
  },
} as const satisfies Record<StatusEntity, Record<string, StatusTone>>;

export function getStatusTone(entity: StatusEntity, status: string): StatusTone {
  const tones = STATUS_TONES[entity] as Record<string, StatusTone>;

  return tones[status] ?? "neutral";
}

export function getStatusLabel(status: string) {
  return formatStatusLabel(status);
}
