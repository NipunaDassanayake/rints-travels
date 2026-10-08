const path = require("path");
const crypto = require("crypto");

/**
 * =========================================================
 * Load Backend Environment
 * =========================================================
 *
 * This script is executed from the frontend directory by
 * Playwright, so load backend/.env explicitly.
 */

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

/**
 * =========================================================
 * Production / Local-Only Protection
 * =========================================================
 */

if (process.env.NODE_ENV === "production") {
  console.error("E2E fixture creation is disabled in production.");

  process.exit(1);
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function isLocalUrl(value) {
  try {
    return LOCAL_HOSTNAMES.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

if (!isLocalUrl(process.env.DATABASE_URL)) {
  console.error("Guide privacy fixtures only run against a local database.");

  process.exit(1);
}

const prisma = require("../src/config/prisma");

const quotationsService = require("../src/modules/quotations/quotations.service");

const tourGuidesService = require("../src/modules/tour-guides/tourGuides.service");

const quotationsRepository = require("../src/modules/quotations/quotations.repository");

const tourRequestsRepository = require("../src/modules/tour-requests/tourRequests.repository");

/**
 * =========================================================
 * Configuration / Helpers
 * =========================================================
 */

// A throwaway e2e-*@travora.com tourist, required (CR-032 Stage 3A).
const { requireFixtureAccountEmail } = require("./lib/e2e-guards");

const TOURIST_EMAIL = requireFixtureAccountEmail("E2E_TOURIST_EMAIL", "Guide privacy E2E fixture");

function createUniqueSuffix() {
  return `${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function createTravelDates() {
  const startDate = new Date();

  startDate.setUTCHours(0, 0, 0, 0);

  startDate.setUTCDate(startDate.getUTCDate() + 365 + crypto.randomInt(1, 3650));

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

  if (!tourist || tourist.role !== "TOURIST" || tourist.status !== "ACTIVE") {
    throw new Error(`E2E tourist "${TOURIST_EMAIL}" must be an ACTIVE TOURIST.`);
  }

  return tourist;
}

/**
 * A dedicated guide per run, with a unique email AND a non-null
 * phone, so the privacy assertions check real values and the
 * shared E2E guide account is never modified. The password is
 * random and never output -- nothing logs in as this guide.
 */
async function createDedicatedGuide(uniqueSuffix) {
  const token = uniqueSuffix.toLowerCase();

  const profile = await tourGuidesService.createTourGuide({
    firstName: "Privacy",

    lastName: `Guide ${uniqueSuffix.slice(-8)}`,

    email: `privacy.guide.${token}@e2e.travora.test`,

    phone: `+94 77 ${crypto.randomInt(1000000, 9999999)}`,

    password: `E2e!${crypto.randomBytes(12).toString("hex")}`,

    bio: "Dedicated guide created by the CR-009 privacy fixture.",

    experienceYears: 6,

    languages: ["English", "Sinhala"],

    specializations: ["Cultural Tours"],

    location: "Kandy",

    dailyRate: 70,

    isAvailable: true,
  });

  return {
    id: profile.id,
    userId: profile.user.id,
    firstName: profile.user.firstName,
    lastName: profile.user.lastName,
    email: profile.user.email,
    phone: profile.user.phone,
  };
}

async function createRequestWithSentQuotation({ tourist, guide, label }) {
  const dates = createTravelDates();

  const tourRequest = await prisma.tourRequest.create({
    data: {
      touristId: tourist.id,

      requestType: "CUSTOM",

      title: `E2E Guide Privacy ${label}`,

      preferredStartDate: dates.startDate,

      preferredEndDate: dates.endDate,

      adultCount: 2,

      childCount: 0,

      destinationPreferences: "Kandy and Sigiriya",

      budget: "1500.00",

      currency: "USD",

      contactMethod: "EMAIL",

      preferredGuideId: guide.id,

      status: "UNDER_DISCUSSION",
    },
  });

  const draft = await quotationsService.createQuotation(tourRequest.id, {
    guideId: guide.id,

    title: `Guide Privacy Journey ${label}`,

    description: "CR-009 guide privacy fixture quotation.",

    startDate: dates.startDate,

    endDate: dates.endDate,

    adultCount: 2,

    childCount: 0,

    subtotal: 1200,

    discountAmount: 50,

    taxAmount: 25,

    totalAmount: 1175,

    currency: "USD",

    itineraries: [
      {
        dayNumber: 1,
        title: "Arrival in Kandy",
        description: "Meet the guide in Kandy.",
      },
    ],

    inclusions: ["Guide service"],

    exclusions: ["International airfare"],
  });

  const sent = await quotationsService.sendQuotation(draft.id);

  return {
    tourRequestId: tourRequest.id,
    quotationId: sent.id,
    quotationNumber: sent.quotationNumber,
  };
}

/**
 * =========================================================
 * Scenario
 * =========================================================
 */

async function scenarioPrivacySet() {
  const uniqueSuffix = createUniqueSuffix();

  const tourist = await getTourist();

  const guide = await createDedicatedGuide(uniqueSuffix);

  if (!guide.email || !guide.phone) {
    throw new Error("The dedicated guide must have both an email and a phone.");
  }

  const main = await createRequestWithSentQuotation({
    tourist,
    guide,
    label: `Main ${uniqueSuffix}`,
  });

  const toAccept = await createRequestWithSentQuotation({
    tourist,
    guide,
    label: `Accept ${uniqueSuffix}`,
  });

  const toReject = await createRequestWithSentQuotation({
    tourist,
    guide,
    label: `Reject ${uniqueSuffix}`,
  });

  /**
   * Keep one-off fixture guides out of the public guide list and
   * the admin assignment choices. Existing quotations and
   * requests still reference the guide, which is all the privacy
   * tests need.
   */
  await prisma.tourGuideProfile.update({
    where: {
      id: guide.id,
    },

    data: {
      isAvailable: false,
    },
  });

  return {
    scenario: "privacy-set",
    guide,
    main,
    toAccept,
    toReject,
  };
}

/**
 * The repository lookups are fail-closed: calling them WITHOUT a
 * view must never load the guide's email or phone. Reports, per
 * call, whether the guide's real email/phone appear anywhere in
 * the serialized result, plus the exact guide-user keys.
 */
async function scenarioRepositoryDefaultView() {
  const fixture = await scenarioPrivacySet();

  const { guide, main } = fixture;

  const inspect = (record, pickGuideUser) => {
    const serialized = JSON.stringify(record);

    return {
      containsEmail: serialized.includes(guide.email),
      containsPhone: serialized.includes(guide.phone),
      guideUserKeys: Object.keys(pickGuideUser(record)).sort(),
    };
  };

  const quotationGuideUser = (quotation) => quotation.guide.user;

  const preferredGuideUser = (tourRequest) => tourRequest.preferredGuide.user;

  const rejectsView = async (lookup) => {
    try {
      await lookup();

      return false;
    } catch {
      return true;
    }
  };

  return {
    scenario: "repository-default-view",

    quotation: {
      omitted: inspect(
        await quotationsRepository.findQuotationById(main.quotationId),
        quotationGuideUser,
      ),
      emptyOptions: inspect(
        await quotationsRepository.findQuotationById(main.quotationId, {}),
        quotationGuideUser,
      ),
      tourist: inspect(
        await quotationsRepository.findQuotationById(main.quotationId, {
          view: "tourist",
        }),
        quotationGuideUser,
      ),
      admin: inspect(
        await quotationsRepository.findQuotationById(main.quotationId, {
          view: "admin",
        }),
        quotationGuideUser,
      ),
      rejectsInheritedName: await rejectsView(() =>
        quotationsRepository.findQuotationById(main.quotationId, {
          view: "constructor",
        }),
      ),
      rejectsUnknownName: await rejectsView(() =>
        quotationsRepository.findQuotationById(main.quotationId, {
          view: "superuser",
        }),
      ),
    },

    tourRequest: {
      omitted: inspect(
        await tourRequestsRepository.findTourRequestById(main.tourRequestId),
        preferredGuideUser,
      ),
      emptyOptions: inspect(
        await tourRequestsRepository.findTourRequestById(main.tourRequestId, {}),
        preferredGuideUser,
      ),
      tourist: inspect(
        await tourRequestsRepository.findTourRequestById(main.tourRequestId, {
          view: "tourist",
        }),
        preferredGuideUser,
      ),
      admin: inspect(
        await tourRequestsRepository.findTourRequestById(main.tourRequestId, {
          view: "admin",
        }),
        preferredGuideUser,
      ),
      rejectsInheritedName: await rejectsView(() =>
        tourRequestsRepository.findTourRequestById(main.tourRequestId, {
          view: "__proto__",
        }),
      ),
      rejectsUnknownName: await rejectsView(() =>
        tourRequestsRepository.findTourRequestById(main.tourRequestId, {
          view: "superuser",
        }),
      ),
    },
  };
}

/**
 * =========================================================
 * Dispatch
 * =========================================================
 */

const SCENARIOS = {
  "privacy-set": scenarioPrivacySet,

  "repository-default-view": scenarioRepositoryDefaultView,
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
      "Unable to prepare guide privacy E2E fixture:",
      error instanceof Error ? error.message : error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
