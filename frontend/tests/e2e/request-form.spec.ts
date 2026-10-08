import AxeBuilder from "@axe-core/playwright";

import { expect, test, type Page, type Request } from "@playwright/test";

import { createFixtureTourist, type FixtureTourist } from "./support/fixture-identities";

/**
 * =========================================================
 * CR-030 Stage 3 -- Traveler request form
 * =========================================================
 *
 * /tourist/requests/new with a real traveler login. Every create
 * POST is answered by route interception, so no tour request is
 * ever persisted; any other write is aborted.
 *
 * The package and guide options are rendered on the server from the
 * live public APIs, which a browser route cannot intercept. Package
 * tests therefore read the current ACTIVE packages from the public
 * list (read-only) instead of relying on any specific package, and
 * skip if fewer than two exist.
 */

/**
 * Throwaway tourist created per run (CR-032 Stage 3A) -- never a real
 * account. The standard E2E cleanup deletes it and everything it owns.
 */
let e2eTourist: FixtureTourist;

test.beforeAll(async () => {
  e2eTourist = await createFixtureTourist("request-form");
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const CREATED_ID = "4c3b2a19-0f1e-4d2c-8b3a-0000000c0303";

const UNKNOWN_GUIDE_ID = "9b8a7c6d-5e4f-4a3b-8c2d-000000000404";

interface PublicPackage {
  id: number;
  slug: string;
  title: string;
  price: string;
}

async function activePackages(page: Page): Promise<PublicPackage[]> {
  const response = await page.request.get(`${API_BASE_URL}/packages?limit=100`);

  expect(response.ok()).toBeTruthy();

  return (await response.json()).data.items;
}

function money(amount: string) {
  return `USD ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type CreateMode = "success" | "slow-success" | "error-400" | "error-404-package";

interface CreateMock {
  posts: { url: string; body: Record<string, unknown> }[];
  mode: CreateMode;
  /** Data served for the traveler's own lists and the created request. */
  created: Record<string, unknown> | null;
}

/**
 * Intercepts tour-request writes (never forwarded) and, after a
 * successful create, serves the created request to the pages the
 * traveler lands on.
 */
async function mockRequests(page: Page, mode: CreateMode = "success"): Promise<CreateMock> {
  const mock: CreateMock = { posts: [], mode, created: null };

  await page.route(`${API_BASE_URL}/**`, async (route) => {
    const request: Request = route.request();

    const path = new URL(request.url()).pathname.replace(/^\/api/, "");

    if (path.startsWith("/auth/")) {
      return route.continue();
    }

    if (request.method() === "POST" && /^\/tour-requests\/(custom|package-based)$/.test(path)) {
      const body = request.postDataJSON() as Record<string, unknown>;

      mock.posts.push({ url: path, body });

      if (mock.mode === "error-400") {
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            message: "Validation failed",
            data: null,
            errors: [
              '"preferredEndDate" must be greater than or equal to "ref:preferredStartDate"',
              '"somethingInternal" is not allowed by policy XYZ',
            ],
          }),
        });
      }

      if (mock.mode === "error-404-package") {
        return route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ success: false, message: "Travel package not found", data: null, errors: null }),
        });
      }

      if (mock.mode === "slow-success") {
        await new Promise((resolve) => setTimeout(resolve, 1_500));
      }

      mock.created = {
        id: CREATED_ID,
        touristId: "00000000-0000-4000-8000-0000000c0303",
        packageId: (body.packageId as number | undefined) ?? null,
        preferredGuideId: null,
        assignedAdminId: null,
        requestType: path.endsWith("custom") ? "CUSTOM" : "PACKAGE_BASED",
        title: (body.title as string | undefined) ?? null,
        preferredStartDate: `${body.preferredStartDate}T00:00:00.000Z`,
        preferredEndDate: body.preferredEndDate ? `${body.preferredEndDate}T00:00:00.000Z` : null,
        adultCount: body.adultCount,
        childCount: body.childCount,
        destinationPreferences: (body.destinationPreferences as string | undefined) ?? null,
        budget: null,
        currency: body.currency,
        hotelPreference: null,
        transportPreference: null,
        specialRequirements: null,
        contactMethod: null,
        status: "PENDING_REVIEW",
        createdAt: "2026-10-07T09:00:00.000Z",
        updatedAt: "2026-10-07T09:00:00.000Z",
        deletedAt: null,
        travelPackage: null,
        tourist: null,
        preferredGuide: null,
      };

      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Created", data: mock.created }),
      });
    }

    if (request.method() !== "GET") {
      return route.abort();
    }

    const ok = (data: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) });

    // The traveler's own lists (empty until a request is created).
    if (path === "/tour-requests/me") return ok(mock.created ? [mock.created] : []);
    if (path === "/quotations/me" || path === "/payments/me" || path === "/bookings/me" || path === "/reviews/me") {
      return ok([]);
    }

    if (path === `/tour-requests/${CREATED_ID}`) return ok(mock.created);
    if (path === `/quotations/tour-request/${CREATED_ID}`) return ok([]);

    return route.continue();
  });

  return mock;
}

async function login(page: Page) {
  await page.context().clearCookies();

  await page.goto("/login");

  await page.getByLabel("Email").fill(e2eTourist.email);

  await page.getByLabel("Password").fill(e2eTourist.password);

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

async function openForm(page: Page, query = "", mode: CreateMode = "success") {
  const mock = await mockRequests(page, mode);

  await login(page);

  await page.goto(`/tourist/requests/new${query}`);

  await expect(page.getByRole("heading", { level: 1, name: "Tell us about your trip" })).toBeVisible({
    timeout: 15_000,
  });

  return mock;
}

async function fillCustomEssentials(page: Page) {
  await page.getByRole("radio", { name: /create from scratch/i }).check();

  await page.getByLabel("Trip title").fill("Request form test journey");

  await page.getByLabel("Destination preferences").fill("Kandy and Ella");

  await page.getByLabel("Preferred start date").fill("2026-12-01");

  await page.getByLabel("Preferred end date").fill("2026-12-07");
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

test.describe("CR-030 Stage 3 request form: structure and modes", () => {
  test("custom mode renders inside a main landmark with a real radio group", async ({ page }) => {
    await openForm(page);

    await expect(page.getByRole("main")).toHaveCount(1);

    const group = page.getByRole("group", { name: "How would you like to start?" });

    await expect(group.getByRole("radio", { name: "Create from scratch" })).toBeChecked();

    await expect(group.getByRole("radio", { name: "Customize a package" })).not.toBeChecked();

    await expect(page.getByLabel("Trip title")).toHaveAttribute("maxlength", "200");

    await expect(page.getByLabel("Destination preferences")).toBeVisible();

    await expect(page.getByLabel("Travel package")).toHaveCount(0);

    // Optional fields say so; required ones are labelled plainly.
    await expect(page.locator('label[for="budget"]')).toHaveText("Approximate budget (optional)");

    await expect(page.locator('label[for="preferredStartDate"]')).toHaveText("Preferred start date");

    await expect(page.getByLabel("Hotel preference")).toHaveAttribute("maxlength", "100");

    await expect(page.getByLabel("Transport preference")).toHaveAttribute("maxlength", "100");

    await expect(page.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/tourist/requests");
  });

  test("package mode preselects the package and shows its context", async ({ page }) => {
    const packages = await activePackages(page);

    test.skip(packages.length < 2, "Needs at least two active packages.");

    const [first] = packages;

    await openForm(page, `?packageId=${first.id}`);

    await expect(page.getByRole("radio", { name: "Customize a package" })).toBeChecked();

    await expect(page.getByLabel("Travel package")).toHaveValue(String(first.id));

    const context = page.getByTestId("package-context");

    await expect(context.getByRole("heading", { name: first.title })).toBeVisible();

    // Formatted public price, never the raw "$420.00"-style value.
    await expect(context.getByText(/^\$[\d,]+(\.\d{2})?$/)).toBeVisible();

    await expect(context.getByRole("link", { name: /^View package/ })).toHaveAttribute("href", `/packages/${first.slug}`);

    // The package price is helper text, not a placeholder that looks like a value.
    await expect(page.getByLabel("Approximate budget")).not.toHaveAttribute("placeholder", /\d/);

    await expect(page.getByText(`This package starts from ${money(first.price)}.`)).toBeVisible();

    await expect(page.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", `/packages/${first.slug}`);
  });

  test("the traveler can switch package and switch between modes", async ({ page }) => {
    const packages = await activePackages(page);

    test.skip(packages.length < 2, "Needs at least two active packages.");

    const [first, second] = packages;

    await openForm(page, `?packageId=${first.id}`);

    await page.getByLabel("Travel package").selectOption(String(second.id));

    await expect(page.getByTestId("package-context").getByRole("heading", { name: second.title })).toBeVisible();

    await page.getByRole("radio", { name: "Create from scratch" }).check();

    await expect(page.getByLabel("Trip title")).toBeVisible();

    await expect(page.getByLabel("Travel package")).toHaveCount(0);

    await expect(page.getByTestId("package-context")).toHaveCount(0);

    await page.getByRole("radio", { name: "Customize a package" }).check();

    await expect(page.getByLabel("Travel package")).toHaveValue(String(second.id));
  });
});

test.describe("CR-030 Stage 3 request form: submission", () => {
  test("a custom request sends the unchanged payload and opens the new request", async ({ page }) => {
    const mock = await openForm(page);

    await fillCustomEssentials(page);

    await page.getByLabel("Adults").fill("2");

    await page.getByLabel("Children").fill("1");

    await page.getByLabel("Approximate budget").fill("2500");

    await page.getByLabel("Currency").fill("usd");

    await page.getByLabel("Hotel preference").fill("Boutique");

    await page.getByLabel("Transport preference").fill("Private car");

    await page.getByLabel("Preferred contact method").selectOption("EMAIL");

    await page.getByLabel("Special requirements").fill("Vegetarian meals");

    await page.getByRole("button", { name: "Submit tour request" }).click();

    await expect(page).toHaveURL(`/tourist/requests/${CREATED_ID}`, { timeout: 15_000 });

    expect(mock.posts).toHaveLength(1);

    expect(mock.posts[0].url).toBe("/tour-requests/custom");

    expect(mock.posts[0].body).toEqual({
      title: "Request form test journey",
      destinationPreferences: "Kandy and Ella",
      preferredStartDate: "2026-12-01",
      preferredEndDate: "2026-12-07",
      adultCount: 2,
      childCount: 1,
      budget: 2500,
      currency: "USD",
      preferredGuideId: null,
      hotelPreference: "Boutique",
      transportPreference: "Private car",
      specialRequirements: "Vegetarian meals",
      contactMethod: "EMAIL",
    });
  });

  test("a package-based request sends the unchanged payload", async ({ page }) => {
    const packages = await activePackages(page);

    test.skip(packages.length < 1, "Needs an active package.");

    const [first] = packages;

    const mock = await openForm(page, `?packageId=${first.id}`);

    await page.getByLabel("Preferred start date").fill("2026-12-01");

    await page.getByRole("button", { name: "Submit tour request" }).click();

    await expect(page).toHaveURL(`/tourist/requests/${CREATED_ID}`, { timeout: 15_000 });

    expect(mock.posts).toHaveLength(1);

    expect(mock.posts[0].url).toBe("/tour-requests/package-based");

    expect(mock.posts[0].body).toEqual({
      packageId: first.id,
      preferredStartDate: "2026-12-01",
      preferredEndDate: null,
      adultCount: 1,
      childCount: 0,
      budget: null,
      currency: "USD",
      preferredGuideId: null,
      hotelPreference: null,
      transportPreference: null,
      specialRequirements: null,
      contactMethod: null,
    });
  });

  test("rapid repeated submission sends exactly one request and stays locked", async ({ page }) => {
    const mock = await openForm(page, "", "slow-success");

    await fillCustomEssentials(page);

    // Hold the navigation to the new request so the post-success window can be checked.
    await page.route(`**/tourist/requests/${CREATED_ID}**`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2_000));

      await route.continue();
    });

    const submit = page.locator('button[type="submit"]');

    await submit.dblclick();

    await page.getByLabel("Trip title").press("Enter");

    await submit.click({ force: true }).catch(() => {});

    // POST answered (after 1.5 s); navigation still pending: still locked.
    await expect.poll(() => mock.created !== null, { timeout: 10_000 }).toBe(true);

    if (new URL(page.url()).pathname === "/tourist/requests/new") {
      await expect(submit).toBeDisabled();

      await submit.click({ force: true }).catch(() => {});
    }

    await expect(page).toHaveURL(`/tourist/requests/${CREATED_ID}`, { timeout: 15_000 });

    expect(mock.posts).toHaveLength(1);
  });

  test("after creating, My journeys shows the new request (cache refreshed)", async ({ page }) => {
    await mockRequests(page);

    await login(page);

    // Load My journeys first so its (empty) list is cached.
    await page.goto("/tourist/requests");

    await expect(page.getByRole("heading", { level: 2, name: "No journeys yet" })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("main").getByRole("link", { name: "Plan a trip" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Tell us about your trip" })).toBeVisible({
      timeout: 15_000,
    });

    await fillCustomEssentials(page);

    await page.getByRole("button", { name: "Submit tour request" }).click();

    await expect(page).toHaveURL(`/tourist/requests/${CREATED_ID}`, { timeout: 15_000 });

    // Client-side navigation back: without invalidation the empty list would be reused.
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      await page.locator("aside").getByRole("link", { name: "My journeys", exact: true }).click();
    } else {
      await page.getByRole("button", { name: "Toggle traveler navigation" }).click();

      await page.getByRole("dialog").getByRole("link", { name: "My journeys", exact: true }).click();
    }

    await expect(page.getByRole("article", { name: /^Request form test journey/ })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("CR-030 Stage 3 request form: URL context", () => {
  test("an unknown package is cleared, explained and never submitted", async ({ page }) => {
    const mock = await openForm(page, "?packageId=999999");

    const notice = page.getByTestId("package-notice");

    await expect(notice).toBeVisible();

    await expect(notice).not.toContainText("999999");

    await expect(page.getByLabel("Travel package")).toHaveValue("");

    await expect(page.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/tourist/requests");

    // Package mode without a choice: a field error, no request.
    await page.getByLabel("Preferred start date").fill("2026-12-01");

    await page.getByRole("button", { name: "Submit tour request" }).click();

    await expect(page.getByLabel("Travel package")).toHaveAttribute("aria-invalid", "true");

    expect(mock.posts).toHaveLength(0);

    // Switching to a custom journey submits without any package.
    await fillCustomEssentials(page);

    await page.getByRole("button", { name: "Submit tour request" }).click();

    await expect(page).toHaveURL(`/tourist/requests/${CREATED_ID}`, { timeout: 15_000 });

    expect(mock.posts).toHaveLength(1);

    expect(mock.posts[0].url).toBe("/tour-requests/custom");

    expect(mock.posts[0].body).not.toHaveProperty("packageId");
  });

  test("an unavailable guide is cleared, explained and never submitted", async ({ page }) => {
    const mock = await openForm(page, `?preferredGuideId=${UNKNOWN_GUIDE_ID}`);

    const notice = page.getByTestId("guide-notice");

    await expect(notice).toBeVisible();

    await expect(notice).not.toContainText(UNKNOWN_GUIDE_ID);

    await expect(page.getByLabel("Preferred tour guide")).toHaveValue("");

    await fillCustomEssentials(page);

    await page.getByRole("button", { name: "Submit tour request" }).click();

    await expect(page).toHaveURL(`/tourist/requests/${CREATED_ID}`, { timeout: 15_000 });

    expect(mock.posts).toHaveLength(1);

    expect(mock.posts[0].body.preferredGuideId).toBeNull();
  });
});

test.describe("CR-030 Stage 3 request form: validation", () => {
  test("one validation system: linked field errors, a summary and focus on the first problem", async ({ page }) => {
    const mock = await openForm(page);

    await expect(page.locator("form")).toHaveAttribute("novalidate", "");

    await page.getByRole("radio", { name: /create from scratch/i }).check();

    await page.getByLabel("Adults").fill("0");

    await page.getByRole("button", { name: "Submit tour request" }).click();

    const summary = page.getByTestId("error-summary");

    await expect(summary).toHaveAttribute("role", "alert");

    await expect(summary.getByRole("link", { name: "Trip title must contain at least 3 characters" })).toHaveAttribute(
      "href",
      "#title",
    );

    await expect(summary.getByRole("link", { name: "At least one adult is required" })).toBeVisible();

    // React Hook Form focuses the first invalid field.
    await expect(page.getByLabel("Trip title")).toBeFocused();

    const adults = page.getByLabel("Adults");

    await expect(adults).toHaveAttribute("aria-invalid", "true");

    await expect(adults).toHaveAttribute("aria-describedby", "adultCount-error");

    await expect(page.locator("#adultCount-error")).toHaveText("At least one adult is required");

    // A hint and an error are both announced with the field.
    await expect(page.getByLabel("Destination preferences")).toHaveAttribute(
      "aria-describedby",
      "destinationPreferences-hint destinationPreferences-error",
    );

    expect(mock.posts).toHaveLength(0);

    await expectNoAxeViolations(page);
  });

  test("server validation details are shown in traveler language", async ({ page }) => {
    const mock = await openForm(page, "", "error-400");

    await fillCustomEssentials(page);

    await page.getByRole("button", { name: "Submit tour request" }).click();

    const alert = page.getByTestId("server-error");

    await expect(alert).toHaveAttribute("role", "alert");

    await expect(alert).toContainText("We couldn't submit your request");

    await expect(alert).toContainText("The end date cannot be before the start date.");

    await expect(alert).toContainText("Some details could not be accepted. Please review the form and try again.");

    // Joi wording never reaches the traveler.
    await expect(alert).not.toContainText("ref:");

    await expect(alert).not.toContainText("somethingInternal");

    await expect(page.getByLabel("Preferred end date")).toHaveAttribute("aria-invalid", "true");

    // The form is usable again after a failure.
    await expect(page.getByRole("button", { name: "Submit tour request" })).toBeEnabled();

    expect(mock.posts).toHaveLength(1);

    await expect(page).toHaveURL(/\/tourist\/requests\/new$/);
  });

  test("a package that disappeared is explained without technical wording", async ({ page }) => {
    const packages = await activePackages(page);

    test.skip(packages.length < 1, "Needs an active package.");

    await openForm(page, `?packageId=${packages[0].id}`, "error-404-package");

    await page.getByLabel("Preferred start date").fill("2026-12-01");

    await page.getByRole("button", { name: "Submit tour request" }).click();

    await expect(page.getByTestId("server-error")).toContainText("That package is no longer available.");

    await expect(page.getByLabel("Travel package")).toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("CR-030 Stage 3 request form: responsive and accessibility", () => {
  for (const width of [390, 1440]) {
    test(`custom and package forms pass axe with no overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      const packages = await activePackages(page);

      await openForm(page);

      await expectNoHorizontalOverflow(page);

      await expectNoAxeViolations(page);

      if (packages.length > 0) {
        await page.goto(`/tourist/requests/new?packageId=${packages[0].id}`);

        await expect(page.getByTestId("package-context")).toBeVisible({ timeout: 15_000 });

        await expectNoHorizontalOverflow(page);

        await expectNoAxeViolations(page);
      }

      await page.goto("/tourist/requests/new?packageId=999999");

      await expect(page.getByTestId("package-notice")).toBeVisible({ timeout: 15_000 });

      await expectNoAxeViolations(page);
    });
  }
});
