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

/**
 * =========================================================
 * Prepare Quotation Revision Fixture
 * =========================================================
 *
 * Seeds a TourRequest and a genuinely SENT TourQuotation --
 * the state createRevision requires -- by calling the real
 * quotationsService.createQuotation() and
 * quotationsService.sendQuotation() functions, exercising
 * the same production code the admin UI uses, rather than
 * inserting rows directly.
 */

async function prepareQuotationRevisionFixture() {
  const uniqueSuffix = createUniqueSuffix();

  const { startDate, endDate } = createTravelDates();

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

  const tourRequest = await prisma.tourRequest.create({
    data: {
      touristId: tourist.id,

      requestType: "CUSTOM",

      title: `E2E Quotation Revision ${uniqueSuffix}`,

      preferredStartDate: startDate,

      preferredEndDate: endDate,

      adultCount: 2,

      childCount: 0,

      destinationPreferences: "Sigiriya, Kandy, Nuwara Eliya, Ella and Yala",

      budget: "1500.00",

      currency: "USD",

      hotelPreference: "Comfortable E2E accommodation",

      transportPreference: "Private air-conditioned vehicle",

      specialRequirements: "Automated Playwright quotation revision fixture.",

      contactMethod: "EMAIL",

      /**
       * READY_FOR_QUOTATION is required for
       * quotationsService.createQuotation().
       */
      status: "READY_FOR_QUOTATION",
    },
  });

  /**
   * =======================================================
   * Create Draft Quotation Through Production Business Logic
   * =======================================================
   */

  const draftQuotation = await quotationsService.createQuotation(
    tourRequest.id,
    {
      title: `Playwright Quotation Revision Journey ${uniqueSuffix}`,

      description:
        "A dedicated Travora journey created automatically for the Playwright quotation revision test.",

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
    },
  );

  /**
   * =======================================================
   * Send The Quotation
   * =======================================================
   *
   * createRevision() only allows revising a SENT or REJECTED
   * quotation, so the fixture must reach SENT through the
   * real send workflow.
   */

  const sentQuotation = await quotationsService.sendQuotation(
    draftQuotation.id,
  );

  if (sentQuotation.status !== "SENT") {
    throw new Error(
      `E2E quotation should be SENT but was ${sentQuotation.status}.`,
    );
  }

  /**
   * =======================================================
   * Output
   * =======================================================
   */

  const result = {
    tourRequestId: tourRequest.id,

    quotationId: sentQuotation.id,

    quotationNumber: sentQuotation.quotationNumber,

    revisionNumber: sentQuotation.revisionNumber,

    touristId: tourist.id,

    touristEmail: tourist.email,

    status: sentQuotation.status,
  };

  console.log(`E2E_FIXTURE_JSON=${JSON.stringify(result)}`);
}

/**
 * =========================================================
 * Execute
 * =========================================================
 */

prepareQuotationRevisionFixture()
  .catch((error) => {
    console.error(
      "Unable to prepare quotation revision E2E fixture:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
