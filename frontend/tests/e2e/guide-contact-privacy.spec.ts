import {
  expect,
  test,
  type APIResponse,
  type Page,
  type TestInfo,
} from "@playwright/test";

import { execFile } from "node:child_process";

import path from "node:path";

import { promisify } from "node:util";

/**
 * =========================================================
 * CR-009 Tour Guide Contact Information Privacy
 * =========================================================
 *
 * backend/scripts/prepare-guide-privacy-e2e.js creates a
 * dedicated guide (unique email + non-null phone) and three
 * requests where that guide is both the preferred guide and
 * the guide on a SENT quotation.
 *
 * Tourist responses are checked by serializing the ENTIRE body
 * and searching for the guide's real email and phone, so a leak
 * at any nesting depth fails the test.
 */

const execFileAsync = promisify(execFile);

const TOURIST_EMAIL = process.env.E2E_TOURIST_EMAIL ?? "nipuna@example.com";

const TOURIST_PASSWORD = process.env.E2E_TOURIST_PASSWORD ?? "Password123";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@travora.com";

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

interface PrivacyFixture {
  guide: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  main: RequestFixture;
  toAccept: RequestFixture;
  toReject: RequestFixture;
}

interface RequestFixture {
  tourRequestId: string;
  quotationId: string;
  quotationNumber: string;
}

interface GuideUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string | null;
}

interface GuideWithUser {
  id: string;
  bio: string | null;
  languages: string[];
  location: string | null;
  dailyRate: string | null;
  user: GuideUser;
}

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

async function runPrivacyScenario<T>(scenario: string): Promise<T> {
  const scriptPath = path.resolve(
    process.cwd(),
    "../backend/scripts/prepare-guide-privacy-e2e.js",
  );

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [scriptPath, scenario],
    {
      env: {
        ...process.env,

        E2E_TOURIST_EMAIL: TOURIST_EMAIL,
      },

      timeout: 30_000,

      maxBuffer: 4 * 1024 * 1024,
    },
  );

  const fixtureLine = stdout
    .split(/\r?\n/)
    .find((line) => line.startsWith("E2E_FIXTURE_JSON="));

  if (!fixtureLine) {
    throw new Error(
      `Unable to find guide privacy output for "${scenario}".\n\nstderr:\n${stderr}`,
    );
  }

  return JSON.parse(fixtureLine.slice("E2E_FIXTURE_JSON=".length)) as T;
}

function runPrivacyFixture() {
  return runPrivacyScenario<PrivacyFixture>("privacy-set");
}

function skipOutsideChromium(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium",
    "API-level privacy scenarios run once, in the chromium project.",
  );
}

async function login(page: Page, email: string, password: string) {
  await page.context().clearCookies();

  await page.goto("/login");

  // Filling before the dev-mode login page hydrates lets React
  // reset the inputs (see CR-008), so wait for it to settle.
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Email").fill(email);

  await page.getByLabel("Password").fill(password);

  await expect(page.getByLabel("Email")).toHaveValue(email);

  await expect(page.getByLabel("Password")).toHaveValue(password);

  await page
    .getByRole("button", {
      name: "Sign in",
    })
    .click();

  await expect(page).not.toHaveURL(/\/login/, {
    timeout: 10_000,
  });
}

async function captureAuthorizationHeader(page: Page, visitPath: string) {
  const requestPromise = page.waitForRequest(
    (request) =>
      request.url().startsWith(API_BASE_URL) &&
      Boolean(request.headers()["authorization"]),
    {
      timeout: 10_000,
    },
  );

  await page.goto(visitPath);

  const header = (await requestPromise).headers()["authorization"];

  if (!header) {
    throw new Error(`Unable to capture an Authorization header on ${visitPath}.`);
  }

  return header;
}

function api(page: Page, authorization: string) {
  const headers = {
    Authorization: authorization,
  };

  return {
    get: (url: string) => page.request.get(`${API_BASE_URL}${url}`, { headers }),

    post: (url: string, data: unknown = {}) =>
      page.request.post(`${API_BASE_URL}${url}`, { headers, data }),
  };
}

async function asTourist(page: Page) {
  await login(page, TOURIST_EMAIL, TOURIST_PASSWORD);

  return api(page, await captureAuthorizationHeader(page, "/tourist/quotations"));
}

async function asAdmin(page: Page) {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  return api(page, await captureAuthorizationHeader(page, "/admin"));
}

async function okBody(response: APIResponse) {
  const text = await response.text();

  expect(response.ok(), text).toBeTruthy();

  return {
    text,
    data: JSON.parse(text).data,
  };
}

/**
 * The core privacy assertion: the guide's email and phone must
 * not appear ANYWHERE in the serialized response.
 */
function expectNoGuideContact(bodyText: string, fixture: PrivacyFixture) {
  expect(bodyText).not.toContain(fixture.guide.email);

  expect(bodyText).not.toContain(fixture.guide.phone);
}

/**
 * The guide is still identified by name and keeps its public
 * profile fields.
 */
function expectPublicGuide(guide: GuideWithUser, fixture: PrivacyFixture) {
  expect(guide.id).toBe(fixture.guide.id);

  expect(guide.user).toEqual({
    id: fixture.guide.userId,
    firstName: fixture.guide.firstName,
    lastName: fixture.guide.lastName,
  });

  expect(guide.bio).toBe("Dedicated guide created by the CR-009 privacy fixture.");

  expect(guide.languages).toEqual(["English", "Sinhala"]);

  expect(guide.location).toBe("Kandy");

  expect(Number(guide.dailyRate)).toBe(70);
}

/**
 * =========================================================
 * Tourist Responses
 * =========================================================
 */

test.describe("CR-009 tourist responses exclude guide contact details", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("tourist read endpoints never include the guide's email or phone", async ({
    page,
  }) => {
    const fixture = await runPrivacyFixture();

    const tourist = await asTourist(page);

    // 1. GET /quotations/me
    const mine = await okBody(await tourist.get("/quotations/me"));

    expectNoGuideContact(mine.text, fixture);

    const mineQuotation = (mine.data as Array<{ id: string; guide: GuideWithUser }>).find(
      (quotation) => quotation.id === fixture.main.quotationId,
    );

    expect(mineQuotation, "fixture quotation is listed").toBeTruthy();

    expectPublicGuide(mineQuotation!.guide, fixture);

    // 2. GET /quotations/tour-request/:id and its tour-requests alias
    for (const url of [
      `/quotations/tour-request/${fixture.main.tourRequestId}`,
      `/tour-requests/${fixture.main.tourRequestId}/quotations`,
    ]) {
      const list = await okBody(await tourist.get(url));

      expectNoGuideContact(list.text, fixture);

      expect(list.data).toHaveLength(1);

      expectPublicGuide(list.data[0].guide, fixture);
    }

    // 3. GET /quotations/:id
    const detail = await okBody(
      await tourist.get(`/quotations/${fixture.main.quotationId}`),
    );

    expectNoGuideContact(detail.text, fixture);

    expectPublicGuide(detail.data.guide, fixture);

    // 6. GET /tour-requests/:id (preferred guide)
    const request = await okBody(
      await tourist.get(`/tour-requests/${fixture.main.tourRequestId}`),
    );

    expectNoGuideContact(request.text, fixture);

    expectPublicGuide(request.data.preferredGuide, fixture);

    // The tourist still receives their OWN contact details.
    expect(request.data.tourist.email).toBe(TOURIST_EMAIL);
  });

  test("the accept response never includes the guide's email or phone", async ({
    page,
  }) => {
    const fixture = await runPrivacyFixture();

    const tourist = await asTourist(page);

    // 4. POST /quotations/:id/accept
    const accepted = await okBody(
      await tourist.post(`/quotations/${fixture.toAccept.quotationId}/accept`),
    );

    expect(accepted.data.status).toBe("ACCEPTED");

    expectNoGuideContact(accepted.text, fixture);

    expectPublicGuide(accepted.data.guide, fixture);
  });

  test("the reject response never includes the guide's email or phone", async ({
    page,
  }) => {
    const fixture = await runPrivacyFixture();

    const tourist = await asTourist(page);

    // 5. POST /quotations/:id/reject
    const rejected = await okBody(
      await tourist.post(`/quotations/${fixture.toReject.quotationId}/reject`, {
        reason: "CR-009 privacy test rejection",
      }),
    );

    expect(rejected.data.status).toBe("REJECTED");

    expectNoGuideContact(rejected.text, fixture);

    expectPublicGuide(rejected.data.guide, fixture);
  });
});

/**
 * =========================================================
 * Admin Responses (unchanged contract)
 * =========================================================
 */

test.describe("CR-009 admin responses keep guide contact details", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("admins still receive the guide's email and phone", async ({ page }) => {
    const fixture = await runPrivacyFixture();

    const admin = await asAdmin(page);

    const expectedUser = {
      id: fixture.guide.userId,
      firstName: fixture.guide.firstName,
      lastName: fixture.guide.lastName,
      email: fixture.guide.email,
      phone: fixture.guide.phone,
    };

    const detail = await okBody(
      await admin.get(`/quotations/${fixture.main.quotationId}`),
    );

    expect(detail.data.guide.user).toEqual(expectedUser);

    const list = await okBody(
      await admin.get(`/quotations/tour-request/${fixture.main.tourRequestId}`),
    );

    expect(list.data[0].guide.user).toEqual(expectedUser);

    const request = await okBody(
      await admin.get(`/tour-requests/${fixture.main.tourRequestId}`),
    );

    expect(request.data.preferredGuide.user).toEqual(expectedUser);
  });
});

/**
 * =========================================================
 * Fail-Closed Repository Default
 * =========================================================
 *
 * findQuotationById / findTourRequestById default to the
 * tourist view. A caller that omits `view` -- today's internal
 * checks, or a future tourist endpoint that forgets it -- must
 * never receive the guide's email or phone.
 */

interface ViewInspection {
  containsEmail: boolean;
  containsPhone: boolean;
  guideUserKeys: string[];
}

interface LookupInspection {
  omitted: ViewInspection;
  emptyOptions: ViewInspection;
  tourist: ViewInspection;
  admin: ViewInspection;
  rejectsInheritedName: boolean;
  rejectsUnknownName: boolean;
}

test.describe("CR-009 repository lookups are fail-closed", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("omitting the view never returns the guide's email or phone", async () => {
    const result = await runPrivacyScenario<{
      quotation: LookupInspection;
      tourRequest: LookupInspection;
    }>("repository-default-view");

    const withoutContact: ViewInspection = {
      containsEmail: false,
      containsPhone: false,
      guideUserKeys: ["firstName", "id", "lastName"],
    };

    for (const lookup of [result.quotation, result.tourRequest]) {
      expect(lookup.omitted).toEqual(withoutContact);

      expect(lookup.emptyOptions).toEqual(withoutContact);

      expect(lookup.tourist).toEqual(withoutContact);

      // Contact details only with an explicit admin view.
      expect(lookup.admin).toEqual({
        containsEmail: true,
        containsPhone: true,
        guideUserKeys: ["email", "firstName", "id", "lastName", "phone"],
      });

      // Unknown or inherited property names are not valid views.
      expect(lookup.rejectsInheritedName).toBe(true);

      expect(lookup.rejectsUnknownName).toBe(true);
    }
  });
});

/**
 * =========================================================
 * Tourist UI
 * =========================================================
 */

test.describe("CR-009 tourist UI", () => {
  test("the tourist quotations page shows the guide's name but no contact details", async ({
    page,
  }) => {
    const fixture = await runPrivacyFixture();

    const quotationsResponse = page.waitForResponse(
      (response) =>
        response.url() === `${API_BASE_URL}/quotations/me` &&
        response.request().method() === "GET",
    );

    await login(page, TOURIST_EMAIL, TOURIST_PASSWORD);

    await page.goto("/tourist/quotations");

    // The payload the page actually received carries no contact details.
    expectNoGuideContact(await (await quotationsResponse).text(), fixture);

    const card = page
      .locator("div", {
        has: page.getByText(fixture.main.quotationNumber, {
          exact: true,
        }),
      })
      .filter({
        hasText: `${fixture.guide.firstName} ${fixture.guide.lastName}`,
      })
      .last();

    await expect(card).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByText(fixture.guide.email)).toHaveCount(0);

    await expect(page.getByText(fixture.guide.phone)).toHaveCount(0);
  });
});
