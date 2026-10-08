import AxeBuilder from "@axe-core/playwright";

import { expect, test, type Page } from "@playwright/test";

import {
  LifecycleWorld,
  TARGET_STATUS,
  TIMESTAMP_FIELD,
  readChallenges,
  wrongCode,
} from "./support/lifecycle-fixtures";

import { API_BASE_URL, type LifecycleAction } from "./support/tour-confirmation";

/**
 * =========================================================
 * CR-032 Stage 3B -- Guide confirmation UI resilience (D7)
 * =========================================================
 *
 * Real backend, throwaway accounts (LifecycleWorld). The guide's
 * success can be lost on the way back (network drop) or seen only on
 * a retry (409 with the target status). Either way the booking moved
 * exactly once, so the guide must see success -- never an error --
 * and the timestamps must not change.
 */

let world: LifecycleWorld;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  world = await LifecycleWorld.create("guide-ui");
});

const LABEL: Record<LifecycleAction, string> = {
  START: "Start tour",
  COMPLETE: "Complete tour",
};

const ANNOUNCEMENT: Record<LifecycleAction, string> = {
  START: "Tour started. This booking is now in progress.",
  COMPLETE: "Tour completed. The traveler can now leave a review.",
};

const STATE_TEXT: Record<LifecycleAction, string> = {
  START: "Tour in progress",
  COMPLETE: "Tour completed",
};

async function openAsGuide(page: Page, bookingId: string) {
  await page.context().clearCookies();

  await page.goto("/login");

  await page.getByLabel("Email").fill(world.guide1.email);

  await page.getByLabel("Password").fill(world.guide1.password);

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

  await page.goto(`/guide/bookings/${bookingId}`);

  await expect(page.getByText("Assigned tour", { exact: true })).toBeVisible({ timeout: 15_000 });
}

async function enterCode(page: Page, action: LifecycleAction, code: string) {
  await page.getByRole("button", { name: LABEL[action] }).click();

  const dialog = page.getByRole("dialog", { name: LABEL[action] });

  await expect(dialog).toBeVisible();

  await dialog.getByLabel("Confirmation code").fill(code);

  await dialog.getByRole("button", { name: LABEL[action] }).click();

  return dialog;
}

async function expectSucceededOnce(page: Page, bookingId: string, action: LifecycleAction, stamp?: string) {
  await expect(page.getByRole("status").filter({ hasText: ANNOUNCEMENT[action] })).toHaveCount(1);

  await expect(page.getByText(STATE_TEXT[action], { exact: true })).toBeVisible();

  // Never a misleading error.
  await expect(page.getByText(/couldn't reach Travora|no longer available|incorrect/i)).toHaveCount(0);

  const state = await readChallenges(bookingId);

  expect(state.booking.status).toBe(TARGET_STATUS[action]);

  expect(state.challenges.filter((row) => row.action === action && row.consumedAt)).toHaveLength(1);

  if (stamp) {
    expect(new Date(state.booking[TIMESTAMP_FIELD[action]]!).toISOString()).toBe(new Date(stamp).toISOString());
  }

  return state;
}

for (const action of ["START", "COMPLETE"] as const) {
  const endpoint = action === "START" ? "start" : "complete";

  test.describe(`${action} in the guide UI`, () => {
    test(`${action}: a lost success response is confirmed by refetching, once`, async ({ page }) => {
      const bookingId = await world.bookingReadyFor(action);

      const code = await world.code(bookingId, action);

      await openAsGuide(page, bookingId);

      let serverStatus = 0;

      // The request reaches the backend and succeeds, but the browser
      // never sees the answer.
      await page.route(`${API_BASE_URL}/bookings/guide/${bookingId}/${endpoint}`, async (route) => {
        const response = await route.fetch();

        serverStatus = response.status();

        await route.abort("connectionreset");
      });

      const dialog = await enterCode(page, action, code);

      await expect(dialog).toBeHidden({ timeout: 15_000 });

      expect(serverStatus).toBe(200);

      const state = await expectSucceededOnce(page, bookingId, action);

      // A retry still cannot transition twice or move the timestamp.
      const stamp = state.booking[TIMESTAMP_FIELD[action]]!;

      await page.unroute(`${API_BASE_URL}/bookings/guide/${bookingId}/${endpoint}`);

      const retry = await world.verify(bookingId, action, code);

      expect(retry.status).toBe(409);

      expect((await readChallenges(bookingId)).booking[TIMESTAMP_FIELD[action]]).toBe(stamp);
    });

    test(`${action}: a retry after an unseen success shows success, not an error`, async ({ page }) => {
      const bookingId = await world.bookingReadyFor(action);

      const code = await world.code(bookingId, action);

      // The page still shows the earlier state...
      await openAsGuide(page, bookingId);

      // ...while the first attempt had already succeeded.
      const first = await world.verify(bookingId, action, code);

      expect(first.status).toBe(200);

      const stamp = first.body?.data?.[TIMESTAMP_FIELD[action]] as string;

      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/bookings/guide/${bookingId}/${endpoint}`) &&
          response.request().method() === "POST",
      );

      const dialog = await enterCode(page, action, code);

      const response = await responsePromise;

      expect(response.status()).toBe(409);

      expect((await response.json()).errors).toMatchObject({
        code: "BOOKING_STATUS_MISMATCH",
        currentStatus: TARGET_STATUS[action],
      });

      await expect(dialog).toBeHidden({ timeout: 15_000 });

      await expectSucceededOnce(page, bookingId, action, stamp);
    });

    test(`${action}: a wrong code says how many attempts remain and keeps the dialog usable`, async ({ page }) => {
      const bookingId = await world.bookingReadyFor(action);

      const code = await world.code(bookingId, action);

      await openAsGuide(page, bookingId);

      const dialog = await enterCode(page, action, wrongCode(code));

      await expect(dialog.getByRole("alert")).toHaveText(
        "That code is incorrect. 4 attempts remaining before the traveler needs a new code.",
      );

      await expect(dialog.getByLabel("Confirmation code")).toHaveAttribute("aria-invalid", "true");

      await dialog.getByLabel("Confirmation code").fill(code);

      await dialog.getByRole("button", { name: LABEL[action] }).click();

      await expect(dialog).toBeHidden({ timeout: 15_000 });

      await expectSucceededOnce(page, bookingId, action);
    });
  });
}

/* ================================================================ */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("guide confirmation dialog accessibility", () => {
  for (const width of [390, 1440]) {
    test(`keyboard-only use, focus handling and axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      const bookingId = await world.bookingReadyFor("START");

      const code = await world.code(bookingId, "START");

      await openAsGuide(page, bookingId);

      const opener = page.getByRole("button", { name: "Start tour" });

      await opener.focus();

      await page.keyboard.press("Enter");

      const dialog = page.getByRole("dialog", { name: "Start tour" });

      await expect(dialog).toBeVisible();

      await expect(dialog).toHaveAccessibleDescription(/^Ask the traveler to open this booking/);

      // Focus lands on the labelled code input.
      const input = dialog.getByLabel("Confirmation code");

      await expect(input).toBeFocused();

      await expect(input).toHaveAttribute("inputmode", "numeric");

      await expect(input).toHaveAttribute("autocomplete", "one-time-code");

      await expect(input).toHaveAttribute("maxlength", "6");

      // One control per name: no duplicated accessible controls.
      for (const name of ["Close", "Cancel", "Start tour"]) {
        await expect(dialog.getByRole("button", { name, exact: true })).toHaveCount(1);
      }

      const scanDialog = async () => {
        const results = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(WCAG_TAGS).analyze();

        expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);

        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
        ).toBe(true);
      };

      await scanDialog();

      // A wrong code, keyboard only: announced as an alert, not by colour.
      await page.keyboard.type(wrongCode(code));

      await page.keyboard.press("Enter");

      await expect(dialog.getByRole("alert")).toHaveText(/^That code is incorrect\./);

      await expect(input).toHaveAttribute("aria-invalid", "true");

      await scanDialog();

      // Escape closes and returns focus to the opener.
      await page.keyboard.press("Escape");

      await expect(dialog).toBeHidden();

      await expect(opener).toBeFocused();

      // Reopen, enter the right code; after the transition focus
      // moves to the updated tour actions.
      await page.keyboard.press("Enter");

      await expect(dialog.getByLabel("Confirmation code")).toBeFocused();

      await page.keyboard.type(code);

      await page.keyboard.press("Enter");

      await expect(dialog).toBeHidden({ timeout: 15_000 });

      await expect(page.getByText("Tour actions", { exact: true })).toBeFocused();

      await expect(page.getByRole("status").filter({ hasText: ANNOUNCEMENT.START })).toHaveCount(1);
    });
  }
});
