const { NotFoundError, ConflictError } = require("../../utils/AppError");

/**
 * =========================================================
 * Tour Request Lifecycle
 * =========================================================
 *
 * This module is the single source of truth for TourRequest
 * status rules and the transaction helpers that enforce them.
 *
 * It is a leaf module: it requires nothing but AppError, never
 * opens a Prisma transaction itself, and never touches the
 * database directly outside of the `tx` client callers pass in.
 * quotations.repository and bookings.repository depend on this
 * module directly (not on tourRequests.repository/service), so
 * there is no circular dependency between the modules that
 * write TourRequest.status.
 */

const TOUR_REQUEST_STATUSES = [
  "PENDING_REVIEW",
  "UNDER_DISCUSSION",
  "READY_FOR_QUOTATION",
  "QUOTATION_SENT",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "BOOKED",
];

/**
 * Manual, admin-driven TourRequest status transitions (the
 * PATCH /tour-requests/:id/status endpoint) and the tourist's
 * own-request cancellation. QUOTATION_SENT, ACCEPTED and BOOKED
 * are never reached as a *target* of this map -- those each
 * have their own fixed from/to pair below, driven by a specific
 * quotation or payment event rather than a manual admin choice.
 */
const MANUAL_ADMIN_TRANSITIONS = {
  PENDING_REVIEW: ["UNDER_DISCUSSION", "REJECTED", "CANCELLED"],

  UNDER_DISCUSSION: ["READY_FOR_QUOTATION", "REJECTED", "CANCELLED"],

  READY_FOR_QUOTATION: ["UNDER_DISCUSSION", "CANCELLED"],

  QUOTATION_SENT: ["UNDER_DISCUSSION", "CANCELLED"],

  ACCEPTED: [],
  REJECTED: [],
  CANCELLED: [],
  BOOKED: [],
};

const isTransitionAllowed = (currentStatus, targetStatus) => {
  const allowed = MANUAL_ADMIN_TRANSITIONS[currentStatus] || [];

  return allowed.includes(targetStatus);
};

const allowedSourcesFor = (targetStatus) =>
  Object.entries(MANUAL_ADMIN_TRANSITIONS)
    .filter(([, targets]) => targets.includes(targetStatus))
    .map(([source]) => source);

/**
 * Tourist self-cancellation is allowed from the same source
 * statuses as the admin-driven CANCELLED transition.
 */
const TOURIST_CANCEL = {
  from: allowedSourcesFor("CANCELLED"),
  to: "CANCELLED",
};

/**
 * =========================================================
 * Guard Sets (no status change)
 * =========================================================
 */

const QUOTATION_CREATE_ALLOWED = ["UNDER_DISCUSSION", "READY_FOR_QUOTATION"];

const QUOTATION_REVISE_ALLOWED = [
  "UNDER_DISCUSSION",
  "READY_FOR_QUOTATION",
  "QUOTATION_SENT",
];

const ADMIN_EDIT_ALLOWED = [
  "PENDING_REVIEW",
  "UNDER_DISCUSSION",
  "READY_FOR_QUOTATION",
];

const PAYMENT_ALLOWED = ["ACCEPTED"];

/**
 * =========================================================
 * Quotation-Driven Events (fixed from/to pairs)
 * =========================================================
 */

const QUOTATION_SEND = {
  from: ["UNDER_DISCUSSION", "READY_FOR_QUOTATION", "QUOTATION_SENT"],

  to: "QUOTATION_SENT",
};

const QUOTATION_REJECT = {
  from: ["QUOTATION_SENT"],

  to: "UNDER_DISCUSSION",
};

const QUOTATION_ACCEPT = {
  from: ["QUOTATION_SENT"],

  to: "ACCEPTED",
};

const BOOKING_CONFIRM = {
  from: ["ACCEPTED"],

  to: "BOOKED",
};

/**
 * =========================================================
 * Superseding Open Quotations
 * =========================================================
 *
 * Which quotation statuses must become SUPERSEDED, in the same
 * transaction, when a TourRequest reaches `targetStatus` via
 * `transitionTourRequestStatus`. This only covers the generic
 * admin/tourist transitions above -- the quotation module's own
 * send/reject/accept transactions supersede competing
 * quotations directly, since those must exclude the one
 * quotation actually being changed.
 */
const SUPERSEDE_ON_REQUEST_STATUS = {
  CANCELLED: ["DRAFT", "SENT"],
  REJECTED: ["DRAFT", "SENT"],
  UNDER_DISCUSSION: ["SENT"],
};

const supersedeStatusesFor = (targetStatus) =>
  SUPERSEDE_ON_REQUEST_STATUS[targetStatus] || [];

/**
 * =========================================================
 * Transaction Helpers
 * =========================================================
 *
 * Every helper below takes an open Prisma transaction client
 * (`tx`) and never opens one itself. The repository function
 * that owns the `prisma.$transaction(...)` call decides where
 * these fit in the lock order: TourRequest -> TourQuotation ->
 * Payment/Booking.
 */

const readTourRequestState = async (tx, tourRequestId) => {
  return tx.tourRequest.findUnique({
    where: {
      id: tourRequestId,
    },

    select: {
      status: true,
      deletedAt: true,
    },
  });
};

/**
 * Conditionally moves a TourRequest from one of `from` to `to`.
 * A count of 0 means either the row does not exist (404) or its
 * status had already changed before this write could apply --
 * a lost race against a concurrent operation (409).
 */
const transitionTourRequestStatus = async (
  tx,
  { tourRequestId, from, to, conflictMessage },
) => {
  const result = await tx.tourRequest.updateMany({
    where: {
      id: tourRequestId,
      deletedAt: null,
      status: {
        in: from,
      },
    },

    data: {
      status: to,
    },
  });

  if (result.count === 0) {
    const current = await readTourRequestState(tx, tourRequestId);

    if (!current || current.deletedAt) {
      throw new NotFoundError("Tour request not found");
    }

    throw new ConflictError(
      conflictMessage ||
        `Tour request status changed to ${current.status} before this operation could complete`,
    );
  }
};

/**
 * A status-aware lock that changes no status. Used by
 * operations (create quotation, create revision, admin edit)
 * that must run only while the TourRequest is in one of
 * `allowed`, without themselves moving it to a new status.
 */
const lockTourRequestInStatus = async (
  tx,
  { tourRequestId, allowed, conflictMessage },
) => {
  const result = await tx.tourRequest.updateMany({
    where: {
      id: tourRequestId,
      deletedAt: null,
      status: {
        in: allowed,
      },
    },

    data: {
      updatedAt: new Date(),
    },
  });

  if (result.count === 0) {
    const current = await readTourRequestState(tx, tourRequestId);

    if (!current || current.deletedAt) {
      throw new NotFoundError("Tour request not found");
    }

    throw new ConflictError(
      conflictMessage ||
        `This operation is not allowed while the tour request is ${current.status}`,
    );
  }
};

const supersedeOpenQuotations = async (
  tx,
  { tourRequestId, statuses, excludeQuotationId },
) => {
  if (!statuses || statuses.length === 0) {
    return {
      count: 0,
    };
  }

  return tx.tourQuotation.updateMany({
    where: {
      tourRequestId,

      status: {
        in: statuses,
      },

      ...(excludeQuotationId
        ? {
            id: {
              not: excludeQuotationId,
            },
          }
        : {}),
    },

    data: {
      status: "SUPERSEDED",
    },
  });
};

module.exports = {
  TOUR_REQUEST_STATUSES,
  MANUAL_ADMIN_TRANSITIONS,
  isTransitionAllowed,
  allowedSourcesFor,
  TOURIST_CANCEL,
  QUOTATION_CREATE_ALLOWED,
  QUOTATION_REVISE_ALLOWED,
  ADMIN_EDIT_ALLOWED,
  PAYMENT_ALLOWED,
  QUOTATION_SEND,
  QUOTATION_REJECT,
  QUOTATION_ACCEPT,
  BOOKING_CONFIRM,
  supersedeStatusesFor,
  transitionTourRequestStatus,
  lockTourRequestInStatus,
  supersedeOpenQuotations,
};
