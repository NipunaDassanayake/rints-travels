const prisma = require("../../config/prisma");

const paymentInclude = {
  quotation: {
    include: {
      tourRequest: true,
      guide: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  },
  tourist: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
  booking: {
    select: {
      id: true,
    },
  },
};

const createPayment = async (data) => {
  return prisma.payment.create({
    data,
    include: paymentInclude,
  });
};

const findPaymentById = async (id) => {
  return prisma.payment.findUnique({
    where: {
      id,
    },
    include: paymentInclude,
  });
};

const findPaymentsByTouristId = async (touristId) => {
  return prisma.payment.findMany({
    where: {
      touristId,
    },
    include: paymentInclude,
    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * =========================================================
 * Find Payment By Quotation
 * =========================================================
 *
 * `Payment.quotationId` is unique (CR-007) -- at most one
 * Payment row can ever exist per quotation, so this replaces
 * the old two-query "find successful" / "find active" pattern
 * with a single lookup the service layer branches on.
 */
const findByQuotationId = async (quotationId) => {
  return prisma.payment.findUnique({
    where: {
      quotationId,
    },
    include: paymentInclude,
  });
};

/**
 * =========================================================
 * Set Checkout Session (compare-and-swap)
 * =========================================================
 *
 * Stores `nextSessionId` only if the row still holds the exact
 * session id the caller read before creating its Stripe session
 * (`previousSessionId`, which may be null for the first attempt)
 * and the payment is still open. `count === 0` means another
 * request already stored a session (or the payment completed) --
 * the caller must re-read and inspect the current session rather
 * than overwrite a newer one.
 */
const setCheckoutSessionIfUnchanged = async (
  paymentId,
  previousSessionId,
  nextSessionId,
) => {
  return prisma.payment.updateMany({
    where: {
      id: paymentId,
      stripeCheckoutSessionId: previousSessionId,
      status: {
        in: ["PENDING", "PROCESSING"],
      },
    },
    data: {
      stripeCheckoutSessionId: nextSessionId,
    },
  });
};

/**
 * =========================================================
 * Reset For Retry
 * =========================================================
 *
 * Resets a FAILED/CANCELLED payment back to a fresh PENDING
 * attempt in place, rather than creating a second row --
 * `Payment.quotationId` is unique, so a quotation can only
 * ever have one Payment row for its lifetime (CR-007 §6.1).
 *
 * NOT reachable today: nothing in the codebase ever writes
 * Payment.status to FAILED or CANCELLED (`markPaymentFailed`
 * is dead code). Kept for forward-compatibility with the
 * domain model, not exercised by any current flow.
 *
 * Conditional `updateMany` -- count 0 means the row moved out
 * of FAILED/CANCELLED before this could apply (e.g. a
 * concurrent caller already reset it), which the caller should
 * treat as "re-fetch and use the current row" rather than an
 * error.
 */
const resetForRetry = async (paymentId, { amount, currency, paymentMethod }) => {
  return prisma.payment.updateMany({
    where: {
      id: paymentId,
      status: {
        in: ["FAILED", "CANCELLED"],
      },
    },
    data: {
      status: "PENDING",
      amount,
      currency,
      paymentMethod,
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: null,
      gatewayReference: null,
      failureReason: null,
      paidAt: null,
    },
  });
};

/**
 * =========================================================
 * Mark Successful (conditional)
 * =========================================================
 *
 * `updateMany` guarded on the current status so two concurrent
 * webhook deliveries for the same payment can't both "win" --
 * count 0 means someone else already applied this (or the row
 * is no longer PENDING/PROCESSING for some other reason), which
 * the caller treats as a safe replay, not an error.
 */
const markSuccessful = async (
  paymentId,
  { stripePaymentIntentId, stripeCheckoutSessionId, gatewayReference, paidAt },
) => {
  return prisma.payment.updateMany({
    where: {
      id: paymentId,
      status: {
        in: ["PENDING", "PROCESSING"],
      },
    },
    data: {
      status: "SUCCESS",
      stripePaymentIntentId,
      stripeCheckoutSessionId,
      gatewayReference,
      failureReason: null,
      paidAt,
    },
  });
};

const updatePaymentStatus = async (
  id,
  data
) => {
  return prisma.payment.update({
    where: {
      id,
    },
    data,
    include: paymentInclude,
  });
};

/**
 * =========================================================
 * Stripe Webhook Event Ledger
 * =========================================================
 *
 * Raw Prisma primitives only -- the claim/inspect orchestration
 * (staleness decisions, retry loop) is business logic and lives
 * in payments.service.js.
 */

const createWebhookEventClaim = async (id, type) => {
  return prisma.stripeWebhookEvent.create({
    data: {
      id,
      type,
      status: "PROCESSING",
      claimedAt: new Date(),
    },
  });
};

const findWebhookEventById = async (id) => {
  return prisma.stripeWebhookEvent.findUnique({
    where: {
      id,
    },
  });
};

const takeoverStaleWebhookClaim = async (id, previousClaimedAt) => {
  return prisma.stripeWebhookEvent.updateMany({
    where: {
      id,
      status: "PROCESSING",
      claimedAt: previousClaimedAt,
    },
    data: {
      claimedAt: new Date(),
    },
  });
};

const markWebhookEventProcessed = async (id) => {
  return prisma.stripeWebhookEvent.update({
    where: {
      id,
    },
    data: {
      status: "PROCESSED",
      processedAt: new Date(),
    },
  });
};

const markWebhookEventFailed = async (id, failureReason) => {
  return prisma.stripeWebhookEvent.update({
    where: {
      id,
    },
    data: {
      status: "FAILED",
      failureReason,
      processedAt: new Date(),
    },
  });
};

module.exports = {
  createPayment,
  findPaymentById,
  findPaymentsByTouristId,
  findByQuotationId,
  setCheckoutSessionIfUnchanged,
  resetForRetry,
  markSuccessful,
  updatePaymentStatus,
  createWebhookEventClaim,
  findWebhookEventById,
  takeoverStaleWebhookClaim,
  markWebhookEventProcessed,
  markWebhookEventFailed,
};
