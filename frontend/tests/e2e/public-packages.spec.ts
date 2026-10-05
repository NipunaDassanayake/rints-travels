import AxeBuilder from "@axe-core/playwright";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

import crypto from "node:crypto";

import {
  canonicalPackagesRedirect,
  describeShownCount,
  packagesListingState,
} from "../../src/features/packages/package-query";

import { formatUsdPrice } from "../../src/lib/format";

/**
 * =========================================================
 * CR-029 Stage 3 -- public package discovery
 * =========================================================
 *
 * Pure-function checks (price format, result wording, listing
 * state, canonical URLs) plus browser and HTTP checks of the
 * /packages discovery contract.
 *
 * Browser checks never depend on the hand-made demo packages:
 * they create two uniquely named packages through the admin API
 * and search for this run's token only. Both are soft-deleted
 * again in afterAll (the API's supported delete), which runs even
 * when a test fails. Searches that need no data use a nonsense
 * term instead.
 *
 * Everything runs once, in the chromium project (CR-028
 * convention), so a run creates exactly two packages.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

const FRONTEND_URL = "http://localhost:3000";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@travora.com";

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345";

const REFRESH_COOKIE = "travora_refresh_token";

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const MOBILE = { width: 390, height: 844 };

const DESKTOP = { width: 1440, height: 900 };

/** Lowercase letters and digits only, so it is slug-safe. */
const RUN = `${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;

/** Every temporary package's destination contains this. */
const TOKEN = `E2E${RUN}`;

/** Matches no destination or title. */
const NOTHING = `zz${RUN}`;

/*
 * While the temporary packages exist, tests start from a no-match
 * search rather than the unfiltered list: the page's API response
 * is cached for 60 seconds and must not keep showing them later.
 */
const START = `/packages?q=${NOTHING}`;

/*
 * Created in this order, so "Newest" lists Coast first while
 * "Price: low to high" lists Rail first.
 */
const RAIL = {
  title: `E2E Stage 3 ${RUN} Rail Journey`,
  slug: `e2e-stage3-${RUN}-rail`,
  destination: `${TOKEN} Hill Country`,
  description: "Temporary package created by the CR-029 package discovery E2E test.",
  durationDays: 5,
  price: 450,
};

const COAST = {
  title: `E2E Stage 3 ${RUN} Coast Escape`,
  slug: `e2e-stage3-${RUN}-coast`,
  destination: `${TOKEN} South Coast`,
  description: "Temporary package created by the CR-029 package discovery E2E test.",
  durationDays: 3,
  price: 1250.5,
};

function runOnce(testInfo: TestInfo) {
  test.skip(testInfo.project.name !== "chromium", "Package discovery checks run once.");
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
  const headers: Record<string, string> = {};

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

/**
 * =========================================================
 * Page helpers
 * =========================================================
 */

function search(page: Page) {
  return {
    destination: page.getByLabel("Destination", { exact: true }),
    q: page.getByLabel("Package name", { exact: true }),
    sort: page.getByLabel("Sort by", { exact: true }),
    submit: page.getByRole("button", { name: "Search", exact: true }),
  };
}

/** The single result announcement (role="status") in the main region. */
function resultStatus(page: Page) {
  return page.locator('main [role="status"]');
}

function cardTitles(page: Page) {
  return page.locator("main article h2");
}

/** Path + query of the current page, with the query parsed for comparison. */
function currentQuery(page: Page) {
  const url = new URL(page.url());

  return { pathname: url.pathname, params: Object.fromEntries(url.searchParams) };
}

async function axeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  return results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`);
}

/** Marks the current status element so later checks can prove it was updated in place. */
async function markStatus(page: Page) {
  await resultStatus(page).evaluate((element) => {
    element.setAttribute("data-e2e-original", "true");
  });
}

/**
 * =========================================================
 * Pure functions
 * =========================================================
 */

test.describe("CR-029 package price formatting", () => {
  test("whole USD amounts show no decimals, with thousands separators", ({}, testInfo) => {
    runOnce(testInfo);

    expect(formatUsdPrice("680")).toBe("$680");

    expect(formatUsdPrice("1650")).toBe("$1,650");

    expect(formatUsdPrice("1650.00")).toBe("$1,650");

    expect(formatUsdPrice(1650)).toBe("$1,650");

    expect(formatUsdPrice("0")).toBe("$0");

    expect(formatUsdPrice("99999999.99")).toBe("$99,999,999.99");

    expect(formatUsdPrice("1250000")).toBe("$1,250,000");
  });

  test("amounts with cents always show exactly two decimals", ({}, testInfo) => {
    runOnce(testInfo);

    expect(formatUsdPrice("680.5")).toBe("$680.50");

    expect(formatUsdPrice("680.50")).toBe("$680.50");

    expect(formatUsdPrice(680.5)).toBe("$680.50");

    expect(formatUsdPrice("1234.56")).toBe("$1,234.56");

    expect(formatUsdPrice(" 1234.56 ")).toBe("$1,234.56");
  });

  test("unusable values return null instead of $NaN, $undefined or $Infinity", ({}, testInfo) => {
    runOnce(testInfo);

    for (const value of [
      "",
      "   ",
      "abc",
      "12abc",
      "0x10",
      "1e5",
      "-5",
      "1,650",
      "$1650",
      Number.NaN,
      Number.POSITIVE_INFINITY,
      -1,
      null,
      undefined,
    ]) {
      expect(formatUsdPrice(value), String(value)).toBeNull();
    }
  });
});

test.describe("CR-029 package result truncation wording", () => {
  test("says how many are shown only when the API returned fewer than match", ({}, testInfo) => {
    runOnce(testInfo);

    expect(describeShownCount(10, 14)).toBe("Showing 10 of 14 packages");

    expect(describeShownCount(10, 11)).toBe("Showing 10 of 11 packages");

    expect(describeShownCount(6, 6)).toBeNull();

    expect(describeShownCount(10, 10)).toBeNull();

    expect(describeShownCount(0, 0)).toBeNull();

    // Inconsistent counts never produce a misleading message.
    expect(describeShownCount(0, 14)).toBeNull();

    expect(describeShownCount(10, 4)).toBeNull();
  });
});

test.describe("CR-029 /packages listing state", () => {
  test("results, a search with no matches, or an empty catalogue", ({}, testInfo) => {
    runOnce(testInfo);

    const unfiltered = { destination: "", q: "", sort: "newest" } as const;

    expect(packagesListingState(6, unfiltered)).toBe("results");

    expect(packagesListingState(1, { ...unfiltered, q: "rail" })).toBe("results");

    expect(packagesListingState(0, { ...unfiltered, destination: "Ella" })).toBe("no-matches");

    expect(packagesListingState(0, { ...unfiltered, q: "zzzz" })).toBe("no-matches");

    // No active packages at all: a sort alone is not a search.
    expect(packagesListingState(0, unfiltered)).toBe("empty-catalog");

    expect(packagesListingState(0, { ...unfiltered, sort: "price-asc" })).toBe("empty-catalog");
  });
});

test.describe("CR-029 /packages canonical URLs (proxy + page)", () => {
  const redirectFor = (query: string) => canonicalPackagesRedirect(new URLSearchParams(query));

  test("non-canonical queries map to one canonical URL", ({}, testInfo) => {
    runOnce(testInfo);

    expect(redirectFor("destination=%20Ella%20")).toBe("/packages?destination=Ella");

    expect(redirectFor("q=%20tea%20")).toBe("/packages?q=tea");

    expect(redirectFor("sort=newest")).toBe("/packages");

    expect(redirectFor("sort=popular")).toBe("/packages");

    expect(redirectFor("sort=invalid")).toBe("/packages");

    expect(redirectFor("sortBy=price&limit=100")).toBe("/packages");

    // What the GET search form submits.
    expect(redirectFor("destination=&q=rail&sort=newest")).toBe("/packages?q=rail");

    expect(redirectFor("destination=Ella&destination=Kandy")).toBe("/packages");

    expect(redirectFor(`q=${"x".repeat(150)}`)).toBe(`/packages?q=${"x".repeat(100)}`);
  });

  test("canonical queries are left alone (no redirect loop)", ({}, testInfo) => {
    runOnce(testInfo);

    for (const query of [
      "",
      "destination=Ella",
      "q=tea",
      "destination=Ella&sort=price-asc",
      "destination=Ella&q=rail&sort=duration-asc",
    ]) {
      expect(redirectFor(query), query).toBeNull();

      // Every redirect target is itself canonical.
      const target = redirectFor(`${query}&sort=newest&limit=5`);

      expect(redirectFor(new URL(target ?? "/packages", "http://local").search), query).toBeNull();
    }
  });
});

/**
 * =========================================================
 * Discovery against two temporary packages
 * =========================================================
 */

test.describe("CR-029 /packages discovery", () => {
  const created: number[] = [];

  let admin: AdminSession | undefined;

  test.beforeAll(async ({}, testInfo) => {
    if (testInfo.project.name !== "chromium") {
      return;
    }

    admin = await loginAdmin();

    for (const travelPackage of [RAIL, COAST]) {
      const result = await api("POST", "/packages", {
        body: { ...travelPackage, status: "ACTIVE" },
        accessToken: admin.accessToken,
      });

      expect(result.status, JSON.stringify(result.body)).toBe(201);

      created.push(result.body.data.id);
    }
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

    for (const { slug } of [RAIL, COAST]) {
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

  test("destination search, result context and sorting keep a clean URL", async ({ page }) => {
    await page.goto(START);

    const form = search(page);

    await markStatus(page);

    await form.q.fill("");

    // Untrimmed input: the URL and the results use the trimmed value.
    await form.destination.fill(`  ${TOKEN}  `);

    await form.submit.click();

    await expect(page).toHaveURL(`/packages?destination=${TOKEN}`);

    await expect(resultStatus(page)).toHaveText(`2 packages in “${TOKEN}”`);

    await expect(cardTitles(page)).toHaveText([COAST.title, RAIL.title]);

    // Exactly one result announcement, updated in place (not re-created).
    await expect(resultStatus(page)).toHaveCount(1);

    await expect(resultStatus(page)).toHaveAttribute("data-e2e-original", "true");

    await expect(page.getByText(/^Showing \d+ of \d+ packages$/)).toHaveCount(0);

    // Prices use the public USD format.
    await expect(page.locator("main article").filter({ hasText: COAST.title })).toContainText("$1,250.50");

    await expect(page.locator("main article").filter({ hasText: RAIL.title })).toContainText("$450");

    await form.sort.selectOption({ label: "Price: low to high" });

    await form.submit.click();

    await expect(page).toHaveURL(`/packages?destination=${TOKEN}&sort=price-asc`);

    await expect(resultStatus(page)).toHaveText(
      `2 packages in “${TOKEN}” · sorted by price, low to high`,
    );

    await expect(cardTitles(page)).toHaveText([RAIL.title, COAST.title]);
  });

  test("package-name search, combined filters and removable chips", async ({ page }) => {
    await page.goto(START);

    const form = search(page);

    await form.q.fill(`${RUN} Rail`);

    await form.submit.click();

    await expect.poll(() => currentQuery(page)).toEqual({
      pathname: "/packages",
      params: { q: `${RUN} Rail` },
    });

    await expect(resultStatus(page)).toHaveText(`1 package matching “${RUN} Rail”`);

    await expect(cardTitles(page)).toHaveText([RAIL.title]);

    // Combined: destination + package name.
    await form.destination.fill(TOKEN);

    await form.q.fill(`${RUN} Coast`);

    await form.submit.click();

    await expect.poll(() => currentQuery(page)).toEqual({
      pathname: "/packages",
      params: { destination: TOKEN, q: `${RUN} Coast` },
    });

    await expect(cardTitles(page)).toHaveText([COAST.title]);

    // Removing one chip keeps the other filter.
    await markStatus(page);

    await page.getByRole("link", { name: `Remove Destination: ${TOKEN}`, exact: true }).click();

    await expect.poll(() => currentQuery(page)).toEqual({
      pathname: "/packages",
      params: { q: `${RUN} Coast` },
    });

    await expect(resultStatus(page)).toHaveText(`1 package matching “${RUN} Coast”`);

    await expect(resultStatus(page)).toHaveAttribute("data-e2e-original", "true");

    await expect(page.getByRole("link", { name: /^Remove Destination/ })).toHaveCount(0);

    await expect(page.getByRole("link", { name: `Remove Package: ${RUN} Coast`, exact: true })).toBeVisible();
  });

  test("each package card is one link and one Tab stop, followed by the custom-trip action", async ({
    page,
  }) => {
    await page.goto(`/packages?destination=${TOKEN}`);

    const cards = page.locator("main article");

    await expect(cards).toHaveCount(2);

    for (const [index, travelPackage] of [COAST, RAIL].entries()) {
      const links = cards.nth(index).getByRole("link");

      await expect(links).toHaveCount(1);

      await expect(links).toHaveAttribute("href", `/packages/${travelPackage.slug}`);
    }

    // From the last result control, Tab visits each card once, then the CTA.
    await page.getByRole("link", { name: "Clear all", exact: true }).focus();

    for (const title of [COAST.title, RAIL.title]) {
      await page.keyboard.press("Tab");

      await expect(page.getByRole("link", { name: title, exact: true })).toBeFocused();
    }

    await page.keyboard.press("Tab");

    const cta = page.locator("main").getByRole("link", { name: "Plan a custom trip" });

    await expect(cta).toBeFocused();

    await expect(cta).toHaveAttribute("href", "/tourist/requests/new");

    await expect(page.getByRole("heading", { name: /have a trip in mind/i })).toBeVisible();

    // The band reused from the homepage does not link /packages to itself.
    await expect(page.locator("main").getByRole("link", { name: "Browse packages" })).toHaveCount(0);
  });

  test("results have no WCAG A/AA violations at 390px and 1440px", async ({ page }) => {
    for (const viewport of [MOBILE, DESKTOP]) {
      await page.setViewportSize(viewport);

      await page.goto(`/packages?destination=${TOKEN}&q=${RUN}`);

      await expect(cardTitles(page)).toHaveCount(2);

      expect(await axeViolations(page), `${viewport.width}px`).toEqual([]);

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
        `${viewport.width}px overflow`,
      ).toBe(true);
    }
  });

  test("the proxy leaves package detail pages alone", async () => {
    const detail = await fetch(`${FRONTEND_URL}/packages/${RAIL.slug}?sort=popular&destination=`, {
      redirect: "manual",
    });

    expect(detail.status).toBe(200);

    expect(detail.headers.get("location")).toBeNull();
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("the server-rendered form searches, redirects to a clean URL and shows results", async ({
      page,
    }) => {
      await page.goto(START);

      const form = search(page);

      await expect(page.getByRole("search", { name: "Search travel packages" })).toBeVisible();

      await form.q.fill("");

      await form.destination.fill(TOKEN);

      await form.sort.selectOption({ label: "Price: low to high" });

      await form.submit.click();

      // The GET form sends empty fields; the proxy redirects to the canonical URL.
      await expect(page).toHaveURL(`/packages?destination=${TOKEN}&sort=price-asc`);

      await expect(cardTitles(page)).toHaveText([RAIL.title, COAST.title]);

      await expect(resultStatus(page)).toHaveText(
        `2 packages in “${TOKEN}” · sorted by price, low to high`,
      );

      // Real content, not a streamed loading fallback.
      await expect(page.locator("main [data-slot='skeleton']")).toHaveCount(0);

      await expect(page.locator("meta[http-equiv='refresh']")).toHaveCount(0);

      await page.getByRole("link", { name: `Remove Destination: ${TOKEN}`, exact: true }).click();

      await expect(page).toHaveURL("/packages?sort=price-asc");
    });
  });
});

/**
 * =========================================================
 * States and URLs that need no package data
 * =========================================================
 */

test.describe("CR-029 /packages without matching packages", () => {
  test.beforeEach(({}, testInfo) => {
    runOnce(testInfo);
  });

  test("a search with no matches keeps the form and offers two clear next steps", async ({ page }) => {
    for (const viewport of [MOBILE, DESKTOP]) {
      await page.setViewportSize(viewport);

      await page.goto(`/packages?q=${NOTHING}`);

      await expect(page.getByRole("heading", { level: 2, name: "No journeys match your search" })).toBeVisible();

      await expect(resultStatus(page)).toHaveText(`0 packages matching “${NOTHING}”`);

      await expect(page.getByRole("search", { name: "Search travel packages" })).toBeVisible();

      await expect(search(page).q).toHaveValue(NOTHING);

      await expect(page.getByRole("link", { name: "Clear all filters" })).toHaveAttribute("href", "/packages");

      // One direct custom-trip action; the large CTA band is not repeated.
      const custom = page.locator("main").getByRole("link", { name: "Plan a custom trip" });

      await expect(custom).toHaveCount(1);

      await expect(custom).toHaveAttribute("href", "/tourist/requests/new");

      await expect(page.getByRole("heading", { name: /have a trip in mind/i })).toHaveCount(0);

      expect(await axeViolations(page), `${viewport.width}px`).toEqual([]);
    }
  });

  test("chips and Clear all keep the URL clean", async ({ page }) => {
    await page.goto(`/packages?destination=${NOTHING}&q=${NOTHING}&sort=price-asc`);

    await markStatus(page);

    await page.getByRole("link", { name: `Remove Package: ${NOTHING}`, exact: true }).click();

    await expect(page).toHaveURL(`/packages?destination=${NOTHING}&sort=price-asc`);

    await expect(resultStatus(page)).toHaveAttribute("data-e2e-original", "true");

    await page.getByRole("link", { name: "Clear all", exact: true }).click();

    await expect(page).toHaveURL("/packages");

    await expect(page.getByRole("list", { name: "Active filters" })).toHaveCount(0);

    await expect(page.getByRole("link", { name: "Clear all", exact: true })).toHaveCount(0);

    await expect(resultStatus(page)).toHaveCount(1);
  });

  test("non-canonical URLs get one real redirect before rendering", async () => {
    const cases: [string, string][] = [
      ["/packages?destination=%20Ella%20", "/packages?destination=Ella"],
      ["/packages?q=%20tea%20", "/packages?q=tea"],
      ["/packages?sort=newest", "/packages"],
      ["/packages?sort=invalid&limit=100&sortBy=price", "/packages"],
      ["/packages?destination=Ella&destination=Kandy", "/packages"],
      ["/packages?destination=&q=tea&sort=newest", "/packages?q=tea"],
    ];

    for (const [from, to] of cases) {
      const response = await fetch(`${FRONTEND_URL}${from}`, { redirect: "manual" });

      expect(response.status, from).toBe(307);

      const location = new URL(response.headers.get("location") ?? "", FRONTEND_URL);

      expect(location.pathname + location.search, from).toBe(to);
    }

    // Canonical URLs render directly: no redirect, no meta refresh.
    for (const path of ["/packages", "/packages?destination=Ella&sort=price-asc"]) {
      const response = await fetch(`${FRONTEND_URL}${path}`, { redirect: "manual" });

      expect(response.status, path).toBe(200);

      expect(await response.text(), path).not.toContain('http-equiv="refresh"');
    }
  });

  test("the proxy does not touch other routes", async () => {
    for (const path of ["/?sort=newest&q=", "/guides?sort=newest", "/packages/does-not-exist?sort=newest"]) {
      const response = await fetch(`${FRONTEND_URL}${path}`, { redirect: "manual" });

      expect(response.headers.get("location"), path).toBeNull();

      expect(response.status, path).not.toBe(307);
    }
  });
});
