import AxeBuilder from "@axe-core/playwright";

import { expect, test, type Page } from "@playwright/test";

import { createFixtureTourist, type FixtureTourist } from "./support/fixture-identities";

/**
 * =========================================================
 * CR-032 Stage 2 -- Traveler tour confirmation UI
 * =========================================================
 *
 * The traveler logs in as a throwaway E2E tourist (e2e-*@travora.com,
 * removed by the standard cleanup) -- never a real account. Every
 * booking read and every code generation is answered by route
 * interception, so nothing is generated, started or completed on the
 * backend. The browser clock is controlled so countdowns, expiry and
 * polling are deterministic.
 */

test.use({ timezoneId: "UTC" });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** The traveler's clock. */
const NOW = new Date("2026-10-07T10:00:00.000Z");

/**
 * The server's clock, two hours ahead on purpose: the countdown must
 * follow the server's expiresAt, corrected for clock skew, not the
 * client clock and not an assumed five minutes.
 */
const SERVER_NOW = new Date("2026-10-07T12:00:00.000Z");

const uid = (n: number) => `5a6b7c8d-9e0f-4a1b-8c2d-${String(n).padStart(12, "0")}`;

type Json = Record<string, unknown>;

function guideRecord(n: number, firstName: string, lastName: string): Json {
  return {
    id: uid(900 + n),
    userId: uid(910 + n),
    bio: "Hill-country walking and culture specialist.",
    experienceYears: 9,
    languages: ["English", "Sinhala"],
    specializations: ["Culture"],
    location: "Kandy",
    dailyRate: "60.00",
    averageRating: "4.80",
    totalReviews: 12,
    isAvailable: true,
    user: { id: uid(910 + n), firstName, lastName },
  };
}

const ASHA = guideRecord(1, "Asha", "Fernando");

const RUWAN = guideRecord(2, "Ruwan", "Silva");

function day(date: string) {
  return `${date}T00:00:00.000Z`;
}

function bookingRecord(n: number, overrides: Json = {}, guide: Json | null = ASHA): Json {
  const quotationId = uid(100 + n);

  const requestId = uid(n);

  const paymentId = uid(200 + n);

  return {
    id: uid(300 + n),
    tourRequestId: requestId,
    quotationId,
    paymentId,
    touristId: uid(999),
    bookingReference: `BK-CR032-S2-${n}`,
    status: "CONFIRMED",
    startDate: day("2026-10-19"),
    endDate: day("2026-10-25"),
    totalAmount: "2360.00",
    currency: "USD",
    confirmedAt: "2026-10-03T09:35:00.000Z",
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: "2026-10-03T09:35:00.000Z",
    updatedAt: "2026-10-03T09:35:00.000Z",
    tourRequest: {
      id: requestId,
      touristId: uid(999),
      packageId: null,
      preferredGuideId: null,
      requestType: "CUSTOM",
      title: "Hill country escape",
      preferredStartDate: day("2026-10-19"),
      preferredEndDate: day("2026-10-25"),
      adultCount: 2,
      childCount: 0,
      destinationPreferences: "Kandy and Ella",
      budget: "2500.00",
      currency: "USD",
      contactMethod: "EMAIL",
      status: "BOOKED",
    },
    quotation: {
      id: quotationId,
      tourRequestId: requestId,
      guideId: guide ? guide.id : null,
      quotationNumber: `QT-CR032-S2-${n}`,
      revisionNumber: 1,
      title: "Hill country and tea trails",
      description: "A relaxed private journey.",
      startDate: day("2026-10-19"),
      endDate: day("2026-10-25"),
      adultCount: 2,
      childCount: 0,
      subtotal: "2400.00",
      discountAmount: "100.00",
      taxAmount: "60.00",
      totalAmount: "2360.00",
      currency: "USD",
      status: "ACCEPTED",
      guide,
      itineraries: [{ id: 1, quotationId, dayNumber: 1, title: "Arrive in Kandy", description: "Private transfer." }],
      inclusions: [],
      exclusions: [],
    },
    payment: {
      id: paymentId,
      quotationId,
      touristId: uid(999),
      paymentReference: `PAY-CR032-S2-${n}`,
      amount: "2360.00",
      currency: "USD",
      paymentMethod: "CARD",
      status: "SUCCESS",
      paidAt: "2026-10-03T09:34:00.000Z",
    },
    tourist: { id: uid(999), firstName: "E2E", lastName: "Traveler" },
    ...overrides,
  };
}

interface GenerateReply {
  status: number;
  code?: string;
  ttlMs?: number;
  errors?: Json | null;
  message?: string;
  delayMs?: number;
  /** Apply to the booking when this reply is sent (e.g. it was cancelled). */
  bookingChange?: Json;
}

interface World {
  booking: Json;
  replies: GenerateReply[];
  generateBodies: Json[];
  bookingGets: number;
  lifecycleGets: number;
}

function newWorld(booking: Json): World {
  return { booking, replies: [], generateBodies: [], bookingGets: 0, lifecycleGets: 0 };
}

function ok(code: string, ttlMs = 5 * 60_000): GenerateReply {
  return { status: 201, code, ttlMs };
}

async function mockApi(page: Page, world: World) {
  await page.route(`${API_BASE_URL}/**`, async (route) => {
    const request = route.request();

    const path = new URL(request.url()).pathname.replace(/^\/api/, "");

    if (path.startsWith("/auth/")) {
      return route.continue();
    }

    const json = (status: number, body: Json) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    const bookingPath = `/bookings/${world.booking.id}`;

    if (path === `${bookingPath}/lifecycle-challenges`) {
      if (request.method() !== "POST") {
        world.lifecycleGets += 1;

        return json(404, { success: false, message: "Route not found", data: null, errors: null });
      }

      world.generateBodies.push(request.postDataJSON() as Json);

      const reply = world.replies.shift() ?? ok("000000");

      if (reply.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, reply.delayMs));
      }

      if (reply.bookingChange) {
        world.booking = { ...world.booking, ...reply.bookingChange };
      }

      if (reply.status !== 201) {
        return json(reply.status, {
          success: false,
          message: reply.message ?? "Request failed",
          data: null,
          errors: reply.errors ?? null,
          meta: { timestamp: SERVER_NOW.toISOString() },
        });
      }

      const guide = (world.booking.quotation as Json).guide as Json;

      const user = guide.user as Json;

      return json(201, {
        success: true,
        message: "Confirmation code created",
        data: {
          action: (request.postDataJSON() as Json).action,
          code: reply.code,
          expiresAt: new Date(SERVER_NOW.getTime() + (reply.ttlMs ?? 300_000)).toISOString(),
          guide: { firstName: user.firstName, lastName: user.lastName },
        },
        errors: null,
        meta: { timestamp: SERVER_NOW.toISOString() },
      });
    }

    if (request.method() !== "GET") {
      return route.abort();
    }

    if (path === bookingPath) {
      world.bookingGets += 1;

      return json(200, { success: true, data: world.booking });
    }

    if (path === "/bookings/me") return json(200, { success: true, data: [world.booking] });

    if (path.startsWith("/reviews/booking/")) return json(200, { success: true, data: null });

    if (["/tour-requests/me", "/quotations/me", "/payments/me", "/reviews/me"].includes(path)) {
      return json(200, { success: true, data: [] });
    }

    return json(404, { success: false, message: "Not mocked", data: null, errors: null });
  });
}

let tourist: FixtureTourist;

async function login(page: Page) {
  await page.context().clearCookies();

  await page.goto("/login");

  await page.getByLabel("Email").fill(tourist.email);

  await page.getByLabel("Password").fill(tourist.password);

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

async function openBooking(page: Page, world: World) {
  await mockApi(page, world);

  await login(page);

  await page.clock.install({ time: NOW });

  await page.goto(`/tourist/bookings/${world.booking.id}`);

  await expect(page.getByTestId("booking-state")).toBeVisible({ timeout: 15_000 });
}

function stateAction(page: Page, name: string) {
  return page.getByTestId("booking-state").getByRole("button", { name });
}

async function openConfirmation(page: Page, name: "Confirm tour start" | "Confirm tour completion") {
  await stateAction(page, name).click();

  const dialog = page.getByRole("dialog", { name });

  await expect(dialog).toBeVisible();

  return dialog;
}

async function generate(page: Page, dialog = page.getByRole("dialog")) {
  await dialog.getByRole("button", { name: /^Generate (new )?code$/ }).click();
}

function pageAnnouncement(page: Page, text: string) {
  return page.getByRole("status").filter({ hasText: text });
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
  ).toBe(true);
}

test.beforeAll(async () => {
  tourist = await createFixtureTourist("traveler-ui");
});

/* ================================================================ */

test.describe("CR-032 traveler confirmation: which bookings offer it", () => {
  test("a confirmed booking with a guide offers to confirm the tour start", async ({ page }) => {
    await openBooking(page, newWorld(bookingRecord(1)));

    await expect(stateAction(page, "Confirm tour start")).toBeVisible();

    await expect(stateAction(page, "Confirm tour completion")).toHaveCount(0);
  });

  test("without a guide nothing is offered and the truthful guide message stays", async ({ page }) => {
    await openBooking(page, newWorld(bookingRecord(2, {}, null)));

    const state = page.getByTestId("booking-state");

    await expect(state).toContainText("Your guide will be assigned before your trip.");

    await expect(state.getByRole("button")).toHaveCount(0);
  });

  for (const [status, extra] of [
    ["COMPLETED", { completedAt: "2026-10-06T16:20:00.000Z", startedAt: "2026-09-28T08:00:00.000Z" }],
    ["CANCELLED", { cancelledAt: "2026-10-06T14:45:00.000Z" }],
  ] as const) {
    test(`a ${status.toLowerCase()} booking offers no tour confirmation`, async ({ page }) => {
      await openBooking(page, newWorld(bookingRecord(3, { status, ...extra })));

      await expect(page.getByTestId("booking-state").getByRole("button")).toHaveCount(0);

      await expect(page.getByRole("button", { name: /Confirm tour/ })).toHaveCount(0);
    });
  }
});

test.describe("CR-032 traveler confirmation: tour start", () => {
  test("the dialog explains first, and only generates on request", async ({ page }) => {
    const world = newWorld(bookingRecord(4));

    await openBooking(page, world);

    const trigger = stateAction(page, "Confirm tour start");

    const dialog = await openConfirmation(page, "Confirm tour start");

    await expect(dialog).toHaveAccessibleDescription(
      "Only generate this code when your assigned guide is with you.",
    );

    await expect(dialog).toContainText("Asha Fernando enters this code to start your tour.");

    await expect(dialog.getByRole("button", { name: "Generate code" })).toBeFocused();

    await expect(dialog.getByTestId("confirmation-code")).toHaveCount(0);

    expect(world.generateBodies).toEqual([]);

    // Keyboard only: Escape closes and focus returns to the trigger.
    await page.keyboard.press("Escape");

    await expect(dialog).toBeHidden();

    await expect(trigger).toBeFocused();

    expect(world.generateBodies).toEqual([]);
  });

  test("a generated code is shown grouped, read as six digits and kept only in memory", async ({ page }) => {
    const world = newWorld(bookingRecord(5));

    world.replies.push(ok("483921"));

    await openBooking(page, world);

    const dialog = await openConfirmation(page, "Confirm tour start");

    // Keyboard only: the focused Generate button activates with Enter.
    const generateCodeButton = dialog.getByRole("button", { name: "Generate code" });

    await expect(generateCodeButton).toBeFocused();

    await page.keyboard.press("Enter");

    const panel = dialog.getByTestId("confirmation-code-panel");

    await expect(panel).toBeFocused();

    await expect(panel).toContainText("Start tour code");

    await expect(dialog.getByTestId("confirmation-code")).toHaveText("483 921");

    await expect(panel.locator(".sr-only")).toHaveText("4 8 3 9 2 1");

    await expect(panel).toContainText("Give this code to Asha Fernando.");

    // Server time is two hours ahead; the countdown still starts at
    // the server's five minutes.
    await expect(dialog.getByTestId("confirmation-code-expiry")).toHaveText(/^Expires in 0[45]:\d\d$/);

    expect(world.generateBodies).toEqual([{ action: "START" }]);

    await expect(dialog.getByRole("button", { name: "Generate new code" })).toBeVisible();

    await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();

    // Nowhere but the dialog: no URL, no storage.
    expect(page.url()).not.toContain("483921");

    const stored = await page.evaluate(() =>
      JSON.stringify([{ ...localStorage }, { ...sessionStorage }]),
    );

    expect(stored).not.toContain("483921");

    // No challenge internals reach the page.
    await expect(dialog).not.toContainText(/challenge|hash/i);
  });

  test("the countdown follows the server's expiry and announces only meaningful moments", async ({ page }) => {
    const world = newWorld(bookingRecord(6));

    // Three minutes, not an assumed five.
    world.replies.push(ok("135790", 3 * 60_000));

    await openBooking(page, world);

    const dialog = await openConfirmation(page, "Confirm tour start");

    await generate(page, dialog);

    const expiry = dialog.getByTestId("confirmation-code-expiry");

    await expect(expiry).toHaveText(/^Expires in 0[23]:\d\d$/);

    const announcer = dialog.getByRole("status");

    await expect(announcer).toHaveText("Start tour code ready.");

    await page.clock.fastForward(2 * 60_000 + 10_000);

    await expect(expiry).toHaveText(/^Expires in 00:[45]\d$/);

    await expect(announcer).toHaveText("1 minute remaining.");

    await page.clock.fastForward(25_000);

    await expect(announcer).toHaveText("30 seconds remaining.");

    await page.clock.fastForward(40_000);

    await expect(announcer).toHaveText("This code has expired.");

    // The expired code no longer looks usable.
    await expect(dialog.getByTestId("confirmation-code")).toHaveCount(0);

    await expect(dialog.getByTestId("confirmation-code-expired")).toHaveText("This code has expired.");

    await expect(dialog).not.toContainText("135");

    await expect(dialog.getByRole("button", { name: "Generate new code" })).toBeVisible();
  });

  test("a new code replaces the old one only after it arrives; duplicate presses send one request", async ({ page }) => {
    const world = newWorld(bookingRecord(7));

    world.replies.push(ok("111222"), { ...ok("333444"), delayMs: 1_500 });

    await openBooking(page, world);

    const dialog = await openConfirmation(page, "Confirm tour start");

    await generate(page, dialog);

    await expect(dialog.getByTestId("confirmation-code")).toHaveText("111 222");

    const regenerate = dialog.getByRole("button", { name: "Generate new code" });

    await regenerate.click();

    // While pending: one code only, visibly not current, no second press.
    const pending = dialog.getByRole("button", { name: "Generating…" });

    await expect(pending).toHaveAttribute("aria-disabled", "true");

    await expect(dialog.getByTestId("confirmation-code-expiry")).toHaveText("Generating a new code…");

    await expect(dialog.getByTestId("confirmation-code")).toHaveCount(1);

    await pending.click({ force: true });

    await expect(dialog.getByTestId("confirmation-code")).toHaveText("333 444");

    await expect(dialog.getByTestId("confirmation-code-expiry")).toHaveText(/^Expires in 0[45]:\d\d$/);

    expect(world.generateBodies).toHaveLength(2);
  });

  test("a failed regeneration keeps the still-valid code and says what happened", async ({ page }) => {
    const world = newWorld(bookingRecord(8));

    world.replies.push(ok("246802"), { status: 500, message: "Internal server error" });

    await openBooking(page, world);

    const dialog = await openConfirmation(page, "Confirm tour start");

    await generate(page, dialog);

    await expect(dialog.getByTestId("confirmation-code")).toHaveText("246 802");

    await generate(page, dialog);

    await expect(dialog.getByRole("alert")).toHaveText("We couldn't create a code. Please try again.");

    await expect(dialog.getByTestId("confirmation-code")).toHaveText("246 802");

    await expect(dialog.getByTestId("confirmation-code-expiry")).toHaveText(/^Expires in 0[45]:\d\d$/);
  });

  test("closing discards the code: reopening offers a new one and never fetches the old", async ({ page }) => {
    const world = newWorld(bookingRecord(9));

    world.replies.push(ok("975310"));

    await openBooking(page, world);

    const dialog = await openConfirmation(page, "Confirm tour start");

    await generate(page, dialog);

    await expect(dialog.getByTestId("confirmation-code")).toHaveText("975 310");

    await dialog.getByRole("button", { name: "Close" }).click();

    await expect(dialog).toBeHidden();

    await expect(stateAction(page, "Confirm tour start")).toBeFocused();

    const reopened = await openConfirmation(page, "Confirm tour start");

    await expect(reopened.getByTestId("confirmation-code")).toHaveCount(0);

    await expect(reopened).toContainText("a code can't be shown again once you close this window");

    await expect(reopened.getByRole("button", { name: "Generate code" })).toBeVisible();

    // Polling stopped when the dialog closed.
    const gets = world.bookingGets;

    await page.clock.fastForward(15_000);

    expect(world.bookingGets).toBe(gets);

    expect(world.lifecycleGets).toBe(0);

    // After a refresh, the same: nothing to recover.
    await page.reload();

    await expect(page.getByTestId("booking-state")).toBeVisible();

    const afterReload = await openConfirmation(page, "Confirm tour start");

    await expect(afterReload.getByTestId("confirmation-code")).toHaveCount(0);

    expect(world.generateBodies).toHaveLength(1);
  });

  test("when the guide starts the tour, the dialog closes and the page moves to in progress", async ({ page }) => {
    const world = newWorld(bookingRecord(10));

    world.replies.push(ok("864200"));

    await openBooking(page, world);

    const dialog = await openConfirmation(page, "Confirm tour start");

    await generate(page, dialog);

    await expect(dialog.getByTestId("confirmation-code")).toHaveText("864 200");

    // The guide redeems the code.
    world.booking = { ...world.booking, status: "IN_PROGRESS", startedAt: "2026-10-07T10:01:00.000Z" };

    await page.clock.fastForward(5_000);

    await expect(dialog).toBeHidden();

    await expect(pageAnnouncement(page, "Your guide started the tour.")).toHaveCount(1);

    const heading = page.getByRole("heading", { level: 2, name: "Your trip is underway" });

    await expect(heading).toBeFocused();

    await expect(stateAction(page, "Confirm tour completion")).toBeVisible();

    // Polling stopped with the transition.
    const gets = world.bookingGets;

    await page.clock.fastForward(15_000);

    expect(world.bookingGets).toBe(gets);
  });

  test("a reassigned guide makes the shown code stale; a new one names the new guide", async ({ page }) => {
    const world = newWorld(bookingRecord(11));

    world.replies.push(ok("123987"), ok("456321"));

    await openBooking(page, world);

    const dialog = await openConfirmation(page, "Confirm tour start");

    await generate(page, dialog);

    await expect(dialog.getByTestId("confirmation-code")).toHaveText("123 987");

    world.booking = {
      ...world.booking,
      quotation: { ...(world.booking.quotation as Json), guideId: RUWAN.id, guide: RUWAN },
    };

    await page.clock.fastForward(5_000);

    await expect(dialog.getByTestId("confirmation-code")).toHaveCount(0);

    await expect(dialog).toContainText("Your assigned guide has changed to Ruwan Silva.");

    await generate(page, dialog);

    await expect(dialog.getByTestId("confirmation-code")).toHaveText("456 321");

    await expect(dialog).toContainText("Give this code to Ruwan Silva.");
  });

  test("a status mismatch refetches and shows the booking's real state", async ({ page }) => {
    const world = newWorld(bookingRecord(12));

    world.replies.push({
      status: 409,
      message: "Only a confirmed booking can be started",
      errors: { code: "BOOKING_STATUS_MISMATCH", currentStatus: "CANCELLED" },
      bookingChange: { status: "CANCELLED", cancelledAt: "2026-10-07T09:59:00.000Z" },
    });

    await openBooking(page, world);

    const dialog = await openConfirmation(page, "Confirm tour start");

    await generate(page, dialog);

    await expect(dialog).toBeHidden();

    await expect(pageAnnouncement(page, "This booking was cancelled.")).toHaveCount(1);

    await expect(page.getByRole("heading", { level: 2, name: "This booking was cancelled" })).toBeFocused();

    await expect(page.getByRole("button", { name: /Confirm tour/ })).toHaveCount(0);
  });

  for (const [label, reply, message] of [
    [
      "rate limit",
      { status: 429, message: "Too many attempts. Please try again later." },
      "Several codes were generated for this booking in a short time. Please wait a few minutes and try again.",
    ],
    ["server error", { status: 500, message: "Internal server error" }, "We couldn't create a code. Please try again."],
    ["forbidden", { status: 403, message: "Forbidden" }, "You can't confirm this booking from this account."],
  ] as const) {
    test(`a ${label} is announced and nothing is shown as a code`, async ({ page }) => {
      const world = newWorld(bookingRecord(13));

      world.replies.push(reply);

      await openBooking(page, world);

      const dialog = await openConfirmation(page, "Confirm tour start");

      await generate(page, dialog);

      await expect(dialog.getByRole("alert")).toHaveText(message);

      await expect(dialog.getByTestId("confirmation-code")).toHaveCount(0);

      // Focus stays on the (retry-able) action.
      await expect(dialog.getByRole("button", { name: "Generate code" })).toBeFocused();
    });
  }
});

test.describe("CR-032 traveler confirmation: tour completion", () => {
  const underway = () =>
    bookingRecord(20, {
      status: "IN_PROGRESS",
      startDate: day("2026-10-05"),
      endDate: day("2026-10-09"),
      startedAt: "2026-10-05T08:00:00.000Z",
    });

  test("completion is explained, generated and followed through to a completed trip", async ({ page }) => {
    const world = newWorld(underway());

    world.replies.push(ok("707070"));

    await openBooking(page, world);

    await expect(stateAction(page, "Confirm tour start")).toHaveCount(0);

    const dialog = await openConfirmation(page, "Confirm tour completion");

    await expect(dialog).toHaveAccessibleDescription(
      "This code lets your assigned guide mark the tour as complete.",
    );

    await expect(dialog).toContainText("Generate it only when your tour has actually finished.");

    await expect(dialog).toContainText("you can review your trip and your guide");

    await generate(page, dialog);

    expect(world.generateBodies).toEqual([{ action: "COMPLETE" }]);

    await expect(dialog.getByTestId("confirmation-code-panel")).toContainText("Completion code");

    await expect(dialog.getByTestId("confirmation-code")).toHaveText("707 070");

    // Still underway: polling keeps the dialog open.
    await page.clock.fastForward(5_000);

    await expect(dialog).toBeVisible();

    world.booking = { ...world.booking, status: "COMPLETED", completedAt: "2026-10-07T10:02:00.000Z" };

    await page.clock.fastForward(5_000);

    await expect(dialog).toBeHidden();

    await expect(pageAnnouncement(page, "Your tour is complete.")).toHaveCount(1);

    await expect(page.getByRole("heading", { level: 2, name: "Trip completed" })).toBeFocused();

    await expect(page.getByRole("button", { name: /Confirm tour/ })).toHaveCount(0);

    await expect(page.getByText("Rate your tour guide", { exact: true })).toBeVisible();
  });
});

test.describe("CR-032 traveler confirmation: accessibility", () => {
  for (const width of [390, 1440]) {
    test(`the confirmation dialog passes axe with no overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      const world = newWorld(bookingRecord(30));

      world.replies.push(ok("192837", 60_000), { status: 500, message: "Internal server error" });

      await openBooking(page, world);

      await expectNoAxeViolations(page);

      const dialog = await openConfirmation(page, "Confirm tour start");

      // Introduction.
      await expectNoAxeViolations(page);

      await expectNoHorizontalOverflow(page);

      // A code.
      await generate(page, dialog);

      await expect(dialog.getByTestId("confirmation-code")).toHaveText("192 837");

      await expectNoAxeViolations(page);

      await expectNoHorizontalOverflow(page);

      // Expired, with an error.
      await page.clock.fastForward(61_000);

      await expect(dialog.getByTestId("confirmation-code-expired")).toBeVisible();

      await generate(page, dialog);

      await expect(dialog.getByRole("alert")).not.toBeEmpty();

      await expectNoAxeViolations(page);

      await expectNoHorizontalOverflow(page);

      // Every control is reachable from the keyboard inside the dialog.
      await page.keyboard.press("Tab");

      await expect(dialog.locator(":focus")).toHaveCount(1);
    });
  }
});
