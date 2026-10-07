/**
 * =========================================================
 * Auth Session Cleanup (CR-012)
 * =========================================================
 *
 * Deletes DEAD refresh_tokens rows only:
 *
 *   (revoked before the cutoff)
 *   OR (never revoked AND expired before the cutoff)
 *
 * where cutoff = database now() - retention (at least 7 days,
 * kept for refresh-token reuse forensics). An active session
 * (not revoked, not expired) can never match; that condition is
 * also enforced explicitly in every query.
 *
 * DRY RUN IS THE DEFAULT. Deleting requires the exact cutoff and
 * row count reported by a previous dry run; the deletion runs in
 * one transaction and rolls back unless exactly that many rows
 * are deleted. Output contains counts only (no ids, tokens or
 * emails).
 *
 * Usage:
 *   node scripts/cleanup-auth-sessions.js [--json] [--retention-days N]
 *   node scripts/cleanup-auth-sessions.js --execute \
 *        --cutoff <ISO from dry run> --expected-count <N from dry run> [--json]
 *
 * Test-only (dry run only): --only-user <id> restricts the report
 * to one E2E-created account (e2e-*@travora.com, TOURIST).
 */

const {
  loadBackendEnv,
  assertSafeE2EEnvironment,
} = require("./lib/e2e-guards");

loadBackendEnv();

assertSafeE2EEnvironment("Auth session cleanup");

const prisma = require("../src/config/prisma");

const MIN_RETENTION_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

class CleanupError extends Error {}

function readOption(name) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  const value = process.argv[index + 1];

  if (value === undefined || value.startsWith("--")) {
    throw new CleanupError(`${name} requires a value.`);
  }

  return value;
}

function parseArguments() {
  const execute = process.argv.includes("--execute");

  const retentionRaw = readOption("--retention-days");

  const retentionDays =
    retentionRaw === undefined ? MIN_RETENTION_DAYS : Number(retentionRaw);

  if (!Number.isInteger(retentionDays) || retentionDays < MIN_RETENTION_DAYS) {
    throw new CleanupError(
      `--retention-days must be an integer of at least ${MIN_RETENTION_DAYS}.`,
    );
  }

  const onlyUserId = readOption("--only-user");

  if (execute && onlyUserId) {
    throw new CleanupError("--only-user is only allowed in dry-run mode.");
  }

  let cutoff;
  let expectedCount;

  if (execute) {
    const cutoffRaw = readOption("--cutoff");

    const expectedRaw = readOption("--expected-count");

    if (!cutoffRaw || expectedRaw === undefined) {
      throw new CleanupError(
        "--execute requires --cutoff and --expected-count from a dry run.",
      );
    }

    cutoff = new Date(cutoffRaw);

    if (Number.isNaN(cutoff.getTime())) {
      throw new CleanupError("--cutoff is not a valid ISO timestamp.");
    }

    expectedCount = Number(expectedRaw);

    if (!Number.isInteger(expectedCount) || expectedCount < 0) {
      throw new CleanupError("--expected-count must be a non-negative integer.");
    }
  }

  return {
    execute,
    retentionDays,
    onlyUserId,
    cutoff,
    expectedCount,
    json: process.argv.includes("--json"),
  };
}

async function databaseNow(db) {
  const [row] = await db.$queryRaw`SELECT now() AS now`;

  return new Date(row.now);
}

/**
 * Never matches an active session, whatever the cutoff.
 */
function notActive(now) {
  return {
    NOT: {
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    },
  };
}

/**
 * A revoked row is judged by its revocation time only: logout-all
 * also stamps revokedAt on long-expired rows, and a revocation
 * inside the retention period keeps the row for forensics.
 */
function deletableWhere(cutoff, now, scope) {
  return {
    AND: [
      scope,
      {
        OR: [
          {
            revokedAt: {
              lt: cutoff,
            },
          },
          {
            revokedAt: null,
            expiresAt: {
              lt: cutoff,
            },
          },
        ],
      },
      notActive(now),
    ],
  };
}

async function report(db, cutoff, now, scope) {
  const count = (where) =>
    db.refreshToken.count({
      where: {
        AND: [scope, where],
      },
    });

  const [
    revokedPastRetention,
    expiredPastRetention,
    active,
    revokedWithinRetention,
    expiredWithinRetention,
    total,
  ] = await Promise.all([
    count({
      revokedAt: {
        lt: cutoff,
      },
    }),
    count({
      revokedAt: null,
      expiresAt: {
        lt: cutoff,
      },
    }),
    count({
      revokedAt: null,
      expiresAt: {
        gt: now,
      },
    }),
    count({
      revokedAt: {
        gte: cutoff,
      },
    }),
    count({
      revokedAt: null,
      expiresAt: {
        gte: cutoff,
        lte: now,
      },
    }),
    count({}),
  ]);

  const wouldDelete = await count(deletableWhere(cutoff, now, scope));

  // The categories partition the table; anything else is a bug.
  if (
    revokedPastRetention + expiredPastRetention !== wouldDelete ||
    wouldDelete + active + revokedWithinRetention + expiredWithinRetention !==
      total
  ) {
    throw new CleanupError("Session categories do not add up; aborting.");
  }

  return {
    wouldDelete,
    revokedPastRetention,
    expiredPastRetention,
    kept: {
      active,
      revokedWithinRetention,
      expiredWithinRetention,
    },
    total,
  };
}

async function resolveScope(onlyUserId) {
  if (!onlyUserId) {
    return {};
  }

  const user = await prisma.user.findUnique({
    where: {
      id: onlyUserId,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (
    !user ||
    user.role !== "TOURIST" ||
    !user.email.startsWith("e2e-") ||
    !user.email.endsWith("@travora.com")
  ) {
    throw new CleanupError(
      "--only-user must name an E2E-created account (e2e-*@travora.com).",
    );
  }

  return {
    userId: user.id,
  };
}

async function dryRun(options) {
  const scope = await resolveScope(options.onlyUserId);

  const now = await databaseNow(prisma);

  const cutoff = new Date(now.getTime() - options.retentionDays * DAY_MS);

  const counts = await report(prisma, cutoff, now, scope);

  return {
    mode: "dry-run",
    retentionDays: options.retentionDays,
    databaseNow: now.toISOString(),
    cutoff: cutoff.toISOString(),
    scoped: Boolean(options.onlyUserId),
    ...counts,
  };
}

async function execute(options) {
  return prisma.$transaction(async (tx) => {
    const now = await databaseNow(tx);

    const latestAllowedCutoff = new Date(now.getTime() - MIN_RETENTION_DAYS * DAY_MS);

    if (options.cutoff > latestAllowedCutoff) {
      throw new CleanupError(
        `--cutoff is within the ${MIN_RETENTION_DAYS}-day retention period; refusing.`,
      );
    }

    const where = deletableWhere(options.cutoff, now, {});

    const matching = await tx.refreshToken.count({
      where,
    });

    if (matching !== options.expectedCount) {
      throw new CleanupError(
        `Expected ${options.expectedCount} deletable rows for this cutoff but found ${matching}; nothing was deleted.`,
      );
    }

    const activeBefore = await tx.refreshToken.count({
      where: {
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
    });

    const deleted = await tx.refreshToken.deleteMany({
      where,
    });

    const activeAfter = await tx.refreshToken.count({
      where: {
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
    });

    if (deleted.count !== options.expectedCount || activeAfter !== activeBefore) {
      throw new CleanupError(
        "Deletion did not match the dry run; rolled back, nothing was deleted.",
      );
    }

    return {
      mode: "execute",
      databaseNow: now.toISOString(),
      cutoff: options.cutoff.toISOString(),
      deleted: deleted.count,
      activeSessions: activeAfter,
    };
  });
}

async function main() {
  const options = parseArguments();

  const result = options.execute ? await execute(options) : await dryRun(options);

  if (options.json) {
    console.log(`AUTH_SESSION_CLEANUP_JSON=${JSON.stringify(result)}`);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

main()
  .catch((error) => {
    console.error(
      error instanceof CleanupError
        ? `Auth session cleanup refused: ${error.message}`
        : error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
