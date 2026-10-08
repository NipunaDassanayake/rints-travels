const prisma = require("../../config/prisma");

const lifecycle = require("../tour-requests/tourRequests.lifecycle");

const { ConflictError } = require("../../utils/AppError");

const {
  lockBooking,
  lockQuotationAssignment,
  invalidateActiveChallenges,
} = require("./bookingLifecycle.lock");

const {
  LIFECYCLE_TRANSITIONS,
  MAX_FAILED_ATTEMPTS,
} = require("./bookingLifecycleChallenge");

/** Statuses an admin can still cancel or reassign a guide for. */
const CANCELLABLE_BOOKING_STATUSES = ["CONFIRMED", "IN_PROGRESS"];

/**
 * =========================================================
 * Shared Booking Include
 * =========================================================
 */

const bookingInclude = {
  tourRequest: true,

  quotation: {
    include: {
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

      itineraries: {
        orderBy: {
          dayNumber: "asc",
        },
      },

      inclusions: true,

      exclusions: true,
    },
  },

  payment: true,

  tourist: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
};

/**
 * =========================================================
 * Find Booking
 * =========================================================
 */

const findBookingByPaymentId = async (paymentId) => {
  return prisma.booking.findUnique({
    where: {
      paymentId,
    },

    include: bookingInclude,
  });
};

const findBookingById = async (id) => {
  return prisma.booking.findUnique({
    where: {
      id,
    },

    include: bookingInclude,
  });
};

/**
 * =========================================================
 * Tourist Bookings
 * =========================================================
 */

const findBookingsByTouristId = async (touristId) => {
  return prisma.booking.findMany({
    where: {
      touristId,
    },

    include: bookingInclude,

    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * =========================================================
 * Tour Guide - Assigned Bookings
 * =========================================================
 *
 * req.user.id is the User ID.
 *
 * The booking stores the assigned guide through:
 *
 * Booking
 *   -> quotation
 *      -> guide
 *         -> userId
 */

const findBookingsByGuideUserId = async (userId) => {
  return prisma.booking.findMany({
    where: {
      quotation: {
        guide: {
          userId,
        },
      },
    },

    include: bookingInclude,

    orderBy: [
      {
        startDate: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
};

/**
 * =========================================================
 * Admin - All Bookings
 * =========================================================
 */

const findAllBookings = async ({ status, touristId } = {}) => {
  const where = {};

  if (status) {
    where.status = status;
  }

  if (touristId) {
    where.touristId = touristId;
  }

  return prisma.booking.findMany({
    where,

    include: bookingInclude,

    orderBy: {
      createdAt: "desc",
    },
  });
};

/**
 * =========================================================
 * Admin - Cancel Booking (CR-032)
 * =========================================================
 *
 * Locked, conditional cancellation: only a CONFIRMED or
 * IN_PROGRESS booking can become CANCELLED, so a cancellation
 * racing a completion can never overwrite COMPLETED. Any code
 * still usable for the booking is invalidated.
 */

const cancelBookingTransaction = async ({ bookingId, now = new Date() }) => {
  return prisma.$transaction(async (tx) => {
    const booking = await lockBooking(tx, bookingId);

    if (!booking) {
      return { outcome: "NOT_FOUND" };
    }

    const result = await tx.booking.updateMany({
      where: {
        id: bookingId,

        status: {
          in: CANCELLABLE_BOOKING_STATUSES,
        },
      },

      data: {
        status: "CANCELLED",

        cancelledAt: now,

        completedAt: null,
      },
    });

    if (result.count !== 1) {
      return { outcome: "STATUS_MISMATCH", currentStatus: booking.status };
    }

    const invalidatedChallenges = await invalidateActiveChallenges(tx, {
      bookingId,

      reason: "BOOKING_CANCELLED",

      now,
    });

    const updatedBooking = await tx.booking.findUnique({
      where: {
        id: bookingId,
      },

      include: bookingInclude,
    });

    return {
      outcome: "CANCELLED",

      booking: updatedBooking,

      previousStatus: booking.status,

      invalidatedChallenges,
    };
  });
};

/**
 * =========================================================
 * Admin - Assign Guide To Booking
 * =========================================================
 *
 * Guide assignment is stored on TourQuotation.guideId. Follows
 * the lifecycle locking protocol (booking row, then quotation
 * row, then codes) so it serializes with code verification: a
 * code is never redeemed by a guide who was replaced, and any
 * code generated before the change is invalidated -- the new
 * guide always needs a fresh one (CR-032).
 */

const assignGuideToBooking = async (bookingId, guideId, now = new Date()) => {
  return prisma.$transaction(async (tx) => {
    const booking = await lockBooking(tx, bookingId);

    if (!booking) {
      return { outcome: "NOT_FOUND" };
    }

    if (!CANCELLABLE_BOOKING_STATUSES.includes(booking.status)) {
      return { outcome: "STATUS_MISMATCH", currentStatus: booking.status };
    }

    const previousGuideId = await lockQuotationAssignment(tx, booking.quotationId);

    let invalidatedChallenges = 0;

    if (previousGuideId !== guideId) {
      await tx.tourQuotation.update({
        where: {
          id: booking.quotationId,
        },

        data: {
          guideId,
        },
      });

      invalidatedChallenges = await invalidateActiveChallenges(tx, {
        bookingId,

        reason: "GUIDE_REASSIGNED",

        now,
      });
    }

    const updatedBooking = await tx.booking.findUnique({
      where: {
        id: bookingId,
      },

      include: bookingInclude,
    });

    return {
      outcome: "ASSIGNED",

      booking: updatedBooking,

      previousGuideId,

      invalidatedChallenges,
    };
  });
};

/**
 * =========================================================
 * Traveler - Generate Lifecycle Confirmation Code (CR-032)
 * =========================================================
 *
 * Receives only the HMAC of the code (never the code itself).
 * Replaces any still-usable code for the same booking and
 * action, so at most one code is usable at a time.
 */

const createLifecycleChallengeTransaction = async ({
  bookingId,
  touristUserId,
  action,
  challengeId,
  codeHash,
  expiresAt,
  now = new Date(),
}) => {
  return prisma.$transaction(async (tx) => {
    const booking = await lockBooking(tx, bookingId);

    if (!booking) {
      return { outcome: "NOT_FOUND" };
    }

    if (booking.touristId !== touristUserId) {
      return { outcome: "FORBIDDEN" };
    }

    if (booking.status !== LIFECYCLE_TRANSITIONS[action].from) {
      return {
        outcome: "STATUS_MISMATCH",
        currentStatus: booking.status,
        bookingReference: booking.bookingReference,
      };
    }

    const guideId = await lockQuotationAssignment(tx, booking.quotationId);

    if (!guideId) {
      return { outcome: "NO_ASSIGNED_GUIDE", bookingReference: booking.bookingReference };
    }

    const replacedChallenges = await invalidateActiveChallenges(tx, {
      bookingId,

      action,

      reason: "REPLACED",

      now,
    });

    const challenge = await tx.bookingLifecycleChallenge.create({
      data: {
        id: challengeId,

        bookingId,

        action,

        codeHash,

        expiresAt,

        createdByUserId: touristUserId,
      },

      select: {
        id: true,

        action: true,

        expiresAt: true,
      },
    });

    const guide = await tx.tourGuideProfile.findUnique({
      where: {
        id: guideId,
      },

      select: {
        user: {
          select: {
            firstName: true,

            lastName: true,
          },
        },
      },
    });

    return {
      outcome: "CREATED",

      challenge,

      replacedChallenges,

      guide: guide?.user ?? null,

      bookingReference: booking.bookingReference,
    };
  });
};

/**
 * =========================================================
 * Guide - Redeem Lifecycle Confirmation Code (CR-032)
 * =========================================================
 *
 * Validates and, on success, consumes the code and moves the
 * booking in one locked transaction. Business failures are
 * RETURNED (never thrown) so the transaction commits whatever it
 * recorded -- a failed attempt, an exhausted or expired code --
 * before the service turns the outcome into an HTTP error.
 *
 * `codeMatches(challenge)` compares the submitted code with the
 * stored hash; the plaintext code never reaches this module.
 */

const verifyLifecycleChallengeTransaction = async ({
  bookingId,
  guideUserId,
  action,
  codeMatches,
  now = new Date(),
}) => {
  return prisma.$transaction(async (tx) => {
    const booking = await lockBooking(tx, bookingId);

    if (!booking) {
      return { outcome: "NOT_FOUND" };
    }

    const assignedGuideId = await lockQuotationAssignment(tx, booking.quotationId);

    const guideProfile = await tx.tourGuideProfile.findUnique({
      where: {
        userId: guideUserId,
      },

      select: {
        id: true,
      },
    });

    const base = { bookingReference: booking.bookingReference };

    if (!assignedGuideId || !guideProfile || guideProfile.id !== assignedGuideId) {
      return { ...base, outcome: "NOT_ASSIGNED" };
    }

    const transition = LIFECYCLE_TRANSITIONS[action];

    if (booking.status !== transition.from) {
      return { ...base, outcome: "STATUS_MISMATCH", currentStatus: booking.status };
    }

    /*
     * Invariant: at most one OPEN code (not consumed, not
     * invalidated) per booking + action. Generation holds the
     * booking lock and invalidates the previous open code before
     * creating a new one, so the open code is looked up directly
     * -- never chosen by ordering. Consumed and invalidated codes
     * are history and play no part in the decision.
     */
    const openChallenges = await tx.bookingLifecycleChallenge.findMany({
      where: {
        bookingId,

        action,

        consumedAt: null,

        invalidatedAt: null,
      },

      take: 2,
    });

    if (openChallenges.length === 0) {
      return { ...base, outcome: "NO_ACTIVE_CODE" };
    }

    if (openChallenges.length > 1) {
      // Fail closed: no attempt is counted and nothing transitions.
      const openCount = await tx.bookingLifecycleChallenge.count({
        where: {
          bookingId,

          action,

          consumedAt: null,

          invalidatedAt: null,
        },
      });

      return { ...base, outcome: "INTEGRITY_VIOLATION", openChallenges: openCount };
    }

    const [active] = openChallenges;

    if (active.expiresAt.getTime() <= now.getTime()) {
      await tx.bookingLifecycleChallenge.update({
        where: {
          id: active.id,
        },

        data: {
          invalidatedAt: now,

          invalidationReason: "EXPIRED",
        },
      });

      return { ...base, outcome: "CODE_EXPIRED", challengeId: active.id, expiredNow: true };
    }

    if (!codeMatches(active)) {
      const failedAttempts = active.failedAttempts + 1;

      const exhausted = failedAttempts >= MAX_FAILED_ATTEMPTS;

      await tx.bookingLifecycleChallenge.update({
        where: {
          id: active.id,
        },

        data: {
          failedAttempts,

          ...(exhausted
            ? {
                invalidatedAt: now,

                invalidationReason: "ATTEMPTS_EXHAUSTED",
              }
            : {}),
        },
      });

      return exhausted
        ? { ...base, outcome: "ATTEMPTS_EXHAUSTED", challengeId: active.id, exhaustedNow: true }
        : {
            ...base,
            outcome: "CODE_INCORRECT",
            challengeId: active.id,
            attemptsRemaining: MAX_FAILED_ATTEMPTS - failedAttempts,
          };
    }

    /*
     * Both writes are conditional. Under the booking lock they
     * cannot fail; if they ever did, throwing rolls back both so a
     * code is never consumed without the transition (or vice versa).
     */
    const consumed = await tx.bookingLifecycleChallenge.updateMany({
      where: {
        id: active.id,

        consumedAt: null,

        invalidatedAt: null,
      },

      data: {
        consumedAt: now,

        consumedByUserId: guideUserId,
      },
    });

    if (consumed.count !== 1) {
      throw new ConflictError("This confirmation code is no longer usable");
    }

    const transitioned = await tx.booking.updateMany({
      where: {
        id: bookingId,

        status: transition.from,
      },

      data: {
        status: transition.to,

        ...(action === "START" ? { startedAt: now } : { completedAt: now }),
      },
    });

    if (transitioned.count !== 1) {
      throw new ConflictError("The booking status changed before the tour could be updated");
    }

    const updatedBooking = await tx.booking.findUnique({
      where: {
        id: bookingId,
      },

      include: bookingInclude,
    });

    return {
      ...base,

      outcome: "VERIFIED",

      challengeId: active.id,

      previousStatus: transition.from,

      booking: updatedBooking,
    };
  });
};

/**
 * =========================================================
 * Check Guide Booking Conflict
 * =========================================================
 */

const findGuideBookingConflict = async ({
  guideId,
  startDate,
  endDate,
  excludeBookingId,
}) => {
  return prisma.booking.findFirst({
    where: {
      ...(excludeBookingId
        ? {
            id: {
              not: excludeBookingId,
            },
          }
        : {}),

      status: {
        in: ["CONFIRMED", "IN_PROGRESS"],
      },

      quotation: {
        guideId,
      },

      startDate: {
        lte: endDate,
      },

      endDate: {
        gte: startDate,
      },
    },

    include: bookingInclude,
  });
};

/**
 * =========================================================
 * Create Booking From Successful Payment
 * =========================================================
 */

const confirmBookingFromPayment = async ({ paymentId, bookingReference }) => {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: {
        id: paymentId,
      },

      include: {
        quotation: {
          include: {
            tourRequest: true,
          },
        },
      },
    });

    if (!payment) {
      return null;
    }

    const existingBooking = await tx.booking.findUnique({
      where: {
        paymentId,
      },

      include: bookingInclude,
    });

    if (existingBooking) {
      return existingBooking;
    }

    if (payment.status !== "SUCCESS") {
      return null;
    }

    const quotation = payment.quotation;

    const tourRequest = quotation.tourRequest;

    if (quotation.status !== "ACCEPTED") {
      throw new ConflictError(
        `Cannot confirm a booking because the quotation is ${quotation.status}, not ACCEPTED`,
      );
    }

    await lifecycle.transitionTourRequestStatus(tx, {
      tourRequestId: tourRequest.id,

      from: lifecycle.BOOKING_CONFIRM.from,

      to: lifecycle.BOOKING_CONFIRM.to,
    });

    const booking = await tx.booking.create({
      data: {
        tourRequestId: tourRequest.id,

        quotationId: quotation.id,

        paymentId: payment.id,

        touristId: payment.touristId,

        bookingReference,

        status: "CONFIRMED",

        startDate: quotation.startDate,

        endDate: quotation.endDate,

        totalAmount: payment.amount,

        currency: payment.currency,

        confirmedAt: new Date(),
      },
    });

    return tx.booking.findUnique({
      where: {
        id: booking.id,
      },

      include: bookingInclude,
    });
  });
};

module.exports = {
  findBookingByPaymentId,
  findBookingById,

  findBookingsByTouristId,
  findBookingsByGuideUserId,

  findAllBookings,

  cancelBookingTransaction,

  assignGuideToBooking,
  findGuideBookingConflict,

  createLifecycleChallengeTransaction,
  verifyLifecycleChallengeTransaction,

  confirmBookingFromPayment,
};