import AxeBuilder from "@axe-core/playwright";

import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { cn, TYPOGRAPHY_SIZES } from "../../src/lib/utils";

/**
 * =========================================================
 * CR-028 Travora Design System & UI/UX Foundation
 * =========================================================
 *
 * Covers the foundation only: fonts, tokens/contrast, status
 * badges, PortalShell parity + accessibility, skip link,
 * reduced motion, responsive overflow and axe (WCAG 2.0/2.1/2.2
 * A + AA) on the showcase and the portal shells. Existing page
 * content is not scanned here (pre-existing issues belong to the
 * page redesign CRs).
 *
 * Runs once, in the chromium project.
 */

const TOURIST = {
  email: process.env.E2E_TOURIST_EMAIL ?? "nipuna@example.com",
  password: process.env.E2E_TOURIST_PASSWORD ?? "Password123",
};

const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@travora.com",
  password: process.env.E2E_ADMIN_PASSWORD ?? "Admin12345",
};

const GUIDE = {
  email: process.env.E2E_GUIDE_EMAIL ?? "nimal.guide@travora.com",
  password: process.env.E2E_GUIDE_PASSWORD ?? "Guide12345",
};

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const MOBILE = { width: 390, height: 844 };

function skipOutsideChromium(testInfo: TestInfo) {
  test.skip(
    testInfo.project.name !== "chromium",
    "Design-system checks run once, in the chromium project.",
  );
}

async function login(page: Page, { email, password }: { email: string; password: string }) {
  await page.goto("/login");

  await page.getByLabel("Email").fill(email);

  await page.getByLabel("Password").fill(password);

  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

async function axeViolations(page: Page, include?: string) {
  const builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);

  if (include) {
    builder.include(include);
  }

  const results = await builder.analyze();

  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
  }));
}

/* ----------------------------------------------------------------
 * Same algorithm the pages use today (formatStatus).
 * ---------------------------------------------------------------- */
const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());

const STATUSES = {
  tourRequest: [
    "PENDING_REVIEW",
    "UNDER_DISCUSSION",
    "READY_FOR_QUOTATION",
    "QUOTATION_SENT",
    "ACCEPTED",
    "REJECTED",
    "CANCELLED",
    "BOOKED",
  ],
  quotation: ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED", "SUPERSEDED"],
  payment: ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED"],
  booking: ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
};

const EXPECTED_TONES: Record<string, string> = {
  "tourRequest:PENDING_REVIEW": "neutral",
  "tourRequest:UNDER_DISCUSSION": "info",
  "tourRequest:READY_FOR_QUOTATION": "info",
  "tourRequest:QUOTATION_SENT": "awaiting",
  "tourRequest:ACCEPTED": "success",
  "tourRequest:REJECTED": "danger",
  "tourRequest:CANCELLED": "muted",
  "tourRequest:BOOKED": "success",
  "quotation:DRAFT": "neutral",
  "quotation:SENT": "awaiting",
  "quotation:ACCEPTED": "success",
  "quotation:REJECTED": "danger",
  "quotation:EXPIRED": "muted",
  "quotation:SUPERSEDED": "muted",
  "payment:PENDING": "awaiting",
  "payment:PROCESSING": "info",
  "payment:SUCCESS": "success",
  "payment:FAILED": "danger",
  "payment:CANCELLED": "muted",
  "payment:REFUNDED": "info",
  "booking:CONFIRMED": "success",
  "booking:IN_PROGRESS": "info",
  "booking:COMPLETED": "success",
  "booking:CANCELLED": "muted",
};

const PORTALS = [
  {
    role: "traveler",
    account: TOURIST,
    home: "/tourist",
    // CR-030 Stage 2: traveler-facing title and journey-first navigation.
    title: "My Travora",
    toggle: "Toggle traveler navigation",
    navigation: [
      ["Dashboard", "/tourist"],
      ["My journeys", "/tourist/requests"],
      ["Quotations", "/tourist/quotations"],
      ["Bookings", "/tourist/bookings"],
      ["Payments", "/tourist/payments"],
    ],
    extras: ["Plan a trip", "Browse guides", "View public site"],
  },
  {
    role: "admin",
    account: ADMIN,
    home: "/admin",
    title: "Admin Portal",
    toggle: "Toggle admin navigation",
    navigation: [
      ["Dashboard", "/admin"],
      ["Tour requests", "/admin/tour-requests"],
      ["Bookings", "/admin/bookings"],
      ["Packages", "/admin/packages"],
      ["Guides", "/admin/guides"],
    ],
    extras: ["View public site"],
  },
  {
    role: "guide",
    account: GUIDE,
    home: "/guide",
    title: "Guide Portal",
    toggle: "Toggle guide navigation",
    navigation: [
      ["Dashboard", "/guide"],
      ["My reviews", "/guide/reviews"],
    ],
    extras: ["View public profiles", "View public site"],
  },
] as const;

/* ================================================================ */

test.describe("CR-028 design system foundation", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  test("the interface renders in Geist and display type in Fraunces, never Times", async ({
    page,
  }) => {
    for (const route of ["/", "/login", "/packages", "/design-system"]) {
      await page.goto(route);

      const fonts = await page.evaluate(() => ({
        body: getComputedStyle(document.body).fontFamily,
        heading: getComputedStyle(document.querySelector("h1, h2") ?? document.body).fontFamily,
      }));

      expect(fonts.body, route).toMatch(/^Geist\b/);

      expect(fonts.body, route).not.toMatch(/Times/);

      expect(fonts.heading, route).not.toMatch(/^"?Times/);
    }

    const display = await page
      .locator(".font-display")
      .first()
      .evaluate((element) => getComputedStyle(element).fontFamily);

    expect(display).toMatch(/^Fraunces\b/);

    await login(page, TOURIST);

    await page.goto("/tourist");

    await expect(page.getByRole("heading", { name: /my travel dashboard/i })).toBeVisible({
      timeout: 15_000,
    });

    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/^Geist\b/);
  });

  test("every token contrast pair meets WCAG AA", async ({ page }) => {
    await page.goto("/design-system");

    const summary = page.getByTestId("contrast-summary");

    await expect(summary).toHaveAttribute("data-total", "51");

    await expect(summary).toHaveAttribute("data-failing", "0");

    const rows = await page.locator("[data-contrast-row]").evaluateAll((elements) =>
      elements.map((row) => ({
        label: (row as HTMLElement).dataset.contrastRow,
        ratio: Number((row as HTMLElement).dataset.ratio),
        required: Number((row as HTMLElement).dataset.required),
      })),
    );

    expect(rows).toHaveLength(51);

    for (const row of rows) {
      expect(row.ratio, row.label).toBeGreaterThanOrEqual(row.required);
    }
  });

  test("status badges keep the exact existing labels, with an icon and the approved tone", async ({
    page,
  }) => {
    await page.goto("/design-system");

    for (const [entity, statuses] of Object.entries(STATUSES)) {
      const badges = page.locator(`[data-entity="${entity}"] [data-status]`);

      await expect(badges).toHaveCount(statuses.length);

      for (const status of statuses) {
        const badge = page.locator(`[data-entity="${entity}"] [data-status="${status}"]`);

        await expect(badge).toHaveText(label(status));

        await expect(badge).toHaveAttribute("data-tone", EXPECTED_TONES[`${entity}:${status}`]);

        await expect(badge.locator("svg")).toHaveCount(1);
      }
    }

    // Spot-check the labels E2E specs assert on elsewhere.
    for (const text of ["Quotation Sent", "In Progress", "Superseded", "Ready For Quotation"]) {
      await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
    }
  });

  test("controls use the approved heights: 40px default, 36px in admin", async ({ page }) => {
    await page.goto("/design-system");

    const height = (selector: string) =>
      page.locator(selector).first().evaluate((element) => element.getBoundingClientRect().height);

    expect(await height("#buttons button:has-text('Size default')")).toBe(40);

    expect(await height("#ds-name")).toBe(40);

    expect(await height("#ds-contact")).toBe(40);

    expect(await height("#buttons [data-area='admin'] button:has-text('Save changes')")).toBe(36);

    expect(await height("#buttons button:has-text('Size lg')")).toBe(48);

    expect(await height("#buttons button:has-text('Size xl')")).toBe(56);

    // Native select stays a real <select> (selectOption-compatible).
    await page.locator("#ds-contact").selectOption("PHONE");

    await expect(page.locator("#ds-contact")).toHaveValue("PHONE");
  });

  test("axe: the design-system showcase has no WCAG A/AA violations", async ({ page }) => {
    await page.goto("/design-system");

    /*
     * The contrast table is built after hydration. Before that it
     * has no rows and data-failing is trivially "0", so wait for
     * every row before handing the page to axe.
     */
    const summary = page.getByTestId("contrast-summary");

    await expect(summary).toHaveAttribute("data-total", "51");

    await expect(summary).toHaveAttribute("data-failing", "0");

    await expect(page.locator("[data-contrast-row]")).toHaveCount(51);

    expect(await axeViolations(page)).toEqual([]);
  });

  test("non-text contrast pairs are demonstrated as the UI element they measure", async ({ page }) => {
    await page.goto("/design-system");

    await expect(page.getByTestId("contrast-summary")).toHaveAttribute("data-total", "51");

    const rows = await page.locator("[data-contrast-row]").evaluateAll((elements) => {
      const hex = (color: string) => {
        const [r, g, b] = color.match(/\d+/g)!.map(Number);

        return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
      };

      return elements.map((row) => {
        const visual = row.querySelector<HTMLElement>("[data-contrast-sample]");

        const shape = visual?.firstElementChild as HTMLElement | null;

        const shapeStyle = shape ? getComputedStyle(shape) : null;

        const caption = visual?.nextElementSibling as HTMLElement | null;

        const [fg] = (row.querySelector("td:nth-child(2)")!.textContent ?? "").split(" / ");

        return {
          label: (row as HTMLElement).dataset.contrastRow,
          required: Number((row as HTMLElement).dataset.required),
          sample: (row as HTMLElement).dataset.sample,
          visual: visual?.dataset.contrastSample ?? null,
          fg: fg.trim(),
          border: shapeStyle ? hex(shapeStyle.borderTopColor) : null,
          outline: shapeStyle ? hex(shapeStyle.outlineColor) : null,
          fill: shapeStyle ? hex(shapeStyle.backgroundColor) : null,
          captionColor: caption ? getComputedStyle(caption).color : null,
        };
      });
    });

    const mutedText = await page.evaluate(() => {
      const probe = document.createElement("span");

      probe.className = "text-muted-foreground";

      document.body.append(probe);

      const color = getComputedStyle(probe).color;

      probe.remove();

      return color;
    });

    const nonText = rows.filter((row) => row.required === 3);

    expect(nonText).toHaveLength(12);

    for (const row of nonText) {
      expect(["border", "ring", "graphic"], row.label).toContain(row.sample);

      // The visual is the element itself, not text in the 3:1 color.
      expect(row.visual, row.label).toBe(row.sample);

      const drawn: Record<string, string | null> = { border: row.border, ring: row.outline, graphic: row.fill };

      expect(drawn[row.sample ?? ""], row.label).toBe(row.fg);

      // The hex caption uses regular muted text, independent of the pair.
      expect(row.captionColor, row.label).toBe(mutedText);
    }

    // Text pairs stay as text samples.
    for (const row of rows.filter((candidate) => candidate.required === 4.5)) {
      expect(row.sample, row.label).toBe("text");

      expect(row.visual, row.label).toBeNull();
    }
  });

  test("reduced motion disables transitions and decorative animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/design-system");

    const transition = await page
      .locator("#buttons button")
      .first()
      .evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration));

    expect(transition).toBeLessThan(0.001);

    const pulse = await page
      .locator("[data-slot='skeleton']")
      .first()
      .evaluate((element) => getComputedStyle(element).animationIterationCount);

    expect(pulse).toBe("1");
  });

  test("the skip link is the first stop and moves focus to the main content", async ({ page }) => {
    for (const route of ["/packages", "/design-system"]) {
      await page.goto(route);

      await page.keyboard.press("Tab");

      const skip = page.getByRole("link", { name: "Skip to main content" });

      await expect(skip).toBeFocused();

      await page.keyboard.press("Enter");

      await expect(page.locator("#main-content")).toBeFocused();
    }
  });
});

test.describe("CR-028 PortalShell", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  for (const portal of PORTALS) {
    test(`${portal.role}: desktop shell keeps navigation, active state and passes axe`, async ({
      page,
    }) => {
      await login(page, portal.account);

      await page.goto(portal.home);

      const sidebar = page.locator("aside");

      await expect(sidebar.getByText(portal.title, { exact: true })).toBeVisible({
        timeout: 15_000,
      });

      const nav = sidebar.getByRole("navigation");

      for (const [name, href] of portal.navigation) {
        await expect(nav.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
      }

      await expect(nav.locator('a[aria-current="page"]')).toHaveText("Dashboard");

      for (const name of portal.extras) {
        await expect(sidebar.getByRole("link", { name, exact: true })).toBeVisible();
      }

      await expect(sidebar.getByRole("button", { name: "Logout" })).toBeVisible();

      // Active state follows the route.
      const [secondName, secondHref] = portal.navigation[1];

      await page.goto(secondHref);

      await expect(nav.locator('a[aria-current="page"]')).toHaveText(secondName, {
        timeout: 15_000,
      });

      expect(await axeViolations(page, "aside")).toEqual([]);
    });

    test(`${portal.role}: mobile drawer is a keyboard-safe modal and logout works`, async ({
      page,
    }) => {
      await page.setViewportSize(MOBILE);

      await login(page, portal.account);

      await page.goto(portal.home);

      const toggle = page.getByRole("button", { name: portal.toggle, exact: true });

      await expect(toggle).toHaveAttribute("aria-expanded", "false", { timeout: 15_000 });

      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
      ).toBe(true);

      await toggle.click();

      const drawer = page.getByRole("dialog");

      await expect(drawer).toBeVisible();

      await expect(page.locator("[data-slot='sheet-trigger']")).toHaveAttribute("aria-expanded", "true");

      for (const [name, href] of portal.navigation) {
        await expect(drawer.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
      }

      await expect(drawer.locator('a[aria-current="page"]')).toHaveText("Dashboard");

      for (const name of portal.extras) {
        await expect(drawer.getByRole("link", { name, exact: true })).toBeVisible();
      }

      expect(await axeViolations(page, "[role='dialog']")).toEqual([]);

      // Tabbing never reaches the page behind the drawer.
      for (let index = 0; index < 20; index += 1) {
        await page.keyboard.press("Tab");

        const escaped = await page.evaluate(() => {
          const active = document.activeElement;

          return Boolean(
            active &&
              active !== document.body &&
              !active.closest("[role='dialog']") &&
              !active.hasAttribute("data-base-ui-focus-guard"),
          );
        });

        expect(escaped).toBe(false);
      }

      await page.keyboard.press("Escape");

      await expect(drawer).toHaveCount(0);

      await expect(toggle).toBeFocused();

      await toggle.click();

      await page.getByRole("dialog").getByRole("button", { name: "Logout" }).click();

      await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    });
  }

  test("shells and showcase have no horizontal overflow at 390px", async ({ page }) => {
    await page.setViewportSize(MOBILE);

    const noOverflow = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

    for (const route of ["/", "/login", "/register", "/packages", "/guides", "/design-system"]) {
      await page.goto(route);

      expect(await noOverflow(), route).toBe(true);
    }

    await login(page, TOURIST);

    for (const route of ["/tourist", "/tourist/requests", "/tourist/quotations"]) {
      await page.goto(route);

      await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });

      expect(await noOverflow(), route).toBe(true);
    }
  });
});

/* ================================================================
 * Review fixes (H1 focus visibility, M1 typography merging)
 * ================================================================ */

test.describe("CR-028 keyboard focus visibility", () => {
  test.beforeEach(({}, testInfo) => {
    skipOutsideChromium(testInfo);
  });

  /**
   * Moves focus onto `selector` with a real Tab key press: the
   * element just before it in tab order is focused first, then
   * Tab lands on the target (keyboard modality => :focus-visible).
   */
  async function tabOnto(page: Page, selector: string) {
    const target = page.locator(selector).first();

    await target.evaluate((element) => {
      const tabbables = [
        ...document.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      ].filter((candidate) => candidate.getClientRects().length > 0);

      const index = tabbables.indexOf(element as HTMLElement);

      if (index < 1) {
        throw new Error("No tabbable element before the target");
      }

      tabbables[index - 1].focus();
    });

    await page.keyboard.press("Tab");

    await expect(target).toBeFocused();
  }

  const PRIMITIVES = [
    ["Button", "#buttons button:has-text('default')"],
    ["Button-styled link (buttonVariants)", "#empty-states a:has-text('Plan a trip')"],
    ["Input", "#ds-name"],
    ["Textarea", "#ds-notes"],
    ["NativeSelect", "#ds-contact"],
  ] as const;

  for (const [name, selector] of PRIMITIVES) {
    test(`${name} shows one visible 2px ring-colored outline on keyboard focus`, async ({
      page,
    }) => {
      await page.goto("/design-system");

      const target = page.locator(selector).first();

      await target.scrollIntoViewIfNeeded();

      const resting = await target.evaluate((element) => {
        const style = getComputedStyle(element);

        return { boxShadow: style.boxShadow, borderColor: style.borderColor };
      });

      await tabOnto(page, selector);

      const focused = await target.evaluate((element) => {
        const style = getComputedStyle(element);

        // Resolve the ring token to the same color format.
        const probe = document.createElement("span");

        probe.style.color = "var(--ring)";

        document.body.append(probe);

        const ring = getComputedStyle(probe).color;

        probe.remove();

        return {
          focusVisible: element.matches(":focus-visible"),
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineColor: style.outlineColor,
          ring,
          boxShadow: style.boxShadow,
          borderColor: style.borderColor,
        };
      });

      expect(focused.focusVisible, name).toBe(true);

      expect(focused.outlineStyle, name).not.toBe("none");

      expect(focused.outlineStyle, name).toBe("solid");

      expect(focused.outlineWidth, name).toBe("2px");

      expect(focused.outlineColor, name).toBe(focused.ring);

      // Exactly one indicator: no added box-shadow ring, no border change.
      expect(focused.boxShadow, name).toBe(resting.boxShadow);

      expect(focused.borderColor, name).toBe(resting.borderColor);
    });
  }
});

test.describe("CR-028 typography class merging", () => {
  test("cn() keeps both the typography utility and the text color", ({}, testInfo) => {
    skipOutsideChromium(testInfo);

    expect(cn("text-body-sm", "text-foreground")).toBe("text-body-sm text-foreground");

    expect(cn("text-overline", "text-tea-700")).toBe("text-overline text-tea-700");

    expect(cn("text-heading-xl", "text-foreground")).toBe("text-heading-xl text-foreground");

    expect(cn("font-display text-display-md", "text-ivory")).toBe(
      "font-display text-display-md text-ivory",
    );

    for (const size of TYPOGRAPHY_SIZES) {
      const merged = cn(`text-${size}`, "text-muted-foreground").split(" ");

      expect(merged, size).toContain(`text-${size}`);

      expect(merged, size).toContain("text-muted-foreground");
    }

    // Conflicts still resolve normally: the later size / color wins.
    expect(cn("text-body-sm", "text-heading-lg")).toBe("text-heading-lg");

    expect(cn("text-sm", "text-body")).toBe("text-body");

    expect(cn("text-foreground", "text-tea-700")).toBe("text-tea-700");
  });

  test("patterns built with cn() render the typography size", async ({ page }, testInfo) => {
    skipOutsideChromium(testInfo);

    await page.goto("/design-system");

    // DescriptionList values (text-body-sm via cn) and the LoadingState label.
    await expect(page.locator("[data-slot='description-list'] dd").first()).toHaveCSS(
      "font-size",
      "14px",
    );

    await expect(
      page.locator("#loading [data-slot='loading-state']").filter({ hasText: "Loading your trips" }),
    ).toHaveCSS("font-size", "14px");
  });
});
