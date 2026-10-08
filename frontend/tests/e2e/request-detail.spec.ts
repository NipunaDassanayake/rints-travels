import AxeBuilder from "@axe-core/playwright";

import { expect, test, type Page } from "@playwright/test";

import { createFixtureTourist, type FixtureTourist } from "./support/fixture-identities";

/**
 * =========================================================
 * CR-030 Stage 6 -- Request detail and journey closeout
 * =========================================================
 *
 * Real traveler login; every traveler read is answered by route
 * interception and every write is refused, so nothing is created,
 * cancelled, paid or reviewed. The clock and time zone are pinned so
 * quotation expiry is deterministic.
 */

test.use({ timezoneId: "UTC" });

/**
 * Throwaway tourist created per run (CR-032 Stage 3A) -- never a real
 * account. The standard E2E cleanup deletes it and everything it owns.
 */
let e2eTourist: FixtureTourist;

test.beforeAll(async () => {
  e2eTourist = await createFixtureTourist("request-detail");
});

/** Mocked responses only; never used to sign in. */
const MOCK_TOURIST_EMAIL = "traveler@example.test";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** "Now" for every test: Oct 7, 2026, 10:00 UTC. */
const NOW = new Date("2026-10-07T10:00:00.000Z");

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const uid = (n: number) => `8d9e0f1a-2b3c-4d5e-9f6a-${String(n).padStart(12, "0")}`;

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
    // Present on purpose: the pages must never render contact details.
    email: "asha.private@e2e.travora.test",
    phone: "+94 77 000 0606",
  },
};

const PACKAGE = {
  id: 2,
  title: "Kandy, the hill capital",
  slug: "cr030-stage6-kandy",
  destination: "Kandy",
  durationDays: 3,
  price: "1650.00",
  description: "Temples, lake walks and tea country.",
};

type Json = Record<string, unknown>;

function request(n: number, title: string, overrides: Json = {}): Json {
  return {
    id: uid(n),
    touristId: TOURIST_ID,
    packageId: null,
    preferredGuideId: null,
    assignedAdminId: uid(800),
    requestType: "CUSTOM",
    title,
    preferredStartDate: "2026-11-10T00:00:00.000Z",
    preferredEndDate: "2026-11-16T00:00:00.000Z",
    adultCount: 2,
    childCount: 1,
    destinationPreferences: "Kandy, Nuwara Eliya, Ella",
    budget: "2500.00",
    currency: "USD",
    hotelPreference: "Boutique 4-star",
    transportPreference: "Private car",
    specialRequirements: null,
    contactMethod: "WHATSAPP",
    status: "PENDING_REVIEW",
    createdAt: "2026-09-20T10:00:00.000Z",
    updatedAt: `2026-10-0${1 + (n % 6)}T10:00:00.000Z`,
    deletedAt: null,
    travelPackage: null,
    preferredGuide: null,
    ...overrides,
  };
}

function quotation(n: number, req: Json, overrides: Json = {}): Json {
  return {
    id: uid(100 + n),
    tourRequestId: req.id,
    tourRequest: { id: req.id, status: req.status },
    guideId: GUIDE.id,
    guide: GUIDE,
    quotationNumber: `QT-CR030-S6-${n}`,
    revisionNumber: 1,
    title: req.title ?? PACKAGE.title,
    description: "A relaxed private journey.",
    startDate: req.preferredStartDate,
    endDate: req.preferredEndDate,
    adultCount: 2,
    childCount: 1,
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
    updatedAt: req.updatedAt,
    itineraries: [{ id: 1, quotationId: uid(100 + n), dayNumber: 1, title: "Arrive in Kandy", description: "Transfer." }],
    inclusions: [],
    exclusions: [],
    ...overrides,
  };
}

function payment(n: number, quote: Json, overrides: Json = {}): Json {
  return {
    id: uid(200 + n),
    quotationId: quote.id,
    touristId: TOURIST_ID,
    paymentReference: `PAY-CR030-S6-${n}`,
    gatewayReference: "pi_3CR030StageSixSecret",
    stripePaymentIntentId: "pi_3CR030StageSixSecret",
    stripeCheckoutSessionId: "cs_test_cr030stage6",
    amount: quote.totalAmount,
    currency: "USD",
    paymentMethod: "CARD",
    status: "SUCCESS",
    failureReason: null,
    paidAt: "2026-10-03T09:40:00.000Z",
    createdAt: "2026-10-03T09:30:00.000Z",
    updatedAt: "2026-10-03T09:40:00.000Z",
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
    tourist: { id: TOURIST_ID, firstName: "Test", lastName: "Traveler", email: MOCK_TOURIST_EMAIL },
    booking: null,
    ...overrides,
  };
}

function booking(n: number, req: Json, quote: Json, pay: Json, overrides: Json = {}): Json {
  return {
    id: uid(300 + n),
    tourRequestId: req.id,
    quotationId: quote.id,
    paymentId: pay.id,
    touristId: TOURIST_ID,
    bookingReference: `BK-CR030-S6-${n}`,
    status: "CONFIRMED",
    startDate: quote.startDate,
    endDate: quote.endDate,
    totalAmount: quote.totalAmount,
    currency: "USD",
    confirmedAt: pay.paidAt,
    completedAt: null,
    cancelledAt: null,
    createdAt: pay.paidAt,
    updatedAt: req.updatedAt,
    tourRequest: req,
    quotation: quote,
    payment: pay,
    tourist: { id: TOURIST_ID, firstName: "Test", lastName: "Traveler", email: MOCK_TOURIST_EMAIL },
    ...overrides,
  };
}

interface World {
  requests: Json[];
  quotations: Json[];
  payments: Json[];
  bookings: Json[];
  reviews: Json[];
  /** Paths answered with HTTP 500. */
  fail: Set<string>;
  /** Paths answered after a delay. */
  slow: Set<string>;
  writes: string[];
}

const newWorld = (): World => ({
  requests: [],
  quotations: [],
  payments: [],
  bookings: [],
  reviews: [],
  fail: new Set(),
  slow: new Set(),
  writes: [],
});

/** One request with whatever records belong to it. */
function journey(
  world: World,
  req: Json,
  quote?: Json | null,
  pay?: Json | null,
  book?: Json | null,
) {
  world.requests.push(req);

  if (quote) world.quotations.push(quote);

  if (pay) world.payments.push(pay);

  if (book) {
    world.bookings.push(book);

    if (pay) pay.booking = { id: book.id, bookingReference: book.bookingReference, status: book.status };
  }

  return { req, quote: quote ?? null, pay: pay ?? null, book: book ?? null };
}

/* The traveler states of the closeout matrix. */

const waiting = (w: World) =>
  journey(
    w,
    request(1, PACKAGE.title, { requestType: "PACKAGE_BASED", packageId: PACKAGE.id, title: null, travelPackage: PACKAGE }),
  );

const sent = (w: World) => {
  const r = request(2, "Southern coast escape", { status: "QUOTATION_SENT" });

  return journey(w, r, quotation(2, r));
};

const acceptedUnpaid = (w: World) => {
  const r = request(3, "Cultural triangle", { status: "ACCEPTED" });

  return journey(w, r, quotation(3, r, { status: "ACCEPTED" }));
};

const paymentPending = (w: World) => {
  const r = request(4, "Tea country rail trip", { status: "ACCEPTED" });

  const q = quotation(4, r, { status: "ACCEPTED" });

  return journey(w, r, q, payment(4, q, { status: "PENDING", paidAt: null }));
};

const paidNoBooking = (w: World) => {
  const r = request(5, "Yala safari weekend", { status: "ACCEPTED" });

  const q = quotation(5, r, { status: "ACCEPTED" });

  return journey(w, r, q, payment(5, q));
};

const booked = (w: World, n: number, title: string, overrides: Json = {}) => {
  const r = request(n, title, { status: "BOOKED" });

  const q = quotation(n, r, { status: "ACCEPTED" });

  const p = payment(n, q);

  return journey(w, r, q, p, booking(n, r, q, p, overrides));
};

const confirmed = (w: World) => booked(w, 6, "Grand Sri Lanka circuit");

const inProgress = (w: World) => booked(w, 7, "Ella hiking week", { status: "IN_PROGRESS" });

const completed = (w: World) =>
  booked(w, 8, "Galle fort and beaches", { status: "COMPLETED", completedAt: "2026-10-05T12:00:00.000Z" });

const reviewed = (w: World) => {
  const j = booked(w, 9, "Sigiriya and Dambulla", { status: "COMPLETED", completedAt: "2026-10-05T12:00:00.000Z" });

  w.reviews.push({
    id: uid(700),
    bookingId: j.book!.id,
    guideId: GUIDE.id,
    touristId: TOURIST_ID,
    rating: 5,
    comment: "Wonderful.",
    createdAt: "2026-10-06T09:00:00.000Z",
    updatedAt: "2026-10-06T09:00:00.000Z",
  });

  return j;
};

const cancelled = (w: World) =>
  booked(w, 14, "Mirissa whale season", { status: "CANCELLED", cancelledAt: "2026-10-06T08:00:00.000Z" });

const sentPastValidity = (w: World) => {
  const r = request(10, "Trincomalee whales", { status: "QUOTATION_SENT" });

  return journey(w, r, quotation(10, r, { validUntil: "2026-10-01T00:00:00.000Z" }));
};

const persistedExpired = (w: World) => {
  const r = request(11, "Arugam Bay surf", { status: "QUOTATION_SENT" });

  return journey(w, r, quotation(11, r, { status: "EXPIRED", validUntil: "2026-10-01T00:00:00.000Z" }));
};

/**
 * CR-031 state T: Travora revised the sent quotation. Revising
 * supersedes revision 1 and creates revision 2 as a DRAFT while the
 * request stays QUOTATION_SENT; the API never returns a draft to the
 * traveler, so revision 1 (SUPERSEDED) is all they can see.
 */
const revisionInPreparation = (w: World) => {
  const r = request(15, "Hill country revision", { status: "QUOTATION_SENT" });

  return journey(w, r, quotation(15, r, { status: "SUPERSEDED", revisionNumber: 1 }));
};

/** CR-031 state N: the revision was sent, so revision 2 is SENT. */
const revisionSent = (w: World) => {
  const r = request(16, "South coast revision", { status: "QUOTATION_SENT" });

  const previous = quotation(16, r, { status: "SUPERSEDED", revisionNumber: 1 });

  const latest = quotation(17, r, { status: "SENT", revisionNumber: 2, quotationNumber: "QT-CR030-S6-16B" });

  w.quotations.push(previous);

  return journey(w, r, latest);
};

const REVISION_MESSAGE = "Travora is preparing an updated quotation.";

async function mockApi(page: Page, world: World) {
  await page.route(`${API_BASE_URL}/**`, async (route) => {
    const req = route.request();

    const path = new URL(req.url()).pathname.replace(/^\/api/, "");

    if (path.startsWith("/auth/")) {
      return route.continue();
    }

    if (req.method() !== "GET") {
      // Nothing is ever written: a cancel attempt fails like a network error.
      world.writes.push(`${req.method()} ${path}`);

      return route.abort();
    }

    if (world.slow.has(path)) {
      await new Promise((resolve) => setTimeout(resolve, 2_500));
    }

    const respond = (status: number, data: unknown) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(
          status < 400
            ? { success: true, message: "OK", data }
            : { success: false, message: status === 404 ? "Not found" : "Unavailable", data: null, errors: null },
        ),
      });

    if (world.fail.has(path)) {
      return respond(500, null);
    }

    const lists: Record<string, Json[]> = {
      "/tour-requests/me": world.requests,
      "/quotations/me": world.quotations,
      "/payments/me": world.payments,
      "/bookings/me": world.bookings,
      "/reviews/me": world.reviews,
    };

    if (lists[path]) return respond(200, lists[path]);

    let match: RegExpMatchArray | null;

    if ((match = path.match(/^\/packages\/slug\/([^/]+)$/))) {
      return match[1] === PACKAGE.slug ? respond(200, { ...PACKAGE, images: [] }) : respond(404, null);
    }

    if ((match = path.match(/^\/quotations\/tour-request\/([^/]+)$/))) {
      return respond(200, world.quotations.filter((item) => item.tourRequestId === match![1]));
    }

    if ((match = path.match(/^\/reviews\/booking\/([^/]+)$/))) {
      return respond(200, world.reviews.find((item) => item.bookingId === match![1]) ?? null);
    }

    for (const [prefix, list] of [
      ["/tour-requests/", world.requests],
      ["/quotations/", world.quotations],
      ["/payments/", world.payments],
      ["/bookings/", world.bookings],
    ] as const) {
      if (path.startsWith(prefix) && !path.slice(prefix.length).includes("/")) {
        const found = list.find((item) => item.id === path.slice(prefix.length));

        return found ? respond(200, found) : respond(404, null);
      }
    }

    return route.continue();
  });
}

async function start(page: Page, world: World) {
  await mockApi(page, world);

  await page.context().clearCookies();

  await page.goto("/login");

  await page.getByLabel("Email").fill(e2eTourist.email);

  await page.getByLabel("Password").fill(e2eTourist.password);

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

  await page.clock.setFixedTime(NOW);
}

/** Opens a request and waits until its journey enrichment has settled. */
async function openRequest(page: Page, req: Json) {
  await page.goto(`/tourist/requests/${req.id}`);

  await expect(page.getByTestId("request-summary")).toBeVisible({ timeout: 15_000 });

  await expect(page.locator("main").getByRole("status")).toHaveCount(0, { timeout: 15_000 });
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

test.describe("CR-030 Stage 6 request detail: cancelled booking", () => {
  test("a cancelled booking is never described as booked", async ({ page }) => {
    const world = newWorld();

    const j = cancelled(world);

    await start(page, world);

    await openRequest(page, j.req);

    const summary = page.getByTestId("request-summary");

    await expect(summary).toContainText("This trip's booking was cancelled.");

    await expect(summary).toContainText("This booking is no longer active.");

    const main = page.locator("main");

    await expect(main).not.toContainText("Your journey has been booked");

    await expect(main).not.toContainText(/refund|reversed|reopen/i);

    // No active "Booked" state: the badge is the cancelled booking, and
    // the request tracker is replaced by a neutral panel.
    await expect(page.locator("[data-status='BOOKED']")).toHaveCount(0);

    await expect(page.locator("[data-status='CANCELLED']")).toHaveAttribute("data-tone", "muted");

    await expect(page.getByTestId("request-tracker")).toHaveCount(0);

    await expect(page.getByTestId("request-booking-cancelled")).toContainText("Booking cancelled");

    const next = page.getByTestId("request-next-step");

    await expect(next.getByRole("link", { name: "View booking" })).toHaveAttribute(
      "href",
      `/tourist/bookings/${j.book!.id}`,
    );

    await expect(next).not.toContainText(/upcoming|underway|starts/i);
  });
});

test.describe("CR-030 Stage 6 request detail: next step", () => {
  const cases = [
    { label: "a valid sent quotation", make: sent, link: "Review quotation", href: (j: ReturnType<typeof sent>) => `/tourist/quotations/${j.quote!.id}` },
    { label: "an accepted, unpaid quotation", make: acceptedUnpaid, link: "Pay now", href: (j: ReturnType<typeof sent>) => `/tourist/quotations/${j.quote!.id}` },
    { label: "a pending payment", make: paymentPending, link: "Resume payment", href: (j: ReturnType<typeof sent>) => `/tourist/quotations/${j.quote!.id}` },
    { label: "a received payment without a booking", make: paidNoBooking, link: "Check payment", href: (j: ReturnType<typeof sent>) => `/tourist/payments/${j.pay!.id}` },
    { label: "a confirmed booking", make: confirmed, link: "View booking", href: (j: ReturnType<typeof sent>) => `/tourist/bookings/${j.book!.id}`, summary: "Your trip is confirmed." },
    { label: "a booking in progress", make: inProgress, link: "View booking", href: (j: ReturnType<typeof sent>) => `/tourist/bookings/${j.book!.id}`, summary: "Your trip is underway." },
    { label: "a completed trip without a review", make: completed, link: "Leave a review", href: (j: ReturnType<typeof sent>) => `/tourist/bookings/${j.book!.id}`, summary: "Your trip is complete." },
    { label: "a completed, reviewed trip", make: reviewed, link: "View booking", href: (j: ReturnType<typeof sent>) => `/tourist/bookings/${j.book!.id}`, summary: "Your trip is complete." },
  ];

  for (const item of cases) {
    test(`${item.label} links to "${item.link}"`, async ({ page }) => {
      const world = newWorld();

      const j = item.make(world);

      await start(page, world);

      await openRequest(page, j.req);

      const next = page.getByTestId("request-next-step");

      const link = next.getByRole("link", { name: item.link, exact: true });

      await expect(link).toBeVisible();

      await expect(link).toHaveAttribute("href", item.href(j));

      await expect(next.getByRole("link")).toHaveCount(1);

      if (item.summary) {
        await expect(page.getByTestId("request-summary")).toHaveText(item.summary);
      }

      await expect(page.locator("main")).not.toContainText("Your journey has been booked");
    });
  }
});

test.describe("CR-030 Stage 6 request detail: degraded journey data", () => {
  test("when the journey lists fail, the request stays usable and claims no booking state", async ({ page }) => {
    const world = newWorld();

    const j = cancelled(world);

    world.fail.add("/bookings/me");

    await start(page, world);

    await page.goto(`/tourist/requests/${j.req.id}`);

    const error = page.locator("main").getByRole("alert");

    await expect(error.getByRole("heading", { level: 2, name: "We couldn't load this trip's latest status" })).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByRole("heading", { level: 1, name: "Mirissa whale season" })).toBeVisible();

    await expect(page.getByTestId("request-summary")).toHaveText("This journey reached the booking stage.");

    const main = page.locator("main");

    await expect(main).not.toContainText(/has been booked|confirmed|cancelled|underway|completed/i);

    // No current-state badge for the trip (the quotation's own badge stays).
    await expect(
      page.locator(
        "main [data-status='BOOKED'], main [data-status='CONFIRMED'], main [data-status='CANCELLED'], main [data-status='IN_PROGRESS'], main [data-status='COMPLETED']",
      ),
    ).toHaveCount(0);

    await expect(page.getByTestId("request-tracker")).toContainText("Stage reached");

    await expect(main).toContainText("Boutique 4-star");

    // Once the lists load, the real booking state replaces the neutral text.
    world.fail.delete("/bookings/me");

    await error.getByRole("button", { name: "Try again" }).click();

    await expect(page.getByTestId("request-summary")).toContainText("This trip's booking was cancelled.");
  });
});

test.describe("CR-030 Stage 6 request detail: privacy and formatting", () => {
  test("no internal ids or provider references; money and contact method formatted", async ({ page }) => {
    const world = newWorld();

    const pkg = waiting(world);

    const pending = paymentPending(world);

    await start(page, world);

    await openRequest(page, pkg.req);

    await expect(page.getByTestId("package-price")).toHaveText("$1,650");

    await expect(page.getByTestId("request-budget")).toHaveText("USD 2,500.00");

    let text = await page.locator("main").innerText();

    expect(text).not.toMatch(UUID_PATTERN);

    expect(text).not.toContain("Request ID");

    await openRequest(page, pending.req);

    await expect(page.getByTestId("request-quotation-total")).toHaveText("USD 2,360.00");

    await expect(page.locator("main")).toContainText("WhatsApp");

    text = await page.locator("main").innerText();

    for (const hidden of ["Request ID", "pi_", "cs_test", "2500.00", "2360.00", GUIDE.user.email, GUIDE.user.phone, "Whatsapp"]) {
      expect(text, hidden).not.toContain(hidden);
    }

    expect(text).not.toMatch(UUID_PATTERN);
  });
});

test.describe("CR-030 Stage 6 request detail: navigation and states", () => {
  test("back navigation returns to My journeys with a comfortable target", async ({ page }) => {
    const world = newWorld();

    const j = sent(world);

    await start(page, world);

    await openRequest(page, j.req);

    const back = page.getByRole("link", { name: "Back to my journeys" });

    await expect(back).toHaveAttribute("href", "/tourist/requests");

    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(40);

    await expect(page.getByRole("link", { name: "Back to dashboard" })).toHaveCount(0);
  });

  test("loading is announced with meaningful text", async ({ page }) => {
    const world = newWorld();

    const j = sent(world);

    world.slow.add(`/tour-requests/${j.req.id}`);

    await start(page, world);

    await page.goto(`/tourist/requests/${j.req.id}`);

    await expect(page.locator("main").getByRole("status")).toContainText("Loading your request");

    await expect(page.getByTestId("request-summary")).toBeVisible({ timeout: 15_000 });
  });

  test("a request that cannot be loaded offers a retry and a way back", async ({ page }) => {
    const world = newWorld();

    await start(page, world);

    await page.goto(`/tourist/requests/${uid(498)}`);

    const error = page.locator("main").getByRole("alert");

    await expect(error.getByRole("heading", { level: 1, name: "Unable to load request" })).toBeVisible({
      timeout: 15_000,
    });

    await expect(error.getByRole("button", { name: "Try again" })).toBeVisible();

    await expect(page.getByRole("link", { name: "Back to my journeys" })).toHaveAttribute("href", "/tourist/requests");
  });

  test("quotation and cancellation failures are announced", async ({ page }) => {
    const world = newWorld();

    const j = sent(world);

    world.fail.add(`/quotations/tour-request/${j.req.id}`);

    await start(page, world);

    await openRequest(page, j.req);

    const main = page.locator("main");

    await expect(main.getByRole("alert").getByRole("heading", { name: "Unable to load quotations" })).toBeVisible();

    await expect(main.getByRole("alert").getByRole("button", { name: "Try again" })).toBeVisible();

    // Cancelling is refused by the mock (nothing is written).
    await page.getByRole("button", { name: "Cancel request" }).click();

    await expect(page.getByText("Cancel this request?", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Yes, cancel request" }).click();

    // The confirmation stays open on failure; the error is announced inside it.
    await expect(
      page.getByRole("alertdialog").getByRole("alert").filter({ hasText: "Unable to cancel this request. Please try again." }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Keep request" }).click();

    await expect(main.getByText("Unable to cancel this request. Please try again.")).toBeVisible();

    expect(world.writes.length).toBeGreaterThan(0);
  });
});

test.describe("CR-030 Stage 6 expired quotations", () => {
  test("a sent quotation past its validity is presented as expired, with no review action", async ({ page }) => {
    const world = newWorld();

    const j = sentPastValidity(world);

    await start(page, world);

    await openRequest(page, j.req);

    await expect(page.getByTestId("request-summary")).toHaveText(
      "Your quotation has expired. Any updated quotation from Travora will appear here.",
    );

    await expect(page.locator("main [data-status='EXPIRED']")).toHaveCount(2);

    await expect(page.locator("main [data-status='SENT']")).toHaveCount(0);

    await expect(page.getByRole("link", { name: /Review quotation/ })).toHaveCount(0);

    await expect(page.getByTestId("request-next-step")).toHaveCount(0);
  });

  test("expired journeys never need the traveler's attention on the dashboard", async ({ page }) => {
    const world = newWorld();

    const valid = sent(world);

    sentPastValidity(world);

    persistedExpired(world);

    await start(page, world);

    await page.goto("/tourist");

    const attention = page.getByTestId("journey-attention");

    await expect(attention).toBeVisible({ timeout: 15_000 });

    await expect(attention).toContainText(valid.req.title as string);

    await expect(attention).not.toContainText("Trincomalee whales");

    await expect(attention).not.toContainText("Arugam Bay surf");

    await expect(page.getByRole("link", { name: /^Review quotation/ })).toHaveCount(1);

    // The valid quotation's expiry is the precise moment, as on the quotation.
    await expect(attention).toContainText("Expires Dec 1, 2026, 12:00 AM UTC");

    await expect(attention).not.toContainText("Valid until");

    // Recent activity points to My journeys by its name.
    await expect(page.getByRole("link", { name: "View all journeys" })).toHaveAttribute("href", "/tourist/requests");

    await expect(page.getByRole("link", { name: "View all requests" })).toHaveCount(0);
  });

  test("with only expired quotations the dashboard has nothing to ask", async ({ page }) => {
    const world = newWorld();

    sentPastValidity(world);

    await start(page, world);

    await page.goto("/tourist");

    await expect(page.getByTestId("journey-all-clear")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId("journey-attention")).toHaveCount(0);

    await expect(page.getByTestId("journey-progress")).toContainText("This quotation has expired.");
  });

  test("My journeys words both kinds of expiry truthfully and consistently", async ({ page }) => {
    const world = newWorld();

    sentPastValidity(world);

    persistedExpired(world);

    await start(page, world);

    await page.goto("/tourist/requests");

    for (const title of ["Trincomalee whales", "Arugam Bay surf"]) {
      const card = page.getByTestId("journey-card").filter({ hasText: title });

      await expect(card).toBeVisible({ timeout: 15_000 });

      await expect(card.locator("[data-status]")).toHaveAttribute("data-status", "EXPIRED");

      await expect(card).toContainText(
        "This quotation has expired. Any updated quotation from Travora will appear here.",
      );

      await expect(card).not.toContainText("Travora is preparing your quotation.");

      await expect(card.getByRole("link", { name: /Review quotation/ })).toHaveCount(0);

      await expect(card).toHaveAttribute("data-group", "active");
    }
  });

  test("a persisted EXPIRED quotation reads the same on its request page", async ({ page }) => {
    const world = newWorld();

    const j = persistedExpired(world);

    await start(page, world);

    await openRequest(page, j.req);

    await expect(page.getByTestId("request-summary")).toHaveText(
      "Your quotation has expired. Any updated quotation from Travora will appear here.",
    );

    await expect(page.locator("main [data-status='EXPIRED']")).toHaveCount(2);
  });
});

test.describe("CR-031 revision in preparation", () => {
  test("the dashboard says an updated quotation is being prepared, with no attention item", async ({ page }) => {
    const world = newWorld();

    const j = revisionInPreparation(world);

    await start(page, world);

    await page.goto("/tourist");

    await expect(page.getByTestId("journey-all-clear")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId("journey-attention")).toHaveCount(0);

    const latest = page.getByTestId("journey-progress");

    await expect(latest).toContainText(j.req.title as string);

    await expect(latest).toContainText(REVISION_MESSAGE);

    await expect(latest.locator("[aria-current='step']")).toContainText("Quotation");

    // The existing request-status badge is unchanged.
    await expect(latest.locator("[data-status]")).toHaveAttribute("data-status", "QUOTATION_SENT");

    await expect(page.getByRole("link", { name: /Review quotation/ })).toHaveCount(0);
  });

  test("My journeys shows the revision in preparation at the Quotation step", async ({ page }) => {
    const world = newWorld();

    const j = revisionInPreparation(world);

    await start(page, world);

    await page.goto("/tourist/requests");

    const card = page.getByTestId("journey-card").filter({ hasText: j.req.title as string });

    await expect(card).toBeVisible({ timeout: 15_000 });

    await expect(card).toContainText(REVISION_MESSAGE);

    await expect(card).not.toContainText("Travora is preparing your quotation.");

    await expect(card.locator("[aria-current='step']")).toContainText("Quotation");

    await expect(card.locator("[data-status]")).toHaveAttribute("data-status", "QUOTATION_SENT");

    await expect(card).toHaveAttribute("data-group", "active");

    await expect(card.getByRole("link", { name: /Review quotation/ })).toHaveCount(0);
  });

  test("the request page uses the same interpretation and never says a quotation is ready", async ({ page }) => {
    const world = newWorld();

    const j = revisionInPreparation(world);

    await start(page, world);

    await openRequest(page, j.req);

    await expect(page.getByTestId("request-summary")).toHaveText(REVISION_MESSAGE);

    await expect(page.locator("main")).not.toContainText("A quotation has been prepared");

    await expect(page.getByTestId("request-next-step")).toHaveCount(0);

    await expect(page.getByRole("link", { name: /Review quotation/ })).toHaveCount(0);

    // Header badge unchanged; the superseded revision stays listed as such.
    await expect(page.locator("main [data-status='QUOTATION_SENT']")).toHaveCount(1);

    await expect(page.locator("main aside [data-status]")).toHaveAttribute("data-status", "SUPERSEDED");
  });

  test("a superseded revision with a newer sent revision still asks for review", async ({ page }) => {
    const world = newWorld();

    const j = revisionSent(world);

    await start(page, world);

    await page.goto("/tourist");

    const attention = page.getByTestId("journey-attention");

    await expect(attention).toContainText(j.req.title as string, { timeout: 15_000 });

    await expect(attention.getByRole("link", { name: /^Review quotation/ })).toHaveAttribute(
      "href",
      `/tourist/quotations/${j.quote!.id}`,
    );

    await page.goto("/tourist/requests");

    const card = page.getByTestId("journey-card").filter({ hasText: j.req.title as string });

    await expect(card.locator("[data-status]")).toHaveAttribute("data-status", "SENT", { timeout: 15_000 });

    await expect(card.getByRole("link", { name: /^Review quotation/ })).toBeVisible();

    await expect(card).not.toContainText(REVISION_MESSAGE);

    await openRequest(page, j.req);

    await expect(page.getByTestId("request-summary")).toHaveText("A quotation has been prepared for your request.");

    await expect(page.getByTestId("request-next-step").getByRole("link", { name: "Review quotation" })).toHaveAttribute(
      "href",
      `/tourist/quotations/${j.quote!.id}`,
    );

    const badges = await page
      .locator("main aside [data-status]")
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-status")));

    expect(badges).toEqual(["SUPERSEDED", "SENT"]);
  });

  for (const [label, make] of [
    ["a revision in preparation", revisionInPreparation],
    ["a valid sent quotation", sent],
  ] as const) {
    test(`without the journey lists, ${label} is never called ready for review`, async ({ page }) => {
      const world = newWorld();

      const j = make(world);

      world.fail.add("/quotations/me");

      await start(page, world);

      await page.goto(`/tourist/requests/${j.req.id}`);

      await expect(
        page.locator("main").getByRole("alert").getByRole("heading", { name: "We couldn't load this trip's latest status" }),
      ).toBeVisible({ timeout: 15_000 });

      await expect(page.getByTestId("request-summary")).toHaveText("This request is at the quotation stage.");

      await expect(page.locator("main")).not.toContainText("A quotation has been prepared");

      await expect(page.getByRole("link", { name: /Review quotation/ })).toHaveCount(0);
    });
  }
});

/**
 * One test per request state and width, so every page gets its own
 * test budget and a failure names the state it belongs to.
 */
const ACCESSIBILITY_STATES: { name: string; make: (world: World) => { req: Json } }[] = [
  { name: "waiting for Travora", make: waiting },
  { name: "accepted, unpaid", make: acceptedUnpaid },
  { name: "payment pending", make: paymentPending },
  { name: "booking confirmed", make: confirmed },
  { name: "trip completed", make: completed },
  { name: "booking cancelled", make: cancelled },
  { name: "quotation expired", make: sentPastValidity },
  { name: "revision in preparation", make: revisionInPreparation },
];

test.describe("CR-030 Stage 6 request detail accessibility", () => {
  for (const width of [390, 1440]) {
    for (const state of ACCESSIBILITY_STATES) {
      test(`request detail (${state.name}) passes axe with one h1 and no overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });

        const world = newWorld();

        const j = state.make(world);

        await start(page, world);

        await openRequest(page, j.req);

        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

        await expectNoAxeViolations(page);

        await expectNoHorizontalOverflow(page);
      });
    }
  }

  test("the next step is reachable and visibly focused from the keyboard", async ({ page }) => {
    const world = newWorld();

    const j = acceptedUnpaid(world);

    await start(page, world);

    await openRequest(page, j.req);

    const link = page.getByTestId("request-next-step").getByRole("link", { name: "Pay now" });

    let reached = false;

    for (let i = 0; i < 25 && !reached; i += 1) {
      await page.keyboard.press("Tab");

      reached = await link.evaluate((element) => element === document.activeElement);
    }

    expect(reached).toBe(true);

    const outline = await link.evaluate((element) => getComputedStyle(element).outlineStyle);

    expect(outline).not.toBe("none");
  });
});
