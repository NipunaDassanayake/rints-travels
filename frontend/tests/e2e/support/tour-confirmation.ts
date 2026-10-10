import { expect, test, type Page } from "@playwright/test";

import { appendFileSync } from "node:fs";

/**
 * =========================================================
 * CR-032 Tour Confirmation Test Support
 * =========================================================
 *
 * Starting and completing a tour needs a confirmation code that
 * the traveler generates and the assigned guide enters. Specs
 * that drive the guide UI get the traveler's code through the
 * API (as the traveler's own device would) and enter it in the
 * guide's code dialog.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

export type LifecycleAction = "START" | "COMPLETE";

/**
 * Codes and hashes seen by the specs, appended to
 * E2E_CODE_AUDIT_FILE when set (CR-032 Stage 3B), so a post-run
 * audit can prove none of them reached the backend log.
 */
export function recordForLogAudit(...values: string[]) {
  const file = process.env.E2E_CODE_AUDIT_FILE;

  if (file) {
    appendFileSync(file, values.filter(Boolean).map((value) => `${value}\n`).join(""));
  }
}

export interface ApiErrorDetails {
  code?: string;

  currentStatus?: string;

  attemptsRemaining?: number;
}

export interface ApiResult {
  status: number;

  body: {
    success?: boolean;

    message?: string;

    data?: Record<string, unknown> | null;

    errors?: ApiErrorDetails | string[] | null;
  } | null;

  headers: Headers;
}

/** The structured error details of a failed response ({} if none). */
export function errorDetails(result: ApiResult): ApiErrorDetails {
  const errors = result.body?.errors;

  return errors && !Array.isArray(errors) ? errors : {};
}

export async function api(
  method: string,
  route: string,
  { token, body }: { token?: string; body?: unknown } = {},
): Promise<ApiResult> {
  const frontendBaseURL = test.info().project.use.baseURL;
  if (!frontendBaseURL) throw new Error("Playwright frontend baseURL is required");

  const headers: Record<string, string> = {
    Origin: new URL(frontendBaseURL).origin,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();

  let parsed: ApiResult["body"] = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return {
    status: response.status,
    body: parsed,
    headers: response.headers,
  };
}

/** Logs in through the API and returns an access token. */
export async function apiLogin(email: string, password: string) {
  const result = await api("POST", "/auth/login", {
    body: {
      email,
      password,
    },
  });

  expect(result.status, `login ${email}: ${JSON.stringify(result.body)}`).toBe(
    200,
  );

  return result.body?.data?.accessToken as string;
}

/** The traveler generates a confirmation code (plaintext, once). */
export async function generateConfirmationCode(
  touristToken: string,
  bookingId: string,
  action: LifecycleAction,
) {
  const result = await api("POST", `/bookings/${bookingId}/lifecycle-challenges`, {
    token: touristToken,
    body: {
      action,
    },
  });

  expect(result.status, JSON.stringify(result.body)).toBe(201);

  const code = result.body?.data?.code as string;

  expect(code).toMatch(/^\d{6}$/);

  recordForLogAudit(code);

  return code;
}

/**
 * On the guide's booking page: opens the Start tour / Complete
 * tour code dialog, enters the traveler's code and submits it.
 * Returns the verification response.
 */
export async function enterGuideConfirmationCode(
  page: Page,
  bookingId: string,
  action: LifecycleAction,
  code: string,
) {
  const label = action === "START" ? "Start tour" : "Complete tour";

  const opener = page.getByRole("button", {
    name: label,
  });

  await expect(opener).toBeVisible();

  await expect(opener).toBeEnabled();

  await opener.click();

  const dialog = page.getByRole("dialog", {
    name: label,
  });

  await expect(dialog).toBeVisible();

  const codeInput = dialog.getByLabel("Confirmation code");

  await expect(codeInput).toBeFocused();

  await codeInput.fill(code);

  const endpoint = action === "START" ? "start" : "complete";

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/bookings/guide/${bookingId}/${endpoint}`) &&
      response.request().method() === "POST",
  );

  await dialog
    .getByRole("button", {
      name: label,
    })
    .click();

  const response = await responsePromise;

  return {
    response,
    dialog,
  };
}
