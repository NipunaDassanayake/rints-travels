import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { createFixtureTourist, type FixtureTourist } from "./support/fixture-identities";

import { execFile } from "node:child_process";

import crypto from "node:crypto";

import fs from "node:fs";

import path from "node:path";

import { promisify } from "node:util";

/**
 * =========================================================
 * CR-012 Security Middleware and Session Hardening
 * =========================================================
 *
 * API-level checks talk to the backend with Node's fetch and
 * explicit cookie values, so every scenario (including
 * "responses arrive out of order") is deterministic rather than
 * timing-dependent. Each describe block registers its own
 * e2e-security-*@travora.com account (inside the CR-018 cleanup
 * scope), so the shared E2E accounts are never logged out.
 *
 * Everything runs once, in the chromium project.
 */

const execFileAsync = promisify(execFile);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

const BACKEND_ORIGIN = new URL(API_BASE_URL).origin;

const FRONTEND_URL = "http://localhost:3000";

const BACKEND_SCRIPTS = path.resolve(process.cwd(), "../backend/scripts");

const REFRESH_COOKIE = "travora_refresh_token";

const PASSWORD = "SecurityE2e123";

/**
 * Throwaway tourist created per run (CR-032 Stage 3A) -- never a real
 * account. The standard E2E cleanup deletes it and everything it owns.
 */
let e2eTourist: FixtureTourist;

test.beforeAll(async () => {
  e2eTourist = await createFixtureTourist("security");
});

const ADMIN_EMAIL = "admin@travora.com";

const ADMIN_PASSWORD = "Admin12345";

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

function chromiumOnly(testInfo: TestInfo) {
  return testInfo.project.name === "chromium";
}

function skipOutsideChromium(testInfo: TestInfo) {
  test.skip(
    !chromiumOnly(testInfo),
    "API-level security checks run once, in the chromium project.",
  );
}

function uniqueEmail(label: string) {
  const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;

  return `e2e-${label}-${suffix}@travora.com`.toLowerCase();
}

interface ApiResult {
  status: number;
  body: {
    message?: string;
    data?: Record<string, unknown> | null;
  } | null;
  headers: Headers;
  setCookies: string[];
}

async function api(
  method: string,
  route: string,
  {
    body,
    accessToken,
    refreshToken,
    headers = {},
  }: {
    body?: unknown;
    accessToken?: string;
    refreshToken?: string;
    headers?: Record<string, string>;
  } = {},
): Promise<ApiResult> {
  const frontendBaseURL = test.info().project.use.baseURL;
  if (!frontendBaseURL) throw new Error("Playwright frontend baseURL is required");

  const requestHeaders: Record<string, string> = {
    Origin: new URL(frontendBaseURL).origin,
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  if (refreshToken) {
    requestHeaders.Cookie = `${REFRESH_COOKIE}=${refreshToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${route}`, {
    method,
    headers: requestHeaders,
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
    setCookies: response.headers.getSetCookie(),
  };
}

function refreshCookieFrom(result: ApiResult) {
  const cookie = result.setCookies.find((value) =>
    value.startsWith(`${REFRESH_COOKIE}=`),
  );

  return cookie ? cookie.slice(REFRESH_COOKIE.length + 1).split(";")[0] : null;
}

function decodeJwt(token: string) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
}

interface Session {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

async function register(label: string) {
  const email = uniqueEmail(label);

  const result = await api("POST", "/auth/register", {
    body: {
      firstName: "Security",
      lastName: "Check",
      email,
      password: PASSWORD,
    },
  });

  expect(result.status, JSON.stringify(result.body)).toBe(201);

  return {
    id: result.body?.data?.id as string,
    email,
  };
}

async function login(email: string, password = PASSWORD): Promise<Session> {
  const result = await api("POST", "/auth/login", {
    body: {
      email,
      password,
    },
  });

  expect(result.status, JSON.stringify(result.body)).toBe(200);

  const accessToken = result.body?.data?.accessToken as string;

  const refreshToken = refreshCookieFrom(result);

  expect(refreshToken).toBeTruthy();

  return {
    accessToken,
    refreshToken: refreshToken as string,
    sessionId: decodeJwt(accessToken).sid,
  };
}

async function refresh(refreshToken: string) {
  const result = await api("POST", "/auth/refresh", {
    refreshToken,
  });

  return {
    ...result,
    newRefreshToken: refreshCookieFrom(result),
    accessToken: result.body?.data?.accessToken as string | undefined,
  };
}

async function me(accessToken: string) {
  return (await api("GET", "/auth/me", { accessToken })).status;
}

async function runScript(script: string, args: string[]) {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [path.join(BACKEND_SCRIPTS, script), ...args],
      {
        env: process.env,
        timeout: 120_000,
        maxBuffer: 16 * 1024 * 1024,
      },
    );

    return { exitCode: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };

    return {
      exitCode: typeof failure.code === "number" ? failure.code : 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
    };
  }
}

function parseMarker<T>(stdout: string, marker: string): T {
  const line = stdout
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${marker}=`));

  if (!line) {
    throw new Error(`No ${marker} output.\n${stdout}`);
  }

  return JSON.parse(line.slice(marker.length + 1)) as T;
}

async function helper<T>(scenario: string, ...args: string[]): Promise<T> {
  const result = await runScript("security-e2e-helpers.js", [scenario, ...args]);

  expect(result.exitCode, result.stderr).toBe(0);

  return parseMarker<T>(result.stdout, "E2E_FIXTURE_JSON");
}

interface SessionState {
  revoked: boolean;
  lastUsedAt: string | null;
}

async function loginThroughUi(page: Page, email: string) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(email);

  await page.getByLabel("Password").fill(PASSWORD);

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/");
}

/**
 * =========================================================
 * Security headers and removed debug routes
 * =========================================================
 */

test.describe("CR-012 security headers", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("the API sends security headers and hides X-Powered-By", async () => {
    const result = await api("GET", "/health");

    expect(result.status).toBe(200);

    expect(result.headers.get("x-content-type-options")).toBe("nosniff");

    expect(result.headers.get("x-powered-by")).toBeNull();

    expect(result.headers.get("cross-origin-resource-policy")).toBe("same-origin");
  });

  test("uploaded images stay loadable cross-origin from the frontend", async ({
    page,
  }) => {
    // Independent of package data: any uploaded file on disk.
    const uploadsDir = path.resolve(process.cwd(), "../backend/uploads/packages");

    const file = fs.existsSync(uploadsDir)
      ? fs.readdirSync(uploadsDir).find((name) => /\.(jpe?g|png|webp)$/i.test(name))
      : undefined;

    test.skip(!file, "No uploaded package image on disk to load.");

    const imageUrl = `${BACKEND_ORIGIN}/uploads/packages/${file}`;

    const response = await fetch(imageUrl);

    expect(response.status).toBe(200);

    expect(response.headers.get("cross-origin-resource-policy")).toBe("cross-origin");

    // The browser on :3000 loads it from :5000 exactly like the
    // site's next/image "unoptimized" images do; helmet's default
    // same-origin policy would block this load.
    await page.goto("/login");

    const naturalWidth = await page.evaluate(
      (src) =>
        new Promise<number>((resolve) => {
          const image = new Image();

          image.onload = () => resolve(image.naturalWidth);

          image.onerror = () => resolve(0);

          image.src = src;
        }),
      imageUrl,
    );

    expect(naturalWidth).toBeGreaterThan(0);
  });

  test("frontend pages send framing, sniffing and referrer protections", async () => {
    const response = await fetch(`${FRONTEND_URL}/login`);

    expect(response.headers.get("x-frame-options")).toBe("DENY");

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");

    expect(response.headers.get("referrer-policy")).toBe(
      "strict-origin-when-cross-origin",
    );

    expect(response.headers.get("x-powered-by")).toBeNull();
  });

  test("the temporary debug routes are gone, even for an admin", async () => {
    const admin = await login(ADMIN_EMAIL, ADMIN_PASSWORD);

    for (const route of ["/auth/protected-test", "/auth/admin-test"]) {
      const result = await api("GET", route, {
        accessToken: admin.accessToken,
      });

      expect(result.status, route).toBe(404);
    }
  });
});

/**
 * =========================================================
 * Session binding, rotation and lifetime
 * =========================================================
 */

test.describe("CR-012 sessions", () => {
  let user: { id: string; email: string };

  test.beforeAll(async ({}, testInfo) => {
    if (chromiumOnly(testInfo)) {
      user = await register("security-session");
    }
  });

  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("logout invalidates that session's access token immediately", async () => {
    const session = await login(user.email);

    expect(await me(session.accessToken)).toBe(200);

    const logout = await api("POST", "/auth/logout", {
      refreshToken: session.refreshToken,
    });

    expect(logout.status).toBe(200);

    expect(await me(session.accessToken)).toBe(401);

    expect((await refresh(session.refreshToken)).status).toBe(401);
  });

  test("logout-all invalidates every session's access and refresh tokens", async () => {
    const other = await register("security-logout-all");

    const first = await login(other.email);

    const second = await login(other.email);

    expect(await me(second.accessToken)).toBe(200);

    const logoutAll = await api("POST", "/auth/logout-all", {
      accessToken: first.accessToken,
      refreshToken: first.refreshToken,
    });

    expect(logoutAll.status).toBe(200);

    expect(await me(first.accessToken)).toBe(401);

    expect(await me(second.accessToken)).toBe(401);

    expect((await refresh(second.refreshToken)).status).toBe(401);
  });

  test("tokens without a session, with another algorithm or of the wrong type are rejected", async () => {
    const session = await login(user.email);

    const { token: legacy } = await helper<{ token: string }>(
      "mint-legacy-access",
      user.id,
    );

    expect(await me(legacy)).toBe(401);

    const { token: hs512 } = await helper<{ token: string }>(
      "mint-hs512-access",
      user.id,
      session.sessionId,
    );

    expect(await me(hs512)).toBe(401);

    expect(await me(session.refreshToken)).toBe(401);

    // The genuine token for the same session still works.
    expect(await me(session.accessToken)).toBe(200);
  });

  test("a refresh loser processed after the winner gets 409 and the session survives", async () => {
    const session = await login(user.email);

    const winner = await refresh(session.refreshToken);

    expect(winner.status).toBe(200);

    expect(winner.newRefreshToken).toBeTruthy();

    // The same (now rotated) token again: the loser, or a retry
    // sent before the winner's cookie reached the browser.
    const loser = await refresh(session.refreshToken);

    expect(loser.status).toBe(409);

    expect(loser.setCookies).toEqual([]);

    const retry = await refresh(winner.newRefreshToken as string);

    expect(retry.status).toBe(200);

    const state = await helper<SessionState>("session-state", session.sessionId);

    expect(state.revoked).toBe(false);
  });

  test("parallel refreshes with one token rotate it exactly once", async () => {
    for (let round = 0; round < 3; round += 1) {
      const session = await login(user.email);

      const results = await Promise.all(
        Array.from({ length: 5 }, () => refresh(session.refreshToken)),
      );

      const statuses = results.map((result) => result.status).sort();

      expect(statuses).toEqual([200, 409, 409, 409, 409]);

      for (const result of results) {
        if (result.status === 409) {
          expect(result.setCookies).toEqual([]);
        }
      }

      const winner = results.find((result) => result.status === 200);

      const next = await refresh(winner?.newRefreshToken as string);

      expect(next.status).toBe(200);

      expect(await me(next.accessToken as string)).toBe(200);
    }
  });

  test("T0 -> T1 -> T2, then replaying T0 revokes the session immediately", async () => {
    const t0 = await login(user.email);

    const t1 = await refresh(t0.refreshToken);

    expect(t1.status).toBe(200);

    const t2 = await refresh(t1.newRefreshToken as string);

    expect(t2.status).toBe(200);

    // Well inside the 10-second window, but T0 is no longer the
    // immediately previous token: reuse detection, no grace.
    const replay = await refresh(t0.refreshToken);

    expect(replay.status).toBe(401);

    expect(replay.setCookies).toEqual([]);

    expect((await refresh(t2.newRefreshToken as string)).status).toBe(401);

    expect(await me(t2.accessToken as string)).toBe(401);

    const state = await helper<SessionState>("session-state", t0.sessionId);

    expect(state.revoked).toBe(true);
  });

  test("continuous rotations cannot keep the grace open for an older token", async () => {
    // The holder of the newest token keeps rotating; only the token
    // it replaced last gets the 409 grace, and an older token is
    // detected at once.
    const t0 = await login(user.email);

    let current = t0.refreshToken;

    let previous = "";

    const rotate = async () => {
      const result = await refresh(current);

      expect(result.status).toBe(200);

      previous = current;

      current = result.newRefreshToken as string;

      return result;
    };

    await rotate(); // T0 -> T1

    await rotate(); // T1 -> T2

    // The immediately previous token (T1) still gets the grace.
    const predecessor = await refresh(previous);

    expect(predecessor.status).toBe(409);

    expect(predecessor.setCookies).toEqual([]);

    const latest = await rotate(); // T2 -> T3, rotations continue

    // The older token (T0) is replayed while rotations continue.
    const replay = await refresh(t0.refreshToken);

    expect(replay.status).toBe(401);

    // The whole session is gone, including the newest token holder.
    expect((await refresh(current)).status).toBe(401);

    expect(await me(latest.accessToken as string)).toBe(401);

    const state = await helper<SessionState>("session-state", t0.sessionId);

    expect(state.revoked).toBe(true);
  });

  test("logout with an older, still-valid token of the session ends the session", async () => {
    const t0 = await login(user.email);

    const t1 = await refresh(t0.refreshToken);

    const t2 = await refresh(t1.newRefreshToken as string);

    expect(t2.status).toBe(200);

    // Someone else holds T2; the user only has the older T0.
    const logout = await api("POST", "/auth/logout", {
      refreshToken: t0.refreshToken,
    });

    expect(logout.status).toBe(200);

    expect((await refresh(t2.newRefreshToken as string)).status).toBe(401);

    expect(await me(t2.accessToken as string)).toBe(401);

    const state = await helper<SessionState>("session-state", t0.sessionId);

    expect(state.revoked).toBe(true);
  });

  test("logout ignores tokens that are not validly signed for the session", async () => {
    const session = await login(user.email);

    // Tampered signature: logout stays idempotent and revokes nothing.
    const [header, payload] = session.refreshToken.split(".");

    const forged = `${header}.${payload}.${Buffer.from("not-the-signature").toString("base64url")}`;

    const logout = await api("POST", "/auth/logout", {
      refreshToken: forged,
    });

    expect(logout.status).toBe(200);

    expect(await me(session.accessToken)).toBe(200);

    const state = await helper<SessionState>("session-state", session.sessionId);

    expect(state.revoked).toBe(false);
  });

  test("an old refresh token replayed after the grace window revokes the session", async () => {
    const session = await login(user.email);

    const rotated = await refresh(session.refreshToken);

    expect(rotated.status).toBe(200);

    await helper("backdate-session", session.sessionId, "lastUsedAt", "11000");

    const replay = await refresh(session.refreshToken);

    expect(replay.status).toBe(401);

    expect(replay.setCookies).toEqual([]);

    // Reuse detection revoked the whole session.
    expect((await refresh(rotated.newRefreshToken as string)).status).toBe(401);

    expect(await me(rotated.accessToken as string)).toBe(401);

    const state = await helper<SessionState>("session-state", session.sessionId);

    expect(state.revoked).toBe(true);
  });

  test("a refresh that races a logout never revives the session", async () => {
    const session = await login(user.email);

    const rotated = await refresh(session.refreshToken);

    expect(rotated.status).toBe(200);

    const logout = await api("POST", "/auth/logout", {
      refreshToken: rotated.newRefreshToken as string,
    });

    expect(logout.status).toBe(200);

    const afterLogout = await refresh(rotated.newRefreshToken as string);

    expect(afterLogout.status).toBe(401);

    expect(afterLogout.setCookies).toEqual([]);

    expect(await me(rotated.accessToken as string)).toBe(401);
  });

  test("a session cannot be refreshed past its absolute lifetime", async () => {
    const session = await login(user.email);

    await helper(
      "backdate-session",
      session.sessionId,
      "createdAt",
      String(31 * 24 * 60 * 60 * 1000),
    );

    const result = await refresh(session.refreshToken);

    expect(result.status).toBe(401);

    const state = await helper<SessionState>("session-state", session.sessionId);

    expect(state.revoked).toBe(true);
  });

  test("a missing refresh cookie gets 401 without touching cookies", async () => {
    const result = await api("POST", "/auth/refresh");

    expect(result.status).toBe(401);

    expect(result.setCookies).toEqual([]);
  });
});

/**
 * =========================================================
 * Browser refresh behavior (single flight, 409 retry)
 * =========================================================
 */

test.describe("CR-012 browser session refresh", () => {
  let user: { id: string; email: string };

  test.beforeAll(async ({}, testInfo) => {
    if (chromiumOnly(testInfo)) {
      user = await register("security-browser");
    }
  });

  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  function countRequests(page: Page, suffix: string) {
    const counter = { count: 0 };

    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith(suffix)) {
        counter.count += 1;
      }
    });

    return counter;
  }

  test("a page load restores the session with exactly one refresh request", async ({
    page,
  }) => {
    await loginThroughUi(page, user.email);

    const refreshes = countRequests(page, "/auth/refresh");

    await page.goto("/tourist");

    await expect(page.getByRole("heading", { name: /my travel dashboard/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.waitForLoadState("networkidle");

    expect(refreshes.count).toBe(1);
  });

  test("a 409 refresh is retried and the session is restored", async ({ page }) => {
    await loginThroughUi(page, user.email);

    const logouts = countRequests(page, "/auth/logout");

    let refreshCalls = 0;

    await page.route("**/auth/refresh", async (route) => {
      refreshCalls += 1;

      if (refreshCalls <= 2) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "This session was just refreshed. Please retry.",
          }),
        });

        return;
      }

      await route.continue();
    });

    await page.goto("/tourist");

    await expect(page.getByRole("heading", { name: /my travel dashboard/i })).toBeVisible({
      timeout: 15_000,
    });

    expect(refreshCalls).toBe(3);

    expect(logouts.count).toBe(0);
  });

  test("persistent 409s end in a logged-out tab without logging the session out", async ({
    page,
    context,
  }) => {
    await loginThroughUi(page, user.email);

    const logouts = countRequests(page, "/auth/logout");

    let refreshCalls = 0;

    await page.route("**/auth/refresh", async (route) => {
      refreshCalls += 1;

      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          message: "This session was just refreshed. Please retry.",
        }),
      });
    });

    await page.goto("/tourist");

    await expect(page).toHaveURL(/\/login\?returnUrl=/, {
      timeout: 15_000,
    });

    // One attempt plus three retries, then the tab gives up.
    expect(refreshCalls).toBe(4);

    expect(logouts.count).toBe(0);

    // The server-side session was never touched.
    // The cookie is scoped to the /api/auth path.
    const cookie = (await context.cookies(`${API_BASE_URL}/auth/refresh`)).find(
      (candidate) => candidate.name === REFRESH_COOKIE,
    );

    expect(cookie).toBeTruthy();

    expect((await refresh(cookie?.value as string)).status).toBe(200);
  });
});

/**
 * =========================================================
 * Rate limiting (IPv6, shared IPs, spoofing)
 * =========================================================
 */

test.describe("CR-012 rate limiting", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("limiter keys handle IPv6 prefixes, mapped IPv4, shared IPs and spoofing", async () => {
    const harness = await helper<{
      loginAccountMax: number;
      loginIpMax: number;
      ipv6: Record<string, number | number[]>;
      mappedIpv4: Record<string, number | number[]>;
      emailNormalization: Record<string, number | number[]>;
      sharedIpv4: Record<string, number | number[]>;
      stuffing: Record<string, number | number[]>;
      successes: Record<string, number | number[]>;
      spoofedForwardedFor: Record<string, number | number[]>;
    }>("ratelimit-harness");

    const failures = (count: number) => Array.from({ length: count }, () => 401);

    const accountFailures = failures(harness.loginAccountMax);

    // One IPv6 /56 is one client; other networks are unaffected.
    expect(harness.ipv6).toEqual({
      failures: accountFailures,
      sameSlash56OtherSlash64: 429,
      sameSlash56OtherHost: 429,
      otherSlash56: 401,
      otherSlash56CorrectPassword: 200,
    });

    // IPv4-mapped IPv6 and plain IPv4 share one bucket.
    expect(harness.mappedIpv4).toEqual({
      failures: accountFailures,
      plain: 429,
      mapped: 429,
    });

    // Email case and whitespace cannot split an account bucket.
    expect(harness.emailNormalization).toEqual({
      failures: accountFailures,
      next: 429,
    });

    // Behind one shared IP, a locked account does not lock others.
    expect(harness.sharedIpv4).toEqual({
      accountAFailures: accountFailures,
      accountANext: 429,
      accountBSuccesses: [200, 200, 200, 200, 200],
      accountBFailure: 401,
    });

    // The per-IP stuffing guard is the only shared limit.
    expect(harness.stuffing).toEqual({
      failures: failures(harness.loginIpMax),
      nextNewEmail: 429,
      nextCorrectPassword: 429,
      otherIp: 401,
    });

    // Successful logins are never counted.
    expect(harness.successes).toEqual({
      successes: Array.from({ length: 50 }, () => 200),
      failuresAfter: accountFailures,
      nextAfterFailures: 429,
    });

    // Without a trusted proxy, X-Forwarded-For cannot split a client.
    expect(harness.spoofedForwardedFor).toEqual({
      failures: accountFailures,
      next: 429,
    });
  });

  test("the live backend limits failed logins per account without blocking others", async () => {
    const email = uniqueEmail("ratelimit");

    const attempt = (headers: Record<string, string> = {}) =>
      api("POST", "/auth/login", {
        body: {
          email,
          password: "Wrong-Password-1",
        },
        headers,
      });

    for (let index = 0; index < 5; index += 1) {
      expect((await attempt()).status).toBe(401);
    }

    const limited = await attempt();

    expect(limited.status).toBe(429);

    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);

    expect(limited.headers.get("ratelimit")).toBeTruthy();

    expect(limited.setCookies).toEqual([]);

    expect(limited.body?.message).toBe("Too many attempts. Please try again later.");

    // A client-supplied X-Forwarded-For is not trusted.
    for (const forwarded of ["203.0.113.77", "2001:db8:77::1"]) {
      expect((await attempt({ "X-Forwarded-For": forwarded })).status).toBe(429);
    }

    // Another account from the same address still signs in.
    const tourist = await login(e2eTourist.email, e2eTourist.password);

    expect(await me(tourist.accessToken)).toBe(200);
  });
});

/**
 * =========================================================
 * Session-row cleanup (dry run only)
 * =========================================================
 */

test.describe("CR-012 session cleanup", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("the dry run selects only rows dead for longer than the retention period", async () => {
    // Never logs in: its only sessions are the fixtures.
    const fixtureUser = await register("security-cleanup");

    await helper("seed-cleanup-fixtures", fixtureUser.id);

    const result = await runScript("cleanup-auth-sessions.js", [
      "--json",
      "--only-user",
      fixtureUser.id,
    ]);

    expect(result.exitCode, result.stderr).toBe(0);

    const report = parseMarker<Record<string, unknown>>(
      result.stdout,
      "AUTH_SESSION_CLEANUP_JSON",
    );

    expect(report).toMatchObject({
      mode: "dry-run",
      retentionDays: 7,
      scoped: true,
      wouldDelete: 3,
      revokedPastRetention: 2,
      expiredPastRetention: 1,
      kept: {
        active: 1,
        revokedWithinRetention: 2,
        expiredWithinRetention: 1,
      },
      total: 7,
    });
  });

  test("unsafe cleanup invocations are refused before anything is deleted", async () => {
    const refusals: Array<[string[], string]> = [
      [["--retention-days", "3"], "at least 7"],
      [["--only-user", "00000000-0000-4000-8000-000000000000"], "E2E-created account"],
      [["--execute"], "requires --cutoff and --expected-count"],
      [
        ["--execute", "--only-user", "00000000-0000-4000-8000-000000000000"],
        "only allowed in dry-run mode",
      ],
      [
        // A cutoff inside the retention period. --expected-count 0
        // means even a hypothetical bug could delete nothing.
        ["--execute", "--cutoff", new Date().toISOString(), "--expected-count", "0"],
        "within the 7-day retention period",
      ],
    ];

    for (const [args, message] of refusals) {
      const result = await runScript("cleanup-auth-sessions.js", args);

      expect(result.exitCode, args.join(" ")).not.toBe(0);

      expect(result.stderr, args.join(" ")).toContain(message);
    }
  });
});

/**
 * =========================================================
 * Startup configuration guards (cookies, TRUST_PROXY)
 * =========================================================
 *
 * Each case loads backend/src/config/env.js in a fresh Node
 * process (cwd backend, so backend/.env supplies the remaining
 * variables; explicit values here take precedence). Nothing is
 * started and no database is touched.
 */

const BACKEND_DIR = path.resolve(process.cwd(), "../backend");

const ENV_CHECK_SCRIPT = `
try {
  const env = require("./src/config/env");
  console.log("ENV_CHECK_JSON=" + JSON.stringify({
    ok: true,
    nodeEnv: env.nodeEnv,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    trustProxy: env.trustProxy,
  }));
} catch (error) {
  console.log("ENV_CHECK_JSON=" + JSON.stringify({ ok: false, error: error.message }));
}
`;

interface EnvCheck {
  ok: boolean;
  error?: string;
  nodeEnv?: string;
  secure?: boolean;
  sameSite?: string;
  trustProxy?: unknown;
}

async function checkEnv(overrides: Record<string, string>): Promise<EnvCheck> {
  const { stdout } = await execFileAsync(process.execPath, ["-e", ENV_CHECK_SCRIPT], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      NODE_ENV: "development",
      COOKIE_SECURE: "false",
      COOKIE_SAME_SITE: "strict",
      TRUST_PROXY: "",
      ...overrides,
    },
    timeout: 60_000,
  });

  return parseMarker<EnvCheck>(stdout, "ENV_CHECK_JSON");
}

test.describe("CR-012 configuration guards", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("production refuses insecure refresh-cookie settings", async () => {
    const insecureProduction = await checkEnv({
      NODE_ENV: "production",
      COOKIE_SECURE: "false",
    });

    expect(insecureProduction.ok).toBe(false);

    expect(insecureProduction.error).toContain("COOKIE_SECURE must be true in production");

    const noneWithoutSecure = await checkEnv({
      COOKIE_SAME_SITE: "none",
      COOKIE_SECURE: "false",
    });

    expect(noneWithoutSecure.ok).toBe(false);

    expect(noneWithoutSecure.error).toContain(
      "COOKIE_SAME_SITE=none requires COOKIE_SECURE=true",
    );

    const noneWithoutSecureInProduction = await checkEnv({
      NODE_ENV: "production",
      COOKIE_SAME_SITE: "none",
      COOKIE_SECURE: "false",
    });

    expect(noneWithoutSecureInProduction.ok).toBe(false);
  });

  test("valid production and local cookie settings start", async () => {
    expect(
      await checkEnv({
        NODE_ENV: "production",
        COOKIE_SECURE: "true",
        COOKIE_SAME_SITE: "strict",
      }),
    ).toMatchObject({
      ok: true,
      nodeEnv: "production",
      secure: true,
      sameSite: "strict",
    });

    expect(
      await checkEnv({
        NODE_ENV: "production",
        COOKIE_SECURE: "true",
        COOKIE_SAME_SITE: "none",
      }),
    ).toMatchObject({
      ok: true,
      secure: true,
      sameSite: "none",
    });

    // Local development over plain HTTP stays allowed.
    expect(
      await checkEnv({
        COOKIE_SECURE: "false",
        COOKIE_SAME_SITE: "lax",
      }),
    ).toMatchObject({
      ok: true,
      nodeEnv: "development",
      secure: false,
    });
  });

  test("TRUST_PROXY accepts only safe, explicit forms", async () => {
    const accepted: Array<[string, unknown]> = [
      ["", false],
      ["false", false],
      ["1", 1],
      ["10", 10],
      ["loopback", ["loopback"]],
      [
        "loopback, 10.0.0.0/8, 2001:db8::/32, 192.0.2.1",
        ["loopback", "10.0.0.0/8", "2001:db8::/32", "192.0.2.1"],
      ],
    ];

    for (const [value, expected] of accepted) {
      const result = await checkEnv({ TRUST_PROXY: value });

      expect(result, `TRUST_PROXY="${value}"`).toMatchObject({
        ok: true,
        trustProxy: expected,
      });
    }

    const rejected = [
      "true",
      "TRUE",
      "*",
      "0",
      "11",
      "0.0.0.0/0",
      "::/0",
      "10.0.0.0/33",
      "10.0.0.1/8/1",
      "not-an-ip",
      "loopback,",
    ];

    for (const value of rejected) {
      const result = await checkEnv({ TRUST_PROXY: value });

      expect(result.ok, `TRUST_PROXY="${value}"`).toBe(false);

      expect(result.error, `TRUST_PROXY="${value}"`).toContain("unsupported TRUST_PROXY");
    }
  });
});
