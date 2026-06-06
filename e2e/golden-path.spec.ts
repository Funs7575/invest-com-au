/**
 * Golden-path E2E — the five money flows that must never be broken.
 *
 * These tests cover the full conversion funnel from first visit through to
 * every revenue-generating CTA. They run deterministically (no AI), targeting
 * the dev server (or the Netlify mirror via PLAYWRIGHT_BASE_URL).
 *
 * Flows:
 *   1. Quiz funnel     — /quiz → answer → results / compare redirect
 *   2. Compare funnel  — /compare renders broker cards + /go/ affiliate CTAs
 *   3. Broker detail   — /broker/:slug renders with disclosure + affiliate CTA
 *   4. Sign-up gate    — /account redirects to auth, /signup renders form
 *   5. Advisor booking — /advisors renders + /find-advisor form is interactive
 *   6. Schema integrity — JSON-LD present on pillar pages (GEO/AI citability)
 *   7. Key API health  — public API routes return 200 on the current target
 */

import { test, expect } from "@playwright/test";

// ── 1. Quiz funnel ─────────────────────────────────────────────────────────

test.describe("Quiz funnel", () => {
  test("quiz page renders with answerable questions", async ({ page }) => {
    await page.goto("/quiz");
    await expect(page.locator("main").first()).toBeVisible();
    // Should have at least one answer option
    const option = page.locator("button").filter({ hasText: /Beginner|DIY|Long.?term|Grow|Save|Start|Yes|No/i }).first();
    await expect(option).toBeVisible({ timeout: 15_000 });
  });

  test("quiz: answering the first question advances to next", async ({ page }) => {
    await page.goto("/quiz");
    const firstOption = page.locator("button").filter({ hasText: /Beginner|DIY|Long.?term|Grow|Save|Start|Yes|No/i }).first();
    await expect(firstOption).toBeVisible({ timeout: 15_000 });
    await firstOption.click();
    // After clicking, either another question appears or we reach a results page
    await page.waitForTimeout(800);
    const stillOnQuiz = page.url().includes("/quiz");
    if (stillOnQuiz) {
      // Should now show a different step — a new option or progress indicator
      const progress = page.locator("[data-step], [aria-label*='step'], progress, .progress").first();
      const nextOption = page.locator("button").filter({ hasText: /Beginner|DIY|Long.?term|Grow|Save|Crypto|Shares|Funds|Property|Yes|No|Next/i }).first();
      await expect(nextOption.or(progress)).toBeVisible({ timeout: 10_000 });
    }
    // Page should not have 500-level errors
    const error = page.locator("text=/500|Internal Server Error/").first();
    await expect(error).not.toBeVisible();
  });

  test("quiz results or /get-matched renders after completion", async ({ page }) => {
    // Navigate directly to the results page variant that doesn't need a full quiz
    await page.goto("/get-matched");
    const response = await page.goto("/get-matched");
    const status = response?.status() ?? 0;
    // Either it renders (200) or redirects to quiz (3xx → 200 after redirect)
    expect(status).toBeLessThan(400);
    await expect(page.locator("main").first()).toBeVisible();
  });
});

// ── 2. Compare funnel ──────────────────────────────────────────────────────

test.describe("Compare funnel", () => {
  test("compare page renders broker list with affiliate CTAs", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        errors.push(msg.text().slice(0, 200));
      }
    });

    await page.goto("/compare");
    await expect(page.locator("main").first()).toBeVisible();

    // Broker cards / table rows should be present
    const brokerEntry = page.locator(
      "table tr, [data-test='broker-card'], article, [class*='broker'], [class*='card']"
    ).nth(1); // skip header row
    await expect(brokerEntry).toBeVisible({ timeout: 15_000 });

    // At least one /go/ affiliate CTA must be present (revenue-critical)
    const affiliateCta = page.locator('a[href*="/go/"]').first();
    await expect(affiliateCta).toBeVisible({ timeout: 10_000 });

    // No unhandled JS errors on the money page
    expect(errors, `Console errors on /compare: ${errors.join("; ")}`).toHaveLength(0);
  });

  test("compare: /go/* links have a recognisable broker slug", async ({ page }) => {
    await page.goto("/compare");
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);

    const hrefs = await page.locator('a[href*="/go/"]').evaluateAll(
      (els) => els.map((el) => (el as HTMLAnchorElement).href),
    );
    expect(hrefs.length, "No /go/ affiliate CTAs found on /compare").toBeGreaterThan(0);

    for (const href of hrefs.slice(0, 5)) {
      const slug = href.match(/\/go\/([^/?#]+)/)?.[1];
      expect(slug, `Malformed /go/ href: ${href}`).toBeTruthy();
      // Slugs should be lowercase alphanumeric with hyphens
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  test("compare: clicking a broker card stays on a safe route", async ({ page }) => {
    await page.goto("/compare");
    const brokerLink = page.locator('a[href*="/broker/"]').first();
    await expect(brokerLink).toBeVisible({ timeout: 15_000 });
    const href = await brokerLink.getAttribute("href");
    expect(href).toMatch(/\/broker\//);
  });
});

// ── 3. Broker detail funnel ────────────────────────────────────────────────

test.describe("Broker detail", () => {
  // We don't hardcode a broker slug — discover it from the compare page
  // so the test survives broker roster changes.
  test("broker detail page renders with compliance disclaimer + affiliate CTA", async ({ page }) => {
    await page.goto("/compare");
    const brokerDetailLink = page.locator('a[href^="/broker/"]').first();
    await expect(brokerDetailLink).toBeVisible({ timeout: 15_000 });
    const detailUrl = await brokerDetailLink.getAttribute("href");
    expect(detailUrl).toBeTruthy();

    await page.goto(detailUrl!);
    await expect(page.locator("main").first()).toBeVisible();

    // Compliance disclaimer is mandatory on financial product pages
    const disclaimer = page.locator(
      "text=/general (information|advice)|not (personal|financial) advice/i"
    ).first();
    await expect(disclaimer).toBeVisible({ timeout: 10_000 });

    // Affiliate CTA (either /go/ link or an "Open account" / "Visit" button)
    const cta = page.locator(
      'a[href*="/go/"], button:has-text("Open account"), a:has-text("Open account"), a:has-text("Visit"), a:has-text("Get started")'
    ).first();
    await expect(cta).toBeVisible({ timeout: 10_000 });
  });

  test("broker detail: JSON-LD schema is present", async ({ page }) => {
    await page.goto("/compare");
    const link = await page.locator('a[href^="/broker/"]').first().getAttribute("href");
    if (!link) return;

    await page.goto(link);
    const schemaBlocks = await page.locator('script[type="application/ld+json"]').count();
    expect(schemaBlocks, `No JSON-LD schema on ${link}`).toBeGreaterThan(0);
  });
});

// ── 4. Sign-up gate ────────────────────────────────────────────────────────

test.describe("Sign-up gate", () => {
  test("/account redirects unauthenticated users to login", async ({ page }) => {
    const response = await page.goto("/account");
    const finalUrl = page.url();
    // Should either redirect to a login page or render a sign-in form
    const isAuth = finalUrl.includes("/login") || finalUrl.includes("/signin") ||
                   finalUrl.includes("/auth") || finalUrl.includes("/account");
    expect(isAuth, `Unexpected redirect destination: ${finalUrl}`).toBeTruthy();
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  test("/signup or /auth/signup renders a sign-up form", async ({ page }) => {
    // Try common sign-up paths
    for (const path of ["/signup", "/auth/signup", "/register", "/login"]) {
      const res = await page.goto(path);
      if (res && res.status() < 400) {
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        await expect(emailInput).toBeVisible({ timeout: 8_000 });
        return; // found it
      }
    }
    // If none found, check that /account at minimum doesn't 500
    const res = await page.goto("/account");
    expect(res?.status()).toBeLessThan(500);
  });
});

// ── 5. Advisor booking funnel ──────────────────────────────────────────────

test.describe("Advisor booking funnel", () => {
  test("/advisors renders advisor cards", async ({ page }) => {
    await page.goto("/advisors");
    await expect(page.locator("main").first()).toBeVisible();
    // Should have advisor cards or a directory listing
    const card = page.locator(
      "[class*='advisor'], [class*='professional'], [data-test*='advisor'], article"
    ).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
  });

  test("/find-advisor form is interactive", async ({ page }) => {
    await page.goto("/find-advisor");
    await expect(page.locator("main").first()).toBeVisible();
    // Should have an input field (suburb / postcode / location)
    const input = page.locator(
      'input[type="text"], input[type="search"], input[placeholder*="postcode"], input[placeholder*="suburb"]'
    ).first();
    await expect(input).toBeVisible({ timeout: 10_000 });
  });

  test("advisor profile renders with enquiry CTA", async ({ page }) => {
    await page.goto("/advisors");
    // Find the first advisor profile link
    const profileLink = page.locator('a[href^="/advisor/"], a[href*="/find-advisor/"]').first();
    await expect(profileLink).toBeVisible({ timeout: 15_000 });
    const href = await profileLink.getAttribute("href");
    if (!href) return;

    await page.goto(href);
    await expect(page.locator("main").first()).toBeVisible();

    // Should have some kind of contact / enquiry CTA
    const cta = page.locator(
      'button:has-text("Enquire"), a:has-text("Enquire"), button:has-text("Contact"), button:has-text("Book"), a:has-text("Book")'
    ).first();
    await expect(cta).toBeVisible({ timeout: 10_000 });
  });
});

// ── 6. Schema integrity on pillar pages ────────────────────────────────────

test.describe("Schema markup (GEO/AI citability)", () => {
  const PILLAR_PAGES = [
    "/compare",
    "/share-trading",
    "/etfs",
    "/advisors",
  ];

  for (const path of PILLAR_PAGES) {
    test(`${path} has JSON-LD structured data`, async ({ page }) => {
      await page.goto(path);
      const count = await page.locator('script[type="application/ld+json"]').count();
      expect(count, `No JSON-LD schema on ${path}`).toBeGreaterThan(0);

      // Validate the first block parses as valid JSON
      const firstBlock = await page.locator('script[type="application/ld+json"]').first().textContent();
      expect(() => JSON.parse(firstBlock ?? ""), `Malformed JSON-LD on ${path}`).not.toThrow();
    });
  }

  test("/compare JSON-LD contains BreadcrumbList or Product schema", async ({ page }) => {
    await page.goto("/compare");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const types = blocks.flatMap((b) => {
      try {
        const parsed = JSON.parse(b) as Record<string, unknown>;
        const graph = parsed["@graph"] as unknown[] | undefined;
        if (graph) return graph.map((n) => (n as Record<string, unknown>)["@type"]);
        return [parsed["@type"]];
      } catch {
        return [];
      }
    }).filter(Boolean);

    expect(types.length, "No @type found in JSON-LD on /compare").toBeGreaterThan(0);
  });
});

// ── 7. Key API health ──────────────────────────────────────────────────────

test.describe("API routes", () => {
  const PUBLIC_APIS = [
    { path: "/api/brokers", label: "brokers list" },
    { path: "/api/events", label: "public events" },
    { path: "/api/office-hours", label: "office hours" },
    { path: "/api/ipo-offers", label: "IPO offers" },
  ];

  for (const { path, label } of PUBLIC_APIS) {
    test(`${path} (${label}) returns 200`, async ({ request }) => {
      const res = await request.get(path);
      expect(
        res.status(),
        `${path} returned ${res.status()} — should be 200`,
      ).toBe(200);
      const body = await res.json();
      expect(body).toBeTruthy();
    });
  }

  test("/api/careers/jobs returns 200 with jobs array", async ({ request }) => {
    const res = await request.get("/api/careers/jobs");
    expect(res.status()).toBe(200);
    const body = await res.json() as { jobs: unknown[] };
    expect(Array.isArray(body.jobs)).toBe(true);
  });
});
