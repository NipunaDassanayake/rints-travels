/**
 * =========================================================
 * Booking Lifecycle Locking Protocol (CR-032)
 * =========================================================
 *
 * Invariant: every change to a booking's status, its assigned
 * guide or its lifecycle confirmation codes happens inside a
 * transaction that first holds that booking's row lock.
 *
 * Lock order (always, in every path):
 *
 *   1. the booking row          -- lockBooking
 *   2. the quotation row        -- lockQuotationAssignment
 *      (only when the guide assignment is read or changed)
 *   3. booking_lifecycle_challenges rows for that booking
 *
 * Code generation, code verification, cancellation and guide
 * reassignment all follow this order, so they serialize per
 * booking without deadlocks. That serialization -- not a unique
 * index -- is what guarantees at most one usable code per booking
 * and action, a single transition per code, attempt counts that
 * are never lost, and that a code is never usable after a
 * cancellation or a change of guide.
 *
 * SELECT ... FOR UPDATE is used instead of a dummy UPDATE so that
 * taking the lock does not touch updatedAt (which the traveler
 * portal shows as "last activity").
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Locks the booking row and returns its lifecycle fields, or null
 * when the booking does not exist.
 */
const lockBooking = async (tx, bookingId) => {
  if (typeof bookingId !== "string" || !UUID_PATTERN.test(bookingId)) {
    return null;
  }

  const rows = await tx.$queryRaw`
    SELECT
      id,
      status::text AS status,
      quotation_id AS "quotationId",
      tourist_id AS "touristId",
      booking_reference AS "bookingReference"
    FROM bookings
    WHERE id = ${bookingId}::uuid
    FOR UPDATE
  `;

  return rows[0] ?? null;
};

/**
 * Locks the booking's quotation row (where the assigned guide is
 * stored) and returns the assigned guide profile id, or null.
 * Must only be called after lockBooking for the same booking.
 */
const lockQuotationAssignment = async (tx, quotationId) => {
  const rows = await tx.$queryRaw`
    SELECT guide_id AS "guideId"
    FROM tour_quotations
    WHERE id = ${quotationId}::uuid
    FOR UPDATE
  `;

  return rows[0]?.guideId ?? null;
};

/**
 * Marks every still-usable code of the booking (optionally for
 * one action) as invalidated. Step 3 of the lock order.
 */
const invalidateActiveChallenges = async (tx, { bookingId, action, reason, now = new Date() }) => {
  const result = await tx.bookingLifecycleChallenge.updateMany({
    where: {
      bookingId,

      ...(action ? { action } : {}),

      consumedAt: null,

      invalidatedAt: null,
    },

    data: {
      invalidatedAt: now,

      invalidationReason: reason,
    },
  });

  return result.count;
};

module.exports = {
  lockBooking,
  lockQuotationAssignment,
  invalidateActiveChallenges,
};
