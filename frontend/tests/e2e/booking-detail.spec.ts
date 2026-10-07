import AxeBuilder from "@axe-core/playwright";

import { expect, test, type Page } from "@playwright/test";

/**
 * =========================================================
 * CR-030 Stage 5 -- Booking detail and post-trip review
 * =========================================================
 *
 * Real traveler login; every booking and review read or write is
 * answered by route interception, so nothing is booked, reviewed or
 * paid. The browser clock and time zone are pinned so countdowns and
 * moments are deterministic.
 */

test.use({ timezoneId: "UTC" });

const TOURIST_EMAIL = process.env.E2E_TOURIST_EMAIL ?? "nipuna@example.com";

const TOURIST_PASSWORD = process.env.E2E_TOURIST_PASSWORD ?? "Password123";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** "Today" for the traveler: Oct 7, 2026, 10:00 UTC. */
const NOW = new Date("2026-10-07T10:00:00.000Z");

const uid = (n: number) => `7b8c9d0e-1f2a-4b3c-8d4e-${String(n).padStart(12, "0")}`;

const TOURIST_ID = uid(999);

const ADMIN_ID = uid(777);

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
    phone: "+94 77 000 0505",
  },
};

const GATEWAY_REFERENCE = "pi_3CR030StageFiveSecret";

type Json = Record<string, unknown>;

function day(date: string) {
  return `${date}T00:00:00.000Z`;
}

function booking(n: number, overrides: Json = {}, quoteOverrides: Json = {}, requestOverrides: Json = {}): Json {
  const quotationId = uid(100 + n);

  const requestId = uid(n);

  const paymentId = uid(200 + n);

  return {
    id: uid(300 + n),
    tourRequestId: requestId,
    quotationId,
    paymentId,
    touristId: TOURIST_ID,
    bookingReference: `BK-CR030-S5-${n}`,
    status: "CONFIRMED",
    startDate: day("2026-10-19"),
    endDate: day("2026-10-25"),
    totalAmount: "2360.00",
    currency: "USD",
    confirmedAt: "2026-10-03T09:35:00.000Z",
    completedAt: null,
    cancelledAt: null,
    createdAt: "2026-10-03T09:35:00.000Z",
    updatedAt: "2026-10-03T09:35:00.000Z",
    tourRequest: {
      id: requestId,
      touristId: TOURIST_ID,
      packageId: null,
      preferredGuideId: null,
      assignedAdminId: ADMIN_ID,
      requestType: "CUSTOM",
      title: "Hill country escape",
      preferredStartDate: day("2026-10-19"),
      preferredEndDate: day("2026-10-25"),
      adultCount: 2,
      childCount: 1,
      destinationPreferences: "Kandy and Ella",
      budget: "2500.00",
      currency: "USD",
      hotelPreference: "Boutique hotels",
      transportPreference: "Private car",
      specialRequirements: "Vegetarian meals",
      contactMethod: "WHATSAPP",
      status: "BOOKED",
      createdAt: "2026-09-20T09:00:00.000Z",
      updatedAt: "2026-10-03T09:35:00.000Z",
      deletedAt: null,
      ...requestOverrides,
    },
    quotation: {
      id: quotationId,
      tourRequestId: requestId,
      guideId: GUIDE.id,
      quotationNumber: `QT-CR030-S5-${n}`,
      revisionNumber: 1,
      title: "Hill country and tea trails",
      description: "A relaxed private journey with handpicked stays.",
      startDate: day("2026-10-19"),
      endDate: day("2026-10-25"),
      adultCount: 2,
      childCount: 1,
      subtotal: "2400.00",
      discountAmount: "100.00",
      taxAmount: "60.00",
      totalAmount: "2360.00",
      currency: "USD",
      notes: "Prices include all transfers.",
      termsConditions: "50% refundable up to 30 days before travel.",
      validUntil: "2026-10-30T00:00:00.000Z",
      status: "ACCEPTED",
      sentAt: "2026-10-01T09:00:00.000Z",
      respondedAt: "2026-10-02T09:00:00.000Z",
      createdAt: "2026-10-01T09:00:00.000Z",
      updatedAt: "2026-10-02T09:00:00.000Z",
      deletedAt: null,
      guide: GUIDE,
      itineraries: [
        // Out of order on purpose: the page shows days in order.
        { id: 3, quotationId, dayNumber: 3, title: "Ella and Nine Arches", description: "Morning hike and the bridge." },
        { id: 1, quotationId, dayNumber: 1, title: "Arrive in Kandy", description: "Private transfer from the airport." },
        { id: 2, quotationId, dayNumber: 2, title: "Tea estates", description: "Guided estate and factory visit." },
      ],
      inclusions: [{ id: 1, quotationId, title: "Private car and driver" }],
      exclusions: [{ id: 1, quotationId, title: "International flights" }],
      ...quoteOverrides,
    },
    payment: {
      id: paymentId,
      quotationId,
      touristId: TOURIST_ID,
      paymentReference: `PAY-CR030-S5-${n}`,
      gatewayReference: GATEWAY_REFERENCE,
      stripeCheckoutSessionId: "cs_test_cr030stage5",
      stripePaymentIntentId: GATEWAY_REFERENCE,
      amount: "2360.00",
      currency: "USD",
      paymentMethod: "CARD",
      status: "SUCCESS",
      failureReason: null,
      paidAt: "2026-10-03T09:34:00.000Z",
      createdAt: "2026-10-03T09:30:00.000Z",
      updatedAt: "2026-10-03T09:34:00.000Z",
    },
    tourist: { id: TOURIST_ID, firstName: "Nipuna", lastName: "Tourist", email: TOURIST_EMAIL },
    ...overrides,
  };
}

const completed = (n: number, quoteOverrides: Json = {}) =>
  booking(
    n,
    {
      status: "COMPLETED",
      startDate: day("2026-09-28"),
      endDate: day("2026-10-04"),
      completedAt: "2026-10-05T16:20:00.000Z",
    },
    quoteOverrides,
  );

const cancelledBooking = (n: number) =>
  booking(n, { status: "CANCELLED", cancelledAt: "2026-10-06T14:45:00.000Z" });

function review(bookingRecord: Json, overrides: Json = {}): Json {
  return {
    id: uid(400 + Number(String(bookingRecord.id).slice(-3))),
    bookingId: bookingRecord.id,
    guideId: GUIDE.id,
    touristId: TOURIST_ID,
    rating: 5,
    comment: "Asha made every day easy.",
    createdAt: "2026-10-06T08:15:00.000Z",
    updatedAt: "2026-10-06T08:15:00.000Z",
    ...overrides,
  };
}

interface World {
  bookings: Json[];
  /** The review the server holds for each booking id. */
  reviews: Record<string, Json | null>;
  /** How POST /reviews answers. */
  post: "success" | "conflict" | "error";
  /** Delay before POST /reviews answers, in ms. */
  postDelay: number;
  /** Whether GET /reviews/booking/:id fails ("after-post": only once a POST has been made). */
  reviewGet: "ok" | "fail" | "after-post";
  postBodies: Json[];
  reviewGets: number;
}

const newWorld = (): World => ({
  bookings: [],
  reviews: {},
  post: "success",
  postDelay: 0,
  reviewGet: "ok",
  postBodies: [],
  reviewGets: 0,
});

async function mockApi(page: Page, world: World) {
  await page.route(`${API_BASE_URL}/**`, async (route) => {
    const request = route.request();

    const path = new URL(request.url()).pathname.replace(/^\/api/, "");

    if (path.startsWith("/auth/")) {
      return route.continue();
    }

    const respond = (status: number, data: unknown, message = "OK") =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(
          status < 400 ? { success: true, data } : { success: false, message, data: null, errors: null },
        ),
      });

    let match: RegExpMatchArray | null;

    if (request.method() === "POST" && path === "/reviews") {
      const body = request.postDataJSON() as Json;

      world.postBodies.push(body);

      if (world.postDelay) {
        await new Promise((resolve) => setTimeout(resolve, world.postDelay));
      }

      const target = world.bookings.find((item) => item.id === body.bookingId);

      if (!target) return respond(404, null, "Booking not found");

      if (world.post === "error") return respond(500, null, "Internal server error");

      if (world.post === "conflict") {
        // Someone (another tab) already reviewed this trip.
        world.reviews[String(target.id)] = review(target, { rating: 4, comment: "Reviewed earlier from another tab." });

        return respond(409, null, "A review has already been submitted for this booking");
      }

      // The server keeps the trimmed comment; the POST body echoes a
      // different shape so the page has to show the stored review.
      world.reviews[String(target.id)] = review(target, {
        rating: body.rating,
        comment: typeof body.comment === "string" ? body.comment : null,
        createdAt: "2026-10-07T10:00:00.000Z",
      });

      return respond(201, review(target, { rating: body.rating, comment: "POST-ONLY ECHO" }));
    }

    if (request.method() !== "GET") {
      return route.abort();
    }

    if (["/tour-requests/me", "/quotations/me", "/payments/me", "/reviews/me"].includes(path)) return respond(200, []);

    if (path === "/bookings/me") return respond(200, world.bookings);

    if ((match = path.match(/^\/reviews\/booking\/([^/]+)$/))) {
      world.reviewGets += 1;

      if (world.reviewGet === "fail" || (world.reviewGet === "after-post" && world.postBodies.length > 0)) {
        return respond(500, null, "Internal server error");
      }

      return respond(200, world.reviews[match[1]] ?? null);
    }

    if ((match = path.match(/^\/bookings\/([^/]+)$/))) {
      const found = world.bookings.find((item) => item.id === match![1]);

      return found ? respond(200, found) : respond(404, null, "Booking not found");
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

async function start(page: Page, world: World, now: Date = NOW) {
  await mockApi(page, world);

  await login(page);

  await page.clock.setFixedTime(now);
}

async function openBooking(page: Page, record: Json) {
  await page.goto(`/tourist/bookings/${record.id}`);

  await expect(page.getByTestId("booking-state")).toBeVisible({ timeout: 15_000 });
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

async function top(page: Page, testId: string) {
  const box = await page.getByTestId(testId).boundingBox();

  expect(box, `${testId} is laid out`).not.toBeNull();

  return box!.y;
}

/* ================================================================ */

test.describe("CR-030 Stage 5 booking states", () => {
  for (const [label, start_, lead] of [
    ["more than a day away", "2026-10-19", "Starts in 12 days"],
    ["tomorrow", "2026-10-08", "Starts tomorrow"],
    ["today", "2026-10-07", "Starts today"],
  ] as const) {
    test(`a confirmed trip starting ${label} counts down in calendar days`, async ({ page }) => {
      const world = newWorld();

      const record = booking(1, { startDate: day(start_) });

      world.bookings.push(record);

      await start(page, world);

      await openBooking(page, record);

      const state = page.getByTestId("booking-state");

      await expect(state.getByRole("heading", { level: 2, name: "Your upcoming trip" })).toBeVisible();

      await expect(page.getByTestId("booking-state-lead")).toHaveText(lead);

      await expect(state).toContainText("Your guide: Asha Fernando");
    });
  }

  test("a confirmed trip whose start date has passed is only 'scheduled', never underway", async ({ page }) => {
    const world = newWorld();

    const record = booking(2, { startDate: day("2026-10-01"), endDate: day("2026-10-06") });

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    await expect(page.getByTestId("booking-state-lead")).toHaveText("Scheduled for Oct 1, 2026");

    await expect(page.locator("main")).not.toContainText(/underway|Starts in|Day \d+ of \d+/);
  });

  test("a confirmed trip without a guide says one will be assigned and shows no guide card", async ({ page }) => {
    const world = newWorld();

    const record = booking(3, {}, { guideId: null, guide: null });

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    await expect(page.getByTestId("booking-state")).toContainText("Your guide will be assigned before your trip.");

    await expect(page.getByRole("heading", { name: "Your tour guide" })).toHaveCount(0);

    await expect(page.getByRole("heading", { name: "Rate your tour guide" })).toHaveCount(0);
  });

  test("a trip in progress is underway, with no countdown or day counter", async ({ page }) => {
    const world = newWorld();

    const record = booking(4, { status: "IN_PROGRESS", startDate: day("2026-10-05"), endDate: day("2026-10-10") });

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    await expect(
      page.getByTestId("booking-state").getByRole("heading", { level: 2, name: "Your trip is underway" }),
    ).toBeVisible();

    await expect(page.getByTestId("booking-state")).toContainText("Oct 5, 2026 – Oct 10, 2026");

    await expect(page.locator("main")).not.toContainText(/Starts in|Starts today|Starts tomorrow|Day \d+ of \d+/);

    await expect(page.getByRole("heading", { name: "Rate your tour guide" })).toHaveCount(0);
  });

  test("a completed trip says when it was completed and asks for a review", async ({ page }) => {
    const world = newWorld();

    const record = completed(5);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    const state = page.getByTestId("booking-state");

    await expect(state.getByRole("heading", { level: 2, name: "Trip completed" })).toBeVisible();

    await expect(page.getByTestId("booking-state-lead")).toHaveText("Completed on Oct 5, 2026");

    await expect(page.getByRole("heading", { level: 2, name: "Rate your tour guide" })).toBeVisible();

    await expect(page.getByTestId("booking-facts")).toContainText("Oct 5, 2026, 4:20 PM UTC");
  });

  test("a cancelled booking is framed neutrally: no success, nothing upcoming, no review", async ({ page }) => {
    const world = newWorld();

    const record = cancelledBooking(6);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    const state = page.getByTestId("booking-state");

    await expect(state.getByRole("heading", { level: 2, name: "This booking was cancelled" })).toBeVisible();

    await expect(page.getByTestId("booking-state-lead")).toHaveText("Cancelled on Oct 6, 2026, 2:45 PM UTC");

    await expect(state).toContainText("This booking is no longer active.");

    // Status pill uses the neutral tone, never success.
    await expect(page.locator("[data-status='CANCELLED']")).toHaveAttribute("data-tone", "muted");

    const text = await page.locator("main").innerText();

    for (const phrase of [
      "Your upcoming trip",
      "Starts in",
      "underway",
      "Your booking",
      "Your itinerary",
      "Total paid",
      "Your tour guide",
      "Rate your tour guide",
    ]) {
      expect(text, phrase).not.toContain(phrase);
    }

    // Nothing the page itself says implies money coming back. (The
    // quotation terms shown below are the agreed text, not a promise.)
    for (const region of ["booking-state", "booking-facts"]) {
      await expect(page.getByTestId(region)).not.toContainText(/refund/i);
    }

    await expect(page.getByRole("heading", { level: 2, name: "Planned itinerary" })).toBeVisible();

    await expect(page.getByTestId("amount-paid")).toContainText("Amount paid");

    expect(world.reviewGets).toBe(0);
  });
});

test.describe("CR-030 Stage 5 calendar days in the traveler's time zone", () => {
  test.use({ timezoneId: "Asia/Colombo" });

  test("late evening in Colombo, a trip two UTC days away starts tomorrow", async ({ page }) => {
    const world = newWorld();

    const record = booking(7, { startDate: day("2026-10-09") });

    world.bookings.push(record);

    // 20:30 UTC on Oct 7 is 02:00 on Oct 8 in Colombo.
    await start(page, world, new Date("2026-10-07T20:30:00.000Z"));

    await openBooking(page, record);

    await expect(page.getByTestId("booking-state-lead")).toHaveText("Starts tomorrow");
  });
});

test.describe("CR-030 Stage 5 booking content", () => {
  test("itinerary, inclusions, guide, preferences, money and links", async ({ page }) => {
    const world = newWorld();

    const record = booking(8);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    await expect(page.getByRole("heading", { level: 1, name: "Hill country and tea trails" })).toBeVisible();

    await expect(page.locator("main")).toContainText("BK-CR030-S5-8");

    // Itinerary in day order, each day a level-3 heading.
    const itinerary = page.getByTestId("itinerary");

    await expect(itinerary.getByRole("heading", { level: 2, name: "Itinerary" })).toBeVisible();

    await expect(itinerary.getByRole("heading", { level: 3 })).toHaveText([
      "Arrive in Kandy",
      "Tea estates",
      "Ella and Nine Arches",
    ]);

    await expect(itinerary.getByText(/^Day \d$/)).toHaveText(["Day 1", "Day 2", "Day 3"]);

    // Included / not included.
    await expect(page.getByRole("heading", { level: 2, name: "What's included" })).toBeVisible();

    await expect(page.getByText("Private car and driver")).toBeVisible();

    await expect(page.getByRole("heading", { level: 2, name: "What's not included" })).toBeVisible();

    // Guide: public profile only.
    await expect(page.getByRole("heading", { level: 2, name: "Your tour guide" })).toBeVisible();

    await expect(page.getByRole("heading", { level: 3, name: "Asha Fernando" })).toBeVisible();

    // Trip preferences: the traveler's own, never admin fields.
    const preferences = page.getByTestId("trip-preferences");

    await expect(preferences.getByRole("heading", { level: 2, name: "Your trip preferences" })).toBeVisible();

    for (const value of ["Kandy and Ella", "Boutique hotels", "Private car", "Vegetarian meals", "WhatsApp"]) {
      await expect(preferences).toContainText(value);
    }

    // Money and payment: formatted, no provider internals.
    const facts = page.getByTestId("booking-facts");

    await expect(page.getByTestId("amount-paid")).toHaveText(/Amount paid\s*USD 2,360\.00/);

    await expect(facts).toContainText("PAY-CR030-S5-8");

    await expect(facts).toContainText("Oct 19, 2026 – Oct 25, 2026");

    await expect(facts).toContainText("2 adults · 1 child");

    await expect(facts).toContainText("Oct 3, 2026, 9:35 AM UTC");

    const text = await page.locator("main").innerText();

    for (const hidden of [
      GUIDE.user.email,
      GUIDE.user.phone,
      GATEWAY_REFERENCE,
      "pi_",
      "Gateway reference",
      "cs_test",
      ADMIN_ID,
      "2360.00",
    ]) {
      expect(text, hidden).not.toContain(hidden);
    }

    // Travelers appear once.
    expect(text.match(/2 adults/g)).toHaveLength(1);

    // Secondary links back to the journey, quotation and receipt.
    const related = page.getByRole("navigation", { name: "Related to this booking" });

    await expect(related.getByRole("link", { name: "View journey" })).toHaveAttribute(
      "href",
      `/tourist/requests/${record.tourRequestId}`,
    );

    await expect(related.getByRole("link", { name: "View quotation" })).toHaveAttribute(
      "href",
      `/tourist/quotations/${record.quotationId}`,
    );

    await expect(related.getByRole("link", { name: "View payment receipt" })).toHaveAttribute(
      "href",
      `/tourist/payments/${record.paymentId}`,
    );
  });

  test("empty itinerary, inclusions and preferences are handled cleanly", async ({ page }) => {
    const world = newWorld();

    const record = booking(
      9,
      {},
      { itineraries: [], inclusions: [], exclusions: [], description: null, notes: null, termsConditions: null },
    );

    (record.tourRequest as Json).hotelPreference = null;
    (record.tourRequest as Json).transportPreference = "  ";
    (record.tourRequest as Json).specialRequirements = null;
    (record.tourRequest as Json).destinationPreferences = null;
    (record.tourRequest as Json).contactMethod = null;

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    await expect(page.getByTestId("itinerary")).toContainText(
      "Travora hasn't added a day-by-day plan to this booking.",
    );

    await expect(page.getByRole("heading", { name: "What's included" })).toHaveCount(0);

    await expect(page.getByRole("heading", { name: "What's not included" })).toHaveCount(0);

    await expect(page.getByTestId("trip-preferences")).toHaveCount(0);

    await expect(page.getByRole("heading", { name: "Notes and terms" })).toHaveCount(0);
  });

  test("a booking that cannot be loaded offers a retry", async ({ page }) => {
    const world = newWorld();

    await start(page, world);

    await page.goto(`/tourist/bookings/${uid(398)}`);

    const error = page.locator("main").getByRole("alert");

    await expect(error.getByRole("heading", { level: 1, name: "Unable to load booking" })).toBeVisible({
      timeout: 15_000,
    });

    await expect(error.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});

test.describe("CR-030 Stage 5 review form", () => {
  test("the rating is a labelled radio group that works with arrow keys", async ({ page }) => {
    const world = newWorld();

    const record = completed(10);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    const group = page.getByRole("radiogroup", { name: "Your rating" });

    await expect(group).toBeVisible();

    const radios = group.getByRole("radio");

    await expect(radios).toHaveCount(5);

    for (const name of ["1 star – Poor", "2 stars – Fair", "3 stars – Good", "4 stars – Very good", "5 stars – Excellent"]) {
      await expect(group.getByRole("radio", { name })).not.toBeChecked();
    }

    // Selected state.
    await group.getByRole("radio", { name: "3 stars – Good" }).check();

    await expect(group.getByRole("radio", { name: "3 stars – Good" })).toBeChecked();

    await expect(page.getByTestId("rating-caption")).toHaveText("Good");

    // Arrow keys move the selection within one tab stop.
    await group.getByRole("radio", { name: "3 stars – Good" }).focus();

    await page.keyboard.press("ArrowRight");

    await expect(group.getByRole("radio", { name: "4 stars – Very good" })).toBeChecked();

    await expect(group.getByRole("radio", { name: "4 stars – Very good" })).toBeFocused();

    await page.keyboard.press("ArrowLeft");

    await page.keyboard.press("ArrowLeft");

    await expect(group.getByRole("radio", { name: "2 stars – Fair" })).toBeChecked();

    await expect(page.getByTestId("rating-caption")).toHaveText("Fair");

    // Tab leaves the group in one step, to the comment.
    await page.keyboard.press("Tab");

    await expect(page.getByLabel("Tell us about your experience")).toBeFocused();

    // Each option is a comfortable target.
    const box = await page.locator("label[for='review-rating-1']").boundingBox();

    expect(box!.width).toBeGreaterThanOrEqual(40);

    expect(box!.height).toBeGreaterThanOrEqual(40);
  });

  test("submitting without a rating explains why and focuses the group", async ({ page }) => {
    const world = newWorld();

    const record = completed(11);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    const submit = page.getByRole("button", { name: "Submit review" });

    await expect(submit).toBeEnabled();

    await submit.click();

    const error = page.locator("main").getByRole("alert");

    await expect(error).toHaveText("Choose a rating");

    const group = page.getByRole("radiogroup", { name: "Your rating" });

    await expect(group).toHaveAttribute("aria-invalid", "true");

    await expect(group).toHaveAttribute("aria-describedby", "review-rating-error");

    await expect(error).toHaveAttribute("id", "review-rating-error");

    await expect(group.getByRole("radio", { name: "1 star – Poor" })).toBeFocused();

    expect(world.postBodies).toHaveLength(0);

    // Choosing a rating clears the error.
    await group.getByRole("radio", { name: "4 stars – Very good" }).check();

    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);

    await expect(group).not.toHaveAttribute("aria-invalid", "true");
  });

  test("the comment is optional, capped at 2,000 characters and counted", async ({ page }) => {
    const world = newWorld();

    const record = completed(12);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    const comment = page.getByLabel("Tell us about your experience");

    await expect(page.locator("label[for='review-comment']")).toContainText("(optional)");

    await expect(comment).toHaveAttribute("maxlength", "2000");

    await expect(page.getByTestId("comment-count")).toHaveText("0 / 2,000 characters");

    await comment.fill("Hello");

    await expect(page.getByTestId("comment-count")).toHaveText("5 / 2,000 characters");

    await comment.fill("x".repeat(2100));

    expect(await comment.inputValue()).toHaveLength(2000);

    await expect(page.getByTestId("comment-count")).toContainText("2,000 / 2,000 characters");

    await expectNoHorizontalOverflow(page);
  });

  test("a review is sent once even if Submit is pressed twice", async ({ page }) => {
    const world = newWorld();

    world.postDelay = 1_500;

    const record = completed(13);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    await page.getByRole("radio", { name: "5 stars – Excellent" }).check();

    await page.getByLabel("Tell us about your experience").fill("  Wonderful guide.  ");

    const submit = page.getByTestId("review-form").locator("button[type='submit']");

    // A fast double click, then another press while the first is in
    // flight (the button stays focusable, marked aria-disabled).
    await submit.dblclick();

    await expect(submit).toHaveText(/Submitting/);

    await expect(submit).toHaveAttribute("aria-disabled", "true");

    await submit.click({ force: true });

    await expect(page.getByRole("heading", { level: 2, name: "Your review" })).toBeVisible({ timeout: 10_000 });

    expect(world.postBodies).toEqual([{ bookingId: record.id, rating: 5, comment: "Wonderful guide." }]);
  });

  test("after submitting, the saved review is shown from the server and focused", async ({ page }) => {
    const world = newWorld();

    const record = completed(14);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    await page.getByRole("radio", { name: "4 stars – Very good" }).check();

    await page.getByLabel("Tell us about your experience").fill("Thoughtful pacing and great stories.");

    await page.getByRole("button", { name: "Submit review" }).click();

    const heading = page.getByRole("heading", { level: 2, name: "Your review" });

    await expect(heading).toBeVisible();

    await expect(heading).toBeFocused();

    const saved = page.getByTestId("submitted-review");

    await expect(saved).toContainText("Thoughtful pacing and great stories.");

    await expect(saved).not.toContainText("POST-ONLY ECHO");

    await expect(page.getByTestId("submitted-rating")).toHaveText("4/5");

    await expect(saved).toContainText("Very good");

    await expect(saved).toContainText("Submitted Oct 7, 2026, 10:00 AM UTC");

    await expect(saved).not.toContainText("already reviewed");

    await expect(page.getByTestId("review-form")).toHaveCount(0);
  });

  test("a 409 shows the review already on file, never the draft", async ({ page }) => {
    const world = newWorld();

    world.post = "conflict";

    const record = completed(15);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    await page.getByRole("radio", { name: "5 stars – Excellent" }).check();

    await page.getByLabel("Tell us about your experience").fill("My unsent draft");

    await page.getByRole("button", { name: "Submit review" }).click();

    const heading = page.getByRole("heading", { level: 2, name: "Your review" });

    await expect(heading).toBeFocused();

    const saved = page.getByTestId("submitted-review");

    await expect(saved).toContainText("You had already reviewed this trip");

    await expect(saved).toContainText("Reviewed earlier from another tab.");

    await expect(page.getByTestId("submitted-rating")).toHaveText("4/5");

    await expect(page.locator("main")).not.toContainText("My unsent draft");
  });

  test("a 409 whose review cannot be loaded reports an error and keeps the draft", async ({ page }) => {
    const world = newWorld();

    world.post = "conflict";

    world.reviewGet = "after-post";

    const record = completed(16);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    await page.getByRole("radio", { name: "5 stars – Excellent" }).check();

    await page.getByLabel("Tell us about your experience").fill("Draft kept safe");

    await page.getByRole("button", { name: "Submit review" }).click();

    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "We couldn't load your review just now. Please try again.",
      { timeout: 15_000 },
    );

    await expect(page.getByLabel("Tell us about your experience")).toHaveValue("Draft kept safe");

    await expect(page.getByTestId("submitted-review")).toHaveCount(0);
  });

  test("a server error is announced and the form stays usable", async ({ page }) => {
    const world = newWorld();

    world.post = "error";

    const record = completed(17);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    await page.getByRole("radio", { name: "3 stars – Good" }).check();

    await page.getByLabel("Tell us about your experience").fill("Pleasant trip");

    await page.getByRole("button", { name: "Submit review" }).click();

    await expect(page.locator("main").getByRole("alert")).toHaveText(
      "We couldn't submit your review. Please try again.",
    );

    await expect(page.getByLabel("Tell us about your experience")).toHaveValue("Pleasant trip");

    await expect(page.getByRole("radio", { name: "3 stars – Good" })).toBeChecked();

    await expect(page.getByRole("button", { name: "Submit review" })).toBeEnabled();
  });

  test("an existing review is shown instead of the form", async ({ page }) => {
    const world = newWorld();

    const record = completed(18);

    world.bookings.push(record);

    world.reviews[String(record.id)] = review(record);

    await start(page, world);

    await openBooking(page, record);

    await expect(page.getByRole("heading", { level: 2, name: "Your review" })).toBeVisible();

    await expect(page.getByTestId("submitted-review")).toContainText("Asha made every day easy.");

    await expect(page.getByTestId("submitted-review")).toContainText("Excellent");

    await expect(page.getByTestId("review-form")).toHaveCount(0);

    await expect(page.getByRole("heading", { level: 2, name: "Your review" })).not.toBeFocused();
  });

  test("a review lookup failure can be retried", async ({ page }) => {
    const world = newWorld();

    world.reviewGet = "fail";

    const record = completed(19);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    const error = page.locator("main").getByRole("alert");

    await expect(error.getByRole("heading", { level: 2, name: "We couldn't check your review" })).toBeVisible({
      timeout: 15_000,
    });

    // The rest of the booking is still there.
    await expect(page.getByTestId("itinerary")).toBeVisible();

    world.reviewGet = "ok";

    await error.getByRole("button", { name: "Try again" }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Rate your tour guide" })).toBeVisible();
  });

  test("a 2,000-character unbroken review wraps without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const world = newWorld();

    const record = completed(20);

    world.bookings.push(record);

    world.reviews[String(record.id)] = review(record, { comment: "W".repeat(2000) });

    await start(page, world);

    await openBooking(page, record);

    const comment = page.getByTestId("submitted-comment");

    await expect(comment).toBeVisible();

    const box = await comment.boundingBox();

    expect(box!.x + box!.width).toBeLessThanOrEqual(390);

    await expectNoHorizontalOverflow(page);
  });
});

test.describe("CR-030 Stage 5 layout and accessibility", () => {
  test("on a phone, a completed trip's state, review and facts come before the itinerary", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const world = newWorld();

    const record = completed(21);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    await expect(page.getByTestId("review-form")).toBeVisible();

    const state = await top(page, "booking-state");

    const reviewForm = await top(page, "review-form");

    const facts = await top(page, "booking-facts");

    const itinerary = await top(page, "itinerary");

    expect(state).toBeLessThan(reviewForm);

    expect(reviewForm).toBeLessThan(facts);

    expect(facts).toBeLessThan(itinerary);

    // The state panel starts within the first screen.
    expect(state).toBeLessThan(844);
  });

  /*
   * One test per booking state and width, so every page gets its own
   * test budget and a failure names the state it belongs to.
   */
  const accessibilityStates: { name: string; setup: (world: World) => Json }[] = [
    { name: "confirmed with a guide", setup: () => booking(30) },
    { name: "completed with the review form", setup: () => completed(31) },
    {
      name: "completed with a 2,000-character review",
      setup: (world) => {
        const record = completed(32);

        world.reviews[String(record.id)] = review(record, { comment: "Q".repeat(2000) });

        return record;
      },
    },
    { name: "cancelled", setup: () => cancelledBooking(33) },
    {
      name: "confirmed without a guide or itinerary",
      setup: () => booking(34, {}, { guide: null, guideId: null, itineraries: [] }),
    },
  ];

  for (const width of [390, 1440]) {
    for (const state of accessibilityStates) {
      test(`booking (${state.name}) passes axe with no overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });

        const world = newWorld();

        const record = state.setup(world);

        world.bookings.push(record);

        await start(page, world);

        await openBooking(page, record);

        if (record.status === "COMPLETED") {
          await expect(
            page.getByTestId("review-form").or(page.getByTestId("submitted-review")),
          ).toBeVisible();
        }

        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

        await expectNoAxeViolations(page);

        await expectNoHorizontalOverflow(page);
      });
    }

    test(`the invalid rating state passes axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      const world = newWorld();

      const record = completed(31);

      world.bookings.push(record);

      await start(page, world);

      await openBooking(page, record);

      await page.getByRole("button", { name: "Submit review" }).click();

      await expect(page.locator("main").getByRole("alert")).toHaveText("Choose a rating");

      await expectNoAxeViolations(page);
    });
  }

  test("on desktop the booking details rail stays in view while scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const world = newWorld();

    const record = booking(35);

    world.bookings.push(record);

    await start(page, world);

    await openBooking(page, record);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await expect(page.getByTestId("booking-facts")).toBeInViewport();
  });
});
