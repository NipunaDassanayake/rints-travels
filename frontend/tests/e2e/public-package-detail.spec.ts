import AxeBuilder from "@axe-core/playwright";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { createFixtureTourist, type FixtureTourist } from "./support/fixture-identities";

import crypto from "node:crypto";

/**
 * =========================================================
 * CR-029 Stage 4 -- public package detail
 * =========================================================
 *
 * Durable contracts of /packages/[slug]: facts, price, the
 * package-aware action, the adaptive gallery and its accessible
 * lightbox, empty sections, no-JavaScript reading, 404 and proxy
 * scope.
 *
 * The tests never depend on the hand-made demo packages. They
 * create two packages through the admin API with a unique run
 * token: a sparse one (one photo, no exclusions, no FAQs) and a
 * dense one (four photos, every section). Photos are added by URL
 * and point at images tracked in frontend/public, so no upload
 * files are written. Both packages are soft-deleted in afterAll
 * (the API's supported delete), which runs even when a test fails.
 *
 * Everything runs once, in the chromium project.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

const FRONTEND_URL = "http://localhost:3000";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@travora.com";

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345";

/**
 * Throwaway tourist created per run (CR-032 Stage 3A) -- never a real
 * account. The standard E2E cleanup deletes it and everything it owns.
 */
let e2eTourist: FixtureTourist;

test.beforeAll(async () => {
  e2eTourist = await createFixtureTourist("pkg-detail");
});

const REFRESH_COOKIE = "travora_refresh_token";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const MOBILE = { width: 390, height: 844 };

const DESKTOP = { width: 1440, height: 900 };

const RUN = `${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;

/** Every fixture's destination contains this. */
const TOKEN = `E2E${RUN}`;

const photo = (file: string) => `${FRONTEND_URL}/images/home/destinations/${file}`;

type Fixture = {
  title: string;
  slug: string;
  destination: string;
  description: string;
  durationDays: number;
  price: number;
  /** Created in this order; the API lists the primary first, then by display order. */
  images: { file: string; altText: string; isPrimary: boolean; displayOrder: number }[];
  /** Created in this (shuffled) order; the page must sort by day. */
  itinerary: { dayNumber: number; title: string; description: string }[];
  inclusions: string[];
  exclusions: string[];
  faqs: { question: string; answer: string; displayOrder: number }[];
};

const SPARSE: Fixture = {
  title: `E2E Stage 4 ${RUN} Sparse Escape`,
  slug: `e2e-stage4-${RUN}-sparse`,
  destination: `${TOKEN} Coast`,
  description: "Temporary package created by the CR-029 package detail E2E test.",
  durationDays: 2,
  price: 1250.5,
  images: [{ file: "galle.jpg", altText: "Test photo of a coastal fort", isPrimary: true, displayOrder: 0 }],
  itinerary: [
    { dayNumber: 2, title: "Second test day", description: "Second day of the temporary test itinerary." },
    { dayNumber: 1, title: "First test day", description: "First day of the temporary test itinerary." },
  ],
  inclusions: ["Test inclusion one", "Test inclusion two"],
  exclusions: [],
  faqs: [],
};

const DENSE: Fixture = {
  title: `E2E Stage 4 ${RUN} Dense Circuit`,
  slug: `e2e-stage4-${RUN}-dense`,
  destination: `${TOKEN} Hills, Rock & Coast`,
  description: "Temporary package created by the CR-029 package detail E2E test.\nIt has every section.",
  durationDays: 3,
  price: 1650,
  images: [
    { file: "ella.jpg", altText: "Test photo of hill country", isPrimary: false, displayOrder: 0 },
    { file: "kandy.jpg", altText: "Test photo of a lake city", isPrimary: false, displayOrder: 1 },
    { file: "sigiriya.jpg", altText: "Test photo of a rock fortress", isPrimary: true, displayOrder: 2 },
    { file: "mirissa.jpg", altText: "Test photo of a palm beach", isPrimary: false, displayOrder: 3 },
  ],
  itinerary: [
    { dayNumber: 3, title: "Third test day", description: "Third day of the temporary test itinerary." },
    { dayNumber: 1, title: "First test day", description: "First day of the temporary test itinerary." },
    { dayNumber: 2, title: "Second test day", description: "Second day of the temporary test itinerary." },
  ],
  inclusions: ["Test inclusion one", "Test inclusion two"],
  exclusions: ["Test exclusion one", "Test exclusion two"],
  faqs: [
    { question: "First test question?", answer: "First temporary test answer.", displayOrder: 0 },
    { question: "Second test question?", answer: "Second temporary test answer.", displayOrder: 1 },
  ],
};

/** Photo alt texts in the order the gallery must show them (primary first, then display order). */
const DENSE_ORDER = [
  "Test photo of a rock fortress",
  "Test photo of hill country",
  "Test photo of a lake city",
  "Test photo of a palm beach",
];

function runOnce(testInfo: TestInfo) {
  test.skip(testInfo.project.name !== "chromium", "Package detail checks run once.");
}

/**
 * =========================================================
 * API helpers (admin session for the temporary packages)
 * =========================================================
 */

async function api(
  method: string,
  route: string,
  { body, accessToken, refreshToken }: { body?: unknown; accessToken?: string; refreshToken?: string } = {},
) {
  const frontendBaseURL = test.info().project.use.baseURL;
  if (!frontendBaseURL) throw new Error("Playwright frontend baseURL is required");

  const headers: Record<string, string> = {
    Origin: new URL(frontendBaseURL).origin,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (refreshToken) {
    headers.Cookie = `${REFRESH_COOKIE}=${refreshToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    setCookies: response.headers.getSetCookie(),
  };
}

type AdminSession = { accessToken: string; refreshToken: string };

async function loginAdmin(): Promise<AdminSession> {
  const result = await api("POST", "/auth/login", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });

  expect(result.status, JSON.stringify(result.body)).toBe(200);

  const refreshToken = result.setCookies
    .map((cookie) => cookie.split(";")[0])
    .find((pair) => pair.startsWith(`${REFRESH_COOKIE}=`))
    ?.slice(REFRESH_COOKIE.length + 1);

  expect(refreshToken).toBeTruthy();

  return { accessToken: result.body.data.accessToken, refreshToken: refreshToken as string };
}

async function createFixture(admin: AdminSession, fixture: Fixture, created: number[]) {
  const auth = { accessToken: admin.accessToken };

  const result = await api("POST", "/packages", {
    ...auth,
    body: {
      title: fixture.title,
      slug: fixture.slug,
      destination: fixture.destination,
      description: fixture.description,
      durationDays: fixture.durationDays,
      price: fixture.price,
      status: "ACTIVE",
    },
  });

  expect(result.status, JSON.stringify(result.body)).toBe(201);

  const id: number = result.body.data.id;

  created.push(id);

  const children: [string, unknown][] = [
    ...fixture.images.map((image) => [
      "images",
      { imageUrl: photo(image.file), altText: image.altText, isPrimary: image.isPrimary, displayOrder: image.displayOrder },
    ] as [string, unknown]),
    ...fixture.itinerary.map((day) => ["itineraries", day] as [string, unknown]),
    ...fixture.inclusions.map((title) => ["inclusions", { title }] as [string, unknown]),
    ...fixture.exclusions.map((title) => ["exclusions", { title }] as [string, unknown]),
    ...fixture.faqs.map((faq) => ["faqs", faq] as [string, unknown]),
  ];

  for (const [collection, body] of children) {
    const child = await api("POST", `/packages/${id}/${collection}`, { ...auth, body });

    expect(child.status, `${collection}: ${JSON.stringify(child.body)}`).toBe(201);
  }

  return id;
}

/**
 * =========================================================
 * Page helpers
 * =========================================================
 */

function priceCard(page: Page) {
  return page.getByRole("complementary", { name: "Tour details and customization" });
}

function lightbox(page: Page) {
  return page.getByRole("dialog");
}

/** Waits (polling) until focus is inside the open lightbox. */
async function expectFocusInLightbox(page: Page) {
  await expect
    .poll(() => page.evaluate(() => !!document.querySelector("[role=dialog]")?.contains(document.activeElement)))
    .toBe(true);
}

async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  return results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`);
}

async function headingSkips(page: Page) {
  return page.evaluate(() => {
    const levels = [...document.querySelectorAll("main h1, main h2, main h3")].map((h) => Number(h.tagName[1]));

    return levels.filter((level, i) => i > 0 && level > levels[i - 1] + 1).length;
  });
}

/**
 * =========================================================
 * Tests
 * =========================================================
 */

test.describe("CR-029 /packages/[slug] detail", () => {
  const created: number[] = [];

  const ids: Record<"sparse" | "dense", number> = { sparse: 0, dense: 0 };

  let admin: AdminSession | undefined;

  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== "chromium") {
      return;
    }

    admin = await loginAdmin();

    ids.sparse = await createFixture(admin, SPARSE, created);

    ids.dense = await createFixture(admin, DENSE, created);
  });

  test.afterAll(async () => {
    if (!admin) {
      return;
    }

    // Attempt every cleanup step, then report all failures together.
    const problems: string[] = [];

    for (const id of created) {
      const result = await api("DELETE", `/packages/${id}`, { accessToken: admin.accessToken });

      if (result.status !== 200) {
        problems.push(`delete ${id}: ${result.status}`);
      }
    }

    const listed = await api("GET", `/packages?destination=${encodeURIComponent(TOKEN)}`);

    if (listed.body?.data?.pagination?.total !== 0) {
      problems.push(`still listed: ${JSON.stringify(listed.body?.data?.pagination)}`);
    }

    for (const { slug } of [SPARSE, DENSE]) {
      const detail = await api("GET", `/packages/slug/${slug}`);

      if (detail.status !== 404) {
        problems.push(`${slug} still public: ${detail.status}`);
      }
    }

    const logout = await api("POST", "/auth/logout", { refreshToken: admin.refreshToken });

    if (logout.status !== 200) {
      problems.push(`logout: ${logout.status}`);
    }

    expect(problems, "temporary package cleanup").toEqual([]);
  });

  test.beforeEach(({}, testInfo) => {
    runOnce(testInfo);
  });

  test("a listing card opens the detail page with title, facts, price and overview", async ({ page }) => {
    await page.goto(`/packages?destination=${TOKEN}`);

    await page.getByRole("link", { name: DENSE.title, exact: true }).click();

    await expect(page).toHaveURL(`/packages/${DENSE.slug}`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(DENSE.title);

    await expect(page.locator("main header dl")).toContainText(DENSE.destination);

    await expect(page.locator("main header dl")).toContainText("3 days");

    await expect(priceCard(page)).toContainText("Starting from");

    await expect(priceCard(page)).toContainText("$1,650");

    await expect(page.getByRole("heading", { level: 2, name: "Overview" })).toBeVisible();

    await expect(page.getByText("It has every section.")).toBeVisible();

    await expect(page.getByRole("link", { name: "All packages" })).toHaveAttribute("href", "/packages");
  });

  test("the package-aware action and the public price format", async ({ page }) => {
    for (const [fixture, id, price] of [[SPARSE, ids.sparse, "$1,250.50"], [DENSE, ids.dense, "$1,650"]] as const) {
      await page.goto(`/packages/${fixture.slug}`);

      await expect(priceCard(page)).toContainText(price);

      const action = page.getByRole("link", { name: "Customize this tour" });

      await expect(action).toHaveCount(1);

      await expect(action).toHaveAttribute("href", `/tourist/requests/new?packageId=${id}`);
    }
  });

  test("a guest is sent to sign in and returns to the request form for this package", async ({ page }) => {
    await page.goto(`/packages/${DENSE.slug}`);

    await page.getByRole("link", { name: "Customize this tour" }).click();

    await expect(page).toHaveURL(
      `/login?returnUrl=${encodeURIComponent(`/tourist/requests/new?packageId=${ids.dense}`)}`,
    );

    await page.getByLabel("Email").fill(e2eTourist.email);

    await page.getByLabel("Password").fill(e2eTourist.password);

    await page.getByRole("button", { name: "Sign in" }).click();

    // The package context survives sign-in.
    await expect(page).toHaveURL(`/tourist/requests/new?packageId=${ids.dense}`, { timeout: 15_000 });

    await expect(page.getByLabel("Travel package")).toBeVisible();

    // Not asserted: preselecting the package. The request form builds its
    // package list from a response cached for 60 seconds, so a package
    // created moments ago is not an option yet (request-form backlog).
  });

  test("itinerary in day order; only sections with content are shown", async ({ page }) => {
    await page.goto(`/packages/${SPARSE.slug}`);

    const days = page.getByRole("heading", { level: 2, name: "Itinerary" }).locator("xpath=..").getByRole("heading", { level: 3 });

    await expect(days).toHaveText(["Day 1: First test day", "Day 2: Second test day"]);

    const included = page.getByRole("heading", { level: 2, name: "What's included" }).locator("xpath=..").getByRole("listitem");

    await expect(included).toHaveText(SPARSE.inclusions);

    // Empty exclusions and FAQs are hidden, with no placeholder text.
    await expect(page.getByRole("heading", { name: "What's not included" })).toHaveCount(0);

    await expect(page.getByRole("heading", { name: "Frequently asked questions" })).toHaveCount(0);

    await expect(page.getByText(/not been added yet/)).toHaveCount(0);

    await page.goto(`/packages/${DENSE.slug}`);

    await expect(
      page.getByRole("heading", { level: 2, name: "Itinerary" }).locator("xpath=..").getByRole("heading", { level: 3 }),
    ).toHaveText(["Day 1: First test day", "Day 2: Second test day", "Day 3: Third test day"]);

    await expect(
      page.getByRole("heading", { level: 2, name: "What's not included" }).locator("xpath=..").getByRole("listitem"),
    ).toHaveText(DENSE.exclusions);

    // FAQs: native disclosures, closed until opened.
    const questions = page.locator("main details");

    await expect(questions).toHaveCount(2);

    await expect(page.getByText("First temporary test answer.")).toBeHidden();

    await page.getByText("First test question?").click();

    await expect(page.getByText("First temporary test answer.")).toBeVisible();
  });

  test("one photo: one preview, a single control and a lightbox with only Close", async ({ page }) => {
    await page.goto(`/packages/${SPARSE.slug}`);

    await expect(page.locator("main figure")).toHaveCount(1);

    await expect(page.locator("main figure img")).toHaveAttribute("alt", "Test photo of a coastal fort");

    await expect(page.getByRole("button", { name: /View all/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Open photo", exact: true }).click();

    await expect(lightbox(page)).toBeVisible();

    await expect(lightbox(page).getByRole("button")).toHaveCount(1);

    await expect(lightbox(page).getByRole("button")).toHaveAccessibleName("Close photos");

    await expect(lightbox(page)).toHaveAccessibleDescription("Photo 1 of 1");

    await page.keyboard.press("Escape");

    await expect(lightbox(page)).toHaveCount(0);
  });

  test("several photos: adaptive previews, all photos reachable, selected photo opens", async ({ page }) => {
    await page.setViewportSize(DESKTOP);

    await page.goto(`/packages/${DENSE.slug}`);

    // Three previews in API order; the fourth is reached through the lightbox.
    await expect(page.locator("main figure img")).toHaveCount(3);

    expect(
      await page.locator("main figure img").evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).alt)),
    ).toEqual(DENSE_ORDER.slice(0, 3));

    await expect(page.getByRole("button", { name: "View all 4 photos" })).toBeVisible();

    // Control names describe the action, not the photo.
    for (const name of ["Open photo 1 of 4", "Open photo 2 of 4", "Open photo 3 of 4"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    }

    await page.getByRole("button", { name: "Open photo 2 of 4", exact: true }).click();

    await expect(lightbox(page)).toHaveAccessibleDescription("Photo 2 of 4");

    await expect(lightbox(page).getByRole("img")).toHaveAttribute("alt", DENSE_ORDER[1]);

    // Next walks every photo and wraps; Previous wraps back.
    const seen = [DENSE_ORDER[1]];

    for (let step = 0; step < 4; step++) {
      await lightbox(page).getByRole("button", { name: "Next photo" }).click();

      seen.push((await lightbox(page).getByRole("img").getAttribute("alt")) ?? "");
    }

    expect(seen).toEqual([DENSE_ORDER[1], DENSE_ORDER[2], DENSE_ORDER[3], DENSE_ORDER[0], DENSE_ORDER[1]]);

    await lightbox(page).getByRole("button", { name: "Previous photo" }).click();

    await expect(lightbox(page)).toHaveAccessibleDescription("Photo 1 of 4");

    await lightbox(page).getByRole("button", { name: "Previous photo" }).click();

    await expect(lightbox(page)).toHaveAccessibleDescription("Photo 4 of 4");

    await page.keyboard.press("ArrowRight");

    await expect(lightbox(page)).toHaveAccessibleDescription("Photo 1 of 4");

    await page.keyboard.press("Escape");

    // Phones show one preview; the rest are behind "View all".
    await page.setViewportSize(MOBILE);

    await expect(page.locator("main figure:visible")).toHaveCount(1);

    await expect(page.getByRole("button", { name: "View all 4 photos" })).toBeVisible();
  });

  test("the lightbox is an accessible modal: focus moves in, stays in and returns", async ({ page }) => {
    await page.setViewportSize(DESKTOP);

    await page.goto(`/packages/${DENSE.slug}`);

    const opener = page.getByRole("button", { name: "Open photo 1 of 4", exact: true });

    await opener.focus();

    await page.keyboard.press("Enter");

    await expect(lightbox(page)).toBeVisible();

    await expect(lightbox(page)).toHaveAttribute("aria-modal", "true");

    await expect(lightbox(page)).toHaveAccessibleName(DENSE.title);

    await expectFocusInLightbox(page);

    // Background is hidden from assistive technology / inert while open.
    await expect
      .poll(() => page.evaluate(() => !!document.querySelector("main")?.closest("[inert], [aria-hidden='true']")))
      .toBe(true);

    await expect(lightbox(page).getByRole("button")).toHaveCount(3);

    for (const [index, name] of ["Close photos", "Previous photo", "Next photo"].entries()) {
      await expect(lightbox(page).getByRole("button").nth(index)).toHaveAccessibleName(name);
    }

    // Tab and Shift+Tab cycle inside the dialog (more presses than controls).
    for (const key of ["Tab", "Tab", "Tab", "Tab", "Shift+Tab", "Shift+Tab", "Shift+Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);

      await expectFocusInLightbox(page);
    }

    await page.keyboard.press("Escape");

    await expect(lightbox(page)).toHaveCount(0);

    await expect(opener).toBeFocused();

    // A different opener gets focus back too.
    const viewAll = page.getByRole("button", { name: "View all 4 photos" });

    await viewAll.focus();

    await page.keyboard.press(" ");

    await expect(lightbox(page)).toHaveAccessibleDescription("Photo 1 of 4");

    await lightbox(page).getByRole("button", { name: "Close photos" }).click();

    await expect(viewAll).toBeFocused();
  });

  test("no WCAG A/AA violations at 390px and 1440px, lightbox closed and open", async ({ page }) => {
    for (const viewport of [MOBILE, DESKTOP]) {
      await page.setViewportSize(viewport);

      for (const fixture of [SPARSE, DENSE]) {
        await page.goto(`/packages/${fixture.slug}`);

        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

        expect(await headingSkips(page), `${fixture.slug} heading levels`).toBe(0);

        expect(await axeViolations(page), `${viewport.width}px ${fixture.slug}`).toEqual([]);

        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
          `${viewport.width}px ${fixture.slug} overflow`,
        ).toBe(true);
      }

      await page.getByRole("button", { name: "View all 4 photos" }).click();

      await expect(lightbox(page)).toBeVisible();

      expect(await axeViolations(page), `${viewport.width}px lightbox open`).toEqual([]);

      await page.keyboard.press("Escape");
    }
  });

  test("unknown slugs are a real 404 and the proxy leaves detail URLs alone", async ({ page }) => {
    const missing = await page.goto(`/packages/e2e-stage4-${RUN}-missing`);

    expect(missing?.status()).toBe(404);

    const response = await fetch(`${FRONTEND_URL}/packages/${DENSE.slug}?sort=popular&destination=`, {
      redirect: "manual",
    });

    expect(response.status).toBe(200);

    expect(response.headers.get("location")).toBeNull();
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false, viewport: MOBILE });

    test("the whole page reads and every photo stays reachable", async ({ page }) => {
      await page.goto(`/packages/${DENSE.slug}`);

      await expect(page.getByRole("heading", { level: 1 })).toHaveText(DENSE.title);

      await expect(page.locator("main header dl")).toContainText("3 days");

      await expect(priceCard(page)).toContainText("$1,650");

      await expect(page.getByText("It has every section.")).toBeVisible();

      await expect(page.getByRole("heading", { level: 3, name: "Day 3: Third test day" })).toBeVisible();

      await expect(page.getByText("Test inclusion two")).toBeVisible();

      await expect(page.getByText("Test exclusion two")).toBeVisible();

      await page.getByText("Second test question?").click();

      await expect(page.getByText("Second temporary test answer.")).toBeVisible();

      // Photography: the visible preview with its alt text, plus links to every photo.
      await expect(page.locator("main figure:visible img")).toHaveAttribute("alt", DENSE_ORDER[0]);

      await expect(page.getByRole("button", { name: /View all/ })).toHaveCount(0);

      const all = page.getByRole("list", { name: "All photos" }).getByRole("link");

      await expect(all).toHaveText(["Photo 1 of 4", "Photo 2 of 4", "Photo 3 of 4", "Photo 4 of 4"]);

      for (const href of await all.evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""))) {
        const image = await page.request.get(href);

        expect(image.status(), href).toBe(200);

        expect(image.headers()["content-type"], href).toMatch(/^image\//);
      }

      await expect(page.getByRole("link", { name: "Plan a custom trip" }).first()).toBeVisible();

      await page.getByRole("link", { name: "All packages" }).click();

      await expect(page).toHaveURL("/packages");
    });
  });
});
