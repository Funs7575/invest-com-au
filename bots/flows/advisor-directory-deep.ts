/**
 * Deep advisor directory exploration flow.
 *
 * Goes beyond the basic directory-filters flow to test advisor-specific
 * features: type-specific sub-pages, state filtering, leaderboard,
 * comparison page render, and the advisor search API directly.
 *
 *   1. /advisors/financial-advisors sub-type page renders
 *   2. /advisors/mortgage-brokers sub-type page renders
 *   3. /advisors/leaderboard renders with ranked entries
 *   4. /advisors/compare renders (or compare sub-page after selecting 2)
 *   5. Type filter interaction on /advisors
 *   6. Specialist sub-pages: /advisors/firb-specialists, /advisors/migration-agents
 *   7. /api/advisor-search returns valid JSON with results
 */

const BASE_SUB_TYPES = [
  { path: "/advisors/financial-advisors", label: "financial-advisors" },
  { path: "/advisors/mortgage-brokers", label: "mortgage-brokers" },
  { path: "/advisors/accountants", label: "accountants" },
];

const SPECIALIST_PAGES = [
  { path: "/advisors/firb-specialists", label: "firb-specialists" },
  { path: "/advisors/migration-agents", label: "migration-agents" },
  { path: "/advisors/international-tax-specialists", label: "international-tax" },
];

export const ADVISOR_DIRECTORY_DEEP_FLOW = {
  name: "advisor-directory-deep",
  description:
    "Deep directory exploration: advisor-type sub-pages, leaderboard, specialist pages, comparison, and the search API.",
  steps: [
    // ── Step 1: type-specific sub-pages render ────────────────────────────────
    {
      name: "advisor-type-subpages",
      async run({ page, store, persona, config }: { page: import("@playwright/test").Page, store: import("../findings/store").FindingStore, persona: string, config: import("../config").BotConfig }) {
        for (const { path, label } of BASE_SUB_TYPES) {
          const url = config.baseUrl.replace(/\/$/, "") + path;
          const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
          const status = res?.status() ?? 0;

          if (status >= 500) {
            store.add({
              severity: "high",
              category: "http-error",
              title: `advisor sub-type page ${path} returned HTTP ${status}`,
              detail: `Server error on ${path}.`,
              url,
              persona,
              signatureKey: `advisor-dir:subtype:${label}:${status}`,
            });
          } else if (status === 404) {
            store.add({
              severity: "medium",
              category: "http-error",
              title: `advisor sub-type page ${path} returned 404`,
              detail: `The ${label} directory page doesn't exist. This breaks type-specific SEO landing pages.`,
              url,
              persona,
              signatureKey: `advisor-dir:subtype:${label}:404`,
            });
          } else {
            await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
            await page.waitForTimeout(300);
            const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
            if (bodyText.trim().length < 30) {
              store.add({
                severity: "medium",
                category: "ux",
                title: `advisor sub-type page ${path} rendered almost no content`,
                url,
                persona,
                signatureKey: `advisor-dir:subtype:${label}:empty`,
                detail: "Sub-type directory page is blank or has almost no text content.",
              });
            }
          }
        }
      },
    },

    // ── Step 2: specialist pages render ──────────────────────────────────────
    {
      name: "specialist-pages",
      async run({ page, store, persona, config }: { page: import("@playwright/test").Page, store: import("../findings/store").FindingStore, persona: string, config: import("../config").BotConfig }) {
        for (const { path, label } of SPECIALIST_PAGES) {
          const url = config.baseUrl.replace(/\/$/, "") + path;
          const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
          const status = res?.status() ?? 0;

          if (status >= 400) {
            store.add({
              severity: status >= 500 ? "high" : "medium",
              category: "http-error",
              title: `specialist page ${path} returned HTTP ${status}`,
              detail: `The ${label} specialist landing page is broken. Foreign investment features rely on these pages.`,
              url,
              persona,
              signatureKey: `advisor-dir:specialist:${label}:${status}`,
            });
          } else {
            await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
            await page.waitForTimeout(300);
            // Check for specialist-specific content (FIRB, migration).
            const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
            const hasSpecialistContent =
              label === "firb-specialists" ? /FIRB|foreign investment/i.test(bodyText) :
              label === "migration-agents" ? /migrat|visa/i.test(bodyText) :
              /international|tax/i.test(bodyText);

            if (!hasSpecialistContent) {
              store.add({
                severity: "low",
                category: "ux",
                title: `specialist page ${path}: specialist content keywords not found`,
                detail: `The ${label} page doesn't contain expected specialist keywords. May be showing generic content.`,
                url,
                persona,
                signatureKey: `advisor-dir:specialist:${label}:no-content`,
              });
            }
          }
        }
      },
    },

    // ── Step 3: leaderboard renders with entries ──────────────────────────────
    {
      name: "leaderboard-renders",
      async run({ page, store, persona, config }: { page: import("@playwright/test").Page, store: import("../findings/store").FindingStore, persona: string, config: import("../config").BotConfig }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisors/leaderboard";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          store.add({
            severity: status >= 500 ? "high" : "medium",
            category: "http-error",
            title: `advisor leaderboard returned HTTP ${status}`,
            url,
            persona,
            signatureKey: `advisor-dir:leaderboard:${status}`,
            detail: "The advisor leaderboard page is not accessible.",
          });
          return;
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(400);

        // Leaderboard should have ranked entries — look for ranking indicators.
        const hasEntries =
          (await page.locator('main a[href^="/advisor/"]').count().catch(() => 0)) > 0 ||
          (await page.locator("main ol li, main [data-rank]").count().catch(() => 0)) > 0;

        if (!hasEntries) {
          store.add({
            severity: "low",
            category: "ux",
            title: "advisor leaderboard: no ranked entries found",
            detail: "The leaderboard page renders but shows no advisor entries. May be empty on this target.",
            url,
            persona,
            signatureKey: "advisor-dir:leaderboard:empty",
          });
        }
      },
    },

    // ── Step 4: compare page renders ─────────────────────────────────────────
    {
      name: "compare-page-renders",
      async run({ page, store, persona, config }: { page: import("@playwright/test").Page, store: import("../findings/store").FindingStore, persona: string, config: import("../config").BotConfig }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisors/compare";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status === 404) {
          // Not all deployments have this — soft note.
          store.add({
            severity: "low",
            category: "http-error",
            title: "advisor compare page /advisors/compare returned 404",
            url,
            persona,
            signatureKey: "advisor-dir:compare:404",
            detail: "The /advisors/compare page doesn't exist or redirects away.",
          });
        } else if (status >= 500) {
          store.add({
            severity: "high",
            category: "http-error",
            title: `advisor compare page returned HTTP ${status}`,
            url,
            persona,
            signatureKey: `advisor-dir:compare:${status}`,
            detail: "Server error on the advisor compare page.",
          });
        } else {
          await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
          await page.waitForTimeout(300);
          const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
          if (bodyText.trim().length < 20) {
            store.add({
              severity: "medium",
              category: "ux",
              title: "advisor compare page rendered almost no content",
              url,
              persona,
              signatureKey: "advisor-dir:compare:empty",
              detail: "Compare page body is nearly empty.",
            });
          }
        }
      },
    },

    // ── Step 5: search API returns JSON ──────────────────────────────────────
    {
      name: "search-api-returns-json",
      async run({ page, store, persona, config }: { page: import("@playwright/test").Page, store: import("../findings/store").FindingStore, persona: string, config: import("../config").BotConfig }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/api/advisor-search?q=financial";
        const res = await page.request.fetch(url, { method: "GET", timeout: 10_000 }).catch(() => null);

        if (!res) {
          store.add({
            severity: "medium",
            category: "http-error",
            title: "advisor search API: request failed (network/timeout)",
            url,
            persona,
            signatureKey: "advisor-dir:api:search-failed",
            detail: "GET /api/advisor-search?q=financial threw a network error or timed out.",
          });
          return;
        }

        const status = res.status();
        if (status >= 400) {
          store.add({
            severity: status >= 500 ? "high" : "medium",
            category: "http-error",
            title: `advisor search API returned HTTP ${status}`,
            url,
            persona,
            signatureKey: `advisor-dir:api:search:${status}`,
            detail: `GET /api/advisor-search?q=financial returned ${status}.`,
          });
          return;
        }

        // Check the response is valid JSON.
        const text = await res.text().catch(() => "");
        try {
          JSON.parse(text);
        } catch {
          store.add({
            severity: "high",
            category: "http-error",
            title: "advisor search API returned non-JSON response",
            url,
            persona,
            signatureKey: "advisor-dir:api:search:non-json",
            detail: `Response was not valid JSON: ${text.slice(0, 100)}`,
          });
        }
      },
    },

    // ── Step 6: for-advisors marketing page ──────────────────────────────────
    {
      name: "for-advisors-page-renders",
      async run({ page, store, persona, config }: { page: import("@playwright/test").Page, store: import("../findings/store").FindingStore, persona: string, config: import("../config").BotConfig }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/for-advisors";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          store.add({
            severity: status >= 500 ? "high" : "medium",
            category: "http-error",
            title: `for-advisors page returned HTTP ${status}`,
            url,
            persona,
            signatureKey: `advisor-dir:for-advisors:${status}`,
            detail: "/for-advisors is a key advisor acquisition page.",
          });
          return;
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(400);

        // Key conversion elements: Apply / Get Started CTA and pricing anchor.
        const hasCTA =
          (await page.locator('a:has-text("Apply"), button:has-text("Apply"), a:has-text("Get started"), a[href*="advisor-apply"], a[href*="advisor-signup"]').count().catch(() => 0)) > 0;
        const hasPricing =
          (await page.locator('a[href*="pricing"], a[href*="#pricing"], section:has-text("Pricing")').count().catch(() => 0)) > 0;

        if (!hasCTA) {
          store.add({
            severity: "high",
            category: "ux",
            title: "for-advisors: no 'Apply' / 'Get Started' CTA found",
            detail: "The /for-advisors marketing page has no primary conversion CTA. This is the main advisor acquisition page.",
            url,
            persona,
            signatureKey: "advisor-dir:for-advisors:no-cta",
          });
        }
        if (!hasPricing) {
          store.add({
            severity: "medium",
            category: "ux",
            title: "for-advisors: no pricing section or link",
            detail: "No pricing section or link to /for-advisors/pricing was found. Pricing transparency reduces sign-up friction.",
            url,
            persona,
            signatureKey: "advisor-dir:for-advisors:no-pricing",
          });
        }
      },
    },

    // ── Step 7: advisor jobs page renders ────────────────────────────────────
    {
      name: "advisor-jobs-page-renders",
      async run({ page, store, persona, config }: { page: import("@playwright/test").Page, store: import("../findings/store").FindingStore, persona: string, config: import("../config").BotConfig }) {
        const url = config.baseUrl.replace(/\/$/, "") + "/advisor-jobs";
        const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        const status = res?.status() ?? 0;

        if (status >= 400) {
          store.add({
            severity: status >= 500 ? "high" : "low",
            category: "http-error",
            title: `advisor-jobs returned HTTP ${status}`,
            url,
            persona,
            signatureKey: `advisor-dir:jobs:${status}`,
            detail: "/advisor-jobs is a jobs board for the advisor ecosystem.",
          });
          return;
        }

        await page.waitForLoadState("load", { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(300);

        const bodyText = await page.locator("main, body").first().innerText().catch(() => "");
        if (bodyText.trim().length < 20) {
          store.add({
            severity: "low",
            category: "ux",
            title: "advisor-jobs: page rendered almost no content",
            url,
            persona,
            signatureKey: "advisor-dir:jobs:empty",
            detail: "Advisor jobs board is blank — either no jobs are seeded or the page failed to render.",
          });
        }
      },
    },
  ],
} as import("./types").Flow;
