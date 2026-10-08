import { expect } from "@playwright/test";

import { execFile } from "node:child_process";

import crypto from "node:crypto";

import path from "node:path";

import { promisify } from "node:util";

import { api } from "./tour-confirmation";

/**
 * =========================================================
 * Throwaway E2E Identities (CR-032)
 * =========================================================
 *
 * Specs that need a tourist or a guide create their own, per
 * run, instead of logging in as shared real accounts:
 *
 * - tourists register through the API as e2e-*@travora.com;
 * - guides are created by the fixture helper as
 *   e2e-guide-*@travora.com (logins reject *@e2e.travora.test).
 *
 * Both patterns are the CR-018 cleanup scope: the accounts and
 * everything they own are deleted by the standard E2E cleanup,
 * and no real account's data is ever touched.
 */

const execFileAsync = promisify(execFile);

export interface FixtureTourist {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface FixtureGuide {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export function fixtureGuideName(guide: FixtureGuide) {
  return `${guide.firstName} ${guide.lastName}`;
}

function uniqueToken() {
  return `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}

/**
 * Runs a backend script and returns its E2E_FIXTURE_JSON output.
 */
export async function runBackendScript<T>(
  script: string,
  args: string[] = [],
  env: Record<string, string> = {},
): Promise<T> {
  const scriptPath = path.resolve(process.cwd(), "../backend/scripts", script);

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [scriptPath, ...args],
    {
      env: {
        ...process.env,

        ...env,
      },

      timeout: 30_000,

      maxBuffer: 16 * 1024 * 1024,
    },
  );

  if (stderr.trim()) {
    console.log(`${script} stderr:`, stderr.trim());
  }

  const fixtureLine = stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("E2E_FIXTURE_JSON="));

  if (!fixtureLine) {
    throw new Error(`No fixture output from ${script}.\n\n${stdout}`);
  }

  return JSON.parse(fixtureLine.slice("E2E_FIXTURE_JSON=".length)) as T;
}

/** Registers a throwaway tourist (e2e-<label>-<token>@travora.com). */
export async function createFixtureTourist(label: string): Promise<FixtureTourist> {
  const email = `e2e-${label}-${uniqueToken()}@travora.com`.toLowerCase();

  const password = `TravelerE2e${crypto.randomInt(100_000, 999_999)}`;

  const firstName = "E2E";

  const lastName = `Traveler ${label}`;

  const result = await api("POST", "/auth/register", {
    body: {
      firstName,
      lastName,
      email,
      password,
    },
  });

  expect(result.status, `register ${email}: ${JSON.stringify(result.body)}`).toBe(
    201,
  );

  return {
    id: result.body?.data?.id as string,
    email,
    password,
    firstName,
    lastName,
  };
}

/** Creates a throwaway fixture guide (e2e-guide-*@travora.com). */
export function createFixtureGuide(label: string) {
  return runBackendScript<FixtureGuide>("booking-lifecycle-e2e-helpers.js", [
    "create-guide",
    label,
  ]);
}
