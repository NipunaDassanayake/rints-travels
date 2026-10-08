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
  console.error("Quotation integrity fixtures only run against a local database.");

  process.exit(1);
}

const prisma = require("../src/config/prisma");

const quotationsService = require("../src/modules/quotations/quotations.service");

const quotationsRepository = require("../src/modules/quotations/quotations.repository");

/**
 * =========================================================
 * Configuration / Helpers
 * =========================================================
 */

// A throwaway e2e-*@travora.com tourist, required (CR-032 Stage 3A).
const { requireFixtureAccountEmail } = require("./lib/e2e-guards");

const TOURIST_EMAIL = requireFixtureAccountEmail("E2E_TOURIST_EMAIL", "Quotation integrity E2E fixture");

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

async function createRequestUnderDiscussion(uniqueSuffix, dates) {
  const tourist = await getTourist();

  const tourRequest = await prisma.tourRequest.create({
    data: {
      touristId: tourist.id,

      requestType: "CUSTOM",

      title: `E2E Quotation Integrity ${uniqueSuffix}`,

      preferredStartDate: dates.startDate,

      preferredEndDate: dates.endDate,

      adultCount: 2,

      childCount: 1,

      destinationPreferences: "Kandy, Ella and Galle",

      budget: "1500.00",

      currency: "USD",

      specialRequirements: "Automated Playwright quotation integrity fixture.",

      contactMethod: "EMAIL",

      status: "UNDER_DISCUSSION",
    },
  });

  return {
    tourist,
    tourRequest,
  };
}

/**
 * A complete, price-consistent quotation payload with child
 * data on every collection, so tests can prove nothing is lost.
 */
function quotationPayload(label, dates) {
  const validUntil = new Date();

  validUntil.setUTCDate(validUntil.getUTCDate() + 60);

  return {
    title: `Quotation Integrity ${label}`,

    description: "Quotation integrity fixture description.",

    startDate: dates.startDate,

    endDate: dates.endDate,

    adultCount: 2,

    childCount: 1,

    subtotal: 1200,

    discountAmount: 50,

    taxAmount: 25,

    totalAmount: 1175,

    currency: "LKR",

    notes: "Fixture notes.",

    termsConditions: "Fixture terms.",

    validUntil,

    itineraries: [
      {
        dayNumber: 1,
        title: "Arrival in Kandy",
        description: "Temple of the Tooth and lake walk.",
      },
      {
        dayNumber: 2,
        title: "Train to Ella",
        description: "Scenic hill-country train journey.",
      },
    ],

    inclusions: ["Private transport", "Guide service"],

    exclusions: ["International airfare"],
  };
}

function summarize(quotation) {
  return {
    id: quotation.id,
    quotationNumber: quotation.quotationNumber,
    status: quotation.status,
  };
}

function describeError(error) {
  return {
    name: error.constructor?.name,
    statusCode: error.statusCode ?? null,
    message: error.message,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Settles a promise into a plain result object and records when
 * it settled, so a scenario can prove an operation was still
 * blocked at a given moment.
 */
function track(promise) {
  const state = {
    settled: false,
  };

  state.result = promise.then(
    (value) => {
      state.settled = true;

      return {
        status: "fulfilled",
        value,
      };
    },
    (error) => {
      state.settled = true;

      return {
        status: "rejected",
        error: describeError(error),
      };
    },
  );

  return state;
}

/**
 * =========================================================
 * Transaction Interception (in-process only)
 * =========================================================
 *
 * Wraps prisma.$transaction for THIS script's process so a
 * scenario can pause or fail a specific model call inside a
 * specific interactive transaction (numbered in call order).
 * The repository under test is unchanged; it receives a
 * proxied transaction client.
 */

function wrapTransactionClient(tx, hooks) {
  return new Proxy(tx, {
    get(target, model) {
      const delegate = Reflect.get(target, model);

      const modelHooks = hooks[model];

      if (!modelHooks) {
        return delegate;
      }

      return new Proxy(delegate, {
        get(modelDelegate, method) {
          const fn = Reflect.get(modelDelegate, method);

          if (typeof fn !== "function") {
            return fn;
          }

          const hook = modelHooks[method];

          if (!hook) {
            return fn.bind(modelDelegate);
          }

          return (...args) => hook(() => fn.apply(modelDelegate, args));
        },
      });
    },
  });
}

function interceptTransactions(hooksForCall) {
  const original = prisma.$transaction;

  let callIndex = 0;

  prisma.$transaction = function interceptedTransaction(arg, options) {
    if (typeof arg !== "function") {
      return original.call(prisma, arg, options);
    }

    const hooks = hooksForCall(callIndex) ?? {};

    callIndex += 1;

    return original.call(
      prisma,
      (tx) => arg(wrapTransactionClient(tx, hooks)),
      options,
    );
  };

  return () => {
    prisma.$transaction = original;
  };
}

async function snapshotQuotation(id) {
  const quotation = await quotationsRepository.findQuotationById(id);

  return {
    title: quotation.title,
    subtotal: quotation.subtotal.toString(),
    discountAmount: quotation.discountAmount.toString(),
    taxAmount: quotation.taxAmount.toString(),
    totalAmount: quotation.totalAmount.toString(),
    consistent: quotation.subtotal
      .minus(quotation.discountAmount)
      .plus(quotation.taxAmount)
      .equals(quotation.totalAmount),
    updatedAt: quotation.updatedAt.toISOString(),
    itineraries: quotation.itineraries.map((item) => item.title),
    inclusions: quotation.inclusions.map((item) => item.title).sort(),
    exclusions: quotation.exclusions.map((item) => item.title).sort(),
  };
}

/**
 * =========================================================
 * Scenarios
 * =========================================================
 */

async function scenarioDraftQuotation() {
  const uniqueSuffix = createUniqueSuffix();

  const dates = createTravelDates();

  const { tourRequest } = await createRequestUnderDiscussion(uniqueSuffix, dates);

  const draft = await quotationsService.createQuotation(
    tourRequest.id,
    quotationPayload(`Draft ${uniqueSuffix}`, dates),
  );

  // The spec's own throwaway guide (CR-032 Stage 3A) -- never
  // whichever real guide happens to be available.
  const availableGuide = await prisma.tourGuideProfile.findFirst({
    where: {
      isAvailable: true,
      deletedAt: null,
      user: {
        email: requireFixtureAccountEmail("E2E_GUIDE_EMAIL", "Quotation integrity E2E fixture"),
        status: "ACTIVE",
      },
    },
  });

  return {
    scenario: "draft-quotation",
    tourRequestId: tourRequest.id,
    quotation: summarize(draft),
    title: draft.title,
    availableGuideId: availableGuide ? availableGuide.id : null,
  };
}

async function scenarioSentQuotation() {
  const uniqueSuffix = createUniqueSuffix();

  const dates = createTravelDates();

  const { tourRequest } = await createRequestUnderDiscussion(uniqueSuffix, dates);

  const draft = await quotationsService.createQuotation(
    tourRequest.id,
    quotationPayload(`Sent ${uniqueSuffix}`, dates),
  );

  const sent = await quotationsService.sendQuotation(draft.id);

  return {
    scenario: "sent-quotation",
    tourRequestId: tourRequest.id,
    quotation: summarize(sent),
  };
}

/**
 * Two requests covering every visibility case, all produced by
 * the real service layer:
 *
 * Request 1: sentThenSuperseded (SUPERSEDED, sent), revisionDraft
 *            (DRAFT), siblingDraft (DRAFT).
 * Request 2: accepted (ACCEPTED), neverSentSuperseded (a DRAFT
 *            superseded by the acceptance, never sent).
 */
async function scenarioVisibilitySet() {
  const uniqueSuffix = createUniqueSuffix();

  const dates1 = createTravelDates();

  const { tourist, tourRequest: request1 } = await createRequestUnderDiscussion(
    `${uniqueSuffix}-A`,
    dates1,
  );

  const sentSource = await quotationsService.createQuotation(
    request1.id,
    quotationPayload(`Visible ${uniqueSuffix}`, dates1),
  );

  const siblingDraft = await quotationsService.createQuotation(
    request1.id,
    quotationPayload(`Sibling ${uniqueSuffix}`, dates1),
  );

  await quotationsService.sendQuotation(sentSource.id);

  const revisionDraft = await quotationsService.createRevision(sentSource.id, {});

  const dates2 = createTravelDates();

  const { tourRequest: request2 } = await createRequestUnderDiscussion(
    `${uniqueSuffix}-B`,
    dates2,
  );

  const toAccept = await quotationsService.createQuotation(
    request2.id,
    quotationPayload(`Accepted ${uniqueSuffix}`, dates2),
  );

  const unsentDraft = await quotationsService.createQuotation(
    request2.id,
    quotationPayload(`Unsent ${uniqueSuffix}`, dates2),
  );

  await quotationsService.sendQuotation(toAccept.id);

  await quotationsService.acceptQuotation(toAccept.id, tourist.id);

  const reload = async (id) =>
    summarize(await quotationsRepository.findQuotationById(id));

  return {
    scenario: "visibility-set",
    request1Id: request1.id,
    request2Id: request2.id,
    visible: {
      sentThenSuperseded: await reload(sentSource.id),
      accepted: await reload(toAccept.id),
    },
    hidden: {
      revisionDraft: await reload(revisionDraft.id),
      siblingDraft: await reload(siblingDraft.id),
      neverSentSuperseded: await reload(unsentDraft.id),
    },
  };
}

/**
 * Deterministic edit-vs-send race: the quotation is read as
 * DRAFT by updateQuotation, then sent before the conditional
 * write runs. The edit must lose without modifying anything.
 */
async function scenarioEditSendRace() {
  const draftFixture = await scenarioDraftQuotation();

  const quotationId = draftFixture.quotation.id;

  const originalUpdate = quotationsRepository.updateDraftQuotationTransaction;

  quotationsRepository.updateDraftQuotationTransaction = async (args) => {
    await quotationsService.sendQuotation(quotationId);

    return originalUpdate(args);
  };

  let error = null;

  try {
    await quotationsService.updateQuotation(quotationId, {
      title: "Title written after the quotation was sent",
      inclusions: ["Should never be written"],
    });
  } catch (caught) {
    error = {
      name: caught.constructor?.name,
      statusCode: caught.statusCode ?? null,
      message: caught.message,
    };
  } finally {
    quotationsRepository.updateDraftQuotationTransaction = originalUpdate;
  }

  const final = await quotationsRepository.findQuotationById(quotationId);

  return {
    scenario: "edit-send-race",
    error,
    finalStatus: final.status,
    titleUnchanged: final.title === draftFixture.title,
    inclusions: final.inclusions.map((item) => item.title).sort(),
  };
}

/**
 * Two genuinely overlapping draft edits. Edit A takes the row
 * lock and pauses inside its transaction; edit B is then started
 * and its UPDATE blocks on A's lock. Only after B is proven to be
 * blocked is A allowed to commit.
 *
 * Stored pricing: 1200 - 50 + 25 = 1175.
 * - conflicting: A = {discount 60, total 1165}, B = {tax 35,
 *   total 1185}. Each is valid against the original row, but
 *   together they are not -- B must be rejected.
 * - compatible:  A = {title}, B = {discount 60, total 1165}.
 *   Both must succeed and both changes must persist.
 */
async function runOverlappingEdits(editA, editB) {
  const draftFixture = await scenarioDraftQuotation();

  const quotationId = draftFixture.quotation.id;

  let signalALocked;

  const aLocked = new Promise((resolve) => {
    signalALocked = resolve;
  });

  let releaseA;

  const aReleased = new Promise((resolve) => {
    releaseA = resolve;
  });

  let signalBIssued;

  const bIssued = new Promise((resolve) => {
    signalBIssued = resolve;
  });

  const restore = interceptTransactions((index) => ({
    tourQuotation: {
      updateMany:
        index === 0
          ? async (run) => {
              const result = await run();

              signalALocked();

              await aReleased;

              return result;
            }
          : async (run) => {
              signalBIssued();

              return run();
            },
    },
  }));

  let bBlockedWhileALocked = false;

  let a;

  let b;

  try {
    a = track(quotationsService.updateQuotation(quotationId, editA));

    await aLocked;

    b = track(quotationsService.updateQuotation(quotationId, editB));

    await bIssued;

    // Give B's UPDATE time to reach PostgreSQL and block.
    await sleep(750);

    bBlockedWhileALocked = !b.settled;

    releaseA();
  } finally {
    // Never leave A paused, even if the setup above failed.
    releaseA();
  }

  const [resultA, resultB] = await Promise.all([a.result, b.result]);

  restore();

  return {
    quotationId,
    bBlockedWhileALocked,
    editA: {
      status: resultA.status,
      error: resultA.error ?? null,
    },
    editB: {
      status: resultB.status,
      error: resultB.error ?? null,
    },
    final: await snapshotQuotation(quotationId),
  };
}

async function scenarioConcurrentDraftEdits() {
  const conflicting = await runOverlappingEdits(
    {
      discountAmount: 60,
      totalAmount: 1165,
    },
    {
      taxAmount: 35,
      totalAmount: 1185,
    },
  );

  const compatible = await runOverlappingEdits(
    {
      title: "Concurrent edit A title",
    },
    {
      discountAmount: 60,
      totalAmount: 1165,
    },
  );

  return {
    scenario: "concurrent-draft-edits",
    conflicting,
    compatible,
  };
}

/**
 * A failure while replacing child rows (the last collection,
 * after scalars, itinerary and inclusions were already written
 * in the transaction) must roll back the entire edit.
 */
async function scenarioChildReplacementRollback() {
  const draftFixture = await scenarioDraftQuotation();

  const quotationId = draftFixture.quotation.id;

  const before = await snapshotQuotation(quotationId);

  const restore = interceptTransactions(() => ({
    quotationExclusion: {
      createMany: async () => {
        throw new Error("Injected failure while replacing exclusions");
      },
    },
  }));

  let error = null;

  try {
    await quotationsService.updateQuotation(quotationId, {
      title: "Title that must be rolled back",
      discountAmount: 60,
      totalAmount: 1165,
      itineraries: [
        {
          dayNumber: 1,
          title: "Itinerary that must be rolled back",
          description: "This itinerary must never be committed.",
        },
      ],
      inclusions: ["Inclusion that must be rolled back"],
      exclusions: ["Exclusion that fails to insert"],
    });
  } catch (caught) {
    error = describeError(caught);
  } finally {
    restore();
  }

  return {
    scenario: "child-replacement-rollback",
    error,
    before,
    after: await snapshotQuotation(quotationId),
  };
}

/**
 * =========================================================
 * Dispatch
 * =========================================================
 */

const SCENARIOS = {
  "draft-quotation": scenarioDraftQuotation,

  "sent-quotation": scenarioSentQuotation,

  "visibility-set": scenarioVisibilitySet,

  "edit-send-race": scenarioEditSendRace,

  "concurrent-draft-edits": scenarioConcurrentDraftEdits,

  "child-replacement-rollback": scenarioChildReplacementRollback,
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
      "Unable to prepare quotation integrity E2E fixture:",
      error instanceof Error ? error.message : error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
