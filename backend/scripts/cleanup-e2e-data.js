/**
 * =========================================================
 * E2E Test-Data Cleanup (CR-018)
 * =========================================================
 *
 * Deletes data created by the automated E2E suite, identified
 * strictly by ACCOUNT IDENTITY (never by time):
 *
 * 1. Everything owned by the dedicated E2E tourist account(s)
 *    in the FIXED allow-list below (E2E_CLEANUP_TOURIST_ALLOWLIST)
 *    -- the accounts themselves are kept. There is deliberately
 *    no environment override: E2E_TOURIST_EMAIL (which the specs
 *    log in with) can never widen the scope. If it names an
 *    account outside the allow-list, cleanup refuses to run.
 *    The list is currently EMPTY (CR-032): nipuna@example.com
 *    now holds user-owned manual development data and must never
 *    be cleaned. Specs that need a tourist create a throwaway
 *    e2e-*@travora.com account (scope 2) instead.
 * 2. TOURIST / TOUR_GUIDE accounts created by the suite, and
 *    their data / guide profiles:
 *      - e2e-*@travora.com   (registration.spec.ts,
 *        tour-request-lifecycle.spec.ts,
 *        admin-guide-management.spec.ts)
 *      - *@e2e.travora.test  (fixture guides, CR-009)
 *    ADMIN / SYSTEM_ADMIN accounts are never matched.
 * 3. Stripe webhook ledger rows created by signed test events
 *    (evt_test_e2e_*).
 *
 * Every other account and its data (admins, the shared E2E
 * guide account, manually created accounts) is never deleted.
 * If any row in scope is linked to data OUTSIDE the scope, the
 * script aborts without deleting anything.
 *
 * Usage:
 *   node scripts/cleanup-e2e-data.js --dry-run [--json]
 *   node scripts/cleanup-e2e-data.js [--json]
 *
 * After a test batch (CR-032 Stage 3A), from backend/:
 *   npm run e2e:cleanup:dry-run   show exactly what would be deleted
 *   npm run e2e:cleanup           delete it (one transaction)
 * Playwright global setup still runs the same cleanup before each
 * run; no spec has to be run just to trigger it.
 */

const {
  loadBackendEnv,
  assertSafeE2EEnvironment,
} = require("./lib/e2e-guards");

loadBackendEnv();

assertSafeE2EEnvironment("E2E data cleanup");

const prisma = require("../src/config/prisma");

const DRY_RUN = process.argv.includes("--dry-run");

const JSON_OUTPUT = process.argv.includes("--json");

/**
 * The ONLY pre-existing tourist accounts whose data may be
 * deleted. Changing this list is a code change (reviewed and
 * committed), never a configuration change.
 *
 * Empty since CR-032: nipuna@example.com (previously listed) now
 * holds user-owned manual data. Specs still logging in as that
 * account leave their data behind until they move to throwaway
 * fixture accounts.
 */
const E2E_CLEANUP_TOURIST_ALLOWLIST = Object.freeze([]);

class CleanupConfigurationError extends Error {}

/**
 * E2E_TOURIST_EMAIL is only validated here, never used to build
 * the scope: a run configured to log in as a non-allow-listed
 * account must not silently clean a different one either.
 */
function assertConfiguredTouristIsAllowListed() {
  const configured = (process.env.E2E_TOURIST_EMAIL ?? "").trim().toLowerCase();

  if (configured && !E2E_CLEANUP_TOURIST_ALLOWLIST.includes(configured)) {
    throw new CleanupConfigurationError(
      "E2E_TOURIST_EMAIL is not in the E2E cleanup allow-list; refusing to run cleanup.",
    );
  }
}

/**
 * Accounts the suite creates for itself. Restricted to the
 * TOURIST and TOUR_GUIDE roles in every query below.
 */
const CREATED_ACCOUNT_EMAIL_FILTERS = [
  {
    AND: [
      {
        email: {
          startsWith: "e2e-",
        },
      },
      {
        email: {
          endsWith: "@travora.com",
        },
      },
    ],
  },
  {
    email: {
      endsWith: "@e2e.travora.test",
    },
  },
];

const WEBHOOK_EVENT_PREFIX = "evt_test_e2e_";

class OutOfScopeLinkError extends Error {}

const ids = (rows) => rows.map((row) => row.id);

/**
 * =========================================================
 * Scope Resolution
 * =========================================================
 */

async function resolveScope(db) {
  const keptTourists = await db.user.findMany({
    where: {
      email: {
        in: [...E2E_CLEANUP_TOURIST_ALLOWLIST],
      },
    },

    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  for (const tourist of keptTourists) {
    if (tourist.role !== "TOURIST") {
      throw new OutOfScopeLinkError(
        `Configured E2E tourist ${tourist.email} is not a TOURIST account.`,
      );
    }
  }

  const createdTourists = await db.user.findMany({
    where: {
      role: "TOURIST",

      OR: CREATED_ACCOUNT_EMAIL_FILTERS,
    },

    select: {
      id: true,
    },
  });

  const createdGuides = await db.user.findMany({
    where: {
      role: "TOUR_GUIDE",

      OR: CREATED_ACCOUNT_EMAIL_FILTERS,
    },

    select: {
      id: true,

      tourGuideProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  const touristIds = [...ids(keptTourists), ...ids(createdTourists)];

  const deletedUserIds = [...ids(createdTourists), ...ids(createdGuides)];

  const fixtureGuideProfileIds = createdGuides
    .map((user) => user.tourGuideProfile?.id)
    .filter(Boolean);

  const requestIds = ids(
    await db.tourRequest.findMany({
      where: {
        touristId: {
          in: touristIds,
        },
      },

      select: {
        id: true,
      },
    }),
  );

  const quotationIds = ids(
    await db.tourQuotation.findMany({
      where: {
        tourRequestId: {
          in: requestIds,
        },
      },

      select: {
        id: true,
      },
    }),
  );

  const payments = await db.payment.findMany({
    where: {
      OR: [
        {
          touristId: {
            in: touristIds,
          },
        },
        {
          quotationId: {
            in: quotationIds,
          },
        },
      ],
    },

    select: {
      id: true,
      touristId: true,
    },
  });

  const bookings = await db.booking.findMany({
    where: {
      OR: [
        {
          touristId: {
            in: touristIds,
          },
        },
        {
          tourRequestId: {
            in: requestIds,
          },
        },
        {
          paymentId: {
            in: ids(payments),
          },
        },
      ],
    },

    select: {
      id: true,
      touristId: true,
    },
  });

  const reviews = await db.guideReview.findMany({
    where: {
      OR: [
        {
          bookingId: {
            in: ids(bookings),
          },
        },
        {
          touristId: {
            in: touristIds,
          },
        },
        {
          guideId: {
            in: fixtureGuideProfileIds,
          },
        },
      ],
    },

    select: {
      id: true,
      touristId: true,
      guideId: true,
    },
  });

  /**
   * -------------------------------------------------------
   * Out-of-scope link checks (abort, never partially delete)
   * -------------------------------------------------------
   */

  const inTouristScope = (touristId) => touristIds.includes(touristId);

  const foreignPayment = payments.find((row) => !inTouristScope(row.touristId));

  const foreignBooking = bookings.find((row) => !inTouristScope(row.touristId));

  const foreignReview = reviews.find((row) => !inTouristScope(row.touristId));

  if (foreignPayment || foreignBooking || foreignReview) {
    throw new OutOfScopeLinkError(
      "In-scope records are linked to a payment, booking or review owned by an account outside the cleanup scope.",
    );
  }

  // Deleting a fixture guide would SET NULL these references on
  // data outside the scope -- refuse instead of modifying it.
  const foreignGuideReferences =
    (await db.tourQuotation.count({
      where: {
        guideId: {
          in: fixtureGuideProfileIds,
        },

        id: {
          notIn: quotationIds,
        },
      },
    })) +
    (await db.tourRequest.count({
      where: {
        preferredGuideId: {
          in: fixtureGuideProfileIds,
        },

        id: {
          notIn: requestIds,
        },
      },
    }));

  if (foreignGuideReferences > 0) {
    throw new OutOfScopeLinkError(
      "A fixture guide is referenced by a quotation or tour request outside the cleanup scope.",
    );
  }

  const webhookEventCount = await db.stripeWebhookEvent.count({
    where: {
      id: {
        startsWith: WEBHOOK_EVENT_PREFIX,
      },
    },
  });

  // Guides that keep existing but lose reviews need their cached
  // rating aggregate recalculated.
  const affectedGuideIds = [
    ...new Set(
      reviews
        .map((review) => review.guideId)
        .filter((guideId) => !fixtureGuideProfileIds.includes(guideId)),
    ),
  ];

  return {
    keptTouristEmails: keptTourists.map((tourist) => tourist.email),
    touristIds,
    deletedUserIds,
    fixtureGuideProfileIds,
    requestIds,
    quotationIds,
    paymentIds: ids(payments),
    bookingIds: ids(bookings),
    reviewIds: ids(reviews),
    webhookEventCount,
    affectedGuideIds,
  };
}

function summarize(scope) {
  return {
    keptTouristAccounts: scope.keptTouristEmails.length,
    createdTouristAccounts: scope.touristIds.length - scope.keptTouristEmails.length,
    createdGuideAccounts: scope.fixtureGuideProfileIds.length,
    reviews: scope.reviewIds.length,
    bookings: scope.bookingIds.length,
    payments: scope.paymentIds.length,
    quotations: scope.quotationIds.length,
    tourRequests: scope.requestIds.length,
    fixtureGuideProfiles: scope.fixtureGuideProfileIds.length,
    deletedUsers: scope.deletedUserIds.length,
    webhookLedgerRows: scope.webhookEventCount,
    guideRatingsRecalculated: scope.affectedGuideIds.length,
  };
}

/**
 * =========================================================
 * Deletion (single transaction, FK-safe order)
 * =========================================================
 */

async function deleteScope(tx, scope) {
  await tx.guideReview.deleteMany({
    where: {
      id: {
        in: scope.reviewIds,
      },
    },
  });

  await tx.booking.deleteMany({
    where: {
      id: {
        in: scope.bookingIds,
      },
    },
  });

  await tx.payment.deleteMany({
    where: {
      id: {
        in: scope.paymentIds,
      },
    },
  });

  // Quotation itinerary / inclusion / exclusion rows cascade.
  await tx.tourQuotation.deleteMany({
    where: {
      id: {
        in: scope.quotationIds,
      },
    },
  });

  await tx.tourRequest.deleteMany({
    where: {
      id: {
        in: scope.requestIds,
      },
    },
  });

  await tx.tourGuideProfile.deleteMany({
    where: {
      id: {
        in: scope.fixtureGuideProfileIds,
      },
    },
  });

  // Refresh / verification / reset tokens cascade.
  await tx.user.deleteMany({
    where: {
      id: {
        in: scope.deletedUserIds,
      },
    },
  });

  await tx.stripeWebhookEvent.deleteMany({
    where: {
      id: {
        startsWith: WEBHOOK_EVENT_PREFIX,
      },
    },
  });

  // Same aggregate as reviews.repository.createReviewTransaction.
  for (const guideId of scope.affectedGuideIds) {
    const stats = await tx.guideReview.aggregate({
      where: {
        guideId,
      },

      _avg: {
        rating: true,
      },

      _count: {
        _all: true,
      },
    });

    await tx.tourGuideProfile.update({
      where: {
        id: guideId,
      },

      data: {
        averageRating: stats._avg.rating ?? 0,

        totalReviews: stats._count._all,
      },
    });
  }
}

/**
 * =========================================================
 * Main
 * =========================================================
 */

async function main() {
  // Before any query: refuse outright if the run is configured
  // for a tourist outside the fixed allow-list.
  assertConfiguredTouristIsAllowListed();

  let summary;

  if (DRY_RUN) {
    summary = summarize(await resolveScope(prisma));
  } else {
    summary = await prisma.$transaction(
      async (tx) => {
        const scope = await resolveScope(tx);

        await deleteScope(tx, scope);

        return summarize(scope);
      },
      {
        timeout: 120_000,
        maxWait: 10_000,
      },
    );
  }

  const result = {
    mode: DRY_RUN ? "dry-run" : "deleted",
    ...summary,
  };

  if (JSON_OUTPUT) {
    console.log(`E2E_CLEANUP_JSON=${JSON.stringify(result)}`);
  } else {
    console.log(
      `E2E cleanup (${result.mode}):`,
      JSON.stringify(result, null, 2),
    );
  }
}

main()
  .catch((error) => {
    console.error(
      "E2E cleanup aborted -- nothing was deleted:",
      error instanceof Error ? error.message : error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
