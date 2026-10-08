/**
 * =========================================================
 * E2E Environment Preflight (CR-018)
 * =========================================================
 *
 * Read-only. Run by Playwright's global setup before any test,
 * so a broken environment fails fast with one clear message
 * instead of dozens of login failures.
 *
 * Checks the seeded admin account the specs log in with and that
 * Stripe is configured in test mode. Secrets are never printed --
 * only whether they are present.
 *
 * Since CR-032 Stage 3A no spec uses a shared tourist or guide:
 * each creates throwaway e2e-*@travora.com accounts, so neither the
 * former shared tourist nor the shared guide is required here.
 */

const {
  loadBackendEnv,
  assertSafeE2EEnvironment,
} = require("./lib/e2e-guards");

loadBackendEnv();

assertSafeE2EEnvironment("E2E environment preflight");

const prisma = require("../src/config/prisma");

const REQUIRED_ACCOUNTS = [
  {
    label: "E2E admin",
    email: process.env.E2E_ADMIN_EMAIL ?? "admin@travora.com",
    role: "ADMIN",
  },
];

async function main() {
  const problems = [];

  for (const account of REQUIRED_ACCOUNTS) {
    const user = await prisma.user.findUnique({
      where: {
        email: account.email,
      },

      include: {
        tourGuideProfile: true,
      },
    });

    if (!user) {
      problems.push(`${account.label} account (${account.email}) does not exist.`);

      continue;
    }

    if (user.role !== account.role) {
      problems.push(`${account.label} account must have role ${account.role}.`);
    }

    if (user.status !== "ACTIVE") {
      problems.push(`${account.label} account must be ACTIVE.`);
    }

    if (account.role === "TOUR_GUIDE") {
      const profile = user.tourGuideProfile;

      if (!profile || profile.deletedAt) {
        problems.push(`${account.label} has no active tour guide profile.`);
      } else if (!profile.isAvailable) {
        problems.push(`${account.label} profile must be available for assignment.`);
      }
    }
  }

  const stripeTestMode = String(process.env.STRIPE_SECRET_KEY ?? "").startsWith(
    "sk_test_",
  );

  if (!stripeTestMode) {
    problems.push("STRIPE_SECRET_KEY must be a Stripe test-mode (sk_test_) key.");
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    problems.push("STRIPE_WEBHOOK_SECRET must be configured.");
  }

  const result = {
    ok: problems.length === 0,
    stripeTestMode,
    webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    problems,
  };

  console.log(`E2E_PREFLIGHT_JSON=${JSON.stringify(result)}`);

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(
      "E2E environment preflight failed:",
      error instanceof Error ? error.message : error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
