/**
 * =========================================================
 * Guide Booking-Window Allocation (CR-018)
 * =========================================================
 *
 * E2E fixtures used to pick RANDOM future dates for bookings
 * that the shared E2E guide is later assigned to. As leftover
 * CONFIRMED bookings accumulated, assignment increasingly hit
 * the guide-overlap rule (bookings.service "This guide is
 * already assigned to another booking ..."), failing runs at
 * random.
 *
 * allocateGuideWindow returns the earliest window that does not
 * overlap any active booking of the guide, using the same
 * inclusive rule as bookings.repository.findGuideBookingConflict:
 *   existing.startDate <= new.endDate AND existing.endDate >= new.startDate
 */

const ACTIVE_BOOKING_STATUSES = ["CONFIRMED", "IN_PROGRESS"];

const DAY_MS = 24 * 60 * 60 * 1000;

function utcMidnight(date) {
  const value = new Date(date);

  value.setUTCHours(0, 0, 0, 0);

  return value;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function overlaps(range, startDate, endDate) {
  return range.startDate <= endDate && range.endDate >= startDate;
}

/**
 * Pure: the earliest window [start, start + spanDays] beginning
 * no earlier than `from` that overlaps none of `busyRanges`.
 * `gapDays` whole days are left after a busy range ends.
 */
function findFirstFreeWindow({ busyRanges, from, spanDays, gapDays = 1 }) {
  const ranges = [...busyRanges].sort((a, b) => a.startDate - b.startDate);

  let startDate = utcMidnight(from);

  let moved = true;

  // Re-scan until the candidate is clear of every range.
  while (moved) {
    moved = false;

    for (const range of ranges) {
      const endDate = addDays(startDate, spanDays);

      if (overlaps(range, startDate, endDate)) {
        startDate = addDays(utcMidnight(range.endDate), 1 + gapDays);

        moved = true;
      }
    }
  }

  return {
    startDate,
    endDate: addDays(startDate, spanDays),
  };
}

/**
 * Allocates a window for `guideId`.
 *
 * Busy ranges are the guide's CONFIRMED / IN_PROGRESS bookings
 * PLUS -- when `pendingAssignmentTouristId` is given -- that
 * tourist's active bookings that have no guide yet. Fixtures
 * create bookings first and assign the shared guide later (in
 * the spec), so without counting those pending bookings every
 * fixture in a spec's setup would receive the same window and
 * the second assignment would collide.
 *
 * The advisory lock serialises concurrent allocations for the
 * same guide. The window is not "reserved" -- the booking is
 * created afterwards by the caller -- so fixtures must not run
 * concurrently (playwright.config sets workers: 1).
 */
async function allocateGuideWindow(
  prisma,
  { guideId, spanDays, pendingAssignmentTouristId = null, minLeadDays = 365, gapDays = 1 },
) {
  return prisma.$transaction(async (tx) => {
    const lockKey = `e2e-guide-window:${guideId}`;

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const busyRanges = await tx.booking.findMany({
      where: {
        status: {
          in: ACTIVE_BOOKING_STATUSES,
        },

        OR: [
          {
            quotation: {
              guideId,
            },
          },

          ...(pendingAssignmentTouristId
            ? [
                {
                  touristId: pendingAssignmentTouristId,

                  quotation: {
                    guideId: null,
                  },
                },
              ]
            : []),
        ],
      },

      select: {
        startDate: true,
        endDate: true,
      },
    });

    return findFirstFreeWindow({
      busyRanges,
      from: addDays(utcMidnight(new Date()), minLeadDays),
      spanDays,
      gapDays,
    });
  });
}

module.exports = {
  findFirstFreeWindow,
  allocateGuideWindow,
};
