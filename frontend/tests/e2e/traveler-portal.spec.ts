import AxeBuilder from "@axe-core/playwright";

import { expect, test, type Page } from "@playwright/test";

/**
 * =========================================================
 * CR-030 Stage 1 -- Traveler journey dashboard
 * =========================================================
 *
 * The traveler's own lists (`/me` endpoints) and quotation
 * reads are served by route interception, so every journey
 * state is deterministic and no persistent data is created or
 * changed. Authentication is real (the shared E2E tourist), so
 * the real portal shell, RoleGuard and refresh flow are used.
 *
 * Mutating requests are never forwarded to the backend: the
 * accept call is answered by the mock, anything else is
 * aborted.
 */

const TOURIST_EMAIL = process.env.E2E_TOURIST_EMAIL ?? "nipuna@example.com";

const TOURIST_PASSWORD = process.env.E2E_TOURIST_PASSWORD ?? "Password123";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/* ----------------------------------------------------------------
 * Fictional traveler data
 * ---------------------------------------------------------------- */

const TOURIST_ID = "00000000-0000-4000-8000-0000000c0300";

const GUIDE = {
  id: "guide-cr030",
  userId: "guide-user-cr030",
  bio: "Hill-country walking and culture specialist.",
  experienceYears: 9,
  languages: ["English", "Sinhala"],
  specializations: ["Culture", "Hiking"],
  location: "Kandy",
  dailyRate: "60.00",
  averageRating: "4.80",
  totalReviews: 12,
  isAvailable: true,
  user: {
    id: "guide-user-cr030",
    firstName: "Asha",
    lastName: "Fernando",
    // Deliberately present: the page must never render them.
    email: "asha.private@e2e.travora.test",
    phone: "+94 77 000 0300",
  },
};

type Json = Record<string, unknown>;

function request(id: string, overrides: Json = {}): Json {
  return {
    id,
    touristId: TOURIST_ID,
    packageId: null,
    preferredGuideId: null,
    assignedAdminId: null,
    requestType: "CUSTOM",
    title: `Journey ${id}`,
    preferredStartDate: "2026-11-10T00:00:00.000Z",
    preferredEndDate: "2026-11-16T00:00:00.000Z",
    adultCount: 2,
    childCount: 0,
    destinationPreferences: "Kandy, Ella",
    budget: "2500.00",
    currency: "USD",
    hotelPreference: null,
    transportPreference: null,
    specialRequirements: null,
    contactMethod: "EMAIL",
    status: "PENDING_REVIEW",
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
    deletedAt: null,
    travelPackage: null,
    ...overrides,
  };
}

function quotation(id: string, req: Json, overrides: Json = {}): Json {
  return {
    id,
    tourRequestId: req.id,
    tourRequest: { id: req.id, status: req.status },
    guideId: null,
    guide: null,
    quotationNumber: `QT-CR030-${id}`,
    revisionNumber: 1,
    title: req.title,
    description: "A relaxed private journey.",
    startDate: req.preferredStartDate,
    endDate: req.preferredEndDate,
    adultCount: 2,
    childCount: 0,
    subtotal: "2400.00",
    discountAmount: "100.00",
    taxAmount: "60.00",
    totalAmount: "2360.00",
    currency: "USD",
    notes: null,
    termsConditions: null,
    validUntil: "2026-12-01T00:00:00.000Z",
    status: "SENT",
    sentAt: "2026-10-01T09:00:00.000Z",
    respondedAt: null,
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
    itineraries: [
      { id: 1, quotationId: id, dayNumber: 1, title: "Arrive in Kandy", description: "Private transfer." },
    ],
    inclusions: [{ id: 1, quotationId: id, title: "Private car" }],
    exclusions: [],
    ...overrides,
  };
}

function payment(id: string, quote: Json, overrides: Json = {}): Json {
  return {
    id,
    quotationId: quote.id,
    touristId: TOURIST_ID,
    paymentReference: `PAY-CR030-${id}`,
    amount: quote.totalAmount,
    currency: "USD",
    paymentMethod: "CARD",
    status: "SUCCESS",
    gatewayReference: null,
    failureReason: null,
    paidAt: "2026-10-02T10:00:00.000Z",
    createdAt: "2026-10-02T09:30:00.000Z",
    updatedAt: "2026-10-02T10:00:00.000Z",
    quotation: {
      id: quote.id,
      tourRequestId: quote.tourRequestId,
      quotationNumber: quote.quotationNumber,
      title: quote.title,
      totalAmount: quote.totalAmount,
      currency: "USD",
      status: quote.status,
      tourRequest: { id: quote.tourRequestId, touristId: TOURIST_ID, status: "BOOKED" },
      guide: null,
    },
    tourist: { id: TOURIST_ID, firstName: "Nipuna", lastName: "Tourist", email: TOURIST_EMAIL },
    booking: null,
    ...overrides,
  };
}

function booking(id: string, req: Json, quote: Json, pay: Json, overrides: Json = {}): Json {
  return {
    id,
    tourRequestId: req.id,
    quotationId: quote.id,
    paymentId: pay.id,
    touristId: TOURIST_ID,
    bookingReference: `BK-CR030-${id}`,
    status: "CONFIRMED",
    startDate: quote.startDate,
    endDate: quote.endDate,
    totalAmount: quote.totalAmount,
    currency: "USD",
    confirmedAt: pay.paidAt,
    completedAt: null,
    cancelledAt: null,
    createdAt: pay.paidAt,
    updatedAt: pay.paidAt,
    tourRequest: req,
    quotation: { ...quote, guideId: GUIDE.id, guide: GUIDE },
    payment: pay,
    tourist: { id: TOURIST_ID, firstName: "Nipuna", lastName: "Tourist", email: TOURIST_EMAIL },
    ...overrides,
  };
}

interface TravelerState {
  requests: Json[];
  quotations: Json[];
  payments: Json[];
  bookings: Json[];
  reviews: Json[];
}

const emptyState = (): TravelerState => ({
  requests: [],
  quotations: [],
  payments: [],
  bookings: [],
  reviews: [],
});

/* ----------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------- */

const ok = (data: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({ success: true, message: "OK", data }),
});

const notFound = {
  status: 404,
  contentType: "application/json",
  body: JSON.stringify({ success: false, message: "Not found" }),
};

/**
 * Serves the traveler state; returns the accept calls it saw.
 */
interface MockOptions {
  /** `/me` paths answered with HTTP 500. */
  fail?: string[];
  /** `/me` paths answered only after `slowMs` milliseconds. */
  slow?: string[];
  slowMs?: number;
}

async function mockTraveler(page: Page, state: TravelerState, options: MockOptions = {}) {
  const acceptCalls: string[] = [];

  await page.route(`${API_BASE_URL}/**`, async (route) => {
    const method = route.request().method();

    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");

    if (options.fail?.includes(path)) {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Unavailable" }),
      });
    }

    if (options.slow?.includes(path)) {
      await new Promise((resolve) => setTimeout(resolve, options.slowMs ?? 2_000));
    }

    const byId = (list: Json[], id: string) => list.find((item) => item.id === id);

    let match: RegExpMatchArray | null;

    if (path.startsWith("/auth/")) {
      return route.continue();
    }

    if (method === "POST" && (match = path.match(/^\/quotations\/([^/]+)\/accept$/))) {
      acceptCalls.push(match[1]);

      const accepted = byId(state.quotations, match[1]);

      if (!accepted) {
        return route.fulfill(notFound);
      }

      accepted.status = "ACCEPTED";

      accepted.respondedAt = "2026-10-03T09:00:00.000Z";

      return route.fulfill(ok(accepted));
    }

    if (method !== "GET") {
      return route.abort();
    }

    if (path === "/tour-requests/me") return route.fulfill(ok(state.requests));
    if (path === "/quotations/me") return route.fulfill(ok(state.quotations));
    if (path === "/payments/me") return route.fulfill(ok(state.payments));
    if (path === "/bookings/me") return route.fulfill(ok(state.bookings));
    if (path === "/reviews/me") return route.fulfill(ok(state.reviews));

    if ((match = path.match(/^\/quotations\/tour-request\/([^/]+)$/))) {
      return route.fulfill(ok(state.quotations.filter((item) => item.tourRequestId === match![1])));
    }

    for (const [prefix, list] of [
      ["/tour-requests/", state.requests],
      ["/quotations/", state.quotations],
      ["/payments/", state.payments],
      ["/bookings/", state.bookings],
    ] as const) {
      if (path.startsWith(prefix)) {
        const item = byId(list, path.slice(prefix.length));

        return route.fulfill(item ? ok(item) : notFound);
      }
    }

    if (path.startsWith("/reviews/booking/")) {
      return route.fulfill(notFound);
    }

    return route.continue();
  });

  return { acceptCalls };
}

async function loginAsTourist(page: Page) {
  await page.context().clearCookies();

  await page.goto("/login");

  await page.getByLabel("Email").fill(TOURIST_EMAIL);

  await page.getByLabel("Password").fill(TOURIST_PASSWORD);

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

async function openDashboard(page: Page, state: TravelerState) {
  const mock = await mockTraveler(page, state);

  await loginAsTourist(page);

  await page.goto("/tourist");

  await expect(page.getByRole("heading", { level: 1, name: "My travel dashboard" })).toBeVisible({
    timeout: 15_000,
  });

  await expect(page.locator('[data-slot="loading-state"]')).toHaveCount(0, { timeout: 15_000 });

  return mock;
}

async function expectNoAxeViolations(page: Page, include?: string) {
  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);

  if (include) {
    builder.include(include);
  }

  const results = await builder.analyze();

  expect(
    results.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`),
  ).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
  ).toBe(true);
}

/* ----------------------------------------------------------------
 * State builders
 * ---------------------------------------------------------------- */

function sentQuotationState() {
  const state = emptyState();

  const req = request("req-sent", { title: "Hill country and tea trails", status: "QUOTATION_SENT" });

  state.requests.push(req);

  state.quotations.push(quotation("quote-sent", req, { guideId: GUIDE.id, guide: GUIDE }));

  return state;
}

function acceptedState(paymentOverrides: Json | null) {
  const state = emptyState();

  const req = request("req-accepted", { title: "South coast escape", status: "ACCEPTED" });

  const quote = quotation("quote-accepted", req, { status: "ACCEPTED" });

  state.requests.push(req);

  state.quotations.push(quote);

  if (paymentOverrides) {
    state.payments.push(payment("pay-accepted", quote, paymentOverrides));
  }

  return state;
}

function bookedState(bookingStatus: string) {
  const state = emptyState();

  const req = request("req-booked", { title: "Cultural Triangle highlights", status: "BOOKED" });

  const quote = quotation("quote-booked", req, {
    status: "ACCEPTED",
    tourRequest: { id: "req-booked", status: "BOOKED" },
    guideId: GUIDE.id,
    guide: GUIDE,
  });

  const pay = payment("pay-booked", quote, { booking: { id: "booking-cr030" } });

  state.requests.push(req);

  state.quotations.push(quote);

  state.payments.push(pay);

  state.bookings.push(
    booking("booking-cr030", req, quote, pay, {
      status: bookingStatus,
      completedAt: bookingStatus === "COMPLETED" ? "2026-11-16T18:00:00.000Z" : null,
    }),
  );

  return state;
}

/* ----------------------------------------------------------------
 * Dashboard
 * ---------------------------------------------------------------- */

test.describe("CR-030 traveler dashboard", () => {
  test("an empty traveler gets a starting point, not a wall of zeroes", async ({ page }) => {
    await openDashboard(page, emptyState());

    await expect(page.getByRole("heading", { level: 2, name: "Plan your first Sri Lanka journey" })).toBeVisible();

    await expect(page.getByRole("main").getByRole("link", { name: "Plan a trip" })).toHaveAttribute(
      "href",
      "/tourist/requests/new",
    );

    await expect(page.getByTestId("journey-attention")).toHaveCount(0);

    await expect(page.getByRole("main").getByText(/^0$/)).toHaveCount(0);

    await expectNoHorizontalOverflow(page);

    await expectNoAxeViolations(page);
  });

  test("a sent quotation is the next action", async ({ page }) => {
    await openDashboard(page, sentQuotationState());

    const attention = page.getByTestId("journey-attention");

    await expect(attention.getByRole("heading", { name: "Needs your attention" })).toBeVisible();

    await expect(attention.getByRole("heading", { level: 3, name: "Hill country and tea trails" })).toBeVisible();

    await expect(attention.getByRole("link", { name: /^Review quotation/ })).toHaveAttribute(
      "href",
      "/tourist/quotations/quote-sent",
    );

    // CR-030 money format on the dashboard.
    await expect(attention.getByText("USD 2,360.00", { exact: true })).toBeVisible();

    await expectNoHorizontalOverflow(page);

    await expectNoAxeViolations(page);
  });

  test("an accepted, unpaid quotation asks the traveler to pay", async ({ page }) => {
    await openDashboard(page, acceptedState(null));

    const attention = page.getByTestId("journey-attention");

    await expect(attention.getByText("Payment due", { exact: true })).toBeVisible();

    await expect(attention.getByRole("link", { name: /^Pay now/ })).toHaveAttribute(
      "href",
      "/tourist/quotations/quote-accepted",
    );

    await page.goto("/tourist/quotations/quote-accepted");

    await expect(page.getByRole("button", { name: /^Pay USD/ })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText(/you can now continue to secure payment/i)).toBeVisible();
  });

  test("a started payment can be resumed", async ({ page }) => {
    await openDashboard(page, acceptedState({ status: "PENDING", paidAt: null }));

    await expect(
      page.getByTestId("journey-attention").getByRole("link", { name: /^Resume payment/ }),
    ).toHaveAttribute("href", "/tourist/quotations/quote-accepted");
  });

  test("a processing payment is checked, not paid again", async ({ page }) => {
    await openDashboard(page, acceptedState({ status: "PROCESSING", paidAt: null }));

    await expect(page.getByTestId("journey-attention")).toHaveCount(0);

    await expect(page.getByTestId("journey-progress").getByRole("link", { name: "Check payment" })).toHaveAttribute(
      "href",
      "/tourist/payments/pay-accepted",
    );

    await page.goto("/tourist/quotations/quote-accepted");

    await expect(page.getByTestId("quotation-payment-confirming")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("button", { name: /^Pay/ })).toHaveCount(0);
  });

  test("an accepted quotation that is already paid never asks for payment again", async ({ page }) => {
    // Paid, booking not created yet (webhook still finishing).
    await openDashboard(page, acceptedState({ status: "SUCCESS" }));

    await expect(page.getByTestId("journey-attention")).toHaveCount(0);

    await expect(page.getByRole("link", { name: /pay now|resume payment/i })).toHaveCount(0);

    await expect(page.getByTestId("journey-all-clear")).toBeVisible();

    await page.goto("/tourist/quotations/quote-accepted");

    await expect(page.getByTestId("quotation-paid")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("button", { name: /^Pay/ })).toHaveCount(0);

    await expect(page.getByText(/continue to secure payment/i)).toHaveCount(0);

    await expect(page.getByTestId("quotation-paid").getByRole("link", { name: "View payment" })).toHaveAttribute(
      "href",
      "/tourist/payments/pay-accepted",
    );
  });

  test("a paid and booked quotation links to its booking instead of payment", async ({ page }) => {
    await openDashboard(page, bookedState("CONFIRMED"));

    await page.goto("/tourist/quotations/quote-booked");

    await expect(page.getByTestId("quotation-paid")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("button", { name: /^Pay/ })).toHaveCount(0);

    await expect(page.getByTestId("quotation-paid").getByRole("link", { name: "View booking" })).toHaveAttribute(
      "href",
      "/tourist/bookings/booking-cr030",
    );
  });

  test("a confirmed booking is surfaced as the upcoming trip", async ({ page }) => {
    await openDashboard(page, bookedState("CONFIRMED"));

    const trip = page.getByTestId("current-trip");

    await expect(trip.getByRole("heading", { level: 2, name: "Your upcoming trip" })).toBeVisible();

    await expect(trip.getByRole("heading", { level: 3, name: "Cultural Triangle highlights" })).toBeVisible();

    await expect(trip.getByText("Nov 10, 2026 – Nov 16, 2026", { exact: true })).toBeVisible();

    await expect(trip.getByText("Asha Fernando", { exact: true })).toBeVisible();

    await expect(trip.getByText("Confirmed", { exact: true })).toBeVisible();

    await expect(trip.getByRole("link", { name: "View upcoming trip" })).toHaveAttribute(
      "href",
      "/tourist/bookings/booking-cr030",
    );

    await expect(page.getByTestId("journey-attention")).toHaveCount(0);

    await expectNoHorizontalOverflow(page);

    await expectNoAxeViolations(page);
  });

  test("a completed trip without a review asks for one", async ({ page }) => {
    await openDashboard(page, bookedState("COMPLETED"));

    await expect(
      page.getByTestId("journey-attention").getByRole("link", { name: /^Leave a review/ }),
    ).toHaveAttribute("href", "/tourist/bookings/booking-cr030");
  });

  test("a completed trip that was reviewed asks for nothing", async ({ page }) => {
    const state = bookedState("COMPLETED");

    state.reviews.push({ id: "review-cr030", bookingId: "booking-cr030", guideId: GUIDE.id, touristId: TOURIST_ID, rating: 5, comment: null });

    await openDashboard(page, state);

    await expect(page.getByTestId("journey-attention")).toHaveCount(0);

    await expect(page.getByRole("link", { name: /leave a review/i })).toHaveCount(0);
  });

  test("a request with Travora explains who is working on it", async ({ page }) => {
    const state = emptyState();

    state.requests.push(request("req-discussion", { title: "Family week", status: "UNDER_DISCUSSION" }));

    await openDashboard(page, state);

    await expect(page.getByTestId("journey-attention")).toHaveCount(0);

    const progress = page.getByTestId("journey-progress");

    await expect(progress.getByText("Under Discussion", { exact: true })).toBeVisible();

    await expect(progress.getByText(/Travora is working through your trip details/)).toBeVisible();

    await expect(progress.getByRole("listitem").filter({ hasText: "Request" })).toHaveAttribute("aria-current", "step");
  });

  test("the most urgent action leads when several are waiting", async ({ page }) => {
    const state = sentQuotationState();

    const pending = acceptedState({ status: "PENDING", paidAt: null });

    state.requests.push(...pending.requests);

    state.quotations.push(...pending.quotations);

    state.payments.push(...pending.payments);

    await openDashboard(page, state);

    const attention = page.getByTestId("journey-attention");

    await expect(attention.getByRole("heading", { level: 3 })).toHaveText("South coast escape");

    await expect(attention.getByRole("list", { name: "Other actions" }).getByRole("link", { name: /^Review quotation/ })).toBeVisible();
  });
});

/* ----------------------------------------------------------------
 * Quotation detail
 * ---------------------------------------------------------------- */

test.describe("CR-030 quotation detail", () => {
  test("shows the proposed guide without contact details", async ({ page }) => {
    await openDashboard(page, sentQuotationState());

    await page.goto("/tourist/quotations/quote-sent");

    const guide = page.getByTestId("proposed-guide");

    await expect(guide.getByRole("heading", { level: 2, name: "Your proposed guide" })).toBeVisible({ timeout: 15_000 });

    await expect(guide.getByRole("heading", { level: 3, name: "Asha Fernando" })).toBeVisible();

    await expect(guide.getByText("English", { exact: true })).toBeVisible();

    const text = await page.locator("main").innerText();

    expect(text).not.toContain(GUIDE.user.email);

    expect(text).not.toContain(GUIDE.user.phone);

    expect(text).not.toContain(GUIDE.userId);
  });

  test("shows no guide section when none is proposed", async ({ page }) => {
    const state = sentQuotationState();

    state.quotations[0].guide = null;

    state.quotations[0].guideId = null;

    await openDashboard(page, state);

    await page.goto("/tourist/quotations/quote-sent");

    await expect(page.getByRole("button", { name: "Accept quotation" })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId("proposed-guide")).toHaveCount(0);
  });

  test("accepting asks for confirmation; cancelling changes nothing", async ({ page }) => {
    const state = sentQuotationState();

    const { acceptCalls } = await openDashboard(page, state);

    await page.goto("/tourist/quotations/quote-sent");

    const accept = page.getByRole("button", { name: "Accept quotation" });

    await expect(accept).toBeVisible({ timeout: 15_000 });

    // Cancel with the button: no call, focus returns to Accept.
    await accept.click();

    const dialog = page.getByRole("alertdialog", { name: "Accept this quotation?" });

    await expect(dialog).toBeVisible();

    await expect(dialog).toContainText("USD 2,360.00");

    await expectNoAxeViolations(page);

    await dialog.getByRole("button", { name: "Keep reviewing" }).click();

    await expect(dialog).toBeHidden();

    await expect(accept).toBeFocused();

    // Cancel with Escape from the keyboard.
    await accept.press("Enter");

    await expect(dialog).toBeVisible();

    await expect(dialog.getByRole("button", { name: "Keep reviewing" })).toBeFocused();

    await page.keyboard.press("Tab");

    await expect(dialog.getByRole("button", { name: "Yes, accept quotation" })).toBeFocused();

    await page.keyboard.press("Tab");

    // Focus stays trapped inside the dialog.
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true);

    await page.keyboard.press("Escape");

    await expect(dialog).toBeHidden();

    await expect(accept).toBeFocused();

    expect(acceptCalls).toEqual([]);

    await expect(page.getByText("Sent", { exact: true }).first()).toBeVisible();

    // Confirm: exactly one accept call, then the accepted state.
    await accept.click();

    const acceptResponse = page.waitForResponse(
      (response) => response.url().endsWith("/quotations/quote-sent/accept") && response.request().method() === "POST",
    );

    await dialog.getByRole("button", { name: "Yes, accept quotation" }).click();

    await acceptResponse;

    await expect(page.getByText("Quotation accepted", { exact: true })).toBeVisible({ timeout: 10_000 });

    await expect(dialog).toBeHidden();

    await expect(page.getByRole("button", { name: "Accept quotation" })).toHaveCount(0);

    expect(acceptCalls).toEqual(["quote-sent"]);
  });
});

/* ================================================================
 * CR-030 Stage 2 -- shell, My journeys and the entity lists
 * ================================================================ */

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** UUID-shaped ids, so a leaked internal id would be detectable. */
const uid = (n: number) => `7d3c1b2a-4e5f-4a6b-8c7d-${String(n).padStart(12, "0")}`;

/**
 * One traveler with an active, past and closed mix:
 *  - Hill country (quotation sent)       -> Active, Review quotation
 *  - South coast (accepted, unpaid)      -> Active, Pay now
 *  - Honeymoon (payment started)         -> Active, Resume payment
 *  - Cultural Triangle (confirmed)       -> Active, View upcoming trip
 *  - Yala (completed, not reviewed)      -> Past, Leave a review
 *  - Colombo (request cancelled)         -> Closed
 *  - Galle (booking cancelled, request still BOOKED) -> Closed
 */
function journeyMixState() {
  const state = emptyState();

  const sent = request(uid(1), { title: "Hill country and tea trails", status: "QUOTATION_SENT", updatedAt: "2026-10-05T10:00:00.000Z" });

  const unpaid = request(uid(2), { title: "South coast escape", status: "ACCEPTED", updatedAt: "2026-10-04T10:00:00.000Z" });

  const started = request(uid(3), { title: "Honeymoon in the hills", status: "ACCEPTED", updatedAt: "2026-10-03T10:00:00.000Z" });

  const confirmed = request(uid(4), { title: "Cultural Triangle highlights", status: "BOOKED", updatedAt: "2026-10-02T10:00:00.000Z" });

  const completed = request(uid(5), { title: "Yala safari escape", status: "BOOKED", updatedAt: "2026-06-05T10:00:00.000Z" });

  const cancelledRequest = request(uid(6), { title: "Weekend in Colombo", status: "CANCELLED", updatedAt: "2026-07-01T10:00:00.000Z" });

  const cancelledBooking = request(uid(7), { title: "Galle fort weekend", status: "BOOKED", updatedAt: "2026-08-01T10:00:00.000Z" });

  state.requests.push(sent, unpaid, started, confirmed, completed, cancelledRequest, cancelledBooking);

  const old = quotation(uid(11), sent, { status: "SUPERSEDED", revisionNumber: 1, totalAmount: "2580.00", quotationNumber: "QT-CR030-S2-1A" });

  const latest = quotation(uid(12), sent, { revisionNumber: 2, quotationNumber: "QT-CR030-S2-1B", guideId: GUIDE.id, guide: GUIDE });

  const unpaidQuote = quotation(uid(13), unpaid, { status: "ACCEPTED", totalAmount: "12450.00", quotationNumber: "QT-CR030-S2-2" });

  const startedQuote = quotation(uid(14), started, { status: "ACCEPTED", totalAmount: "3125.50", quotationNumber: "QT-CR030-S2-3" });

  const confirmedQuote = quotation(uid(15), confirmed, { status: "ACCEPTED", quotationNumber: "QT-CR030-S2-4", tourRequest: { id: uid(4), status: "BOOKED" } });

  const completedQuote = quotation(uid(16), completed, { status: "ACCEPTED", quotationNumber: "QT-CR030-S2-5", tourRequest: { id: uid(5), status: "BOOKED" } });

  const cancelledQuote = quotation(uid(17), cancelledBooking, { status: "ACCEPTED", quotationNumber: "QT-CR030-S2-7", tourRequest: { id: uid(7), status: "BOOKED" } });

  state.quotations.push(latest, old, unpaidQuote, startedQuote, confirmedQuote, completedQuote, cancelledQuote);

  const startedPay = payment(uid(23), startedQuote, { status: "PENDING", paidAt: null, paymentReference: "PAY-CR030-S2-3" });

  const confirmedPay = payment(uid(24), confirmedQuote, { booking: { id: uid(34) }, paymentReference: "PAY-CR030-S2-4" });

  const completedPay = payment(uid(25), completedQuote, { booking: { id: uid(35) }, paymentReference: "PAY-CR030-S2-5" });

  const cancelledPay = payment(uid(27), cancelledQuote, { booking: { id: uid(37) }, paymentReference: "PAY-CR030-S2-7" });

  state.payments.push(startedPay, confirmedPay, completedPay, cancelledPay);

  state.bookings.push(
    booking(uid(34), confirmed, confirmedQuote, confirmedPay, { bookingReference: "BK-CR030-S2-4" }),
    booking(uid(35), completed, completedQuote, completedPay, { status: "COMPLETED", bookingReference: "BK-CR030-S2-5", completedAt: "2026-06-04T18:00:00.000Z" }),
    booking(uid(37), cancelledBooking, cancelledQuote, cancelledPay, { status: "CANCELLED", bookingReference: "BK-CR030-S2-7", cancelledAt: "2026-08-01T10:00:00.000Z" }),
  );

  return state;
}

async function openTravelerPage(page: Page, path: string, state: TravelerState, options: MockOptions = {}) {
  await mockTraveler(page, state, options);

  await loginAsTourist(page);

  await page.goto(path);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
}

async function waitForContent(page: Page) {
  await expect(page.locator('[data-slot="loading-state"]')).toHaveCount(0, { timeout: 15_000 });
}

async function expectNoUuid(page: Page) {
  expect(await page.locator("main").innerText()).not.toMatch(UUID_PATTERN);
}

/** Link names in <main> (no aria-label is used, so text content is the name). */
async function linkNames(page: Page) {
  return page
    .locator("main a")
    .evaluateAll((links) => links.map((link) => (link.textContent ?? "").replace(/\s+/g, " ").trim()));
}

async function expectUniqueLinkNames(page: Page) {
  const names = await linkNames(page);

  expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
}

test.describe("CR-030 Stage 2 traveler shell", () => {
  test("desktop shell shows My Travora, the Traveler role and journey-first navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await openDashboard(page, emptyState());

    const sidebar = page.locator("aside");

    await expect(sidebar.getByText("My Travora", { exact: true })).toBeVisible();

    await expect(sidebar.getByText("Traveler", { exact: true })).toBeVisible();

    await expect(sidebar.getByText("TOURIST", { exact: true })).toHaveCount(0);

    await expect(sidebar.getByText("Traveler Portal", { exact: true })).toHaveCount(0);

    const nav = sidebar.getByRole("navigation", { name: "Traveler navigation" });

    expect(await nav.getByRole("link").allTextContents()).toEqual([
      "Dashboard",
      "My journeys",
      "Quotations",
      "Bookings",
      "Payments",
    ]);

    await expect(nav.getByRole("link", { name: "My journeys", exact: true })).toHaveAttribute("href", "/tourist/requests");

    await expect(sidebar.getByRole("link", { name: "Browse guides", exact: true })).toHaveAttribute("href", "/guides");

    await expect(sidebar.getByRole("link", { name: "Plan a trip", exact: true })).toHaveAttribute("href", "/tourist/requests/new");

    await page.goto("/tourist/requests");

    await expect(nav.locator('a[aria-current="page"]')).toHaveText("My journeys", { timeout: 15_000 });
  });

  test("mobile drawer carries the same navigation", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await openDashboard(page, emptyState());

    await expect(page.getByRole("link", { name: "My Travora", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Toggle traveler navigation", exact: true }).click();

    const drawer = page.getByRole("dialog", { name: "My Travora" });

    await expect(drawer).toBeVisible();

    expect(await drawer.getByRole("navigation").getByRole("link").allTextContents()).toEqual([
      "Dashboard",
      "My journeys",
      "Quotations",
      "Bookings",
      "Payments",
    ]);

    await expect(drawer.getByRole("link", { name: "Browse guides", exact: true })).toBeVisible();

    await expect(drawer.getByText("TOURIST", { exact: true })).toHaveCount(0);

    await expectNoAxeViolations(page, "[role='dialog']");
  });
});

test.describe("CR-030 Stage 2 My journeys", () => {
  test("groups journeys into Active, Past and Closed with the right next actions", async ({ page }) => {
    await openTravelerPage(page, "/tourist/requests", journeyMixState());

    await expect(page.getByRole("heading", { level: 1, name: "My journeys" })).toBeVisible();

    await waitForContent(page);

    const active = page.getByTestId("journeys-active");

    const past = page.getByTestId("journeys-past");

    const closed = page.getByTestId("journeys-closed");

    await expect(active.getByRole("heading", { level: 2, name: "Active" })).toBeVisible();

    await expect(past.getByRole("heading", { level: 2, name: "Past" })).toBeVisible();

    await expect(closed.getByRole("heading", { level: 2, name: "Closed" })).toBeVisible();

    await expect(active.getByTestId("journey-card")).toHaveCount(4);

    await expect(past.getByTestId("journey-card")).toHaveCount(1);

    await expect(closed.getByTestId("journey-card")).toHaveCount(2);

    const card = (name: string) => page.getByRole("article", { name: new RegExp(`^${name}`) });

    await expect(
      card("Hill country and tea trails").getByRole("link", { name: /^Review quotation\s*: Hill country and tea trails/ }),
    ).toHaveAttribute("href", `/tourist/quotations/${uid(12)}`);

    // Revision context and grouped money.
    await expect(card("Hill country and tea trails").getByText("QT-CR030-S2-1B · Revision 2", { exact: true })).toBeVisible();

    await expect(card("South coast escape").getByRole("link", { name: /^Pay now\s*: South coast escape/ })).toBeVisible();

    await expect(card("South coast escape").getByText("USD 12,450.00", { exact: true })).toBeVisible();

    await expect(card("Honeymoon in the hills").getByRole("link", { name: /^Resume payment\s*: Honeymoon/ })).toHaveAttribute(
      "href",
      `/tourist/quotations/${uid(14)}`,
    );

    await expect(card("Cultural Triangle highlights").getByRole("link", { name: /^View upcoming trip/ })).toHaveAttribute(
      "href",
      `/tourist/bookings/${uid(34)}`,
    );

    await expect(card("Yala safari escape").getByRole("link", { name: /^Leave a review\s*: Yala/ })).toBeVisible();

    await expect(card("Weekend in Colombo").getByText("Cancelled", { exact: true })).toBeVisible();

    // The title links to the journey's own page.
    await expect(card("Weekend in Colombo").getByRole("link", { name: /^Weekend in Colombo/ })).toHaveAttribute(
      "href",
      `/tourist/requests/${uid(6)}`,
    );

    expect(await page.locator("main").innerText()).not.toMatch(/USD \d{4,}\.\d{2}/);

    await expectNoUuid(page);

    await expectUniqueLinkNames(page);

    await expectNoHorizontalOverflow(page);

    await expectNoAxeViolations(page);
  });

  test("a cancelled booking reads as cancelled, not booked", async ({ page }) => {
    await openTravelerPage(page, "/tourist/requests", journeyMixState());

    await waitForContent(page);

    const galle = page.getByTestId("journeys-closed").getByRole("article", { name: /^Galle fort weekend/ });

    await expect(galle.getByText("Cancelled", { exact: true })).toBeVisible();

    await expect(galle.getByText("Booked", { exact: true })).toHaveCount(0);

    await expect(galle.getByText("BK-CR030-S2-7", { exact: true })).toBeVisible();

    // A closed journey shows no progress tracker and asks for nothing.
    await expect(galle.getByRole("list", { name: "Trip progress" })).toHaveCount(0);

    await expect(galle.getByRole("link", { name: /pay now|review quotation|resume payment|leave a review/i })).toHaveCount(0);
  });

  test("only groups with journeys are shown", async ({ page }) => {
    await openTravelerPage(page, "/tourist/requests", sentQuotationState());

    await waitForContent(page);

    await expect(page.getByRole("heading", { level: 2, name: "Active" })).toBeVisible();

    await expect(page.getByRole("heading", { level: 2, name: "Past" })).toHaveCount(0);

    await expect(page.getByRole("heading", { level: 2, name: "Closed" })).toHaveCount(0);
  });

  test("an empty traveler is invited to plan a trip", async ({ page }) => {
    await openTravelerPage(page, "/tourist/requests", emptyState());

    await waitForContent(page);

    await expect(page.getByRole("heading", { level: 2, name: "No journeys yet" })).toBeVisible();

    await expect(page.getByRole("main").getByRole("link", { name: "Plan a trip" })).toHaveAttribute(
      "href",
      "/tourist/requests/new",
    );

    await expect(page.getByRole("heading", { level: 2, name: "Active" })).toHaveCount(0);

    await expectNoAxeViolations(page);
  });

  test("loading is announced and a core failure offers a retry", async ({ page }) => {
    await openTravelerPage(page, "/tourist/requests", journeyMixState(), {
      slow: ["/tour-requests/me"],
      slowMs: 3_000,
    });

    await expect(page.getByRole("status").filter({ hasText: "Loading your journeys" })).toBeAttached();

    await waitForContent(page);

    await page.unrouteAll({ behavior: "ignoreErrors" });

    await mockTraveler(page, journeyMixState(), { fail: ["/bookings/me"] });

    await page.goto("/tourist/requests");

    const alert = page.getByRole("alert");

    await expect(alert.getByRole("heading", { name: "Unable to load your journeys" })).toBeVisible({ timeout: 15_000 });

    await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("a reviews failure does not take the page down", async ({ page }) => {
    await openTravelerPage(page, "/tourist/requests", journeyMixState(), { fail: ["/reviews/me"] });

    await waitForContent(page);

    await expect(page.getByTestId("journeys-active").getByTestId("journey-card")).toHaveCount(4);

    // Review state unknown: the completed trip is offered, not a review.
    const yala = page.getByRole("article", { name: /^Yala safari escape/ });

    await expect(yala.getByRole("link", { name: /^View trip/ })).toBeVisible();

    await expect(yala.getByRole("link", { name: /leave a review/i })).toHaveCount(0);
  });
});

test.describe("CR-030 Stage 2 dashboard deduplication", () => {
  test("each journey appears in only one dashboard section", async ({ page }) => {
    await openDashboard(page, journeyMixState());

    for (const title of [
      "Hill country and tea trails",
      "South coast escape",
      "Honeymoon in the hills",
      "Cultural Triangle highlights",
      "Yala safari escape",
      "Weekend in Colombo",
      "Galle fort weekend",
    ]) {
      expect(await page.locator("main").getByText(title, { exact: true }).count(), title).toBeLessThanOrEqual(1);
    }

    // Precedence: attention first, then the current trip.
    await expect(page.getByTestId("journey-attention").getByRole("heading", { level: 3 })).toHaveText(
      "Honeymoon in the hills",
    );

    await expect(page.getByTestId("current-trip").getByRole("heading", { level: 3 })).toHaveText(
      "Cultural Triangle highlights",
    );

    // Nothing is still being planned outside attention, so no latest-request card.
    await expect(page.getByTestId("journey-progress")).toHaveCount(0);

    await expect(page.getByTestId("recent-journeys").getByRole("listitem")).toHaveCount(2);
  });

  test("a single journey is shown once", async ({ page }) => {
    await openDashboard(page, sentQuotationState());

    await expect(page.locator("main").getByText("Hill country and tea trails", { exact: true })).toHaveCount(1);

    await expect(page.getByTestId("journey-progress")).toHaveCount(0);

    await expect(page.getByTestId("recent-journeys")).toHaveCount(0);
  });
});

test.describe("CR-030 Stage 2 entity lists", () => {
  test("quotations keep every sent quotation with existing labels, grouped money and no contact details", async ({
    page,
  }) => {
    await openTravelerPage(page, "/tourist/quotations", journeyMixState());

    await expect(page.getByRole("heading", { level: 1, name: "My quotations" })).toBeVisible();

    await waitForContent(page);

    await expect(page.getByRole("main").getByRole("article")).toHaveCount(7);

    for (const number of ["QT-CR030-S2-1A", "QT-CR030-S2-1B", "QT-CR030-S2-2"]) {
      await expect(page.getByText(number, { exact: true })).toBeVisible();
    }

    await expect(page.getByText("Superseded", { exact: true })).toBeVisible();

    await expect(page.getByText("Sent", { exact: true })).toBeVisible();

    await expect(page.getByText("USD 2,580.00", { exact: true })).toBeVisible();

    await expect(page.getByText("Asha Fernando", { exact: true })).toBeVisible();

    const text = await page.locator("main").innerText();

    expect(text).not.toContain(GUIDE.user.email);

    expect(text).not.toContain(GUIDE.user.phone);

    expect(text).not.toMatch(/USD \d{4,}\.\d{2}/);

    await expectNoUuid(page);

    await expectUniqueLinkNames(page);

    await expectNoAxeViolations(page);
  });

  test("bookings keep their information without internal ids", async ({ page }) => {
    await openTravelerPage(page, "/tourist/bookings", journeyMixState());

    await expect(page.getByRole("heading", { level: 1, name: "My Bookings" })).toBeVisible();

    await waitForContent(page);

    await expect(page.getByRole("main").getByRole("article")).toHaveCount(3);

    const confirmed = page.getByRole("article", { name: "Cultural Triangle highlights" });

    await expect(confirmed.getByText("BK-CR030-S2-4", { exact: true })).toBeVisible();

    await expect(confirmed.getByText("Confirmed", { exact: true })).toBeVisible();

    await expect(confirmed.getByText("USD 2,360.00", { exact: true })).toBeVisible();

    await expect(confirmed.getByText("Success", { exact: true })).toBeVisible();

    await expect(confirmed.getByText("Asha Fernando", { exact: true })).toBeVisible();

    await expect(page.getByText(/Booking ID/)).toHaveCount(0);

    await expectNoUuid(page);

    await expectUniqueLinkNames(page);

    await expectNoAxeViolations(page);
  });

  test("payments offer Resume payment only for a started payment", async ({ page }) => {
    await openTravelerPage(page, "/tourist/payments", journeyMixState());

    await expect(page.getByRole("heading", { level: 1, name: "My Payments" })).toBeVisible();

    await waitForContent(page);

    await expect(page.getByRole("main").getByRole("article")).toHaveCount(4);

    const started = page.getByRole("article", { name: "Honeymoon in the hills" });

    await expect(started.getByText("Pending", { exact: true })).toBeVisible();

    await expect(started.getByText("USD 3,125.50", { exact: true })).toBeVisible();

    await expect(started.getByRole("link", { name: /^Resume payment/ })).toHaveAttribute(
      "href",
      `/tourist/quotations/${uid(14)}`,
    );

    await expect(page.getByRole("link", { name: /^Resume payment/ })).toHaveCount(1);

    await expect(page.getByText(/Payment ID/)).toHaveCount(0);

    await expectNoUuid(page);

    await expectUniqueLinkNames(page);

    await expectNoAxeViolations(page);
  });

  for (const [path, heading] of [
    ["/tourist/quotations", "No quotations yet"],
    ["/tourist/bookings", "No bookings yet"],
    ["/tourist/payments", "No payments yet"],
  ] as const) {
    test(`${path} empty state points to My journeys`, async ({ page }) => {
      await openTravelerPage(page, path, emptyState());

      await waitForContent(page);

      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();

      await expect(page.getByRole("main").getByRole("link", { name: "View my journeys" })).toHaveAttribute(
        "href",
        "/tourist/requests",
      );

      await expectNoAxeViolations(page);
    });
  }

  test("a list failure is announced with a retry", async ({ page }) => {
    await openTravelerPage(page, "/tourist/quotations", emptyState(), { fail: ["/quotations/me"] });

    const alert = page.getByRole("alert");

    await expect(alert.getByRole("heading", { name: "Unable to load quotations" })).toBeVisible({ timeout: 15_000 });

    await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});

test.describe("CR-030 Stage 2 responsive and accessibility", () => {
  for (const width of [390, 1440]) {
    test(`lists have no overflow, internal ids or axe violations at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      await openTravelerPage(page, "/tourist/requests", journeyMixState());

      for (const path of ["/tourist/requests", "/tourist/quotations", "/tourist/bookings", "/tourist/payments"]) {
        await page.goto(path);

        await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });

        await waitForContent(page);

        await expectNoHorizontalOverflow(page);

        await expectNoUuid(page);

        await expectNoAxeViolations(page);
      }
    });
  }
});

test.describe("CR-030 Stage 2 duplicate journey names", () => {
  test("journeys with the same title and submission date keep distinct link names", async ({ page }) => {
    const state = emptyState();

    // Same title, same submission date (the request() default), no reference yet.
    state.requests.push(
      request(uid(41), { title: "Family week in Kandy", status: "PENDING_REVIEW" }),
      request(uid(42), { title: "Family week in Kandy", status: "PENDING_REVIEW" }),
    );

    // Same title and date, each with its own sent quotation.
    const teaA = request(uid(43), { title: "Tea country escape", status: "QUOTATION_SENT" });

    const teaB = request(uid(44), { title: "Tea country escape", status: "QUOTATION_SENT" });

    state.requests.push(teaA, teaB);

    state.quotations.push(
      quotation(uid(53), teaA, { quotationNumber: "QT-CR030-DUP-A" }),
      quotation(uid(54), teaB, { quotationNumber: "QT-CR030-DUP-B" }),
    );

    await openTravelerPage(page, "/tourist/requests", state);

    await waitForContent(page);

    // Visible action copy is unchanged.
    await expect(page.getByRole("link", { name: /^Review quotation/ })).toHaveCount(2);

    expect(
      await page
        .getByRole("link", { name: /^Review quotation/ })
        .evaluateAll((links) => links.map((link) => link.childNodes[0]?.textContent?.trim())),
    ).toEqual(["Review quotation", "Review quotation"]);

    // The sent quotations are told apart by their quotation numbers.
    await expect(page.getByRole("link", { name: /^Review quotation\s*: Tea country escape, QT-CR030-DUP-A/ })).toHaveAttribute(
      "href",
      `/tourist/quotations/${uid(53)}`,
    );

    await expect(page.getByRole("link", { name: /^Review quotation\s*: Tea country escape, QT-CR030-DUP-B/ })).toHaveAttribute(
      "href",
      `/tourist/quotations/${uid(54)}`,
    );

    // Early requests with no reference get a deterministic ordinal.
    const kandy = page.getByRole("link", { name: /^Family week in Kandy/ });

    await expect(kandy).toHaveCount(2);

    const kandyNames = (await kandy.allTextContents()).map((name) => name.replace(/\s+/g, " ").trim());

    expect(kandyNames.some((name) => name.endsWith("journey 1 of 2"))).toBe(true);

    expect(kandyNames.some((name) => name.endsWith("journey 2 of 2"))).toBe(true);

    const names = await linkNames(page);

    expect(names.join("\n")).not.toMatch(UUID_PATTERN);

    await expectUniqueLinkNames(page);

    await expectNoUuid(page);

    await expectNoAxeViolations(page);
  });
});
