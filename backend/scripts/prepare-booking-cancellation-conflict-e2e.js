const crypto = require("crypto");

/**
 * =========================================================
 * Environment + Production / Local-Only Protection
 * =========================================================
 *
 * This script creates artificial E2E data. It loads
 * backend/.env explicitly (Playwright runs it from the
 * frontend directory) and refuses to run in production or
 * against a non-local database.
 */

const {
  loadBackendEnv,
  assertSafeE2EEnvironment,
  requireFixtureAccountEmail,
} = require("./lib/e2e-guards");

loadBackendEnv();

assertSafeE2EEnvironment("Booking cancellation conflict E2E fixture");

const { allocateGuideWindow } = require("./lib/guide-window");

const prisma = require("../src/config/prisma");

const bookingsService = require("../src/modules/bookings/bookings.service");

/**
 * =========================================================
 * Configuration
 * =========================================================
 *
 * This fixture exists specifically for CR-002 (booking
 * cancellation): it seeds two CONFIRMED bookings for the
 * SAME guide with OVERLAPPING travel dates, one of which
 * already has that guide assigned.
 *
 * This lets a Playwright test prove that:
 *
 * 1. assigning the same guide to the second (overlapping)
 *    booking is rejected as a conflict while the first
 *    booking is still CONFIRMED/IN_PROGRESS;
 *
 * 2. cancelling the first booking frees the guide, so the
 *    same assignment then succeeds -- i.e. a CANCELLED
 *    booking is no longer "active" for guide-conflict
 *    calculations.
 */

// A throwaway e2e-*@travora.com tourist, required (CR-032 Stage 3A).
const TOURIST_EMAIL = requireFixtureAccountEmail("E2E_TOURIST_EMAIL", "Booking cancellation conflict E2E fixture");

// A throwaway e2e-guide-*@travora.com guide, required (CR-032 Stage 3A).
const GUIDE_EMAIL = requireFixtureAccountEmail("E2E_GUIDE_EMAIL", "Booking cancellation conflict E2E fixture");

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

function createUniqueSuffix() {
  return `${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * Shared travel dates for both bookings.
 *
 * Both bookings intentionally use the SAME date range so they
 * overlap EACH OTHER for the guide-conflict checks. The range
 * itself is the earliest window that overlaps none of the
 * guide's other CONFIRMED / IN_PROGRESS bookings, so the only
 * conflict the spec can hit is the intended one.
 */
function createTravelDates(guideId, touristId) {
  return allocateGuideWindow(prisma, {
    guideId,
    spanDays: 5,
    // Other fixtures awaiting assignment of this guide.
    pendingAssignmentTouristId: touristId,
  });
}

async function createConfirmedBooking({
  tourist,
  guideId,
  startDate,
  endDate,
  label,
}) {
  const uniqueSuffix = createUniqueSuffix();

  const tourRequest = await prisma.tourRequest.create({
    data: {
      touristId: tourist.id,

      requestType: "CUSTOM",

      title: `E2E Cancellation Conflict ${label} ${uniqueSuffix}`,

      preferredStartDate: startDate,

      preferredEndDate: endDate,

      adultCount: 2,

      childCount: 0,

      destinationPreferences: "Sigiriya, Kandy, Nuwara Eliya, Ella and Yala",

      budget: "1500.00",

      currency: "USD",

      hotelPreference: "Comfortable E2E accommodation",

      transportPreference: "Private air-conditioned vehicle",

      specialRequirements:
        "Automated Playwright booking-cancellation conflict fixture.",

      contactMethod: "EMAIL",

      status: "ACCEPTED",
    },
  });

  const quotation = await prisma.tourQuotation.create({
    data: {
      tourRequestId: tourRequest.id,

      guideId,

      quotationNumber: `E2E-QTN-CANCEL-${label}-${uniqueSuffix}`,

      revisionNumber: 1,

      title: `Playwright Cancellation Conflict Journey ${label} ${uniqueSuffix}`,

      description:
        "A dedicated Travora journey created automatically for the Playwright booking-cancellation conflict test.",

      startDate,

      endDate,

      adultCount: 2,

      childCount: 0,

      subtotal: "1200.00",

      discountAmount: "50.00",

      taxAmount: "25.00",

      totalAmount: "1175.00",

      currency: "USD",

      notes: "Automatically generated E2E quotation.",

      termsConditions: "For automated testing only.",

      status: "ACCEPTED",

      sentAt: new Date(),

      respondedAt: new Date(),

      itineraries: {
        create: [
          {
            dayNumber: 1,

            title: "Arrival and Cultural Triangle",

            description:
              "Meet the guide and begin the cultural journey through Sri Lanka.",
          },
        ],
      },

      inclusions: {
        create: [
          {
            title: "Private transportation",
          },
        ],
      },

      exclusions: {
        create: [
          {
            title: "International airfare",
          },
        ],
      },
    },
  });

  const payment = await prisma.payment.create({
    data: {
      quotationId: quotation.id,

      touristId: tourist.id,

      paymentReference: `E2E-PAY-CANCEL-${label}-${uniqueSuffix}`,

      gatewayReference: `E2E-GATEWAY-CANCEL-${label}-${uniqueSuffix}`,

      amount: quotation.totalAmount,

      currency: quotation.currency,

      paymentMethod: "CARD",

      status: "SUCCESS",

      failureReason: null,

      paidAt: new Date(),
    },
  });

  /**
   * Created through the real service, exactly like the
   * booking-lifecycle fixture, so this exercises the same
   * production code path as the Stripe webhook.
   */

  const booking = await bookingsService.createBookingFromPayment(payment.id);

  if (booking.status !== "CONFIRMED") {
    throw new Error(
      `E2E booking (${label}) should be CONFIRMED but was ${booking.status}.`,
    );
  }

  return {
    tourRequestId: tourRequest.id,
    quotationId: quotation.id,
    paymentId: payment.id,
    booking,
  };
}

/**
 * =========================================================
 * Prepare Booking Cancellation Conflict Fixture
 * =========================================================
 */

async function prepareBookingCancellationConflictFixture() {
  const tourist = await prisma.user.findUnique({
    where: {
      email: TOURIST_EMAIL,
    },
  });

  if (!tourist) {
    throw new Error(`E2E tourist "${TOURIST_EMAIL}" was not found.`);
  }

  if (tourist.role !== "TOURIST") {
    throw new Error(`E2E user "${TOURIST_EMAIL}" must have TOURIST role.`);
  }

  if (tourist.status !== "ACTIVE") {
    throw new Error(`E2E tourist "${TOURIST_EMAIL}" must be ACTIVE.`);
  }

  const guide = await prisma.tourGuideProfile.findFirst({
    where: {
      user: {
        email: GUIDE_EMAIL,
      },
    },

    include: {
      user: true,
    },
  });

  if (!guide) {
    throw new Error(`E2E guide "${GUIDE_EMAIL}" was not found.`);
  }

  if (guide.user.status !== "ACTIVE") {
    throw new Error(`E2E guide "${GUIDE_EMAIL}" must be ACTIVE.`);
  }

  const { startDate, endDate } = await createTravelDates(guide.id, tourist.id);

  /**
   * =======================================================
   * Booking A - Already Assigned To The Guide
   * =======================================================
   */

  const { booking: bookingA } = await createConfirmedBooking({
    tourist,
    guideId: guide.id,
    startDate,
    endDate,
    label: "A",
  });

  if (bookingA.quotation.guideId !== guide.id) {
    throw new Error("E2E booking A should already have the guide assigned.");
  }

  /**
   * =======================================================
   * Booking B - Overlapping, Unassigned
   * =======================================================
   */

  const { booking: bookingB } = await createConfirmedBooking({
    tourist,
    guideId: null,
    startDate,
    endDate,
    label: "B",
  });

  if (bookingB.quotation.guideId) {
    throw new Error("E2E booking B unexpectedly already has a guide.");
  }

  /**
   * =======================================================
   * Output
   * =======================================================
   */

  const result = {
    bookingAId: bookingA.id,

    bookingAReference: bookingA.bookingReference,

    bookingBId: bookingB.id,

    bookingBReference: bookingB.bookingReference,

    guideId: guide.id,

    guideName: `${guide.user.firstName} ${guide.user.lastName}`,

    touristId: tourist.id,

    touristEmail: tourist.email,

    startDate: bookingA.startDate,

    endDate: bookingA.endDate,
  };

  console.log(`E2E_FIXTURE_JSON=${JSON.stringify(result)}`);
}

/**
 * =========================================================
 * Execute
 * =========================================================
 */

prepareBookingCancellationConflictFixture()
  .catch((error) => {
    console.error(
      "Unable to prepare booking cancellation conflict E2E fixture:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
