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
async function mockTraveler(page: Page, state: TravelerState) {
  const acceptCalls: string[] = [];

  await page.route(`${API_BASE_URL}/**`, async (route) => {
    const method = route.request().method();

    const path = new URL(route.request().url()).pathname.replace(/^\/api/, "");

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
