import { expect, test } from "@playwright/test";

import { runBackendScript } from "./support/fixture-identities";

import {
  LifecycleWorld,
  SOURCE_STATUS,
  TARGET_STATUS,
  TIMESTAMP_FIELD,
  duplicateOpenCode,
  expectError,
  expireOpenCode,
  openChallenges,
  readChallenges,
  unassignGuide,
  wrongCode,
} from "./support/lifecycle-fixtures";

import { apiLogin, type LifecycleAction } from "./support/tour-confirmation";

/**
 * =========================================================
 * CR-032 Stage 3B -- Lifecycle confirmation matrix
 * =========================================================
 *
 * Every case runs explicitly for BOTH actions (START and COMPLETE):
 * a START result never stands in for COMPLETE. Plus the races of
 * the locking protocol (booking row -> quotation row -> challenge
 * rows), cross-action / cross-booking binding, the one-open-code
 * invariant, and the admin restriction for ADMIN and SYSTEM_ADMIN.
 *
 * All actors are throwaway E2E accounts (LifecycleWorld); the
 * temporary SYSTEM_ADMIN is removed in afterAll.
 */

const ACTIONS: LifecycleAction[] = ["START", "COMPLETE"];

let world: LifecycleWorld;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  world = await LifecycleWorld.create("matrix");
});

/* ================================================================ */

for (const action of ACTIONS) {
  const target = TARGET_STATUS[action];

  const source = SOURCE_STATUS[action];

  const stamp = TIMESTAMP_FIELD[action];

  test.describe(`${action} matrix`, () => {
    test(`${action}: only the owning traveler generates`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      for (const token of [world.otherTouristToken, world.guide1Token, world.adminToken]) {
        expectError(await world.requestCode(bookingId, action, token), 403);
      }

      const owned = await world.requestCode(bookingId, action);

      expect(owned.status).toBe(201);

      expect(owned.body?.data?.action).toBe(action);

      const state = await readChallenges(bookingId);

      expect(openChallenges(state, action)).toHaveLength(1);

      expect(openChallenges(state, action)[0].createdByUserId).toBe(world.tourist.id);
    });

    test(`${action}: without an assigned guide nothing can be generated or redeemed`, async () => {
      let bookingId: string;

      if (action === "START") {
        bookingId = await world.createBooking(null);
      } else {
        // Unreachable in the app once a tour is underway: forced here.
        bookingId = await world.bookingReadyFor("COMPLETE");

        await unassignGuide(bookingId);
      }

      expectError(await world.requestCode(bookingId, action), 409, "NO_ASSIGNED_GUIDE");

      expectError(await world.verify(bookingId, action, "123456"), 403, "NOT_ASSIGNED_GUIDE");

      expect(openChallenges(await readChallenges(bookingId), action)).toHaveLength(0);
    });

    test(`${action}: no one but the assigned guide can redeem; the code stays usable`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const code = await world.code(bookingId, action);

      expectError(await world.verify(bookingId, action, code, world.guide2Token), 403, "NOT_ASSIGNED_GUIDE");

      for (const token of [world.touristToken, world.adminToken]) {
        expectError(await world.verify(bookingId, action, code, token), 403);
      }

      const state = await readChallenges(bookingId);

      expect(state.booking.status).toBe(source);

      expect(openChallenges(state, action)[0].failedAttempts).toBe(0);

      expect((await world.verify(bookingId, action, code)).status).toBe(200);
    });

    test(`${action}: the right code transitions once and stamps ${stamp} once; reuse changes nothing`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const before = await readChallenges(bookingId);

      const code = await world.code(bookingId, action);

      const done = await world.verify(bookingId, action, code);

      expect(done.status, JSON.stringify(done.body)).toBe(200);

      expect(done.body?.data?.status).toBe(target);

      const stamped = done.body?.data?.[stamp] as string;

      expect(stamped).toBeTruthy();

      if (action === "COMPLETE") {
        // Completion keeps the start time.
        expect(done.body?.data?.startedAt).toBe(before.booking.startedAt);
      }

      // Used code / already in the target status (lost-response retry).
      expectError(await world.verify(bookingId, action, code), 409, "BOOKING_STATUS_MISMATCH", {
        currentStatus: target,
      });

      const after = await readChallenges(bookingId);

      expect(after.booking.status).toBe(target);

      expect(new Date(after.booking[stamp]!).toISOString()).toBe(new Date(stamped).toISOString());

      const row = after.challenges.find((challenge) => challenge.action === action)!;

      expect(row).toMatchObject({
        consumedByUserId: world.guide1.userId,
        invalidatedAt: null,
        failedAttempts: 0,
      });

      expect(openChallenges(after)).toHaveLength(0);
    });

    test(`${action}: wrong codes count down, persist, and the fifth invalidates for good`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const code = await world.code(bookingId, action);

      for (const [index, remaining] of [4, 3, 2, 1].entries()) {
        expectError(await world.verify(bookingId, action, wrongCode(code)), 400, "CODE_INCORRECT", {
          attemptsRemaining: remaining,
        });

        // Committed before the error was returned.
        const state = await readChallenges(bookingId);

        expect(openChallenges(state, action)[0].failedAttempts).toBe(index + 1);
      }

      expectError(await world.verify(bookingId, action, wrongCode(code)), 429, "TOO_MANY_ATTEMPTS");

      const exhausted = (await readChallenges(bookingId)).challenges.find(
        (row) => row.action === action && row.invalidationReason === "ATTEMPTS_EXHAUSTED",
      )!;

      expect(exhausted).toMatchObject({ failedAttempts: 5, consumedAt: null });

      expect(exhausted.invalidatedAt).toBeTruthy();

      // Afterwards: no usable code, and the invalidated row never changes.
      expectError(await world.verify(bookingId, action, code), 409, "NO_ACTIVE_CODE");

      expectError(await world.verify(bookingId, action, wrongCode(code)), 409, "NO_ACTIVE_CODE");

      const after = await readChallenges(bookingId);

      expect(after.challenges.find((row) => row.id === exhausted.id)).toEqual(exhausted);

      expect(after.booking.status).toBe(source);
    });

    test(`${action}: an expired code reports CODE_EXPIRED once, is stored EXPIRED, then is gone`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const code = await world.code(bookingId, action);

      expect((await expireOpenCode(bookingId, action)).expired).toBe(1);

      expectError(await world.verify(bookingId, action, code), 409, "CODE_EXPIRED");

      const expired = (await readChallenges(bookingId)).challenges.find(
        (row) => row.action === action && row.invalidationReason === "EXPIRED",
      )!;

      expect(expired).toMatchObject({ failedAttempts: 0, consumedAt: null });

      expectError(await world.verify(bookingId, action, code), 409, "NO_ACTIVE_CODE");

      const after = await readChallenges(bookingId);

      expect(after.challenges.find((row) => row.id === expired.id)).toEqual(expired);

      expect(after.booking.status).toBe(source);
    });

    test(`${action}: a regenerated code replaces the previous one`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const first = await world.code(bookingId, action);

      const second = await world.code(bookingId, action);

      const state = await readChallenges(bookingId);

      const rows = state.challenges.filter((row) => row.action === action);

      expect(rows.map((row) => row.invalidationReason)).toEqual(["REPLACED", null]);

      if (first !== second) {
        expectError(await world.verify(bookingId, action, first), 400, "CODE_INCORRECT");
      }

      expect((await world.verify(bookingId, action, second)).status).toBe(200);
    });

    test(`${action}: cancelling before redemption invalidates the code and keeps history`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const before = await readChallenges(bookingId);

      const code = await world.code(bookingId, action);

      const cancelled = await world.cancel(bookingId);

      expect(cancelled.status).toBe(200);

      const after = await readChallenges(bookingId);

      expect(after.booking).toMatchObject({
        status: "CANCELLED",
        completedAt: null,
        // START: never started; COMPLETE: the real start time stays.
        startedAt: before.booking.startedAt,
      });

      expect(after.booking.cancelledAt).toBeTruthy();

      expect(after.challenges.find((row) => row.action === action)).toMatchObject({
        consumedAt: null,
        invalidationReason: "BOOKING_CANCELLED",
      });

      // Consumed history (COMPLETE: the START code) is unchanged.
      for (const row of before.challenges) {
        expect(after.challenges.find((candidate) => candidate.id === row.id)).toEqual(row);
      }

      expect(openChallenges(after)).toHaveLength(0);

      expectError(await world.verify(bookingId, action, code), 409, "BOOKING_STATUS_MISMATCH", {
        currentStatus: "CANCELLED",
      });

      expectError(await world.requestCode(bookingId, action), 409, "BOOKING_STATUS_MISMATCH");
    });

    test(`${action}: after a guide change neither guide can use the old code`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const before = await readChallenges(bookingId);

      const oldCode = await world.code(bookingId, action);

      expect((await world.assignGuide(bookingId, world.guide2)).status).toBe(200);

      const after = await readChallenges(bookingId);

      expect(after.challenges.find((row) => row.action === action && !row.consumedAt)).toMatchObject({
        invalidationReason: "GUIDE_REASSIGNED",
      });

      for (const row of before.challenges) {
        expect(after.challenges.find((candidate) => candidate.id === row.id)).toEqual(row);
      }

      expectError(await world.verify(bookingId, action, oldCode, world.guide1Token), 403, "NOT_ASSIGNED_GUIDE");

      expectError(await world.verify(bookingId, action, oldCode, world.guide2Token), 409, "NO_ACTIVE_CODE");

      const fresh = await world.requestCode(bookingId, action);

      expect(fresh.body?.data?.guide).toEqual({
        firstName: world.guide2.firstName,
        lastName: world.guide2.lastName,
      });

      expect((await world.verify(bookingId, action, fresh.body?.data?.code, world.guide2Token)).status).toBe(200);

      await world.releaseIfActive(bookingId);
    });

    test(`${action}: refused from the wrong source status`, async () => {
      // START from a cancelled booking; COMPLETE from a confirmed one.
      const bookingId = await world.createBooking();

      if (action === "START") {
        expect((await world.cancel(bookingId)).status).toBe(200);
      }

      const current = action === "START" ? "CANCELLED" : "CONFIRMED";

      expectError(await world.requestCode(bookingId, action), 409, "BOOKING_STATUS_MISMATCH", {
        currentStatus: current,
      });

      expectError(await world.verify(bookingId, action, "123456"), 409, "BOOKING_STATUS_MISMATCH", {
        currentStatus: current,
      });

      expect((await readChallenges(bookingId)).challenges.filter((row) => row.action === action)).toHaveLength(0);
    });

    test(`${action}: booking A's code never works for booking B`, async () => {
      const bookingA = await world.bookingReadyFor(action);

      const bookingB = await world.bookingReadyFor(action);

      const codeA = await world.code(bookingA, action);

      expectError(await world.verify(bookingB, action, codeA), 409, "NO_ACTIVE_CODE");

      const codeB = await world.code(bookingB, action);

      if (codeA !== codeB) {
        expectError(await world.verify(bookingB, action, codeA), 400, "CODE_INCORRECT");
      }

      expect((await world.verify(bookingB, action, codeB)).status).toBe(200);

      expect((await world.verify(bookingA, action, codeA)).status).toBe(200);
    });

    test(`${action}: two open codes fail closed; a new code restores one`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const code = await world.code(bookingId, action);

      await duplicateOpenCode(bookingId, action);

      for (const attempt of [code, wrongCode(code)]) {
        expectError(await world.verify(bookingId, action, attempt), 500, "CONFIRMATION_INTEGRITY_ERROR");
      }

      let state = await readChallenges(bookingId);

      expect(state.booking.status).toBe(source);

      expect(openChallenges(state, action)).toHaveLength(2);

      // No attempt was consumed.
      expect(openChallenges(state, action).every((row) => row.failedAttempts === 0)).toBe(true);

      const fresh = await world.code(bookingId, action);

      state = await readChallenges(bookingId);

      expect(openChallenges(state, action)).toHaveLength(1);

      expect(
        state.challenges.filter((row) => row.action === action && row.invalidationReason === "REPLACED"),
      ).toHaveLength(2);

      expect((await world.verify(bookingId, action, fresh)).status).toBe(200);
    });
  });

  /* -------------------------------------------------------------- */

  test.describe(`${action} races`, () => {
    test(`${action} A: generate + generate leaves exactly one usable code`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const results = await Promise.all([world.requestCode(bookingId, action), world.requestCode(bookingId, action)]);

      expect(results.map((result) => result.status)).toEqual([201, 201]);

      const state = await readChallenges(bookingId);

      expect(openChallenges(state, action)).toHaveLength(1);

      expect(state.challenges.filter((row) => row.invalidationReason === "REPLACED")).toHaveLength(1);

      const codes = results.map((result) => result.body?.data?.code as string);

      const outcomes = [];

      for (const code of codes) {
        outcomes.push((await world.verify(bookingId, action, code)).status);
      }

      // Exactly one of the two codes was usable.
      expect(outcomes.filter((status) => status === 200)).toHaveLength(1);
    });

    test(`${action} B: correct + correct transitions once`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const code = await world.code(bookingId, action);

      const results = await Promise.all([world.verify(bookingId, action, code), world.verify(bookingId, action, code)]);

      expect(results.map((result) => result.status).sort()).toEqual([200, 409]);

      expectError(results.find((result) => result.status === 409)!, 409, "BOOKING_STATUS_MISMATCH", {
        currentStatus: target,
      });

      const winner = results.find((result) => result.status === 200)!;

      const state = await readChallenges(bookingId);

      expect(state.booking.status).toBe(target);

      expect(new Date(state.booking[stamp]!).toISOString()).toBe(
        new Date(winner.body?.data?.[stamp] as string).toISOString(),
      );

      expect(state.challenges.filter((row) => row.action === action && row.consumedAt)).toHaveLength(1);
    });

    test(`${action} C: wrong + wrong both persist (no lost increment)`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const code = await world.code(bookingId, action);

      const results = await Promise.all([
        world.verify(bookingId, action, wrongCode(code)),
        world.verify(bookingId, action, wrongCode(code)),
      ]);

      expect(results.map((result) => result.status)).toEqual([400, 400]);

      expect(
        results.map((result) => (result.body?.errors as { attemptsRemaining: number }).attemptsRemaining).sort(),
      ).toEqual([3, 4]);

      expect(openChallenges(await readChallenges(bookingId), action)[0].failedAttempts).toBe(2);
    });

    test(`${action} D: wrong + right serialize consistently`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const code = await world.code(bookingId, action);

      const [wrong, right] = await Promise.all([
        world.verify(bookingId, action, wrongCode(code)),
        world.verify(bookingId, action, code),
      ]);

      expect(right.status).toBe(200);

      expect([400, 409]).toContain(wrong.status);

      const state = await readChallenges(bookingId);

      expect(state.booking.status).toBe(target);

      const row = state.challenges.find((challenge) => challenge.action === action)!;

      expect(row.failedAttempts).toBe(wrong.status === 400 ? 1 : 0);

      expect(row.consumedAt).toBeTruthy();
    });

    test(`${action} E: regenerate + old-code verify never leaves the old code usable`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const oldCode = await world.code(bookingId, action);

      const [regenerated, verified] = await Promise.all([
        world.requestCode(bookingId, action),
        world.verify(bookingId, action, oldCode),
      ]);

      const state = await readChallenges(bookingId);

      if (verified.status === 200) {
        // Verification locked first: the old code was still current.
        expectError(regenerated, 409, "BOOKING_STATUS_MISMATCH");

        expect(state.booking.status).toBe(target);
      } else {
        // Regeneration locked first: the old code was replaced.
        expect(regenerated.status).toBe(201);

        const newCode = regenerated.body?.data?.code as string;

        test.skip(newCode === oldCode, "Both codes happened to be equal (1 in 10^6).");

        expectError(verified, 400, "CODE_INCORRECT");

        expect(state.booking.status).toBe(source);

        expect(state.challenges.filter((row) => row.action === action).map((row) => row.invalidationReason)).toEqual([
          "REPLACED",
          null,
        ]);

        expectError(await world.verify(bookingId, action, oldCode), 400, "CODE_INCORRECT");
      }
    });

    test(`${action} F: cancel + verify never overwrites a final state`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const before = await readChallenges(bookingId);

      const code = await world.code(bookingId, action);

      const [cancel, verify] = await Promise.all([world.cancel(bookingId), world.verify(bookingId, action, code)]);

      const state = await readChallenges(bookingId);

      const row = state.challenges.find((challenge) => challenge.action === action && challenge.id !== before.challenges[0]?.id)!;

      if (verify.status === 200 && action === "START") {
        // Started first, then legitimately cancelled from IN_PROGRESS.
        expect(cancel.status).toBe(200);

        expect(state.booking).toMatchObject({ status: "CANCELLED", completedAt: null });

        expect(state.booking.startedAt).toBeTruthy();

        expect(row.consumedAt).toBeTruthy();
      } else if (verify.status === 200) {
        // Completed first: COMPLETED is final, never cancelled.
        expect([400, 409]).toContain(cancel.status);

        expect(state.booking.status).toBe("COMPLETED");

        expect(state.booking.cancelledAt).toBeNull();

        expect(row.consumedAt).toBeTruthy();
      } else {
        // Cancelled first: never moved on afterwards.
        expect(cancel.status).toBe(200);

        expectError(verify, 409, "BOOKING_STATUS_MISMATCH", { currentStatus: "CANCELLED" });

        expect(state.booking).toMatchObject({
          status: "CANCELLED",
          completedAt: null,
          startedAt: before.booking.startedAt,
        });

        expect(row).toMatchObject({ consumedAt: null, invalidationReason: "BOOKING_CANCELLED" });
      }

      expect(openChallenges(state)).toHaveLength(0);
    });

    test(`${action} G: guide change + verify never lets the replaced guide transition afterwards`, async () => {
      const bookingId = await world.bookingReadyFor(action);

      const code = await world.code(bookingId, action);

      const [reassign, verify] = await Promise.all([
        world.assignGuide(bookingId, world.guide2),
        world.verify(bookingId, action, code, world.guide1Token),
      ]);

      const state = await readChallenges(bookingId);

      const row = state.challenges.find((challenge) => challenge.action === action)!;

      if (verify.status === 200) {
        // guide1 was still assigned when it redeemed the code.
        expect(row.consumedByUserId).toBe(world.guide1.userId);

        expect(state.booking.status).toBe(target);

        // START: an underway tour may still change guide; COMPLETE: final.
        expect(reassign.status).toBe(action === "START" ? 200 : 400);
      } else {
        expect(reassign.status).toBe(200);

        expectError(verify, 403, "NOT_ASSIGNED_GUIDE");

        expect(state.booking.status).toBe(source);

        expect(row).toMatchObject({ consumedAt: null, invalidationReason: "GUIDE_REASSIGNED" });
      }

      // Nothing generated before the change is usable by anyone.
      expect(openChallenges(state)).toHaveLength(0);

      await world.releaseIfActive(bookingId);
    });
  });
}

/* ================================================================ */

test.describe("cross-action binding", () => {
  test("a START code cannot complete and a COMPLETE code cannot start", async () => {
    const bookingId = await world.createBooking();

    const startCode = await world.code(bookingId, "START");

    // Status-gated: COMPLETE needs IN_PROGRESS.
    expectError(await world.verify(bookingId, "COMPLETE", startCode), 409, "BOOKING_STATUS_MISMATCH");

    expect((await world.verify(bookingId, "START", startCode)).status).toBe(200);

    // The used START code finds no COMPLETE code...
    expectError(await world.verify(bookingId, "COMPLETE", startCode), 409, "NO_ACTIVE_CODE");

    const completeCode = await world.code(bookingId, "COMPLETE");

    // ...and does not match the COMPLETE code (hash binds the action).
    if (startCode !== completeCode) {
      expectError(await world.verify(bookingId, "COMPLETE", startCode), 400, "CODE_INCORRECT");
    }

    // A COMPLETE code cannot start (already underway).
    expectError(await world.verify(bookingId, "START", completeCode), 409, "BOOKING_STATUS_MISMATCH", {
      currentStatus: "IN_PROGRESS",
    });

    expect((await world.verify(bookingId, "COMPLETE", completeCode)).status).toBe(200);
  });
});

/* ================================================================ */

test.describe("admin cannot start or complete a tour", () => {
  let systemAdminToken = "";

  test.beforeAll(async () => {
    const admin = await runBackendScript<{ email: string; password: string }>(
      "booking-lifecycle-e2e-helpers.js",
      ["create-system-admin"],
    );

    systemAdminToken = await apiLogin(admin.email, admin.password);
  });

  test.afterAll(async () => {
    const removed = await runBackendScript<{ removed: number }>("booking-lifecycle-e2e-helpers.js", [
      "remove-system-admins",
    ]);

    expect(removed.removed).toBe(1);
  });

  test("ADMIN and SYSTEM_ADMIN are refused IN_PROGRESS and COMPLETED; CANCELLED still works", async () => {
    const confirmed = await world.createBooking();

    const underway = await world.bookingReadyFor("COMPLETE");

    for (const [label, token] of [
      ["ADMIN", world.adminToken],
      ["SYSTEM_ADMIN", systemAdminToken],
    ] as const) {
      for (const [bookingId, status] of [
        [confirmed, "IN_PROGRESS"],
        [confirmed, "COMPLETED"],
        [underway, "COMPLETED"],
      ] as const) {
        const result = await world.setStatus(bookingId, status, token);

        expect(result.status, `${label} ${status}: ${JSON.stringify(result.body)}`).toBe(400);
      }

      // Neither role can generate or redeem codes either.
      expectError(await world.requestCode(confirmed, "START", token), 403);

      expectError(await world.verify(confirmed, "START", "123456", token), 403);
    }

    expect((await readChallenges(confirmed)).booking).toMatchObject({
      status: "CONFIRMED",
      startedAt: null,
      completedAt: null,
    });

    expect((await readChallenges(underway)).booking).toMatchObject({ status: "IN_PROGRESS", completedAt: null });

    // SYSTEM_ADMIN is authorized for the endpoint: only the rule refuses.
    const cancelled = await world.setStatus(confirmed, "CANCELLED", systemAdminToken);

    expect(cancelled.status, JSON.stringify(cancelled.body)).toBe(200);

    expect((await readChallenges(confirmed)).booking).toMatchObject({
      status: "CANCELLED",
      startedAt: null,
      completedAt: null,
    });
  });
});

/* ================================================================ */

test.describe("logs never carry codes, hashes or the secret", () => {
  test("the real logger redacts code, pin, hash and secret shapes", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Process-level check runs once, in chromium.");

    const result = await runBackendScript<{
      probesLogged: boolean;
      leaked: Record<string, boolean>;
      redactions: number;
      errorCodeVisible: boolean;
    }>("booking-lifecycle-e2e-helpers.js", ["logger-redaction"]);

    expect(result.probesLogged).toBe(true);

    expect(result.leaked).toEqual({ code: false, pin: false, codeHash: false, secret: false });

    expect(result.redactions).toBeGreaterThan(0);

    // Not over-redacted: ordinary error codes stay readable.
    expect(result.errorCodeVisible).toBe(true);
  });

  test("a failing database call logs safe diagnostics only and never reaches the client", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Process-level check runs once, in chromium.");

    // Prisma errors whose message and meta carry a code hash, a code
    // and the secret -- as a failed challenge insert would.
    const result = await runBackendScript<{
      leaked: Record<string, boolean>;
      logged: Record<string, boolean>;
      responses: { status: number; message: string; errors: unknown }[];
    }>("booking-lifecycle-e2e-helpers.js", ["error-handler-probe"]);

    expect(result.leaked).toEqual({ code: false, codeHash: false, secret: false, queryString: false });

    // Still diagnosable: what failed, where, and how to correlate it.
    expect(result.logged).toEqual({
      event: true,
      prismaCode: true,
      knownErrorName: true,
      validationErrorName: true,
      prismaOperation: true,
      correlationId: true,
      route: true,
      stackFrames: true,
      applicationMessage: true,
    });

    // Database internals never reach clients; application errors are unchanged.
    expect(result.responses).toEqual([
      { status: 500, message: "Internal server error", errors: null },
      { status: 500, message: "Internal server error", errors: null },
      {
        status: 409,
        message: "Only a confirmed booking can be started",
        errors: { code: "BOOKING_STATUS_MISMATCH", currentStatus: "IN_PROGRESS" },
      },
    ]);
  });
});
