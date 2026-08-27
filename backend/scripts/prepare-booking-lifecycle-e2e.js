const path = require("path");
const crypto = require("crypto");

/**
 * =========================================================
 * Load Backend Environment
 * =========================================================
 *
 * This script may be executed from the frontend directory
 * by Playwright.
 *
 * Therefore explicitly load backend/.env instead of
 * depending on the current terminal working directory.
 */

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

/**
 * =========================================================
 * Production Protection
 * =========================================================
 *
 * This script creates artificial E2E data.
 *
 * It must NEVER run against production.
 */

if (process.env.NODE_ENV === "production") {
  console.error("E2E fixture creation is disabled in production.");

  process.exit(1);
}

const prisma = require("../src/config/prisma");

const bookingsService = require("../src/modules/bookings/bookings.service");

/**
 * =========================================================
 * Configuration
 * =========================================================
 */

const TOURIST_EMAIL = process.env.E2E_TOURIST_EMAIL ?? "nipuna@example.com";

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

function createUniqueSuffix() {
  return `${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/**
 * Generate future travel dates.
 *
 * We deliberately move the booking well into the future
 * and add a random offset so repeatedly-created E2E
 * bookings are unlikely to overlap.
 *
 * This is useful because Travora prevents the same guide
 * from having overlapping CONFIRMED / IN_PROGRESS tours.
 */
function createTravelDates() {
  const startDate = new Date();

  startDate.setUTCHours(0, 0, 0, 0);

  /**
   * At least one year into the future.
   *
   * Add up to approximately 10 additional years
   * to make collisions between failed E2E runs
   * extremely unlikely.
   */
  const randomOffset = crypto.randomInt(1, 3650);

  startDate.setUTCDate(startDate.getUTCDate() + 365 + randomOffset);

  const endDate = new Date(startDate);

  endDate.setUTCDate(endDate.getUTCDate() + 5);

  return {
    startDate,
    endDate,
  };
}

/**
 * =========================================================
 * Prepare Booking Lifecycle Fixture
 * =========================================================
 */

async function prepareBookingLifecycleFixture() {
  const uniqueSuffix = createUniqueSuffix();

  const { startDate, endDate } = createTravelDates();

  /**
   * =======================================================
   * Find Tourist
   * =======================================================
   */

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

  /**
   * =======================================================
   * Create Tour Request
   * =======================================================
   *
   * We use CUSTOM because this test is about the booking
   * lifecycle and should not depend on a particular package.
   */

  const tourRequest = await prisma.tourRequest.create({
    data: {
      touristId: tourist.id,

      requestType: "CUSTOM",

      title: `E2E Booking Lifecycle ${uniqueSuffix}`,

      preferredStartDate: startDate,

      preferredEndDate: endDate,

      adultCount: 2,

      childCount: 0,

      destinationPreferences: "Sigiriya, Kandy, Nuwara Eliya, Ella and Yala",

      budget: "1500.00",

      currency: "USD",

      hotelPreference: "Comfortable E2E accommodation",

      transportPreference: "Private air-conditioned vehicle",

      specialRequirements: "Automated Playwright booking lifecycle fixture.",

      contactMethod: "EMAIL",

      /**
       * The quotation below represents an already
       * accepted quotation.
       */
      status: "ACCEPTED",
    },
  });

  /**
   * =======================================================
   * Create Accepted Quotation
   * =======================================================
   *
   * IMPORTANT:
   *
   * guideId intentionally remains NULL.
   *
   * The Playwright test itself must verify that the
   * admin can assign Nimal to the confirmed booking.
   */

  const quotation = await prisma.tourQuotation.create({
    data: {
      tourRequestId: tourRequest.id,

      guideId: null,

      quotationNumber: `E2E-QTN-${uniqueSuffix}`,

      revisionNumber: 1,

      title: `Playwright Booking Lifecycle Journey ${uniqueSuffix}`,

      description:
        "A dedicated Travora journey created automatically for the Playwright booking lifecycle test.",

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
          {
            dayNumber: 2,

            title: "Kandy and Hill Country",

            description:
              "Continue toward Kandy and explore Sri Lanka's central highlands.",
          },
        ],
      },

      inclusions: {
        create: [
          {
            title: "Private transportation",
          },
          {
            title: "Tour guide service",
          },
          {
            title: "Hotel accommodation",
          },
        ],
      },

      exclusions: {
        create: [
          {
            title: "International airfare",
          },
          {
            title: "Travel insurance",
          },
        ],
      },
    },
  });

  /**
   * =======================================================
   * Create Successful Payment
   * =======================================================
   *
   * This represents the result that Stripe would normally
   * produce after a successful Checkout session.
   *
   * We don't call Stripe from this fixture because Stripe
   * integration has its own E2E/manual verification.
   */

  const payment = await prisma.payment.create({
    data: {
      quotationId: quotation.id,

      touristId: tourist.id,

      paymentReference: `E2E-PAY-${uniqueSuffix}`,

      gatewayReference: `E2E-GATEWAY-${uniqueSuffix}`,

      amount: quotation.totalAmount,

      currency: quotation.currency,

      paymentMethod: "CARD",

      status: "SUCCESS",

      failureReason: null,

      paidAt: new Date(),
    },
  });

  /**
   * =======================================================
   * Create Booking Through Production Business Logic
   * =======================================================
   *
   * Do NOT insert Booking manually.
   *
   * Using the real service verifies the same path that the
   * Stripe webhook ultimately uses:
   *
   * SUCCESS payment
   *      ↓
   * createBookingFromPayment()
   *      ↓
   * CONFIRMED booking
   */

  const booking = await bookingsService.createBookingFromPayment(payment.id);

  /**
   * =======================================================
   * Sanity Checks
   * =======================================================
   */

  if (booking.status !== "CONFIRMED") {
    throw new Error(
      `E2E booking should be CONFIRMED but was ${booking.status}.`,
    );
  }

  if (booking.quotation.guideId) {
    throw new Error("E2E booking unexpectedly already has a guide.");
  }

  /**
   * =======================================================
   * Output
   * =======================================================
   *
   * The prefix lets Playwright reliably locate this JSON
   * even when Pino/Prisma/backend logs also appear.
   */

  const result = {
    bookingId: booking.id,

    bookingReference: booking.bookingReference,

    tourRequestId: tourRequest.id,

    quotationId: quotation.id,

    paymentId: payment.id,

    touristId: tourist.id,

    touristEmail: tourist.email,

    startDate: booking.startDate,

    endDate: booking.endDate,

    status: booking.status,
  };

  console.log(`E2E_FIXTURE_JSON=${JSON.stringify(result)}`);
}

/**
 * =========================================================
 * Execute
 * =========================================================
 */

prepareBookingLifecycleFixture()
  .catch((error) => {
    console.error("Unable to prepare booking lifecycle E2E fixture:", error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });