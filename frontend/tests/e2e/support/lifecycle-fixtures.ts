import { expect } from "@playwright/test";

import {
  createFixtureGuide,
  createFixtureTourist,
  runBackendScript,
  type FixtureGuide,
  type FixtureTourist,
} from "./fixture-identities";

import {
  api,
  apiLogin,
  errorDetails,
  recordForLogAudit,
  type ApiResult,
  type LifecycleAction,
} from "./tour-confirmation";

/**
 * =========================================================
 * CR-032 Lifecycle Fixtures (Stage 3B)
 * =========================================================
 *
 * Shared by the lifecycle matrix and guide UI specs: throwaway
 * actors, fixture bookings in a chosen lifecycle state, and the
 * confirmation-code API calls. Everything is created for E2E-owned
 * accounts only and removed by the standard cleanup.
 */

export const TARGET_STATUS: Record<LifecycleAction, string> = {
  START: "IN_PROGRESS",
  COMPLETE: "COMPLETED",
};

export const SOURCE_STATUS: Record<LifecycleAction, string> = {
  START: "CONFIRMED",
  COMPLETE: "IN_PROGRESS",
};

export const TIMESTAMP_FIELD: Record<LifecycleAction, "startedAt" | "completedAt"> = {
  START: "startedAt",
  COMPLETE: "completedAt",
};

export interface ChallengeRow {
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

export interface ChallengeState {
  booking: {
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
  };
  challenges: ChallengeRow[];
}

const HELPERS = "booking-lifecycle-e2e-helpers.js";

export async function readChallenges(bookingId: string) {
  const state = await runBackendScript<ChallengeState>(HELPERS, ["challenges", bookingId]);

  recordForLogAudit(...state.challenges.map((row) => row.codeHash));

  return state;
}

export function expireOpenCode(bookingId: string, action: LifecycleAction) {
  return runBackendScript<{ expired: number }>(HELPERS, ["expire", bookingId, action]);
}

export function duplicateOpenCode(bookingId: string, action: LifecycleAction) {
  return runBackendScript<{ duplicateId: string }>(HELPERS, ["duplicate-open", bookingId, action]);
}

export function unassignGuide(bookingId: string) {
  return runBackendScript<{ unassigned: boolean }>(HELPERS, ["unassign-guide", bookingId]);
}

export function openChallenges(state: ChallengeState, action?: LifecycleAction) {
  return state.challenges.filter(
    (row) => !row.consumedAt && !row.invalidatedAt && (!action || row.action === action),
  );
}

/** A 6-digit code guaranteed to differ from `code`. */
export function wrongCode(code: string) {
  return String((Number(code) + 1) % 1_000_000).padStart(6, "0");
}

export function expectError(
  result: ApiResult,
  status: number,
  code?: string,
  extra: Record<string, unknown> = {},
) {
  expect(result.status, JSON.stringify(result.body)).toBe(status);

  if (code) {
    expect(errorDetails(result)).toMatchObject({ code, ...extra });
  }
}

/**
 * Throwaway actors for one spec run: the owning traveler, another
 * traveler, two guides and the admin token.
 */
export class LifecycleWorld {
  tourist!: FixtureTourist;

  touristToken = "";

  otherTouristToken = "";

  adminToken = "";

  guide1!: FixtureGuide;

  guide1Token = "";

  guide2!: FixtureGuide;

  guide2Token = "";

  static async create(label: string) {
    const world = new LifecycleWorld();

    world.tourist = await createFixtureTourist(label);

    const other = await createFixtureTourist(`${label}-other`);

    world.guide1 = await createFixtureGuide(`${label}-1`);

    world.guide2 = await createFixtureGuide(`${label}-2`);

    [world.touristToken, world.otherTouristToken, world.adminToken, world.guide1Token, world.guide2Token] =
      await Promise.all([
        apiLogin(world.tourist.email, world.tourist.password),
        apiLogin(other.email, other.password),
        apiLogin(
          process.env.E2E_ADMIN_EMAIL ?? "admin@travora.com",
          process.env.E2E_ADMIN_PASSWORD ?? "Admin12345",
        ),
        apiLogin(world.guide1.email, world.guide1.password),
        apiLogin(world.guide2.email, world.guide2.password),
      ]);

    return world;
  }

  guideToken(guide: FixtureGuide) {
    return guide.id === this.guide1.id ? this.guide1Token : this.guide2Token;
  }

  /** A fresh CONFIRMED booking, assigned to `guide` (or unassigned). */
  async createBooking(guide: FixtureGuide | null = this.guide1) {
    const fixture = await runBackendScript<{ bookingId: string; status: string }>(
      "prepare-booking-lifecycle-e2e.js",
      [],
      {
        E2E_TOURIST_EMAIL: this.tourist.email,
        E2E_GUIDE_EMAIL: (guide ?? this.guide1).email,
      },
    );

    expect(fixture.status).toBe("CONFIRMED");

    if (guide) {
      const assigned = await this.assignGuide(fixture.bookingId, guide);

      expect(assigned.status, JSON.stringify(assigned.body)).toBe(200);
    }

    return fixture.bookingId;
  }

  /** A booking in the state `action` starts from, with `guide` assigned. */
  async bookingReadyFor(action: LifecycleAction, guide: FixtureGuide = this.guide1) {
    const bookingId = await this.createBooking(guide);

    if (action === "COMPLETE") {
      await this.transition(bookingId, "START", guide);
    }

    return bookingId;
  }

  assignGuide(bookingId: string, guide: FixtureGuide) {
    return api("PATCH", `/bookings/${bookingId}/guide`, {
      token: this.adminToken,
      body: { guideId: guide.id },
    });
  }

  async requestCode(bookingId: string, action: LifecycleAction, token = this.touristToken) {
    const result = await api("POST", `/bookings/${bookingId}/lifecycle-challenges`, {
      token,
      body: { action },
    });

    if (result.status === 201) {
      recordForLogAudit(String(result.body?.data?.code ?? ""));
    }

    return result;
  }

  async code(bookingId: string, action: LifecycleAction) {
    const result = await this.requestCode(bookingId, action);

    expect(result.status, JSON.stringify(result.body)).toBe(201);

    return result.body?.data?.code as string;
  }

  verify(bookingId: string, action: LifecycleAction, code: unknown, token = this.guide1Token) {
    if (typeof code === "string") {
      recordForLogAudit(code);
    }

    return api("POST", `/bookings/guide/${bookingId}/${action === "START" ? "start" : "complete"}`, {
      token,
      body: code === undefined ? {} : { code },
    });
  }

  /** Performs a confirmed transition (generate + redeem). */
  async transition(bookingId: string, action: LifecycleAction, guide: FixtureGuide = this.guide1) {
    const code = await this.code(bookingId, action);

    const result = await this.verify(bookingId, action, code, this.guideToken(guide));

    expect(result.status, JSON.stringify(result.body)).toBe(200);

    return result;
  }

  cancel(bookingId: string, token = this.adminToken) {
    return api("PATCH", `/bookings/${bookingId}/status`, {
      token,
      body: { status: "CANCELLED" },
    });
  }

  setStatus(bookingId: string, status: string, token: string) {
    return api("PATCH", `/bookings/${bookingId}/status`, {
      token,
      body: { status },
    });
  }

  /** Frees guide2's schedule when a test leaves it an active booking. */
  async releaseIfActive(bookingId: string) {
    const state = await readChallenges(bookingId);

    if (["CONFIRMED", "IN_PROGRESS"].includes(state.booking.status)) {
      expect((await this.cancel(bookingId)).status).toBe(200);
    }
  }
}
