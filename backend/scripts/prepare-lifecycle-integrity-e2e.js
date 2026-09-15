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

const quotationsService = require("../src/modules/quotations/quotations.service");

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
 * Generate future travel dates, well clear of any other
 * E2E fixture's dates.
 */
function createTravelDates() {
  const startDate = new Date();

  startDate.setUTCHours(0, 0, 0, 0);

  const randomOffset = crypto.randomInt(1, 3650);

  startDate.setUTCDate(startDate.getUTCDate() + 365 + randomOffset);

  const endDate = new Date(startDate);

  endDate.setUTCDate(endDate.getUTCDate() + 5);

  return {
    startDate,
    endDate,
  };
}

async function getTourist() {
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

  return tourist;
}

function baseTourRequestData({
  touristId,
  uniqueSuffix,
  startDate,
  endDate,
  status,
}) {
  return {
    touristId,

    requestType: "CUSTOM",

    title: `E2E Lifecycle Integrity ${uniqueSuffix}`,

    preferredStartDate: startDate,

    preferredEndDate: endDate,

    adultCount: 2,

    childCount: 0,

    destinationPreferences: "Sigiriya, Kandy, Nuwara Eliya, Ella and Yala",

    budget: "1500.00",

    currency: "USD",

    hotelPreference: "Comfortable E2E accommodation",

    transportPreference: "Private air-conditioned vehicle",

    specialRequirements: "Automated Playwright lifecycle integrity fixture.",

    contactMethod: "EMAIL",

    status,
  };
}

/**
 * Payload shape for the real quotationsService.createQuotation() --
 * used by the two scenarios below that go through production business
 * logic instead of inserting rows directly.
 */
function servicePayload({ uniqueSuffix, startDate, endDate }) {
  return {
    title: `Playwright Lifecycle Integrity Journey ${uniqueSuffix}`,

    description:
      "A dedicated Travora journey created automatically for the Playwright lifecycle integrity test.",

    startDate,

    endDate,

    adultCount: 2,

    childCount: 0,

    subtotal: 1200,

    discountAmount: 50,

    taxAmount: 25,

    totalAmount: 1175,

    currency: "USD",

    notes: "Automatically generated E2E quotation.",

    termsConditions: "For automated testing only.",

    itineraries: [
      {
        dayNumber: 1,

        title: "Arrival and Cultural Triangle",

        description:
          "Meet the guide and begin the cultural journey through Sri Lanka.",
      },
    ],

    inclusions: ["Private transportation", "Tour guide service"],

    exclusions: ["International airfare"],
  };
}

/**
 * Raw Prisma `tourQuotation.create` data shape -- used only by the
 * legacy-* scenarios below, which represent data states CR-006's
 * guards make unreachable through the service layer going forward
 * (a quotation left DRAFT/SENT/ACCEPTED on a request that has since
 * been CANCELLED). These can only be produced by inserting rows
 * directly, standing in for data written before CR-006 shipped.
 */
function buildRawQuotationData({
  tourRequestId,
  uniqueSuffix,
  startDate,
  endDate,
  status,
  extra = {},
}) {
  return {
    tourRequestId,

    guideId: null,

    quotationNumber: `E2E-QTN-${uniqueSuffix}`,

    revisionNumber: 1,

    title: `Playwright Lifecycle Integrity Journey ${uniqueSuffix}`,

    description:
      "A dedicated Travora journey created automatically for the Playwright lifecycle integrity test.",

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

    status,

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

    ...extra,
  };
}

/**
 * =========================================================
 * Scenario: quotation-sent
 * =========================================================
 *
 * A TourRequest genuinely at QUOTATION_SENT with one SENT
 * quotation, produced through the real create + send service
 * calls (not inserted directly).
 */
async function prepareQuotationSent() {
  const uniqueSuffix = createUniqueSuffix();

  const { startDate, endDate } = createTravelDates();

  const tourist = await getTourist();

  const tourRequest = await prisma.tourRequest.create({
    data: baseTourRequestData({
      touristId: tourist.id,
      uniqueSuffix,
      startDate,
      endDate,
      status: "READY_FOR_QUOTATION",
    }),
  });

  const draft = await quotationsService.createQuotation(
    tourRequest.id,
    servicePayload({ uniqueSuffix, startDate, endDate }),
  );

  const sent = await quotationsService.sendQuotation(draft.id);

  if (sent.status !== "SENT") {
    throw new Error(`Expected quotation to be SENT but was ${sent.status}.`);
  }

  return {
    scenario: "quotation-sent",

    tourRequestId: tourRequest.id,

    quotationId: sent.id,

    touristId: tourist.id,

    touristEmail: tourist.email,

    requestStatus: "QUOTATION_SENT",

    quotationStatus: sent.status,
  };
}

/**
 * =========================================================
 * Scenario: two-drafts
 * =========================================================
 *
 * A TourRequest at READY_FOR_QUOTATION with two independent
 * DRAFT quotations (A, B), so the spec can send A, then send
 * B, and confirm A is superseded and only B remains acceptable.
 */
async function prepareTwoDrafts() {
  const uniqueSuffix = createUniqueSuffix();

  const { startDate, endDate } = createTravelDates();

  const tourist = await getTourist();

  const tourRequest = await prisma.tourRequest.create({
    data: baseTourRequestData({
      touristId: tourist.id,
      uniqueSuffix,
      startDate,
      endDate,
      status: "READY_FOR_QUOTATION",
    }),
  });

  const quotationA = await quotationsService.createQuotation(
    tourRequest.id,
    servicePayload({
      uniqueSuffix: `${uniqueSuffix}-A`,
      startDate,
      endDate,
    }),
  );

  const quotationB = await quotationsService.createQuotation(
    tourRequest.id,
    servicePayload({
      uniqueSuffix: `${uniqueSuffix}-B`,
      startDate,
      endDate,
    }),
  );

  return {
    scenario: "two-drafts",

    tourRequestId: tourRequest.id,

    quotationAId: quotationA.id,

    quotationBId: quotationB.id,

    touristId: tourist.id,

    touristEmail: tourist.email,
  };
}

/**
 * =========================================================
 * Scenario: legacy-cancelled-draft
 * =========================================================
 */
async function prepareLegacyCancelledDraft() {
  const uniqueSuffix = createUniqueSuffix();

  const { startDate, endDate } = createTravelDates();

  const tourist = await getTourist();

  const tourRequest = await prisma.tourRequest.create({
    data: baseTourRequestData({
      touristId: tourist.id,
      uniqueSuffix,
      startDate,
      endDate,
      status: "CANCELLED",
    }),
  });

  const quotation = await prisma.tourQuotation.create({
    data: buildRawQuotationData({
      tourRequestId: tourRequest.id,
      uniqueSuffix,
      startDate,
      endDate,
      status: "DRAFT",
    }),
  });

  return {
    scenario: "legacy-cancelled-draft",

    tourRequestId: tourRequest.id,

    quotationId: quotation.id,

    touristId: tourist.id,

    touristEmail: tourist.email,
  };
}

/**
 * =========================================================
 * Scenario: legacy-cancelled-sent
 * =========================================================
 */
async function prepareLegacyCancelledSent() {
  const uniqueSuffix = createUniqueSuffix();

  const { startDate, endDate } = createTravelDates();

  const tourist = await getTourist();

  const tourRequest = await prisma.tourRequest.create({
    data: baseTourRequestData({
      touristId: tourist.id,
      uniqueSuffix,
      startDate,
      endDate,
      status: "CANCELLED",
    }),
  });

  const quotation = await prisma.tourQuotation.create({
    data: buildRawQuotationData({
      tourRequestId: tourRequest.id,
      uniqueSuffix,
      startDate,
      endDate,
      status: "SENT",

      extra: {
        sentAt: new Date(),
      },
    }),
  });

  return {
    scenario: "legacy-cancelled-sent",

    tourRequestId: tourRequest.id,

    quotationId: quotation.id,

    touristId: tourist.id,

    touristEmail: tourist.email,
  };
}

/**
 * =========================================================
 * Scenario: legacy-cancelled-accepted
 * =========================================================
 */
async function prepareLegacyCancelledAccepted() {
  const uniqueSuffix = createUniqueSuffix();

  const { startDate, endDate } = createTravelDates();

  const tourist = await getTourist();

  const tourRequest = await prisma.tourRequest.create({
    data: baseTourRequestData({
      touristId: tourist.id,
      uniqueSuffix,
      startDate,
      endDate,
      status: "CANCELLED",
    }),
  });

  const quotation = await prisma.tourQuotation.create({
    data: buildRawQuotationData({
      tourRequestId: tourRequest.id,
      uniqueSuffix,
      startDate,
      endDate,
      status: "ACCEPTED",

      extra: {
        sentAt: new Date(),

        respondedAt: new Date(),
      },
    }),
  });

  return {
    scenario: "legacy-cancelled-accepted",

    tourRequestId: tourRequest.id,

    quotationId: quotation.id,

    touristId: tourist.id,

    touristEmail: tourist.email,
  };
}

/**
 * =========================================================
 * Scenario: legacy-confirm-booking
 * =========================================================
 *
 * A CANCELLED request with an ACCEPTED quotation and a SUCCESS
 * payment -- the exact shape a Stripe webhook would see if a
 * request were cancelled after payment was already initiated.
 * This scenario calls bookingsService.createBookingFromPayment()
 * itself (there is no HTTP endpoint for booking confirmation --
 * it is only reachable from the Stripe webhook) and reports
 * whether the attempt was blocked, so the Playwright spec can
 * assert on the JSON result directly instead of making its own
 * API call.
 */
async function prepareLegacyConfirmBooking() {
  const uniqueSuffix = createUniqueSuffix();

  const { startDate, endDate } = createTravelDates();

  const tourist = await getTourist();

  const tourRequest = await prisma.tourRequest.create({
    data: baseTourRequestData({
      touristId: tourist.id,
      uniqueSuffix,
      startDate,
      endDate,
      status: "CANCELLED",
    }),
  });

  const quotation = await prisma.tourQuotation.create({
    data: buildRawQuotationData({
      tourRequestId: tourRequest.id,
      uniqueSuffix,
      startDate,
      endDate,
      status: "ACCEPTED",

      extra: {
        sentAt: new Date(),

        respondedAt: new Date(),
      },
    }),
  });

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

  let bookingCreated = false;

  let blockedReason = null;

  try {
    await bookingsService.createBookingFromPayment(payment.id);

    bookingCreated = true;
  } catch (error) {
    blockedReason = error.message;
  }

  const existingBooking = await prisma.booking.findUnique({
    where: {
      paymentId: payment.id,
    },
  });

  const finalRequest = await prisma.tourRequest.findUnique({
    where: {
      id: tourRequest.id,
    },

    select: {
      status: true,
    },
  });

  return {
    scenario: "legacy-confirm-booking",

    tourRequestId: tourRequest.id,

    quotationId: quotation.id,

    paymentId: payment.id,

    touristId: tourist.id,

    touristEmail: tourist.email,

    bookingCreated,

    bookingExists: Boolean(existingBooking),

    blockedReason,

    requestStatus: finalRequest ? finalRequest.status : null,
  };
}

/**
 * =========================================================
 * Dispatch
 * =========================================================
 */

const SCENARIOS = {
  "quotation-sent": prepareQuotationSent,

  "two-drafts": prepareTwoDrafts,

  "legacy-cancelled-draft": prepareLegacyCancelledDraft,

  "legacy-cancelled-sent": prepareLegacyCancelledSent,

  "legacy-cancelled-accepted": prepareLegacyCancelledAccepted,

  "legacy-confirm-booking": prepareLegacyConfirmBooking,
};

async function main() {
  const scenario = process.argv[2];

  const handler = SCENARIOS[scenario];

  if (!handler) {
    throw new Error(
      `Unknown or missing scenario "${scenario}". Expected one of: ${Object.keys(SCENARIOS).join(", ")}.`,
    );
  }

  const result = await handler();

  console.log(`E2E_FIXTURE_JSON=${JSON.stringify(result)}`);
}

main()
  .catch((error) => {
    console.error(
      "Unable to prepare lifecycle integrity E2E fixture:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
