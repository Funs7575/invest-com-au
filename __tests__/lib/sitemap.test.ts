/**
 * Tests for `app/sitemap.ts` — verify that the new marketplace + testimonials
 * pages are emitted and that noindex `/account/refer` is *not*.
 *
 * The sitemap module touches Supabase for several dynamic page groups, so
 * we stub the server client with a builder that returns empty data for
 * every table. The marketplace pages are derived from `getEnabledIntents()`
 * and `AUSTRALIAN_STATES`, both of which we mock to a fixed set so the
 * URL count is deterministic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => {
    // Each call returns a fresh chain that always resolves to empty data.
    const chain = (): unknown => {
      const builder: Record<string, unknown> = {};
      const methods = [
        "from",
        "select",
        "eq",
        "in",
        "not",
        "order",
        "limit",
      ];
      for (const m of methods) {
        builder[m] = vi.fn(() => builder);
      }
      builder.then = vi.fn(
        (cb: (v: { data: never[]; error: null }) => void) => {
          cb({ data: [], error: null });
          return Promise.resolve();
        },
      );
      return builder;
    };
    return Promise.resolve(chain());
  }),
}));

// Fix intent list so the marketplace URL count is deterministic in tests.
const TEST_INTENTS = [
  { slug: "smsf-property" },
  { slug: "financial-planner" },
  { slug: "tax-agent" },
  { slug: "mortgage-broker" },
  { slug: "buyers-agent" },
  { slug: "estate-planner" },
  { slug: "insurance-broker" },
  { slug: "wealth-manager" },
  { slug: "aged-care-advisor" },
  { slug: "crypto-advisor" },
  { slug: "debt-counsellor" },
  { slug: "business-broker" },
  { slug: "migration-agent" },
  { slug: "conveyancer" },
  { slug: "property-lawyer" },
  { slug: "real-estate-agent" },
  { slug: "property-advisor" },
];

vi.mock("@/lib/getmatched/intents", () => ({
  getEnabledIntents: vi.fn(() => Promise.resolve(TEST_INTENTS)),
}));

// Other helpers used inside sitemap pull from local arrays; nothing to mock.

vi.mock("@/lib/glossary", () => ({
  GLOSSARY_ENTRIES: [],
}));

import sitemap from "@/app/sitemap";
import { AUSTRALIAN_STATES } from "@/lib/seo/best-pages";

describe("app/sitemap.ts — marketplace + testimonials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes the /marketplace hub", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://invest.com.au/marketplace");
  });

  it("includes /marketplace/[intent] for every enabled intent", async () => {
    const entries = await sitemap();
    const urls = new Set(entries.map((e) => e.url));
    for (const intent of TEST_INTENTS) {
      expect(urls.has(`https://invest.com.au/marketplace/${intent.slug}`)).toBe(
        true,
      );
    }
  });

  it("includes /marketplace/[intent]/[state] for every (intent × state) combo", async () => {
    const entries = await sitemap();
    const urls = new Set(entries.map((e) => e.url));
    for (const intent of TEST_INTENTS) {
      for (const state of AUSTRALIAN_STATES) {
        expect(
          urls.has(
            `https://invest.com.au/marketplace/${intent.slug}/${state.slug}`,
          ),
        ).toBe(true);
      }
    }
  });

  it("includes /testimonials", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain("https://invest.com.au/testimonials");
  });

  it("does NOT include any /account/* paths (noindex)", async () => {
    const entries = await sitemap();
    const accountUrls = entries
      .map((e) => e.url)
      .filter((u) => u.includes("/account/"));
    expect(accountUrls).toEqual([]);
  });

  it("does NOT include any /admin/* paths", async () => {
    const entries = await sitemap();
    const adminUrls = entries
      .map((e) => e.url)
      .filter((u) => u.includes("/admin/") || u.endsWith("/admin"));
    expect(adminUrls).toEqual([]);
  });

  it("emits ~140 new marketplace + testimonials URLs", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    const marketplaceCount = urls.filter((u) =>
      u.includes("/marketplace"),
    ).length;
    const testimonialsCount = urls.filter((u) =>
      u.endsWith("/testimonials"),
    ).length;
    // 1 hub + 17 intent + (17 × 8 states) = 154 marketplace + 1 testimonials = 155.
    const expectedMarketplace =
      1 + TEST_INTENTS.length + TEST_INTENTS.length * AUSTRALIAN_STATES.length;
    expect(marketplaceCount).toBe(expectedMarketplace);
    expect(testimonialsCount).toBe(1);
    // Total new ≥ 140 per the task target.
    expect(marketplaceCount + testimonialsCount).toBeGreaterThanOrEqual(140);
  });
});
