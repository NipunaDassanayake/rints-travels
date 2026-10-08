/**
 * =========================================================
 * E2E Reliability Test Helpers (CR-018)
 * =========================================================
 *
 * Scenarios used by frontend/tests/e2e/e2e-reliability.spec.ts
 * to prove that the cleanup script is identity-scoped and that
 * guide-window allocation never collides.
 *
 *   create-sentinel            account OUTSIDE every cleanup pattern
 *   create-in-scope-probe      e2e-*@travora.com account (cleanup target)
 *   create-foreign-link        fixture guide referenced by sentinel data
 *   create-remove-guard-target e2e-*@travora.com account that `remove`
 *                              must REFUSE (not a helper pattern; the
 *                              regular cleanup removes it)
 *   status <id> [<id> ...]     does each user still exist + request count
 *   remove <id> [<id> ...]     delete helper-created users and their data
 *                              -- ONLY accounts matching REMOVABLE_EMAIL_PATTERNS
 *   allocation-check           allocate a window for the fixture guide
 *                              (E2E_GUIDE_EMAIL, a throwaway e2e-guide-*) and
 *                              confirm the real conflict query finds none
 */

const crypto = require("crypto");

const {
  loadBackendEnv,
  assertSafeE2EEnvironment,
  requireFixtureAccountEmail,
} = require("./lib/e2e-guards");

loadBackendEnv();

assertSafeE2EEnvironment("E2E reliability helpers");

const prisma = require("../src/config/prisma");

const bookingsRepository = require("../src/modules/bookings/bookings.repository");

const { allocateGuideWindow } = require("./lib/guide-window");

/**
 * The only accounts `remove` may delete: exactly the ones this
 * helper creates. Anything else is rejected before any deletion.
 */
const REMOVABLE_EMAIL_PATTERNS = Object.freeze([
  /^cr018-(sentinel|link-owner)-[0-9a-z-]+@sentinel\.local$/,
  /^cr018-link-guide-[0-9a-z-]+@e2e\.travora\.test$/,
  /^e2e-cleanup-probe-[0-9a-z-]+@travora\.com$/,
]);

class RemoveGuardError extends Error {}

function suffix() {
  return `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

async function createTouristWithRequest(email, { preferredGuideId = null } = {}) {
  const user = await prisma.user.create({
    data: {
      firstName: "CR018",
      lastName: "Helper",
      email,
      role: "TOURIST",
      provider: "LOCAL",
      status: "ACTIVE",
      isEmailVerified: true,
    },
  });

  const startDate = new Date(Date.UTC(2040, 0, 1));

  await prisma.tourRequest.create({
    data: {
      touristId: user.id,
      requestType: "CUSTOM",
      title: `CR-018 helper request ${email}`,
      preferredStartDate: startDate,
      preferredEndDate: new Date(Date.UTC(2040, 0, 6)),
      adultCount: 1,
      childCount: 0,
      destinationPreferences: "Kandy",
      currency: "USD",
      contactMethod: "EMAIL",
      preferredGuideId,
      status: "PENDING_REVIEW",
    },
  });

  return user;
}

async function createSentinel() {
  // Deliberately matches NO cleanup pattern.
  const user = await createTouristWithRequest(`cr018-sentinel-${suffix()}@sentinel.local`);

  return {
    userIds: [user.id],
    email: user.email,
  };
}

async function createInScopeProbe() {
  const user = await createTouristWithRequest(
    `e2e-cleanup-probe-${suffix()}@travora.com`,
  );

  return {
    userIds: [user.id],
  };
}

/**
 * A fixture-pattern guide (*@e2e.travora.test) referenced as the
 * preferred guide of a request owned by an OUT-of-scope account.
 * Deleting the guide would SET NULL that reference, so cleanup
 * must abort without deleting anything.
 */
async function createForeignLink() {
  const guideUser = await prisma.user.create({
    data: {
      firstName: "CR018",
      lastName: "LinkGuide",
      email: `cr018-link-guide-${suffix()}@e2e.travora.test`,
      role: "TOUR_GUIDE",
      provider: "LOCAL",
      status: "ACTIVE",
      isEmailVerified: true,
      tourGuideProfile: {
        create: {
          languages: ["English"],
          specializations: ["Testing"],
          isAvailable: false,
        },
      },
    },

    include: {
      tourGuideProfile: true,
    },
  });

  const sentinel = await createTouristWithRequest(
    `cr018-link-owner-${suffix()}@sentinel.local`,
    {
      preferredGuideId: guideUser.tourGuideProfile.id,
    },
  );

  return {
    userIds: [sentinel.id, guideUser.id],
  };
}

/**
 * In the regular cleanup scope (e2e-*@travora.com) but NOT a
 * `remove` pattern: used to prove `remove` refuses it.
 */
async function createRemoveGuardTarget() {
  const user = await createTouristWithRequest(
    `e2e-remove-guard-target-${suffix()}@travora.com`,
  );

  return {
    userIds: [user.id],
  };
}

async function status(userIds) {
  return Promise.all(
    userIds.map(async (id) => ({
      id,
      exists: Boolean(await prisma.user.findUnique({ where: { id } })),
      tourRequests: await prisma.tourRequest.count({ where: { touristId: id } }),
    })),
  );
}

async function remove(userIds) {
  if (userIds.length === 0) {
    throw new RemoveGuardError("remove requires at least one user id.");
  }

  await prisma.$transaction(async (tx) => {
    // Guard first, inside the transaction: every id must resolve
    // to a helper-created account, or nothing is deleted.
    const users = await tx.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },

      select: {
        id: true,
        email: true,
      },
    });

    const unknownIds = userIds.filter(
      (id) => !users.some((user) => user.id === id),
    );

    const protectedUsers = users.filter(
      (user) => !REMOVABLE_EMAIL_PATTERNS.some((pattern) => pattern.test(user.email)),
    );

    if (unknownIds.length > 0 || protectedUsers.length > 0) {
      throw new RemoveGuardError(
        `remove refused: ${unknownIds.length} unknown id(s) and ${protectedUsers.length} account(s) not created by this helper. Nothing was deleted.`,
      );
    }

    // Sentinel requests first (they may reference helper guides).
    await tx.tourRequest.deleteMany({
      where: {
        touristId: {
          in: userIds,
        },
      },
    });

    await tx.tourGuideProfile.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await tx.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });
  });

  return status(userIds);
}

async function allocationCheck() {
  // A throwaway fixture guide, required (CR-032 Stage 3A).
  const GUIDE_EMAIL = requireFixtureAccountEmail("E2E_GUIDE_EMAIL", "E2E reliability helpers");

  const guide = await prisma.tourGuideProfile.findFirst({
    where: {
      user: {
        email: GUIDE_EMAIL,
      },
    },
  });

  if (!guide) {
    throw new Error(`E2E guide "${GUIDE_EMAIL}" was not found.`);
  }

  const activeBookings = await prisma.booking.count({
    where: {
      status: {
        in: ["CONFIRMED", "IN_PROGRESS"],
      },

      quotation: {
        guideId: guide.id,
      },
    },
  });

  const window = await allocateGuideWindow(prisma, {
    guideId: guide.id,
    spanDays: 5,
  });

  // The exact query bookings.service uses to reject assignment.
  const conflict = await bookingsRepository.findGuideBookingConflict({
    guideId: guide.id,
    startDate: window.startDate,
    endDate: window.endDate,
  });

  return {
    activeBookings,
    startDate: window.startDate.toISOString(),
    endDate: window.endDate.toISOString(),
    conflictFound: Boolean(conflict),
  };
}

const SCENARIOS = {
  "create-sentinel": () => createSentinel(),
  "create-in-scope-probe": () => createInScopeProbe(),
  "create-foreign-link": () => createForeignLink(),
  "create-remove-guard-target": () => createRemoveGuardTarget(),
  status: (ids) => status(ids),
  remove: (ids) => remove(ids),
  "allocation-check": () => allocationCheck(),
};

async function main() {
  const [scenario, ...args] = process.argv.slice(2);

  const handler = SCENARIOS[scenario];

  if (!handler) {
    throw new Error(
      `Unknown scenario "${scenario}". Expected one of: ${Object.keys(SCENARIOS).join(", ")}.`,
    );
  }

  const result = await handler(args);

  console.log(`E2E_FIXTURE_JSON=${JSON.stringify(result)}`);
}

main()
  .catch((error) => {
    console.error(
      "E2E reliability helper failed:",
      error instanceof Error ? error.message : error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
