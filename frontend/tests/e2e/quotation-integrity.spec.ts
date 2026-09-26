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
 * CR-008 Quotation Edit / Revision / Visibility Integrity
 * =========================================================
 *
 * Fixtures are produced through the real quotation service by
 * backend/scripts/prepare-quotation-integrity-e2e.js. Every
 * fixture quotation has consistent pricing (1200 - 50 + 25 =
 * 1175), currency LKR, childCount 1, a 2-day itinerary, 2
 * inclusions and 1 exclusion -- so any value silently reset to
 * a default (USD, 0, []) is detectable.
 */

const execFileAsync = promisify(execFile);

const TOURIST_EMAIL = process.env.E2E_TOURIST_EMAIL ?? "nipuna@example.com";

const TOURIST_PASSWORD = process.env.E2E_TOURIST_PASSWORD ?? "Password123";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@travora.com";

const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin12345";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

const PRICING_ERROR = "Quotation total must equal subtotal - discount + tax";

/**
 * =========================================================
 * Helpers
 * =========================================================
 */

async function runQuotationFixture<T>(scenario: string): Promise<T> {
  const scriptPath = path.resolve(
    process.cwd(),
    "../backend/scripts/prepare-quotation-integrity-e2e.js",
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
      `Unable to find quotation fixture output for "${scenario}".\n\nstderr:\n${stderr}`,
    );
  }

  return JSON.parse(fixtureLine.slice("E2E_FIXTURE_JSON=".length)) as T;
}

/**
 * API-level scenarios do not depend on the browser, so run them
 * once instead of once per Playwright project.
 */
function skipOutsideChromium(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium",
    "API-level quotation scenarios run once, in the chromium project.",
  );
}

async function login(page: Page, email: string, password: string) {
  await page.context().clearCookies();

  await page.goto("/login");

  // Filling before the dev-mode login page hydrates lets React
  // reset the inputs, so wait for it to settle first.
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

async function adminAuth(page: Page) {
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  return captureAuthorizationHeader(page, "/admin");
}

async function touristAuth(page: Page) {
  await login(page, TOURIST_EMAIL, TOURIST_PASSWORD);

  return captureAuthorizationHeader(page, "/tourist/quotations");
}

interface QuotationSummary {
  id: string;
  quotationNumber: string;
  status: string;
}

interface DraftFixture {
  tourRequestId: string;
  quotation: QuotationSummary;
  title: string;
  availableGuideId: string | null;
}

interface QuotationSnapshot {
  title: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  consistent: boolean;
  updatedAt: string;
  itineraries: string[];
  inclusions: string[];
  exclusions: string[];
}

interface ScenarioError {
  name: string;
  statusCode: number | null;
  message: string;
}

interface OverlappingEditsResult {
  bBlockedWhileALocked: boolean;
  editA: { status: string; error: ScenarioError | null };
  editB: { status: string; error: ScenarioError | null };
  final: QuotationSnapshot;
}

interface SentFixture {
  tourRequestId: string;
  quotation: QuotationSummary;
}

interface VisibilityFixture {
  request1Id: string;
  request2Id: string;
  visible: Record<"sentThenSuperseded" | "accepted", QuotationSummary>;
  hidden: Record<
    "revisionDraft" | "siblingDraft" | "neverSentSuperseded",
    QuotationSummary
  >;
}

interface QuotationBody {
  id: string;
  status: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  adultCount: number;
  childCount: number;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  currency: string;
  notes: string | null;
  termsConditions: string | null;
  validUntil: string | null;
  guideId: string | null;
  itineraries: Array<{ dayNumber: number; title: string; description: string }>;
  inclusions: Array<{ title: string }>;
  exclusions: Array<{ title: string }>;
}

function api(page: Page, authorization: string) {
  const headers = {
    Authorization: authorization,
  };

  return {
    get: (url: string) => page.request.get(`${API_BASE_URL}${url}`, { headers }),

    post: (url: string, data: unknown) =>
      page.request.post(`${API_BASE_URL}${url}`, { headers, data }),

    patch: (url: string, data: unknown) =>
      page.request.patch(`${API_BASE_URL}${url}`, { headers, data }),
  };
}

async function quotationData(response: APIResponse): Promise<QuotationBody> {
  expect(response.ok(), await response.text()).toBeTruthy();

  return (await response.json()).data as QuotationBody;
}

/**
 * Everything except identity/audit columns and the fields a
 * test deliberately changed.
 */
function comparable(quotation: QuotationBody) {
  return {
    title: quotation.title,
    description: quotation.description,
    startDate: quotation.startDate,
    endDate: quotation.endDate,
    adultCount: quotation.adultCount,
    childCount: quotation.childCount,
    subtotal: Number(quotation.subtotal),
    discountAmount: Number(quotation.discountAmount),
    taxAmount: Number(quotation.taxAmount),
    totalAmount: Number(quotation.totalAmount),
    currency: quotation.currency,
    notes: quotation.notes,
    termsConditions: quotation.termsConditions,
    validUntil: quotation.validUntil,
    guideId: quotation.guideId,
    itineraries: quotation.itineraries.map(({ dayNumber, title, description }) => ({
      dayNumber,
      title,
      description,
    })),
    inclusions: quotation.inclusions.map((item) => item.title).sort(),
    exclusions: quotation.exclusions.map((item) => item.title).sort(),
  };
}

/**
 * =========================================================
 * A. Draft Editing
 * =========================================================
 */

test.describe("CR-008 draft quotation editing", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("a partial edit changes only the provided field", async ({ page }) => {
    const fixture = await runQuotationFixture<DraftFixture>("draft-quotation");

    const admin = api(page, await adminAuth(page));

    const before = await quotationData(
      await admin.get(`/quotations/${fixture.quotation.id}`),
    );

    const updated = await quotationData(
      await admin.patch(`/quotations/${fixture.quotation.id}`, {
        title: `${fixture.title} (edited)`,
      }),
    );

    expect(updated.status).toBe("DRAFT");

    expect(comparable(updated)).toEqual({
      ...comparable(before),
      title: `${fixture.title} (edited)`,
    });

    expect(comparable(before)).toMatchObject({
      childCount: 1,
      discountAmount: 50,
      taxAmount: 25,
      totalAmount: 1175,
      currency: "LKR",
    });

    expect(before.itineraries).toHaveLength(2);
  });

  test("a provided child collection replaces only that collection", async ({
    page,
  }) => {
    const fixture = await runQuotationFixture<DraftFixture>("draft-quotation");

    const admin = api(page, await adminAuth(page));

    const before = await quotationData(
      await admin.get(`/quotations/${fixture.quotation.id}`),
    );

    const replacementDay = {
      dayNumber: 1,
      title: "Rewritten first day",
      description: "A single replacement itinerary day.",
    };

    const updated = await quotationData(
      await admin.patch(`/quotations/${fixture.quotation.id}`, {
        itineraries: [replacementDay],
        exclusions: [],
      }),
    );

    expect(comparable(updated)).toEqual({
      ...comparable(before),
      itineraries: [replacementDay],
      exclusions: [],
    });

    expect(comparable(updated).inclusions).toEqual([
      "Guide service",
      "Private transport",
    ]);
  });

  test("an end date alone is validated against the stored start date", async ({
    page,
  }) => {
    const fixture = await runQuotationFixture<DraftFixture>("draft-quotation");

    const admin = api(page, await adminAuth(page));

    const before = await quotationData(
      await admin.get(`/quotations/${fixture.quotation.id}`),
    );

    const start = new Date(before.startDate);

    const valid = new Date(start);

    valid.setUTCDate(valid.getUTCDate() + 2);

    const updated = await quotationData(
      await admin.patch(`/quotations/${fixture.quotation.id}`, {
        endDate: valid.toISOString(),
      }),
    );

    expect(new Date(updated.endDate).toISOString()).toBe(valid.toISOString());

    const invalid = new Date(start);

    invalid.setUTCDate(invalid.getUTCDate() - 1);

    const rejected = await admin.patch(`/quotations/${fixture.quotation.id}`, {
      endDate: invalid.toISOString(),
    });

    expect(rejected.status()).toBe(400);

    expect((await rejected.json()).message).toBe(
      "End date must be on or after the start date",
    );

    const after = await quotationData(
      await admin.get(`/quotations/${fixture.quotation.id}`),
    );

    expect(after.endDate).toBe(updated.endDate);
  });

  test("a sent quotation cannot be edited", async ({ page }) => {
    const fixture = await runQuotationFixture<SentFixture>("sent-quotation");

    const admin = api(page, await adminAuth(page));

    const before = await quotationData(
      await admin.get(`/quotations/${fixture.quotation.id}`),
    );

    const response = await admin.patch(`/quotations/${fixture.quotation.id}`, {
      title: "Should not be written",
    });

    expect(response.status()).toBe(400);

    expect((await response.json()).message).toBe(
      "Only draft quotations can be edited",
    );

    const after = await quotationData(
      await admin.get(`/quotations/${fixture.quotation.id}`),
    );

    expect(comparable(after)).toEqual(comparable(before));
  });

  test("an edit that loses a race with sending is rejected without writing", async () => {
    const result = await runQuotationFixture<{
      error: { name: string; statusCode: number; message: string } | null;
      finalStatus: string;
      titleUnchanged: boolean;
      inclusions: string[];
    }>("edit-send-race");

    expect(result.error).toEqual({
      name: "ConflictError",
      statusCode: 409,
      message: "Only draft quotations can be edited",
    });

    expect(result.finalStatus).toBe("SENT");

    expect(result.titleUnchanged).toBe(true);

    expect(result.inclusions).toEqual(["Guide service", "Private transport"]);
  });

  test("overlapping edits cannot combine into an inconsistent quotation", async () => {
    const result = await runQuotationFixture<{
      conflicting: OverlappingEditsResult;
      compatible: OverlappingEditsResult;
    }>("concurrent-draft-edits");

    // Edit B's UPDATE was genuinely blocked on edit A's row lock.
    expect(result.conflicting.bBlockedWhileALocked).toBe(true);

    expect(result.compatible.bBlockedWhileALocked).toBe(true);

    // Each edit is valid alone; together they are not.
    expect(result.conflicting.editA).toEqual({
      status: "fulfilled",
      error: null,
    });

    expect(result.conflicting.editB).toEqual({
      status: "rejected",
      error: {
        name: "BadRequestError",
        statusCode: 400,
        message: PRICING_ERROR,
      },
    });

    expect(result.conflicting.final).toMatchObject({
      discountAmount: "60",
      taxAmount: "25",
      totalAmount: "1165",
      consistent: true,
    });

    // Non-conflicting overlapping edits both persist.
    expect(result.compatible.editA.status).toBe("fulfilled");

    expect(result.compatible.editB.status).toBe("fulfilled");

    expect(result.compatible.final).toMatchObject({
      title: "Concurrent edit A title",
      discountAmount: "60",
      totalAmount: "1165",
      consistent: true,
    });
  });

  test("a failure while replacing child rows rolls back the whole edit", async () => {
    const result = await runQuotationFixture<{
      error: ScenarioError | null;
      before: QuotationSnapshot;
      after: QuotationSnapshot;
    }>("child-replacement-rollback");

    expect(result.error?.message).toBe(
      "Injected failure while replacing exclusions",
    );

    // Scalars, all three child collections and updatedAt unchanged.
    expect(result.after).toEqual(result.before);

    expect(result.before.itineraries).toHaveLength(2);
  });

  test("optional fields can be cleared with explicit nulls", async ({ page }) => {
    const fixture = await runQuotationFixture<DraftFixture>("draft-quotation");

    expect(
      fixture.availableGuideId,
      "an available tour guide is required for this test",
    ).toBeTruthy();

    const admin = api(page, await adminAuth(page));

    const withGuide = await quotationData(
      await admin.patch(`/quotations/${fixture.quotation.id}`, {
        guideId: fixture.availableGuideId,
      }),
    );

    expect(withGuide.guideId).toBe(fixture.availableGuideId);

    expect(withGuide.description).not.toBeNull();

    expect(withGuide.validUntil).not.toBeNull();

    const cleared = await quotationData(
      await admin.patch(`/quotations/${fixture.quotation.id}`, {
        description: null,
        notes: null,
        termsConditions: null,
        validUntil: null,
        guideId: null,
      }),
    );

    expect(comparable(cleared)).toEqual({
      ...comparable(withGuide),
      description: null,
      notes: null,
      termsConditions: null,
      validUntil: null,
      guideId: null,
    });

    // Required fields cannot be nulled.
    const rejected = await admin.patch(`/quotations/${fixture.quotation.id}`, {
      title: null,
    });

    expect(rejected.status()).toBe(400);
  });
});

/**
 * =========================================================
 * B. Pricing Consistency
 * =========================================================
 */

test.describe("CR-008 quotation pricing consistency", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("create rejects an inconsistent total and writes nothing", async ({
    page,
  }) => {
    const fixture = await runQuotationFixture<DraftFixture>("draft-quotation");

    const admin = api(page, await adminAuth(page));

    const listBefore = await admin.get(
      `/quotations/tour-request/${fixture.tourRequestId}`,
    );

    const countBefore = (await listBefore.json()).data.length;

    const response = await admin.post(
      `/quotations/tour-request/${fixture.tourRequestId}`,
      {
        title: "Inconsistent pricing quotation",
        startDate: "2031-03-01",
        endDate: "2031-03-05",
        adultCount: 2,
        subtotal: 1000,
        discountAmount: 100,
        taxAmount: 10,
        totalAmount: 1000,
        currency: "USD",
      },
    );

    expect(response.status()).toBe(400);

    expect((await response.json()).message).toBe(PRICING_ERROR);

    const listAfter = await admin.get(
      `/quotations/tour-request/${fixture.tourRequestId}`,
    );

    expect((await listAfter.json()).data.length).toBe(countBefore);
  });

  test("an edit is validated against the merged stored and changed prices", async ({
    page,
  }) => {
    const fixture = await runQuotationFixture<DraftFixture>("draft-quotation");

    const admin = api(page, await adminAuth(page));

    const inconsistent = await admin.patch(`/quotations/${fixture.quotation.id}`, {
      discountAmount: 60,
    });

    expect(inconsistent.status()).toBe(400);

    expect((await inconsistent.json()).message).toBe(PRICING_ERROR);

    const unchanged = await quotationData(
      await admin.get(`/quotations/${fixture.quotation.id}`),
    );

    expect(Number(unchanged.discountAmount)).toBe(50);

    const consistent = await quotationData(
      await admin.patch(`/quotations/${fixture.quotation.id}`, {
        discountAmount: 60,
        totalAmount: 1165,
      }),
    );

    expect(Number(consistent.discountAmount)).toBe(60);

    expect(Number(consistent.totalAmount)).toBe(1165);
  });

  test("a revision with an inconsistent total is rejected and the source stays sent", async ({
    page,
  }) => {
    const fixture = await runQuotationFixture<SentFixture>("sent-quotation");

    const admin = api(page, await adminAuth(page));

    const response = await admin.post(
      `/quotations/${fixture.quotation.id}/revisions`,
      {
        subtotal: 1300,
      },
    );

    expect(response.status()).toBe(400);

    expect((await response.json()).message).toBe(PRICING_ERROR);

    const source = await quotationData(
      await admin.get(`/quotations/${fixture.quotation.id}`),
    );

    expect(source.status).toBe("SENT");
  });

  test("amounts with more than two decimal places are rejected everywhere", async ({
    page,
  }) => {
    const draft = await runQuotationFixture<DraftFixture>("draft-quotation");

    const sent = await runQuotationFixture<SentFixture>("sent-quotation");

    const admin = api(page, await adminAuth(page));

    const precisionError = (field: string) =>
      `"${field}" must have no more than 2 decimal places`;

    // Create: 1.005 would be stored as 1.01 by NUMERIC(12,2) while
    // a naive float check computes 100 minor units.
    const create = await admin.post(
      `/quotations/tour-request/${draft.tourRequestId}`,
      {
        title: "Three decimal quotation",
        startDate: "2031-03-01",
        endDate: "2031-03-05",
        adultCount: 2,
        subtotal: 1.005,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount: 1,
      },
    );

    expect(create.status()).toBe(400);

    expect((await create.json()).errors).toContain(precisionError("subtotal"));

    // Edit.
    const edit = await admin.patch(`/quotations/${draft.quotation.id}`, {
      discountAmount: 50.005,
      totalAmount: 1174.995,
    });

    expect(edit.status()).toBe(400);

    const editErrors = (await edit.json()).errors;

    expect(editErrors).toContain(precisionError("discountAmount"));

    expect(editErrors).toContain(precisionError("totalAmount"));

    // Revision.
    const revise = await admin.post(`/quotations/${sent.quotation.id}/revisions`, {
      taxAmount: 25.001,
      totalAmount: 1175.001,
    });

    expect(revise.status()).toBe(400);

    expect((await revise.json()).errors).toContain(precisionError("taxAmount"));

    // Beyond NUMERIC(12,2).
    const tooLarge = await admin.patch(`/quotations/${draft.quotation.id}`, {
      subtotal: 10000000000,
      totalAmount: 10000000000,
    });

    expect(tooLarge.status()).toBe(400);

    // Nothing was written by any rejected request.
    const unchangedDraft = await quotationData(
      await admin.get(`/quotations/${draft.quotation.id}`),
    );

    expect(comparable(unchangedDraft)).toMatchObject({
      subtotal: 1200,
      discountAmount: 50,
      taxAmount: 25,
      totalAmount: 1175,
    });

    const unchangedSource = await quotationData(
      await admin.get(`/quotations/${sent.quotation.id}`),
    );

    expect(unchangedSource.status).toBe("SENT");

    // Two-decimal cent values are exact: 1200.10 - 50.05 + 25.02.
    const cents = await quotationData(
      await admin.patch(`/quotations/${draft.quotation.id}`, {
        subtotal: 1200.1,
        discountAmount: 50.05,
        taxAmount: 25.02,
        totalAmount: 1175.07,
      }),
    );

    expect([
      cents.subtotal,
      cents.discountAmount,
      cents.taxAmount,
      cents.totalAmount,
    ]).toEqual(["1200.1", "50.05", "25.02", "1175.07"]);
  });
});

/**
 * =========================================================
 * C. Revision Child Data
 * =========================================================
 */

test.describe("CR-008 quotation revision inheritance", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("an empty revision copies the source quotation completely", async ({
    page,
  }) => {
    const fixture = await runQuotationFixture<SentFixture>("sent-quotation");

    const admin = api(page, await adminAuth(page));

    const source = await quotationData(
      await admin.get(`/quotations/${fixture.quotation.id}`),
    );

    const revision = await quotationData(
      await admin.post(`/quotations/${fixture.quotation.id}/revisions`, {}),
    );

    expect(revision.status).toBe("DRAFT");

    expect(comparable(revision)).toEqual(comparable(source));
  });

  test("a partial revision inherits omitted fields and applies provided ones", async ({
    page,
  }) => {
    const fixture = await runQuotationFixture<SentFixture>("sent-quotation");

    const admin = api(page, await adminAuth(page));

    const source = await quotationData(
      await admin.get(`/quotations/${fixture.quotation.id}`),
    );

    expect(source.validUntil).not.toBeNull();

    const revision = await quotationData(
      await admin.post(`/quotations/${fixture.quotation.id}/revisions`, {
        subtotal: 1300,
        totalAmount: 1275,
        validUntil: null,
        inclusions: [],
      }),
    );

    expect(comparable(revision)).toEqual({
      ...comparable(source),
      subtotal: 1300,
      totalAmount: 1275,
      validUntil: null,
      inclusions: [],
    });

    const superseded = await quotationData(
      await admin.get(`/quotations/${fixture.quotation.id}`),
    );

    expect(superseded.status).toBe("SUPERSEDED");
  });
});

/**
 * =========================================================
 * D. Tourist Visibility
 * =========================================================
 */

test.describe("CR-008 tourist quotation visibility", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("tourist lists include only quotations that were sent", async ({ page }) => {
    const fixture = await runQuotationFixture<VisibilityFixture>("visibility-set");

    const tourist = api(page, await touristAuth(page));

    const visibleIds = Object.values(fixture.visible).map((q) => q.id);

    const hiddenIds = Object.values(fixture.hidden).map((q) => q.id);

    const mine = (await (await tourist.get("/quotations/me")).json()).data as Array<{
      id: string;
    }>;

    const request1 = (
      await (await tourist.get(`/quotations/tour-request/${fixture.request1Id}`)).json()
    ).data as Array<{ id: string }>;

    const request2 = (
      await (await tourist.get(`/quotations/tour-request/${fixture.request2Id}`)).json()
    ).data as Array<{ id: string }>;

    const mineIds = mine.map((q) => q.id);

    const requestIds = [...request1, ...request2].map((q) => q.id);

    for (const id of visibleIds) {
      expect(mineIds).toContain(id);

      expect(requestIds).toContain(id);
    }

    for (const id of hiddenIds) {
      expect(mineIds).not.toContain(id);

      expect(requestIds).not.toContain(id);
    }

    expect(requestIds.sort()).toEqual([...visibleIds].sort());
  });

  test("a never-sent quotation is not found for the tourist but visible to admins", async ({
    page,
  }) => {
    const fixture = await runQuotationFixture<VisibilityFixture>("visibility-set");

    const tourist = api(page, await touristAuth(page));

    for (const hidden of Object.values(fixture.hidden)) {
      const response = await tourist.get(`/quotations/${hidden.id}`);

      expect(response.status(), hidden.status).toBe(404);
    }

    for (const visible of Object.values(fixture.visible)) {
      const response = await tourist.get(`/quotations/${visible.id}`);

      expect(response.status(), visible.status).toBe(200);
    }

    const admin = api(page, await adminAuth(page));

    for (const hidden of Object.values(fixture.hidden)) {
      const response = await admin.get(`/quotations/${hidden.id}`);

      expect(response.status(), hidden.status).toBe(200);
    }

    const adminList = (
      await (await admin.get(`/quotations/tour-request/${fixture.request1Id}`)).json()
    ).data as Array<{ id: string }>;

    expect(adminList.map((q) => q.id)).toEqual(
      expect.arrayContaining([
        fixture.visible.sentThenSuperseded.id,
        fixture.hidden.revisionDraft.id,
        fixture.hidden.siblingDraft.id,
      ]),
    );
  });
});

/**
 * =========================================================
 * E. User Interface
 * =========================================================
 */

test.describe("CR-008 quotation UI", () => {
  test("an admin can edit a draft quotation's details and pricing", async ({
    page,
  }) => {
    const fixture = await runQuotationFixture<DraftFixture>("draft-quotation");

    const authorization = await adminAuth(page);

    await page.goto(`/admin/tour-requests/${fixture.tourRequestId}`);

    await page
      .getByRole("button", {
        name: "Edit quotation",
      })
      .click();

    // Innermost bordered container holding the edit heading
    // (ancestors precede descendants in document order).
    const editor = page
      .locator("div.rounded-xl", {
        has: page.getByRole("heading", {
          name: "Edit quotation",
        }),
      })
      .last();

    const field = (label: string) =>
      editor
        .locator("div.space-y-2", {
          has: page.getByText(label, {
            exact: true,
          }),
        })
        .locator("input");

    const newTitle = `${fixture.title} (edited in UI)`;

    await field("Title").fill(newTitle);

    await field("Discount").fill("60");

    const saveResponse = page.waitForResponse(
      (response) =>
        response.url() === `${API_BASE_URL}/quotations/${fixture.quotation.id}` &&
        response.request().method() === "PATCH",
    );

    await editor
      .getByRole("button", {
        name: "Save quotation",
      })
      .click();

    expect((await saveResponse).status()).toBe(200);

    await expect(
      page.getByRole("heading", {
        name: "Edit quotation",
      }),
    ).toHaveCount(0);

    await page.reload();

    await expect(
      page.getByRole("heading", {
        name: newTitle,
      }),
    ).toBeVisible();

    const saved = await quotationData(
      await api(page, authorization).get(`/quotations/${fixture.quotation.id}`),
    );

    expect(comparable(saved)).toMatchObject({
      title: newTitle,
      discountAmount: 60,
      taxAmount: 25,
      totalAmount: 1165,
      currency: "LKR",
      childCount: 1,
    });

    expect(saved.itineraries).toHaveLength(2);

    expect(saved.inclusions).toHaveLength(2);

    expect(saved.exclusions).toHaveLength(1);
  });

  test("the tourist quotations page never lists unsent quotations", async ({
    page,
  }) => {
    const fixture = await runQuotationFixture<VisibilityFixture>("visibility-set");

    await login(page, TOURIST_EMAIL, TOURIST_PASSWORD);

    await page.goto("/tourist/quotations");

    for (const visible of Object.values(fixture.visible)) {
      await expect(
        page.getByText(visible.quotationNumber, {
          exact: true,
        }),
      ).toBeVisible({
        timeout: 10_000,
      });
    }

    for (const hidden of Object.values(fixture.hidden)) {
      await expect(
        page.getByText(hidden.quotationNumber, {
          exact: true,
        }),
      ).toHaveCount(0);
    }
  });
});
