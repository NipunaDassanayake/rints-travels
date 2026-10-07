import AxeBuilder from "@axe-core/playwright";

import { expect, test, type Page } from "@playwright/test";

/**
 * =========================================================
 * CR-030 Stage 4 -- Quotation and payment experience
 * =========================================================
 *
 * Real traveler login; every quotation/payment read and write is
 * answered by route interception, so nothing is accepted, paid or
 * created. Times are shown in the browser's time zone, so the
 * context is pinned to UTC for deterministic expiry text.
 */

test.use({ timezoneId: "UTC" });

const TOURIST_EMAIL = process.env.E2E_TOURIST_EMAIL ?? "nipuna@example.com";

const TOURIST_PASSWORD = process.env.E2E_TOURIST_PASSWORD ?? "Password123";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const uid = (n: number) => `6a7b8c9d-0e1f-4a2b-9c3d-${String(n).padStart(12, "0")}`;

const TOURIST_ID = uid(999);

const GUIDE = {
  id: uid(900),
  userId: uid(901),
  bio: "Hill-country walking and culture specialist.",
  experienceYears: 9,
  languages: ["English", "Sinhala"],
  specializations: ["Culture"],
  location: "Kandy",
  dailyRate: "60.00",
  averageRating: "4.80",
  totalReviews: 12,
  isAvailable: true,
  user: {
    id: uid(901),
    firstName: "Asha",
    lastName: "Fernando",
    // Present on purpose: the page must never render contact details.
    email: "asha.private@e2e.travora.test",
    phone: "+94 77 000 0404",
  },
};

type Json = Record<string, unknown>;

function quotation(n: number, overrides: Json = {}): Json {
  const requestStatus = (overrides.requestStatus as string | undefined) ?? "QUOTATION_SENT";

  const requestId = (overrides.requestId as string | undefined) ?? uid(n);

  return {
    id: uid(100 + n),
    tourRequestId: requestId,
    tourRequest: { id: requestId, status: requestStatus },
    guideId: null,
    guide: null,
    quotationNumber: `QT-CR030-S4-${n}`,
    revisionNumber: 1,
    title: "Hill country and tea trails",
    description: "A relaxed private journey with handpicked stays.",
    startDate: "2026-11-10T00:00:00.000Z",
    endDate: "2026-11-16T00:00:00.000Z",
    adultCount: 2,
    childCount: 1,
    subtotal: "2400.00",
    discountAmount: "100.00",
    taxAmount: "60.00",
    totalAmount: "2360.00",
    currency: "USD",
    notes: "Prices include all transfers.",
    termsConditions: "50% refundable up to 30 days before travel.",
    validUntil: "2027-12-01T00:00:00.000Z",
    status: "SENT",
    sentAt: "2026-10-01T09:00:00.000Z",
    respondedAt: null,
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
    itineraries: [1, 2, 3].map((day) => ({
      id: day,
      dayNumber: day,
      title: ["Arrive in Kandy", "Tea estates", "Ella"][day - 1],
      description: "Private transfer and guided visits.",
    })),
    inclusions: [{ id: 1, title: "Private car and driver" }],
    exclusions: [{ id: 1, title: "International flights" }],
    ...overrides,
  };
}

function payment(n: number, quote: Json, overrides: Json = {}): Json {
  return {
    id: uid(200 + n),
    quotationId: quote.id,
    touristId: TOURIST_ID,
    paymentReference: `PAY-CR030-S4-${n}`,
    amount: quote.totalAmount,
    currency: "USD",
    paymentMethod: "CARD",
    status: "PENDING",
    gatewayReference: null,
    failureReason: null,
    paidAt: null,
    createdAt: "2026-10-03T09:30:00.000Z",
    updatedAt: "2026-10-03T09:30:00.000Z",
    stripeCheckoutSessionId: "cs_test_cr030stage4",
    stripePaymentIntentId: null,
    quotation: {
      id: quote.id,
      tourRequestId: quote.tourRequestId,
      quotationNumber: quote.quotationNumber,
      title: quote.title,
      totalAmount: quote.totalAmount,
      currency: "USD",
      status: quote.status,
      tourRequest: { id: quote.tourRequestId, touristId: TOURIST_ID, status: "ACCEPTED" },
      guide: null,
    },
    tourist: { id: TOURIST_ID, firstName: "Nipuna", lastName: "Tourist", email: TOURIST_EMAIL },
    booking: null,
    ...overrides,
  };
}

interface World {
  quotations: Json[];
  payments: Json[];
  acceptCalls: string[];
  /** How the accept endpoint answers. */
  accept: "success" | "expires";
  /** Payment ids whose GET fails. */
  brokenPayments: string[];
}

const newWorld = (): World => ({ quotations: [], payments: [], acceptCalls: [], accept: "success", brokenPayments: [] });

async function mockApi(page: Page, world: World) {
  await page.route(`${API_BASE_URL}/**`, async (route) => {
    const request = route.request();

    const path = new URL(request.url()).pathname.replace(/^\/api/, "");

    if (path.startsWith("/auth/")) {
      return route.continue();
    }

    const ok = (data: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });

    const notFound = () =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Not found", data: null, errors: null }),
      });

    let match: RegExpMatchArray | null;

    if (request.method() === "POST" && (match = path.match(/^\/quotations\/([^/]+)\/accept$/))) {
      world.acceptCalls.push(match[1]);

      const quote = world.quotations.find((item) => item.id === match![1]);

      if (!quote) return notFound();

      if (world.accept === "expires") {
        // The API expires the quotation and refuses the accept.
        quote.status = "EXPIRED";

        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Quotation has expired", data: null, errors: null }),
        });
      }

      quote.status = "ACCEPTED";

      quote.respondedAt = "2026-10-07T10:00:00.000Z";

      (quote.tourRequest as Json).status = "ACCEPTED";

      return ok(quote);
    }

    if (request.method() !== "GET") {
      return route.abort();
    }

    if (path === "/payments/me") return ok(world.payments);
    if (path === "/quotations/me") return ok(world.quotations);
    if (["/tour-requests/me", "/bookings/me", "/reviews/me"].includes(path)) return ok([]);

    if ((match = path.match(/^\/quotations\/tour-request\/([^/]+)$/))) {
      return ok(world.quotations.filter((item) => item.tourRequestId === match![1]));
    }

    if ((match = path.match(/^\/quotations\/([^/]+)$/))) {
      const quote = world.quotations.find((item) => item.id === match![1]);

      return quote ? ok(quote) : notFound();
    }

    if ((match = path.match(/^\/payments\/([^/]+)$/))) {
      if (world.brokenPayments.includes(match[1])) return notFound();

      const found = world.payments.find((item) => item.id === match![1]);

      return found ? ok(found) : notFound();
    }

    return route.continue();
  });
}

async function login(page: Page) {
  await page.context().clearCookies();

  await page.goto("/login");

  await page.getByLabel("Email").fill(TOURIST_EMAIL);

  await page.getByLabel("Password").fill(TOURIST_PASSWORD);

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

async function start(page: Page, world: World) {
  await mockApi(page, world);

  await login(page);
}

async function openQuotation(page: Page, quote: Json) {
  await page.goto(`/tourist/quotations/${quote.id}`);

  await expect(page.getByRole("heading", { level: 1, name: quote.title as string })).toBeVisible({ timeout: 15_000 });

  await expect(page.getByTestId("quotation-action")).toBeVisible({ timeout: 15_000 });
}

async function openPayment(page: Page, record: Json) {
  await page.goto(`/tourist/payments/${record.id}`);

  await expect(page.getByTestId("payment-amount")).toBeVisible({ timeout: 15_000 });
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

/* ================================================================ */

test.describe("CR-030 Stage 4 quotation detail", () => {
  test("a valid sent quotation offers Accept, formatted money and a precise expiry", async ({ page }) => {
    const world = newWorld();

    const quote = quotation(1, { guideId: GUIDE.id, guide: GUIDE });

    world.quotations.push(quote);

    await start(page, world);

    await openQuotation(page, quote);

    const action = page.getByTestId("quotation-action");

    await expect(action.getByRole("heading", { level: 2, name: "Your response" })).toBeVisible();

    await expect(action.getByRole("button", { name: "Accept quotation" })).toBeVisible();

    await expect(action.getByRole("button", { name: "Reject quotation" })).toBeVisible();

    const price = page.getByTestId("price-summary");

    await expect(price.getByText("USD 2,400.00", { exact: true })).toBeVisible();

    await expect(price.getByText("USD 100.00")).toBeVisible();

    await expect(price.getByText("USD 2,360.00", { exact: true })).toBeVisible();

    await expect(price.getByText("Expires", { exact: true })).toBeVisible();

    await expect(price.getByText("Dec 1, 2027, 12:00 AM UTC", { exact: true })).toBeVisible();

    await expect(page.getByTestId("quotation-meta")).toHaveText("QT-CR030-S4-1 · Revision 1");

    // Proposed guide: public profile only, never contact details.
    await expect(page.getByRole("heading", { level: 2, name: "Your proposed guide" })).toBeVisible();

    const text = await page.locator("main").innerText();

    expect(text).not.toContain(GUIDE.user.email);

    expect(text).not.toContain(GUIDE.user.phone);

    // Semantic sections.
    await expect(page.getByRole("heading", { level: 2, name: "Itinerary" })).toBeVisible();

    await expect(page.getByRole("heading", { level: 3, name: "Arrive in Kandy" })).toBeVisible();
  });

  test("a sent quotation past its validity cannot be accepted", async ({ page }) => {
    const world = newWorld();

    const quote = quotation(2, { validUntil: "2026-10-01T00:00:00.000Z" });

    world.quotations.push(quote);

    await start(page, world);

    await openQuotation(page, quote);

    // The API status is shown as it is; expiry is explained, not invented.
    await expect(page.getByText("Sent", { exact: true }).first()).toBeVisible();

    await expect(page.getByText("Expired", { exact: true }).first()).toBeVisible();

    await expect(
      page.getByTestId("quotation-action").getByRole("heading", { name: "This quotation has expired" }),
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Accept quotation" })).toHaveCount(0);

    await expect(page.getByTestId("quotation-action")).toContainText("Oct 1, 2026, 12:00 AM UTC");
  });

  test("an accept that races expiry refreshes the quotation instead of looping", async ({ page }) => {
    const world = newWorld();

    world.accept = "expires";

    const quote = quotation(3);

    world.quotations.push(quote);

    await start(page, world);

    await openQuotation(page, quote);

    await page.getByRole("button", { name: "Accept quotation" }).click();

    const dialog = page.getByRole("alertdialog", { name: "Accept this quotation?" });

    await dialog.getByRole("button", { name: "Yes, accept quotation" }).click();

    await expect(dialog).toBeHidden({ timeout: 10_000 });

    const heading = page.getByTestId("quotation-action").getByRole("heading", { name: "This quotation has expired" });

    await expect(heading).toBeVisible();

    await expect(page.getByText("This quotation expired before it could be accepted.")).toBeVisible();

    await expect(heading).toBeFocused({ timeout: 5_000 });

    await expect(page.getByRole("button", { name: "Accept quotation" })).toHaveCount(0);

    expect(world.acceptCalls).toEqual([quote.id]);
  });

  test("a successful accept moves focus to the accepted state and offers payment", async ({ page }) => {
    const world = newWorld();

    const quote = quotation(4);

    world.quotations.push(quote);

    await start(page, world);

    await openQuotation(page, quote);

    await page.getByRole("button", { name: "Accept quotation" }).click();

    await page.getByRole("alertdialog").getByRole("button", { name: "Yes, accept quotation" }).click();

    const accepted = page.getByRole("heading", { level: 2, name: "Quotation accepted" });

    await expect(accepted).toBeVisible({ timeout: 10_000 });

    await expect(accepted).toBeFocused({ timeout: 5_000 });

    await expect(page.getByRole("button", { name: "Pay USD 2,360.00" })).toBeVisible();

    expect(world.acceptCalls).toEqual([quote.id]);
  });

  test("payment states never offer a second payment", async ({ page }) => {
    const world = newWorld();

    const accepted = (n: number) => quotation(n, { status: "ACCEPTED", requestStatus: "ACCEPTED" });

    const unpaid = accepted(10);

    const pending = accepted(11);

    const processing = accepted(12);

    const paid = accepted(13);

    const booked = quotation(14, { status: "ACCEPTED", requestStatus: "BOOKED" });

    const refunded = accepted(15);

    world.quotations.push(unpaid, pending, processing, paid, booked, refunded);

    world.payments.push(
      payment(11, pending),
      payment(12, processing, { status: "PROCESSING" }),
      payment(13, paid, { status: "SUCCESS", paidAt: "2026-10-03T09:40:00.000Z" }),
      payment(14, booked, { status: "SUCCESS", paidAt: "2026-10-03T09:40:00.000Z", booking: { id: uid(314) } }),
      payment(15, refunded, { status: "REFUNDED" }),
    );

    await start(page, world);

    const anyPay = () => page.getByRole("button", { name: /^(Pay|Resume payment)/ });

    await openQuotation(page, unpaid);

    await expect(page.getByRole("button", { name: "Pay USD 2,360.00" })).toBeVisible({ timeout: 15_000 });

    await openQuotation(page, pending);

    await expect(page.getByRole("button", { name: "Resume payment of USD 2,360.00" })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("button", { name: /^Pay / })).toHaveCount(0);

    await openQuotation(page, processing);

    await expect(page.getByTestId("quotation-payment-confirming")).toContainText("Payment processing", { timeout: 15_000 });

    await expect(anyPay()).toHaveCount(0);

    await openQuotation(page, paid);

    const paidPanel = page.getByTestId("quotation-paid");

    await expect(paidPanel).toContainText("Payment received", { timeout: 15_000 });

    await expect(paidPanel).toContainText("Your booking is being finalized");

    await expect(paidPanel).not.toContainText("Booking confirmed");

    await expect(paidPanel.getByRole("link", { name: "View payment" })).toHaveAttribute("href", `/tourist/payments/${uid(213)}`);

    await expect(anyPay()).toHaveCount(0);

    await openQuotation(page, booked);

    await expect(page.getByTestId("quotation-paid")).toContainText("Payment received · Booking confirmed", { timeout: 15_000 });

    await expect(page.getByTestId("quotation-paid").getByRole("link", { name: "View booking" })).toHaveAttribute(
      "href",
      `/tourist/bookings/${uid(314)}`,
    );

    await expect(anyPay()).toHaveCount(0);

    await openQuotation(page, refunded);

    await expect(page.getByTestId("quotation-paid")).toContainText("Payment refunded", { timeout: 15_000 });

    await expect(anyPay()).toHaveCount(0);
  });

  test("revisions are explained and a superseded revision links to the latest", async ({ page }) => {
    const world = newWorld();

    const requestId = uid(20);

    const older = quotation(21, { requestId, status: "SUPERSEDED", revisionNumber: 1 });

    const latest = quotation(22, { requestId, revisionNumber: 2 });

    world.quotations.push(older, latest);

    await start(page, world);

    await openQuotation(page, older);

    await expect(page.getByTestId("quotation-meta")).toHaveText("QT-CR030-S4-21 · Revision 1 · Previous revision", {
      timeout: 15_000,
    });

    await expect(
      page.getByText(
        "This quotation is no longer active. It was replaced by a newer revision or the request was closed.",
        { exact: true },
      ),
    ).toBeVisible();

    await expect(page.getByTestId("latest-revision-link")).toHaveAttribute("href", `/tourist/quotations/${latest.id}`);

    await expect(page.getByRole("button", { name: "Accept quotation" })).toHaveCount(0);

    // No generic "payment locked" card for a superseded revision.
    await expect(page.getByText(/payment becomes available/i)).toHaveCount(0);

    await page.getByTestId("latest-revision-link").click();

    await expect(page.getByTestId("quotation-meta")).toHaveText("QT-CR030-S4-22 · Revision 2 · Latest", {
      timeout: 15_000,
    });

    await expect(page.getByRole("button", { name: "Accept quotation" })).toBeVisible();

    await expect(page.getByTestId("quotation-revision-list").getByRole("listitem")).toHaveCount(2);
  });

  test("on a phone the price and the next step come before the itinerary", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const world = newWorld();

    const quote = quotation(30);

    world.quotations.push(quote);

    await start(page, world);

    await openQuotation(page, quote);

    const priceTop = (await page.getByTestId("price-summary").boundingBox())!.y;

    const actionTop = (await page.getByTestId("quotation-action").boundingBox())!.y;

    const itineraryTop = (await page.getByRole("heading", { level: 2, name: "Itinerary" }).boundingBox())!.y;

    expect(priceTop).toBeLessThan(itineraryTop);

    expect(actionTop).toBeLessThan(itineraryTop);
  });

  for (const width of [390, 1440]) {
    test(`quotation states pass axe with no overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      const world = newWorld();

      const sent = quotation(40, { guideId: GUIDE.id, guide: GUIDE });

      const accepted = quotation(41, { status: "ACCEPTED", requestStatus: "ACCEPTED" });

      const expired = quotation(42, { validUntil: "2026-10-01T00:00:00.000Z" });

      world.quotations.push(sent, accepted, expired);

      await start(page, world);

      for (const quote of [sent, accepted, expired]) {
        await openQuotation(page, quote);

        await expect(page.locator('[data-slot="loading-state"]')).toHaveCount(0, { timeout: 15_000 });

        await expectNoHorizontalOverflow(page);

        await expectNoAxeViolations(page);
      }
    });
  }
});

test.describe("CR-030 Stage 4 payment detail", () => {
  test("an unfinished payment can be resumed from its quotation; processing cannot be paid", async ({ page }) => {
    const world = newWorld();

    const quote = quotation(50, { status: "ACCEPTED", requestStatus: "ACCEPTED" });

    const pending = payment(50, quote);

    const processing = payment(51, quote, { id: uid(251), status: "PROCESSING" });

    world.quotations.push(quote);

    world.payments.push(pending, processing);

    await start(page, world);

    await openPayment(page, pending);

    await expect(page.getByTestId("payment-amount")).toHaveText("USD 2,360.00");

    await expect(page.getByRole("heading", { level: 2, name: "Payment not completed yet" })).toBeVisible();

    await expect(page.getByRole("link", { name: "Resume payment" })).toHaveAttribute("href", `/tourist/quotations/${quote.id}`);

    await expect(page.getByRole("button", { name: /^Pay/ })).toHaveCount(0);

    await openPayment(page, processing);

    await expect(page.getByRole("heading", { level: 2, name: "Payment processing" })).toBeVisible();

    await expect(page.getByRole("link", { name: "Resume payment" })).toHaveCount(0);
  });

  test("a received payment only claims a booking once the booking exists", async ({ page }) => {
    const world = newWorld();

    const paidQuote = quotation(60, { status: "ACCEPTED", requestStatus: "ACCEPTED" });

    const bookedQuote = quotation(61, { status: "ACCEPTED", requestStatus: "BOOKED" });

    const paid = payment(60, paidQuote, { status: "SUCCESS", paidAt: "2026-10-03T09:40:00.000Z", gatewayReference: "pi_cr030stage4abc", stripePaymentIntentId: "pi_cr030stage4abc" });

    const booked = payment(61, bookedQuote, {
      status: "SUCCESS",
      paidAt: "2026-10-03T09:40:00.000Z",
      gatewayReference: "pi_cr030stage4def",
      booking: { id: uid(361) },
    });

    world.quotations.push(paidQuote, bookedQuote);

    world.payments.push(paid, booked);

    await start(page, world);

    await openPayment(page, paid);

    await expect(page.getByRole("heading", { level: 2, name: "Payment received" })).toBeVisible();

    const main = page.locator("main");

    await expect(main).toContainText("being finalized");

    for (const claim of [/booking confirmed/i, /confirmed booking/i, /available under My Bookings/i]) {
      await expect(main).not.toContainText(claim);
    }

    await expect(page.getByRole("link", { name: "View booking" })).toHaveCount(0);

    await openPayment(page, booked);

    await expect(page.getByRole("heading", { level: 2, name: "Payment received · Booking confirmed" })).toBeVisible();

    await expect(page.getByRole("link", { name: "View booking" })).toHaveAttribute("href", `/tourist/bookings/${uid(361)}`);

    // Provider internals are never shown.
    const text = await main.innerText();

    expect(text).not.toMatch(/\bpi_|\bcs_test_/);

    expect(text).not.toContain("Gateway reference");

    await expect(page.getByText("PAY-CR030-S4-61").first()).toBeVisible();
  });

  test("failed and refunded payments use traveler wording", async ({ page }) => {
    const world = newWorld();

    const quote = quotation(70, { status: "ACCEPTED", requestStatus: "ACCEPTED" });

    const failed = payment(70, quote, {
      status: "FAILED",
      failureReason: "card_declined: insufficient_funds (decline_code=generic)",
    });

    const refunded = payment(71, quote, { id: uid(271), status: "REFUNDED" });

    world.quotations.push(quote);

    world.payments.push(failed, refunded);

    await start(page, world);

    await openPayment(page, failed);

    await expect(page.getByRole("heading", { level: 2, name: "Payment didn't go through" })).toBeVisible();

    await expect(page.locator("main")).not.toContainText("card_declined");

    await expect(page.locator("main")).not.toContainText("decline_code");

    await expect(page.getByRole("link", { name: "Return to quotation" })).toHaveAttribute("href", `/tourist/quotations/${quote.id}`);

    await openPayment(page, refunded);

    await expect(page.getByRole("heading", { level: 2, name: "Payment refunded" })).toBeVisible();

    await expect(page.getByRole("link", { name: /resume payment/i })).toHaveCount(0);

    await expect(page.getByRole("button", { name: /^Pay/ })).toHaveCount(0);
  });

  for (const width of [390, 1440]) {
    test(`payment receipts pass axe with no overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      const world = newWorld();

      const quote = quotation(80, { status: "ACCEPTED", requestStatus: "BOOKED" });

      const booked = payment(80, quote, { status: "SUCCESS", paidAt: "2026-10-03T09:40:00.000Z", booking: { id: uid(380) } });

      const pending = payment(81, quote, { id: uid(281) });

      world.quotations.push(quote);

      world.payments.push(booked, pending);

      await start(page, world);

      for (const record of [booked, pending]) {
        await openPayment(page, record);

        await expectNoHorizontalOverflow(page);

        await expectNoAxeViolations(page);
      }
    });
  }
});

test.describe("CR-030 Stage 4 payment success and cancel", () => {
  test("the success page keeps its states, formats money and announces only the message", async ({ page }) => {
    const world = newWorld();

    const quote = quotation(90, { status: "ACCEPTED", requestStatus: "BOOKED" });

    const pending = payment(90, quote);

    const booked = payment(91, quote, { id: uid(291), status: "SUCCESS", booking: { id: uid(391) } });

    world.quotations.push(quote);

    world.payments.push(pending, booked);

    await start(page, world);

    await page.goto(`/tourist/payments/success?session_id=cs_test_x&paymentId=${pending.id}`);

    await expect(page.getByRole("heading", { level: 1, name: "Confirming your payment" })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByText("USD 2,360.00", { exact: true })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Your booking is confirmed" })).toHaveCount(0);

    const status = page.getByRole("status").filter({ hasText: "Confirming your payment" });

    await expect(status).toHaveCount(1);

    await expect(status.getByRole("link")).toHaveCount(0);

    await expectNoAxeViolations(page);

    await page.goto(`/tourist/payments/success?session_id=cs_test_x&paymentId=${booked.id}`);

    await expect(page.getByRole("heading", { level: 1, name: "Your booking is confirmed" })).toBeVisible({ timeout: 15_000 });

    await expect(page.getByRole("link", { name: "View booking" })).toHaveAttribute("href", `/tourist/bookings/${uid(391)}`);
  });

  test("a received payment without a booking is never called confirmed", async ({ page }) => {
    const world = newWorld();

    const quote = quotation(95, { status: "ACCEPTED", requestStatus: "ACCEPTED" });

    const paid = payment(95, quote, { status: "SUCCESS", paidAt: "2026-10-03T09:40:00.000Z" });

    world.quotations.push(quote);

    world.payments.push(paid);

    await start(page, world);

    await page.clock.install();

    await page.goto(`/tourist/payments/success?paymentId=${paid.id}`);

    await expect(page.getByRole("heading", { level: 1, name: "Confirming your payment" })).toBeVisible({ timeout: 15_000 });

    await page.clock.fastForward(31_000);

    await expect(page.getByRole("heading", { level: 1, name: "Confirmation is taking longer than usual" })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByText("Your payment has been received, but your booking is still being finalized.")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Your booking is confirmed" })).toHaveCount(0);
  });

  test("cancelled checkout links back to its quotation and says nothing was cancelled", async ({ page }) => {
    const world = newWorld();

    const quote = quotation(100, { status: "ACCEPTED", requestStatus: "ACCEPTED" });

    const pending = payment(100, quote);

    world.quotations.push(quote);

    world.payments.push(pending);

    await start(page, world);

    await page.goto(`/tourist/payments/cancel?paymentId=${pending.id}`);

    await expect(page.getByText("Checkout cancelled", { exact: true })).toBeVisible({ timeout: 15_000 });

    const main = page.locator("main");

    await expect(main).toContainText("no payment was taken");

    await expect(main).toContainText("Your trip plans and quotation are unchanged");

    await expect(page.getByRole("link", { name: "Return to quotation" })).toHaveAttribute(
      "href",
      `/tourist/quotations/${quote.id}`,
      { timeout: 15_000 },
    );

    await expect(main).not.toContainText(/trip (was|has been) cancelled/i);

    await expectNoAxeViolations(page);
  });

  test("cancel without a usable payment id falls back gracefully", async ({ page }) => {
    const world = newWorld();

    world.brokenPayments.push(uid(299));

    await start(page, world);

    for (const url of ["/tourist/payments/cancel", `/tourist/payments/cancel?paymentId=${uid(299)}`]) {
      await page.goto(url);

      await expect(page.getByText("Checkout cancelled", { exact: true })).toBeVisible({ timeout: 15_000 });

      await expect(page.getByRole("link", { name: "View my quotations" })).toHaveAttribute("href", "/tourist/quotations", {
        timeout: 15_000,
      });

      await expect(page.getByRole("link", { name: "View my journeys" })).toHaveAttribute("href", "/tourist/requests");

      // No error is shown for a cancellation (Next.js keeps its own route announcer outside main).
      await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    }
  });
});
