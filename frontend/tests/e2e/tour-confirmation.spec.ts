import { expect, test } from "@playwright/test";

import {
  createFixtureGuide,
  createFixtureTourist,
  runBackendScript,
  type FixtureGuide,
  type FixtureTourist,
} from "./support/fixture-identities";

import {
  api,
  apiLogin,
  errorDetails,
  generateConfirmationCode,
  type ApiResult,
  type LifecycleAction,
} from "./support/tour-confirmation";

/**
 * =========================================================
 * CR-032 Traveler–Guide Tour Confirmation (API)
 * =========================================================
 *
 * A booking moves CONFIRMED -> IN_PROGRESS and
 * IN_PROGRESS -> COMPLETED only when the currently assigned
 * guide redeems a valid, unexpired, single-use code that the
 * booking's traveler generated for that booking and action.
 *
 * Every booking is a fresh fixture (prepare-booking-lifecycle-e2e.js)
 * owned by a throwaway tourist (e2e-*@travora.com) and the guides
 * are fixture guides created per run (e2e-guide-*@travora.com), so the
 * spec never depends on, or changes, any real account. Everything
 * it creates is in the standard E2E cleanup scope.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@travora.com";

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345";

const CODE_MESSAGE = "Enter the 6-digit confirmation code";

/**
 * =========================================================
 * Fixture Types
 * =========================================================
 */

interface BookingFixture {
  bookingId: string;
  touristId: string;
  status: string;
}

interface ChallengeRow {
  id: string;
  action: LifecycleAction;
  codeHash: string;
  expiresAt: string;
  failedAttempts: number;
  createdByUserId: string;
  consumedAt: string | null;
  consumedByUserId: string | null;
  invalidatedAt: string | null;
  invalidationReason: string | null;
}

interface ChallengeState {
  booking: {
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
  };
  challenges: ChallengeRow[];
}

/**
 * =========================================================
 * Fixture Helpers
 * =========================================================
 */

const HELPERS = "booking-lifecycle-e2e-helpers.js";

function readChallenges(bookingId: string) {
  return runBackendScript<ChallengeState>(HELPERS, ["challenges", bookingId]);
}

function expireActiveCode(bookingId: string, action: LifecycleAction) {
  return runBackendScript<{ expired: number }>(HELPERS, [
    "expire",
    bookingId,
    action,
  ]);
}

function duplicateOpenCode(bookingId: string, action: LifecycleAction) {
  return runBackendScript<{ duplicateId: string }>(HELPERS, [
    "duplicate-open",
    bookingId,
    action,
  ]);
}

function activeChallenges(state: ChallengeState) {
  return state.challenges.filter(
    (challenge) => !challenge.consumedAt && !challenge.invalidatedAt,
  );
}

/** A 6-digit code guaranteed to differ from `code`. */
function wrongCode(code: string) {
  return String((Number(code) + 1) % 1_000_000).padStart(6, "0");
}

/**
 * =========================================================
 * Run State
 * =========================================================
 */

let tourist: FixtureTourist;

let touristToken = "";

let adminToken = "";

let otherTouristToken = "";

let guide1: FixtureGuide;

let guide2: FixtureGuide;

let guide1Token = "";

let guide2Token = "";

/**
 * =========================================================
 * API Steps
 * =========================================================
 */

/**
 * A fresh CONFIRMED booking for the E2E tourist, assigned to
 * `guide` through the real admin endpoint (or left unassigned).
 * Its dates are allocated clear of guide1's active bookings.
 */
async function createBooking(guide: FixtureGuide | null) {
  const fixture = await runBackendScript<BookingFixture>(
    "prepare-booking-lifecycle-e2e.js",
    [],
    {
      E2E_TOURIST_EMAIL: tourist.email,

      E2E_GUIDE_EMAIL: (guide ?? guide1).email,
    },
  );

  expect(fixture.status).toBe("CONFIRMED");

  if (guide) {
    await assignGuide(fixture.bookingId, guide);
  }

  return fixture;
}

async function assignGuide(bookingId: string, guide: FixtureGuide) {
  const result = await api("PATCH", `/bookings/${bookingId}/guide`, {
    token: adminToken,
    body: {
      guideId: guide.id,
    },
  });

  expect(result.status, JSON.stringify(result.body)).toBe(200);
}

function requestCode(token: string, bookingId: string, action: LifecycleAction) {
  return api("POST", `/bookings/${bookingId}/lifecycle-challenges`, {
    token,
    body: {
      action,
    },
  });
}

function verifyCode(
  token: string,
  bookingId: string,
  action: LifecycleAction,
  code: unknown,
) {
  return api(
    "POST",
    `/bookings/guide/${bookingId}/${action === "START" ? "start" : "complete"}`,
    {
      token,
      body: code === undefined ? {} : { code },
    },
  );
}

function cancelBooking(bookingId: string) {
  return api("PATCH", `/bookings/${bookingId}/status`, {
    token: adminToken,
    body: {
      status: "CANCELLED",
    },
  });
}

async function startTour(bookingId: string, guideToken = guide1Token) {
  const code = await generateConfirmationCode(touristToken, bookingId, "START");

  const result = await verifyCode(guideToken, bookingId, "START", code);

  expect(result.status, JSON.stringify(result.body)).toBe(200);
}

function expectError(
  result: ApiResult,
  status: number,
  code?: string,
  extra: Record<string, unknown> = {},
) {
  expect(result.status, JSON.stringify(result.body)).toBe(status);

  if (code) {
    expect(errorDetails(result)).toMatchObject({
      code,
      ...extra,
    });
  }
}

/**
 * =========================================================
 * Tour Confirmation
 * =========================================================
 */

test.describe("CR-032 tour confirmation codes", () => {
  test.describe.configure({
    mode: "serial",
  });

  test.beforeAll(async () => {
    tourist = await createFixtureTourist("confirm");

    const otherTourist = await createFixtureTourist("confirm-other");

    guide1 = await createFixtureGuide("primary");

    guide2 = await createFixtureGuide("second");

    [touristToken, otherTouristToken, adminToken, guide1Token, guide2Token] =
      await Promise.all([
        apiLogin(tourist.email, tourist.password),
        apiLogin(otherTourist.email, otherTourist.password),
        apiLogin(ADMIN_EMAIL, ADMIN_PASSWORD),
        apiLogin(guide1.email, guide1.password),
        apiLogin(guide2.email, guide2.password),
      ]);
  });

  /**
   * =====================================================
   * A. Generation and storage
   * =====================================================
   */

  test("the traveler receives a code once; only a keyed hash is stored and no booking API exposes it", async () => {
    const fixture = await createBooking(guide1);

    const bookingId = fixture.bookingId;

    const before = Date.now();

    const result = await requestCode(touristToken, bookingId, "START");

    expect(result.status, JSON.stringify(result.body)).toBe(201);

    expect(result.headers.get("cache-control")).toContain("no-store");

    const data = result.body?.data as {
      action: string;
      code: string;
      expiresAt: string;
      guide: { firstName: string; lastName: string };
    };

    expect(Object.keys(data).sort()).toEqual([
      "action",
      "code",
      "expiresAt",
      "guide",
    ]);

    expect(data.action).toBe("START");

    expect(data.code).toMatch(/^\d{6}$/);

    expect(data.guide).toEqual({
      firstName: guide1.firstName,
      lastName: guide1.lastName,
    });

    const ttl = new Date(data.expiresAt).getTime() - before;

    expect(ttl).toBeGreaterThan(4 * 60 * 1000);

    expect(ttl).toBeLessThanOrEqual(5 * 60 * 1000 + 5_000);

    const state = await readChallenges(bookingId);

    expect(state.challenges).toHaveLength(1);

    const [row] = state.challenges;

    expect(row.action).toBe("START");

    expect(row.createdByUserId).toBe(fixture.touristId);

    expect(row.failedAttempts).toBe(0);

    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);

    expect(row.codeHash).not.toContain(data.code);

    // No booking read exposes codes, hashes or code history.
    const reads = await Promise.all([
      api("GET", `/bookings/${bookingId}`, { token: touristToken }),
      api("GET", `/bookings/${bookingId}`, { token: guide1Token }),
      api("GET", `/bookings/${bookingId}`, { token: adminToken }),
      api("GET", "/bookings/me", { token: touristToken }),
      api("GET", "/bookings/guide/me", { token: guide1Token }),
      api("GET", "/bookings", { token: adminToken }),
    ]);

    for (const read of reads) {
      expect(read.status).toBe(200);

      const json = JSON.stringify(read.body);

      expect(json).not.toContain("lifecycleChallenges");

      expect(json).not.toContain("codeHash");

      expect(json).not.toContain(row.codeHash);

      expect(json).not.toContain(row.id);
    }

    expect(reads[0].body?.data).toMatchObject({
      status: "CONFIRMED",
      startedAt: null,
    });
  });

  /**
   * =====================================================
   * B. Happy path and lost-response retry (D7)
   * =====================================================
   */

  test("the assigned guide starts and completes the tour with the traveler's codes", async () => {
    const { bookingId } = await createBooking(guide1);

    const startCode = await generateConfirmationCode(
      touristToken,
      bookingId,
      "START",
    );

    const started = await verifyCode(guide1Token, bookingId, "START", startCode);

    expect(started.status, JSON.stringify(started.body)).toBe(200);

    expect(started.body?.data).toMatchObject({
      status: "IN_PROGRESS",
      completedAt: null,
    });

    const startedAt = started.body?.data?.startedAt as string;

    expect(startedAt).toBeTruthy();

    // A retry after a lost response never transitions twice.
    expectError(
      await verifyCode(guide1Token, bookingId, "START", startCode),
      409,
      "BOOKING_STATUS_MISMATCH",
      { currentStatus: "IN_PROGRESS" },
    );

    // A START code can never complete the tour.
    expectError(
      await verifyCode(guide1Token, bookingId, "COMPLETE", startCode),
      409,
      "NO_ACTIVE_CODE",
    );

    let state = await readChallenges(bookingId);

    expect(state.challenges).toHaveLength(1);

    expect(state.challenges[0]).toMatchObject({
      action: "START",
      consumedByUserId: guide1.userId,
      invalidatedAt: null,
    });

    const completeCode = await generateConfirmationCode(
      touristToken,
      bookingId,
      "COMPLETE",
    );

    expectError(
      await verifyCode(guide1Token, bookingId, "COMPLETE", wrongCode(completeCode)),
      400,
      "CODE_INCORRECT",
      { attemptsRemaining: 4 },
    );

    const completed = await verifyCode(
      guide1Token,
      bookingId,
      "COMPLETE",
      completeCode,
    );

    expect(completed.status, JSON.stringify(completed.body)).toBe(200);

    expect(completed.body?.data).toMatchObject({
      status: "COMPLETED",
      startedAt,
    });

    expect(completed.body?.data?.completedAt).toBeTruthy();

    state = await readChallenges(bookingId);

    expect(state.booking.status).toBe("COMPLETED");

    expect(state.challenges.map((row) => row.action)).toEqual([
      "START",
      "COMPLETE",
    ]);

    expect(state.challenges[1]).toMatchObject({
      failedAttempts: 1,
      consumedByUserId: guide1.userId,
    });

    for (const action of ["START", "COMPLETE"] as const) {
      expectError(
        await requestCode(touristToken, bookingId, action),
        409,
        "BOOKING_STATUS_MISMATCH",
        { currentStatus: "COMPLETED" },
      );
    }
  });

  /**
   * =====================================================
   * C. Authorization and validation
   * =====================================================
   */

  test("only the owning traveler generates and only the assigned guide redeems", async () => {
    const { bookingId } = await createBooking(guide1);

    for (const token of [adminToken, guide1Token]) {
      expectError(await requestCode(token, bookingId, "START"), 403);
    }

    expectError(await requestCode(otherTouristToken, bookingId, "START"), 403);

    const code = await generateConfirmationCode(touristToken, bookingId, "START");

    for (const token of [touristToken, adminToken]) {
      expectError(await verifyCode(token, bookingId, "START", code), 403);
    }

    expectError(
      await verifyCode(guide2Token, bookingId, "START", code),
      403,
      "NOT_ASSIGNED_GUIDE",
    );

    // The removed direct transitions.
    for (const endpoint of ["start", "complete"]) {
      const result = await api("PATCH", `/bookings/guide/${bookingId}/${endpoint}`, {
        token: guide1Token,
      });

      expect(result.status).toBe(404);
    }

    // No admin path starts or completes a tour (D3).
    for (const status of ["IN_PROGRESS", "COMPLETED"]) {
      const result = await api("PATCH", `/bookings/${bookingId}/status`, {
        token: adminToken,
        body: {
          status,
        },
      });

      expect(result.status, JSON.stringify(result.body)).toBe(400);
    }

    // Malformed codes are rejected without counting an attempt
    // and without echoing the submitted value.
    for (const malformed of ["12345", "1234567", "abcdef", " 12345", 123456, undefined]) {
      const result = await verifyCode(guide1Token, bookingId, "START", malformed);

      expect(result.status, JSON.stringify(result.body)).toBe(400);

      expect(result.body?.errors).toEqual([CODE_MESSAGE]);

      if (typeof malformed === "string") {
        expect(
          JSON.stringify([result.body?.message, result.body?.errors]),
        ).not.toContain(malformed.trim());
      }
    }

    let state = await readChallenges(bookingId);

    expect(state.booking.status).toBe("CONFIRMED");

    expect(activeChallenges(state)).toHaveLength(1);

    expect(state.challenges[0].failedAttempts).toBe(0);

    // The code still works for the assigned guide.
    const started = await verifyCode(guide1Token, bookingId, "START", code);

    expect(started.status, JSON.stringify(started.body)).toBe(200);

    // Without an assigned guide there is nobody to confirm with.
    const unassigned = await createBooking(null);

    expectError(
      await requestCode(touristToken, unassigned.bookingId, "START"),
      409,
      "NO_ASSIGNED_GUIDE",
    );

    expectError(
      await verifyCode(guide1Token, unassigned.bookingId, "START", code),
      403,
      "NOT_ASSIGNED_GUIDE",
    );

    state = await readChallenges(unassigned.bookingId);

    expect(state.challenges).toHaveLength(0);
  });

  /**
   * =====================================================
   * D. Attempts, expiry and replacement
   * =====================================================
   */

  test("five incorrect attempts invalidate the code", async () => {
    const { bookingId } = await createBooking(guide1);

    const code = await generateConfirmationCode(touristToken, bookingId, "START");

    for (const remaining of [4, 3, 2, 1]) {
      expectError(
        await verifyCode(guide1Token, bookingId, "START", wrongCode(code)),
        400,
        "CODE_INCORRECT",
        { attemptsRemaining: remaining },
      );
    }

    expectError(
      await verifyCode(guide1Token, bookingId, "START", wrongCode(code)),
      429,
      "TOO_MANY_ATTEMPTS",
    );

    // The exhausted code is no longer open: even the right code
    // finds no usable code.
    expectError(
      await verifyCode(guide1Token, bookingId, "START", code),
      409,
      "NO_ACTIVE_CODE",
    );

    const state = await readChallenges(bookingId);

    expect(state.booking.status).toBe("CONFIRMED");

    expect(state.challenges).toHaveLength(1);

    expect(state.challenges[0]).toMatchObject({
      failedAttempts: 5,
      consumedAt: null,
      invalidationReason: "ATTEMPTS_EXHAUSTED",
    });

    // A fresh code from the traveler works.
    await startTour(bookingId);
  });

  test("expired and replaced codes are rejected", async () => {
    const { bookingId } = await createBooking(guide1);

    const expiredCode = await generateConfirmationCode(
      touristToken,
      bookingId,
      "START",
    );

    expect((await expireActiveCode(bookingId, "START")).expired).toBe(1);

    expectError(
      await verifyCode(guide1Token, bookingId, "START", expiredCode),
      409,
      "CODE_EXPIRED",
    );

    // Marked EXPIRED, it is no longer open.
    expectError(
      await verifyCode(guide1Token, bookingId, "START", expiredCode),
      409,
      "NO_ACTIVE_CODE",
    );

    const replacedCode = await generateConfirmationCode(
      touristToken,
      bookingId,
      "START",
    );

    const currentCode = await generateConfirmationCode(
      touristToken,
      bookingId,
      "START",
    );

    const state = await readChallenges(bookingId);

    expect(state.challenges.map((row) => row.invalidationReason)).toEqual([
      "EXPIRED",
      "REPLACED",
      null,
    ]);

    expect(activeChallenges(state)).toHaveLength(1);

    if (replacedCode !== currentCode) {
      expectError(
        await verifyCode(guide1Token, bookingId, "START", replacedCode),
        400,
        "CODE_INCORRECT",
      );
    }

    const started = await verifyCode(guide1Token, bookingId, "START", currentCode);

    expect(started.status, JSON.stringify(started.body)).toBe(200);
  });

  test("a code only works for the booking it was generated for", async () => {
    const bookingA = (await createBooking(guide1)).bookingId;

    const bookingB = (await createBooking(guide1)).bookingId;

    const codeA = await generateConfirmationCode(touristToken, bookingA, "START");

    expectError(
      await verifyCode(guide1Token, bookingB, "START", codeA),
      409,
      "NO_ACTIVE_CODE",
    );

    const codeB = await generateConfirmationCode(touristToken, bookingB, "START");

    if (codeA !== codeB) {
      expectError(
        await verifyCode(guide1Token, bookingB, "START", codeA),
        400,
        "CODE_INCORRECT",
      );
    }

    for (const [bookingId, code] of [
      [bookingB, codeB],
      [bookingA, codeA],
    ]) {
      const result = await verifyCode(guide1Token, bookingId, "START", code);

      expect(result.status, JSON.stringify(result.body)).toBe(200);
    }
  });

  /**
   * =====================================================
   * E. Cancellation and reassignment (D8)
   * =====================================================
   */

  test("cancelling a booking invalidates its codes", async () => {
    const { bookingId } = await createBooking(guide1);

    await startTour(bookingId);

    const code = await generateConfirmationCode(
      touristToken,
      bookingId,
      "COMPLETE",
    );

    const cancelled = await cancelBooking(bookingId);

    expect(cancelled.status, JSON.stringify(cancelled.body)).toBe(200);

    expect(cancelled.body?.data).toMatchObject({
      status: "CANCELLED",
      completedAt: null,
    });

    const state = await readChallenges(bookingId);

    expect(state.challenges.at(-1)).toMatchObject({
      action: "COMPLETE",
      consumedAt: null,
      invalidationReason: "BOOKING_CANCELLED",
    });

    expectError(
      await verifyCode(guide1Token, bookingId, "COMPLETE", code),
      409,
      "BOOKING_STATUS_MISMATCH",
      { currentStatus: "CANCELLED" },
    );

    expectError(
      await requestCode(touristToken, bookingId, "COMPLETE"),
      409,
      "BOOKING_STATUS_MISMATCH",
    );

    expectError(await cancelBooking(bookingId), 400);
  });

  test("reassigning the guide invalidates codes; the new guide needs a fresh one", async () => {
    const { bookingId } = await createBooking(guide1);

    const oldCode = await generateConfirmationCode(
      touristToken,
      bookingId,
      "START",
    );

    await assignGuide(bookingId, guide2);

    let state = await readChallenges(bookingId);

    expect(state.challenges[0].invalidationReason).toBe("GUIDE_REASSIGNED");

    expectError(
      await verifyCode(guide1Token, bookingId, "START", oldCode),
      403,
      "NOT_ASSIGNED_GUIDE",
    );

    expectError(
      await verifyCode(guide2Token, bookingId, "START", oldCode),
      409,
      "NO_ACTIVE_CODE",
    );

    const generated = await requestCode(touristToken, bookingId, "START");

    expect(generated.status).toBe(201);

    expect(generated.body?.data?.guide).toEqual({
      firstName: guide2.firstName,
      lastName: guide2.lastName,
    });

    const started = await verifyCode(
      guide2Token,
      bookingId,
      "START",
      generated.body?.data?.code,
    );

    expect(started.status, JSON.stringify(started.body)).toBe(200);

    state = await readChallenges(bookingId);

    expect(state.challenges[1].consumedByUserId).toBe(guide2.userId);

    // Frees guide2's schedule for the reassignment race below.
    expect((await cancelBooking(bookingId)).status).toBe(200);
  });

  /**
   * =====================================================
   * F. Concurrency (D6, D9)
   * =====================================================
   */

  test("concurrent generation leaves exactly one usable code", async () => {
    const { bookingId } = await createBooking(guide1);

    const results = await Promise.all([
      requestCode(touristToken, bookingId, "START"),
      requestCode(touristToken, bookingId, "START"),
    ]);

    for (const result of results) {
      expect(result.status, JSON.stringify(result.body)).toBe(201);
    }

    const state = await readChallenges(bookingId);

    expect(state.challenges).toHaveLength(2);

    expect(activeChallenges(state)).toHaveLength(1);

    expect(
      state.challenges.filter((row) => row.invalidationReason === "REPLACED"),
    ).toHaveLength(1);

    const [first, second] = results.map(
      (result) => result.body?.data?.code as string,
    );

    const firstTry = await verifyCode(guide1Token, bookingId, "START", first);

    if (firstTry.status !== 200) {
      expectError(firstTry, 400, "CODE_INCORRECT");

      const secondTry = await verifyCode(guide1Token, bookingId, "START", second);

      expect(secondTry.status, JSON.stringify(secondTry.body)).toBe(200);
    }
  });

  test("concurrent redemption of one code transitions exactly once", async () => {
    const { bookingId } = await createBooking(guide1);

    const code = await generateConfirmationCode(touristToken, bookingId, "START");

    const results = await Promise.all([
      verifyCode(guide1Token, bookingId, "START", code),
      verifyCode(guide1Token, bookingId, "START", code),
    ]);

    const statuses = results.map((result) => result.status).sort();

    expect(statuses).toEqual([200, 409]);

    const conflict = results.find((result) => result.status === 409)!;

    expectError(conflict, 409, "BOOKING_STATUS_MISMATCH", {
      currentStatus: "IN_PROGRESS",
    });

    const state = await readChallenges(bookingId);

    expect(state.booking.status).toBe("IN_PROGRESS");

    expect(state.challenges).toHaveLength(1);

    expect(state.challenges[0].consumedAt).toBeTruthy();
  });

  test("a wrong and a right code racing keep attempts consistent", async () => {
    const { bookingId } = await createBooking(guide1);

    const code = await generateConfirmationCode(touristToken, bookingId, "START");

    const [wrong, right] = await Promise.all([
      verifyCode(guide1Token, bookingId, "START", wrongCode(code)),
      verifyCode(guide1Token, bookingId, "START", code),
    ]);

    expect(right.status, JSON.stringify(right.body)).toBe(200);

    expect([400, 409]).toContain(wrong.status);

    const state = await readChallenges(bookingId);

    expect(state.booking.status).toBe("IN_PROGRESS");

    expect(state.challenges[0].failedAttempts).toBe(wrong.status === 400 ? 1 : 0);

    expect(state.challenges[0].consumedAt).toBeTruthy();
  });

  test("cancellation racing completion never overwrites the winner", async () => {
    const { bookingId } = await createBooking(guide1);

    await startTour(bookingId);

    const code = await generateConfirmationCode(
      touristToken,
      bookingId,
      "COMPLETE",
    );

    const [cancel, complete] = await Promise.all([
      cancelBooking(bookingId),
      verifyCode(guide1Token, bookingId, "COMPLETE", code),
    ]);

    const state = await readChallenges(bookingId);

    const completeRow = state.challenges.at(-1)!;

    if (cancel.status === 200) {
      expectError(complete, 409, "BOOKING_STATUS_MISMATCH", {
        currentStatus: "CANCELLED",
      });

      expect(state.booking).toMatchObject({
        status: "CANCELLED",
        completedAt: null,
      });

      expect(completeRow).toMatchObject({
        consumedAt: null,
        invalidationReason: "BOOKING_CANCELLED",
      });
    } else {
      expect(complete.status, JSON.stringify(complete.body)).toBe(200);

      expect([400, 409]).toContain(cancel.status);

      expect(state.booking.status).toBe("COMPLETED");

      expect(state.booking.cancelledAt).toBeNull();

      expect(completeRow.consumedAt).toBeTruthy();
    }
  });

  test("a reassignment racing redemption never lets the replaced guide start the tour", async () => {
    const { bookingId } = await createBooking(guide1);

    const code = await generateConfirmationCode(touristToken, bookingId, "START");

    const [reassign, verify] = await Promise.all([
      api("PATCH", `/bookings/${bookingId}/guide`, {
        token: adminToken,
        body: {
          guideId: guide2.id,
        },
      }),
      verifyCode(guide1Token, bookingId, "START", code),
    ]);

    expect(reassign.status, JSON.stringify(reassign.body)).toBe(200);

    const state = await readChallenges(bookingId);

    if (verify.status === 200) {
      // guide1 was still assigned when it redeemed the code.
      expect(state.booking.status).toBe("IN_PROGRESS");

      expect(state.challenges[0].consumedByUserId).toBe(guide1.userId);
    } else {
      expectError(verify, 403, "NOT_ASSIGNED_GUIDE");

      expect(state.booking.status).toBe("CONFIRMED");

      expect(state.challenges[0]).toMatchObject({
        consumedAt: null,
        invalidationReason: "GUIDE_REASSIGNED",
      });
    }

    expect((await cancelBooking(bookingId)).status).toBe(200);
  });

  /**
   * =====================================================
   * G. One-open-code invariant
   * =====================================================
   */

  test("two open codes for one booking and action fail closed; a new code restores the invariant", async () => {
    const { bookingId } = await createBooking(guide1);

    const code = await generateConfirmationCode(touristToken, bookingId, "START");

    await duplicateOpenCode(bookingId, "START");

    // Even the genuine code is refused while the invariant is
    // broken: nothing is counted and nothing transitions.
    for (const attempt of [code, wrongCode(code)]) {
      expectError(
        await verifyCode(guide1Token, bookingId, "START", attempt),
        500,
        "CONFIRMATION_INTEGRITY_ERROR",
      );
    }

    let state = await readChallenges(bookingId);

    expect(state.booking.status).toBe("CONFIRMED");

    expect(activeChallenges(state)).toHaveLength(2);

    expect(state.challenges.every((row) => row.failedAttempts === 0)).toBe(true);

    // Generating invalidates every open code for the action.
    const fresh = await generateConfirmationCode(touristToken, bookingId, "START");

    state = await readChallenges(bookingId);

    expect(activeChallenges(state)).toHaveLength(1);

    expect(
      state.challenges.filter((row) => row.invalidationReason === "REPLACED"),
    ).toHaveLength(2);

    const started = await verifyCode(guide1Token, bookingId, "START", fresh);

    expect(started.status, JSON.stringify(started.body)).toBe(200);
  });

  /**
   * =====================================================
   * H. Rate limits (isolated process, limiter enabled)
   * =====================================================
   *
   * The local backend runs with rate limiting disabled, so the
   * helper boots the real app in its own process with
   * AUTH_RATE_LIMIT_ENABLED=true (environment only; backend/.env
   * is untouched) and fresh in-memory limiter stores.
   */

  test("generation and verification limits trip at their boundaries, per booking and action", async ({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Process-level limiter check runs once, in the chromium project.",
    );

    const bookingA = (await createBooking(guide1)).bookingId;

    const bookingB = (await createBooking(guide1)).bookingId;

    const result = await runBackendScript<{
      generation: Record<string, string | string[]>;
      verification: Record<string, string | string[]>;
    }>(HELPERS, ["lifecycle-ratelimit", bookingA, bookingB], {
      AUTH_RATE_LIMIT_ENABLED: "true",
      E2E_RL_TOURIST_TOKEN: touristToken,
      E2E_RL_GUIDE_TOKEN: guide1Token,
      E2E_RL_OTHER_TOURIST_TOKEN: otherTouristToken,
      E2E_RL_OTHER_GUIDE_TOKEN: guide2Token,
    });

    // Generation: 10 per user + booking + action.
    expect(result.generation).toEqual({
      withinLimit: Array(10).fill("201"),
      overLimit: "429",
      otherAction: "409:BOOKING_STATUS_MISMATCH",
      otherBooking: "201",
      otherUser: "403",
    });

    // Verification: 20 per user + booking + action. The code's own
    // 5-attempt cap is reached first; the limiter still caps volume.
    expect(result.verification).toEqual({
      withinLimit: [
        ...Array(4).fill("400:CODE_INCORRECT"),
        "429:TOO_MANY_ATTEMPTS",
        ...Array(15).fill("409:NO_ACTIVE_CODE"),
      ],
      overLimit: "429",
      otherAction: "409:BOOKING_STATUS_MISMATCH",
      otherBooking: "400:CODE_INCORRECT",
      otherGuide: "403:NOT_ASSIGNED_GUIDE",
    });
  });
});
