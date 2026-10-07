import type { Booking } from "@/features/bookings/booking.types";
import type { Payment } from "@/features/payments/payment.types";
import { isExpiredForAction } from "@/features/quotations/quotation-validity";
import type { Quotation } from "@/features/quotations/quotation.types";
import type { Review } from "@/features/reviews/review.types";
import type { TourRequest } from "@/features/tour-requests/tour-request.types";
import { formatDate } from "@/lib/format";
import type { StatusEntity } from "@/lib/status";

/**
 * =========================================================
 * Traveler journeys (CR-030)
 * =========================================================
 *
 * Pure, deterministic presentation logic. A "journey" is one
 * tour request together with the quotation, payment and booking
 * that belong to it, joined client-side over the traveler's own
 * `/me` lists via the existing relationships:
 *
 *   quotation.tourRequestId, payment.quotationId,
 *   payment.quotation.tourRequestId, booking.tourRequestId,
 *   review.bookingId
 *
 * It never invents lifecycle states: every stage and action is
 * read off statuses the backend already returned.
 */

export type JourneyActionKind =
  | "RESUME_PAYMENT"
  | "PAY"
  | "REVIEW_QUOTATION"
  | "LEAVE_REVIEW"
  | "CHECK_PAYMENT"
  | "VIEW_CURRENT_TRIP"
  | "VIEW_UPCOMING_TRIP"
  | "VIEW_BOOKING"
  | "VIEW_TRIP";

export interface JourneyAction {
  kind: JourneyActionKind;
  label: string;
  href: string;
  /** The traveler has to act (it belongs in "Needs your attention"). */
  needsTraveler: boolean;
}

/**
 * Precedence of traveler actions across journeys: the lower the
 * number, the sooner it is shown. Money already in flight comes
 * first, then an accepted quote waiting for payment, then a
 * quote waiting for a decision, then a review.
 */
export const ACTION_PRIORITY: Record<JourneyActionKind, number> = {
  RESUME_PAYMENT: 1,
  PAY: 2,
  REVIEW_QUOTATION: 3,
  LEAVE_REVIEW: 4,
  CHECK_PAYMENT: 5,
  VIEW_CURRENT_TRIP: 6,
  VIEW_UPCOMING_TRIP: 7,
  VIEW_BOOKING: 8,
  VIEW_TRIP: 9,
};

export type JourneyPhase =
  | "planning"
  | "quotation"
  | "payment"
  | "upcoming"
  | "current"
  | "completed"
  | "closed";

/** Steps of the progress tracker, in order. */
export const JOURNEY_STEPS = ["Request", "Quotation", "Payment", "Booking"] as const;

export type QuotationPaymentState =
  /** The quotation is not accepted, so payment does not apply. */
  | "NOT_APPLICABLE"
  /** Accepted, nothing paid (or the last attempt failed / was cancelled). */
  | "UNPAID"
  /** A checkout was started and can be resumed. */
  | "IN_PROGRESS"
  /** Stripe has the payment; Travora is waiting for its confirmation. */
  | "AWAITING_CONFIRMATION"
  /** Paid: never offer payment again. */
  | "PAID";

export interface JourneyGuide {
  firstName: string;
  lastName: string;
  location: string | null;
}

export interface Journey {
  /** The tour request id. */
  id: string;
  title: string;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  request: TourRequest | null;
  quotation: Quotation | null;
  /** How many quotations were sent for this request (revision context). */
  quotationCount: number;
  payment: Payment | null;
  booking: Booking | null;
  guide: JourneyGuide | null;
  phase: JourneyPhase;
  /** 0-based index into JOURNEY_STEPS. */
  stepIndex: number;
  /** The status that best describes the journey now (existing labels). */
  status: {
    entity: StatusEntity;
    value: string;
  };
  paymentState: QuotationPaymentState;
  /**
   * The quotation can no longer be accepted: EXPIRED, or still SENT
   * past its validUntil (the API refuses to accept it). Read-only --
   * the quotation status itself is never changed here.
   */
  quotationExpired: boolean;
  action: JourneyAction | null;
  /** Shown when Travora, not the traveler, has the next step. */
  waitingMessage: string | null;
  /** Latest update across the journey's records (ms since epoch). */
  lastActivityAt: number;
}

export interface JourneySources {
  requests: TourRequest[];
  quotations: Quotation[];
  payments: Payment[];
  bookings: Booking[];
  /** null when reviews could not be loaded (review state unknown). */
  reviews: Review[] | null;
}

const PAID_PAYMENT_STATUSES = new Set(["SUCCESS", "REFUNDED"]);

const WAITING_MESSAGES: Partial<Record<TourRequest["status"], string>> = {
  PENDING_REVIEW: "Travora has received your request and will review it shortly.",
  UNDER_DISCUSSION: "Travora is working through your trip details with you.",
  READY_FOR_QUOTATION: "Travora is preparing your quotation.",
  QUOTATION_SENT: "Travora is preparing your quotation.",
};

const EXPIRED_MESSAGE =
  "This quotation has expired. Any updated quotation from Travora will appear here.";

/**
 * Frontend-effective expiry (CR-030 Stage 6): EXPIRED, or SENT past
 * validUntil, mirroring the accept check the API itself makes.
 * Presentation only; the backend stays authoritative.
 */
export function isQuotationExpired(
  quotation: Pick<Quotation, "status" | "validUntil">,
  now: number = Date.now(),
) {
  return quotation.status === "EXPIRED" || isExpiredForAction(quotation, now);
}

function time(value: string | null | undefined) {
  const parsed = value ? Date.parse(value) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : 0;
}

export function getRequestTitle(request: TourRequest) {
  if (request.requestType === "PACKAGE_BASED") {
    return request.travelPackage?.title ?? "Package based journey";
  }

  return request.title ?? "Custom Sri Lanka journey";
}

/**
 * Payment state of one quotation. Quotation status alone cannot
 * tell paid from unpaid (both are ACCEPTED), so the traveler's
 * payment for that quotation (one per quotation), its booking and
 * the request's BOOKED status are all taken into account.
 */
export function getQuotationPaymentState(
  quotation: Pick<Quotation, "id" | "status"> & {
    tourRequest?: { status: string } | null;
  },
  payments: Payment[],
  booking?: Pick<Booking, "id"> | null,
): { state: QuotationPaymentState; payment: Payment | null } {
  const payment =
    payments.find((candidate) => candidate.quotationId === quotation.id) ?? null;

  if (quotation.status !== "ACCEPTED") {
    return { state: "NOT_APPLICABLE", payment };
  }

  if (
    booking ||
    payment?.booking ||
    (payment && PAID_PAYMENT_STATUSES.has(payment.status)) ||
    quotation.tourRequest?.status === "BOOKED"
  ) {
    return { state: "PAID", payment };
  }

  if (payment?.status === "PENDING") {
    return { state: "IN_PROGRESS", payment };
  }

  if (payment?.status === "PROCESSING") {
    return { state: "AWAITING_CONFIRMATION", payment };
  }

  return { state: "UNPAID", payment };
}

function pickQuotation(quotations: Quotation[], booking: Booking | null) {
  if (booking) {
    return quotations.find((quotation) => quotation.id === booking.quotationId) ?? null;
  }

  const byRevision = [...quotations].sort(
    (a, b) => b.revisionNumber - a.revisionNumber || a.id.localeCompare(b.id),
  );

  return (
    byRevision.find((quotation) => quotation.status === "ACCEPTED") ??
    byRevision.find((quotation) => quotation.status === "SENT") ??
    byRevision[0] ??
    null
  );
}

function deriveAction(
  journey: Pick<
    Journey,
    "booking" | "quotation" | "payment" | "paymentState" | "request" | "id" | "quotationExpired"
  >,
  reviewedBookingIds: Set<string> | null,
): JourneyAction | null {
  const { booking, quotation, payment, paymentState, request } = journey;

  if (booking) {
    const href = `/tourist/bookings/${booking.id}`;

    switch (booking.status) {
      case "IN_PROGRESS":
        return { kind: "VIEW_CURRENT_TRIP", label: "View current trip", href, needsTraveler: false };
      case "CONFIRMED":
        return { kind: "VIEW_UPCOMING_TRIP", label: "View upcoming trip", href, needsTraveler: false };
      case "COMPLETED":
        // Only ask for a review when the review list is known, the
        // booking has a guide to review and none exists yet.
        if (
          reviewedBookingIds &&
          booking.quotation?.guideId &&
          !reviewedBookingIds.has(booking.id)
        ) {
          return { kind: "LEAVE_REVIEW", label: "Leave a review", href, needsTraveler: true };
        }

        return { kind: "VIEW_TRIP", label: "View trip", href, needsTraveler: false };
      default:
        return { kind: "VIEW_BOOKING", label: "View booking", href, needsTraveler: false };
    }
  }

  if (quotation?.status === "ACCEPTED") {
    const quotationHref = `/tourist/quotations/${quotation.id}`;

    switch (paymentState) {
      case "UNPAID":
        return { kind: "PAY", label: "Pay now", href: quotationHref, needsTraveler: true };
      case "IN_PROGRESS":
        return { kind: "RESUME_PAYMENT", label: "Resume payment", href: quotationHref, needsTraveler: true };
      case "AWAITING_CONFIRMATION":
        return payment
          ? { kind: "CHECK_PAYMENT", label: "Check payment", href: `/tourist/payments/${payment.id}`, needsTraveler: false }
          : null;
      case "PAID":
        if (payment?.booking) {
          return { kind: "VIEW_BOOKING", label: "View booking", href: `/tourist/bookings/${payment.booking.id}`, needsTraveler: false };
        }

        if (payment) {
          return { kind: "CHECK_PAYMENT", label: "Check payment", href: `/tourist/payments/${payment.id}`, needsTraveler: false };
        }

        return null;
      default:
        return null;
    }
  }

  if (
    quotation?.status === "SENT" &&
    !journey.quotationExpired &&
    (!request || request.status === "QUOTATION_SENT")
  ) {
    return {
      kind: "REVIEW_QUOTATION",
      label: "Review quotation",
      href: `/tourist/quotations/${quotation.id}`,
      needsTraveler: true,
    };
  }

  return null;
}

/**
 * An expired quotation describes the journey only while there is no
 * booking and the request is still waiting on that quotation.
 */
function showsExpiredQuotation(journey: Pick<Journey, "booking" | "request" | "quotationExpired">) {
  return (
    !journey.booking &&
    journey.quotationExpired &&
    (!journey.request || journey.request.status === "QUOTATION_SENT")
  );
}

function derivePhase(
  journey: Pick<Journey, "booking" | "quotation" | "request" | "action" | "quotationExpired">,
): {
  phase: JourneyPhase;
  stepIndex: number;
} {
  const { booking, quotation, request, action } = journey;

  if (booking) {
    switch (booking.status) {
      case "IN_PROGRESS":
        return { phase: "current", stepIndex: 3 };
      case "CONFIRMED":
        return { phase: "upcoming", stepIndex: 3 };
      case "COMPLETED":
        return { phase: "completed", stepIndex: 3 };
      default:
        return { phase: "closed", stepIndex: 3 };
    }
  }

  if (quotation?.status === "ACCEPTED" || request?.status === "ACCEPTED" || request?.status === "BOOKED") {
    return { phase: "payment", stepIndex: 2 };
  }

  if (request?.status === "REJECTED" || request?.status === "CANCELLED") {
    return { phase: "closed", stepIndex: 0 };
  }

  if (action?.kind === "REVIEW_QUOTATION" || showsExpiredQuotation(journey)) {
    return { phase: "quotation", stepIndex: 1 };
  }

  return { phase: "planning", stepIndex: 0 };
}

function deriveStatus(
  journey: Pick<Journey, "booking" | "quotation" | "payment" | "request" | "quotationExpired">,
): Journey["status"] {
  const { booking, quotation, payment, request } = journey;

  if (booking) {
    return { entity: "booking", value: booking.status };
  }

  if (quotation && showsExpiredQuotation(journey)) {
    return { entity: "quotation", value: "EXPIRED" };
  }

  if (quotation?.status === "ACCEPTED" && payment) {
    return { entity: "payment", value: payment.status };
  }

  if (request && !(quotation?.status === "SENT" || quotation?.status === "ACCEPTED")) {
    return { entity: "tourRequest", value: request.status };
  }

  if (quotation) {
    return { entity: "quotation", value: quotation.status };
  }

  return { entity: "tourRequest", value: request?.status ?? "PENDING_REVIEW" };
}

/**
 * Joins the traveler's lists into journeys, most recent first.
 */
export function buildJourneys(sources: JourneySources, now: number = Date.now()): Journey[] {
  const { requests, quotations, payments, bookings, reviews } = sources;

  const reviewedBookingIds = reviews
    ? new Set(reviews.map((review) => review.bookingId))
    : null;

  // Payments never start a journey: a payment only exists for an
  // accepted (so sent, so listed) quotation of one of these.
  const ids = new Set<string>([
    ...requests.map((request) => request.id),
    ...quotations.map((quotation) => quotation.tourRequestId),
    ...bookings.map((booking) => booking.tourRequestId),
  ]);

  const journeys = [...ids].map((id): Journey => {
    const request = requests.find((candidate) => candidate.id === id) ?? null;

    const booking = bookings.find((candidate) => candidate.tourRequestId === id) ?? null;

    const requestQuotations = quotations.filter((candidate) => candidate.tourRequestId === id);

    const quotation = pickQuotation(requestQuotations, booking);

    const paymentInfo = quotation
      ? getQuotationPaymentState(quotation, payments, booking)
      : { state: "NOT_APPLICABLE" as const, payment: null };

    const payment =
      paymentInfo.payment ??
      (booking ? payments.find((candidate) => candidate.id === booking.paymentId) ?? null : null);

    const base = {
      id,
      request,
      quotation,
      quotationCount: requestQuotations.length,
      payment,
      booking,
      paymentState: booking ? ("PAID" as const) : paymentInfo.state,
      quotationExpired: quotation ? isQuotationExpired(quotation, now) : false,
    };

    const action = deriveAction(base, reviewedBookingIds);

    const { phase, stepIndex } = derivePhase({ ...base, action });

    const guideSource = booking?.quotation?.guide ?? quotation?.guide ?? null;

    const lastActivityAt = Math.max(
      time(request?.updatedAt),
      time(request?.createdAt),
      time(quotation?.updatedAt),
      time(payment?.updatedAt),
      time(booking?.updatedAt),
    );

    return {
      ...base,
      title: request
        ? getRequestTitle(request)
        : (booking?.quotation?.title ?? quotation?.title ?? "Your Sri Lanka journey"),
      destination:
        request?.destinationPreferences ||
        request?.travelPackage?.destination ||
        booking?.tourRequest?.destinationPreferences ||
        null,
      startDate: booking?.startDate ?? quotation?.startDate ?? request?.preferredStartDate ?? null,
      endDate: booking?.endDate ?? quotation?.endDate ?? request?.preferredEndDate ?? null,
      guide: guideSource
        ? {
            firstName: guideSource.user.firstName,
            lastName: guideSource.user.lastName,
            location: guideSource.location ?? null,
          }
        : null,
      phase,
      stepIndex,
      status: deriveStatus(base),
      action,
      waitingMessage: showsExpiredQuotation(base)
        ? EXPIRED_MESSAGE
        : !action && request && phase === "planning"
          ? (WAITING_MESSAGES[request.status] ?? null)
          : null,
      lastActivityAt,
    };
  });

  return journeys.sort((a, b) => b.lastActivityAt - a.lastActivityAt || a.id.localeCompare(b.id));
}

/**
 * =========================================================
 * Grouping (CR-030 Stage 2)
 * =========================================================
 *
 * Read off the journey phase, which follows the booking when one
 * exists -- so a cancelled booking is "closed" even though its
 * request stays BOOKED.
 */
export type JourneyGroup = "active" | "past" | "closed";

export function getJourneyGroup(journey: Pick<Journey, "phase">): JourneyGroup {
  if (journey.phase === "completed") {
    return "past";
  }

  if (journey.phase === "closed") {
    return "closed";
  }

  return "active";
}

/** Splits journeys into groups, keeping their order. */
export function groupJourneys(journeys: Journey[]): Record<JourneyGroup, Journey[]> {
  const groups: Record<JourneyGroup, Journey[]> = { active: [], past: [], closed: [] };

  for (const journey of journeys) {
    groups[getJourneyGroup(journey)].push(journey);
  }

  return groups;
}

/**
 * Screen-reader context that makes each journey card's links
 * unique (CR-030 Stage 2), appended after the visible title:
 * the traveler-facing reference (booking reference, else
 * quotation number) and the submission date. Early requests with
 * no reference that still share a title and date get a
 * deterministic ordinal in list order ("journey 1 of 2"). Never
 * uses internal ids.
 */
export function getJourneyNameContexts(journeys: Journey[]): Map<string, string> {
  const contexts = journeys.map((journey) => {
    const reference = journey.booking?.bookingReference ?? journey.quotation?.quotationNumber;

    return {
      id: journey.id,
      key: journey.title,
      context:
        (reference ? `, ${reference}` : "") +
        (journey.request ? `, submitted ${formatDate(journey.request.createdAt)}` : ""),
    };
  });

  const counts = new Map<string, number>();

  for (const { key, context } of contexts) {
    counts.set(key + context, (counts.get(key + context) ?? 0) + 1);
  }

  const seen = new Map<string, number>();

  return new Map(
    contexts.map(({ id, key, context }) => {
      const total = counts.get(key + context) ?? 1;

      if (total === 1) {
        return [id, context];
      }

      const position = (seen.get(key + context) ?? 0) + 1;

      seen.set(key + context, position);

      return [id, `${context}, journey ${position} of ${total}`];
    }),
  );
}

export interface DashboardSummary {
  /** Journeys that need the traveler, most urgent first. */
  attention: Journey[];
  /** The trip in progress, else the next upcoming one. */
  currentTrip: Journey | null;
  /** The most recent journey still moving. */
  latestJourney: Journey | null;
  /** Other recent journeys, newest first. */
  recent: Journey[];
}

const RECENT_LIMIT = 4;

/**
 * Dashboard sections in precedence order -- attention, current
 * trip, latest journey, recent activity. A journey shown in an
 * earlier section is never repeated in a later one; a section
 * with no remaining journey is omitted (CR-030 Stage 2).
 */
export function summarizeJourneys(journeys: Journey[]): DashboardSummary {
  const attention = journeys
    .filter((journey) => journey.action?.needsTraveler)
    .sort(
      (a, b) =>
        ACTION_PRIORITY[a.action!.kind] - ACTION_PRIORITY[b.action!.kind] ||
        b.lastActivityAt - a.lastActivityAt ||
        a.id.localeCompare(b.id),
    );

  const shown = new Set<string>(attention.map((journey) => journey.id));

  const remaining = () => journeys.filter((journey) => !shown.has(journey.id));

  const currentTrip =
    remaining().find((journey) => journey.phase === "current") ??
    remaining()
      .filter((journey) => journey.phase === "upcoming")
      .sort((a, b) => time(a.startDate) - time(b.startDate) || a.id.localeCompare(b.id))[0] ??
    null;

  if (currentTrip) {
    shown.add(currentTrip.id);
  }

  const latestJourney =
    remaining().find((journey) =>
      ["planning", "quotation", "payment"].includes(journey.phase),
    ) ?? null;

  if (latestJourney) {
    shown.add(latestJourney.id);
  }

  const recent = remaining().slice(0, RECENT_LIMIT);

  return { attention, currentTrip, latestJourney, recent };
}
