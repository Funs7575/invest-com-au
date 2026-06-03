/**
 * Tests for `app/sitemap.ts` — verifies the sharded sitemap index structure.
 *
 * The sitemap uses Next.js's `generateSitemaps()` + `sitemap({ id })` pattern,
 * which produces a sitemap index at /sitemap.xml and individual shards at
 * /sitemap/[id].xml. Each shard is tested independently; the union of all
 * shards is checked for correctness (no dupes, no forbidden paths).
 *
 * Supabase is stubbed with a chain that returns empty data for every table
 * so tests run without a live DB. Intent list and AUSTRALIAN_STATES are fixed
 * so URL counts are deterministic.
 */

import { describe, it, expect, vi } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => {
    // Make the chain thenable but NOT the top-level client object — avoids
    // Promise thenable-assimilation swallowing the client itself.
    const makeChain = (): unknown => {
      const builder: Record<string, unknown> = {};
      const methods = [
        "from",
        "select",
        "eq",
        "in",
        "not",
        "gte",
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
    return { from: vi.fn(() => makeChain()) };
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

vi.mock("@/lib/glossary", () => ({
  GLOSSARY_ENTRIES: [],
}));

import sitemap, { generateSitemaps } from "@/app/sitemap";
import { AUSTRALIAN_STATES } from "@/lib/seo/best-pages";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build every shard and return the flat union of all URLs. */
async function getAllUrls(): Promise<string[]> {
  const shardIds = generateSitemaps().map((s) => s.id);
  const shards = await Promise.all(shardIds.map((id) => sitemap({ id })));
  return shards.flat().map((e) => e.url);
}

describe("sitemap shard id coercion (Netlify passes string ids)", () => {
  it("populates the shard for a string id instead of returning an empty []", async () => {
    // @netlify/plugin-nextjs passes the shard id as "0"; before the Number(id)
    // coercion this fell through to `default: []` and served empty sitemaps.
    const asString = await sitemap({ id: "0" as unknown as number });
    const asNumber = await sitemap({ id: 0 });
    expect(asString.length).toBeGreaterThan(0);
    expect(asString.length).toBe(asNumber.length);
  });
});

/** Build a single shard and return its URLs. */
async function getShardUrls(id: number): Promise<string[]> {
  const entries = await sitemap({ id });
  return entries.map((e) => e.url);
}

// ── generateSitemaps structure ────────────────────────────────────────────────

describe("generateSitemaps()", () => {
  it("returns 8 shards (ids 0–7)", () => {
    const shards = generateSitemaps();
    expect(shards).toHaveLength(8);
    expect(shards.map((s) => s.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});

// ── Per-shard non-empty checks ────────────────────────────────────────────────

describe("each shard is non-empty", () => {
  // DB-driven shards (2, 3) can be legitimately empty under the empty-DB test mock
  // (shard 3 is purely articles/scenarios/reports/alerts). Their functions are
  // validated by the union + category tests below; here we assert the statically
  // seeded shards always emit URLs. Matches `staticShards` in the coverage test.
  const staticShards = [0, 1, 4, 5, 6, 7];
  for (const id of staticShards) {
    it(`shard ${id} emits at least 1 URL`, async () => {
      const urls = await getShardUrls(id);
      expect(urls.length).toBeGreaterThan(0);
    });
  }
});

// ── Category coverage ─────────────────────────────────────────────────────────

describe("shard 0 — static pages", () => {
  it("contains the homepage", async () => {
    const urls = await getShardUrls(0);
    expect(urls).toContain("https://invest.com.au");
  });

  it("contains key high-priority hubs", async () => {
    const urls = new Set(await getShardUrls(0));
    for (const path of ["/compare", "/versus", "/quiz", "/etfs", "/insurance", "/tax"]) {
      expect(urls.has(`https://invest.com.au${path}`)).toBe(true);
    }
  });

  it("does NOT duplicate the homepage (empty string → /)", async () => {
    const urls = await getShardUrls(0);
    const homepageUrls = urls.filter((u) => u === "https://invest.com.au");
    expect(homepageUrls.length).toBe(1);
  });
});

describe("shard 1 — localized pages", () => {
  it("contains canonical /foreign-investment", async () => {
    const urls = await getShardUrls(1);
    expect(urls).toContain("https://invest.com.au/foreign-investment");
  });

  it("contains zh and ko locale variants", async () => {
    const urls = new Set(await getShardUrls(1));
    expect(urls.has("https://invest.com.au/zh/foreign-investment")).toBe(true);
    expect(urls.has("https://invest.com.au/ko/foreign-investment")).toBe(true);
  });

  it("contains ar locale variant for UAE", async () => {
    const urls = new Set(await getShardUrls(1));
    expect(urls.has("https://invest.com.au/ar/foreign-investment/united-arab-emirates")).toBe(true);
  });
});

describe("shard 2 — brokers, best, versus, invest-categories", () => {
  it("contains the /best hub", async () => {
    const urls = await getShardUrls(2);
    expect(urls).toContain("https://invest.com.au/best");
  });

  it("contains the /best-for hub", async () => {
    const urls = await getShardUrls(2);
    expect(urls).toContain("https://invest.com.au/best-for");
  });

  it("does NOT contain /invest hub (that lives in shard 0)", async () => {
    // Static invest pages are in shard 0; shard 2 only has category/subcategory/listing pages
    const urls = new Set(await getShardUrls(2));
    expect(urls.has("https://invest.com.au/invest")).toBe(false);
  });
});

describe("shard 3 — articles, scenarios, reports, alerts", () => {
  it("returns an array (empty with mocked DB)", async () => {
    const urls = await getShardUrls(3);
    // With empty DB stub, article/scenario/etc. pages return empty arrays
    expect(Array.isArray(urls)).toBe(true);
  });
});

describe("shard 4 — advisors", () => {
  it("contains advisor type pages", async () => {
    const urls = new Set(await getShardUrls(4));
    expect(urls.has("https://invest.com.au/advisors/financial-planners")).toBe(true);
    expect(urls.has("https://invest.com.au/advisors/smsf-accountants")).toBe(true);
  });

  it("contains advisor type × state pages", async () => {
    const urls = new Set(await getShardUrls(4));
    expect(urls.has("https://invest.com.au/advisors/financial-planners/nsw")).toBe(true);
  });

  it("contains advisor type × city pages", async () => {
    const urls = new Set(await getShardUrls(4));
    expect(urls.has("https://invest.com.au/advisors/financial-planners/sydney")).toBe(true);
  });

  it("contains find-advisor location pages", async () => {
    const urls = new Set(await getShardUrls(4));
    expect(urls.has("https://invest.com.au/find-advisor/sydney")).toBe(true);
    expect(urls.has("https://invest.com.au/find-advisor/sydney-financial-planner")).toBe(true);
  });
});

describe("shard 5 — glossary, how-to, marketplace", () => {
  it("includes the /marketplace hub", async () => {
    const urls = await getShardUrls(5);
    expect(urls).toContain("https://invest.com.au/marketplace");
  });

  it("includes /marketplace/[intent] for every enabled intent", async () => {
    const urls = new Set(await getShardUrls(5));
    for (const intent of TEST_INTENTS) {
      expect(urls.has(`https://invest.com.au/marketplace/${intent.slug}`)).toBe(true);
    }
  });

  it("includes /marketplace/[intent]/[state] for every (intent × state) combo", async () => {
    const urls = new Set(await getShardUrls(5));
    for (const intent of TEST_INTENTS) {
      for (const state of AUSTRALIAN_STATES) {
        expect(
          urls.has(`https://invest.com.au/marketplace/${intent.slug}/${state.slug}`),
        ).toBe(true);
      }
    }
  });

  it("emits correct marketplace URL count", async () => {
    const urls = await getShardUrls(5);
    const marketplaceCount = urls.filter((u) => u.includes("/marketplace")).length;
    const expected =
      1 + TEST_INTENTS.length + TEST_INTENTS.length * AUSTRALIAN_STATES.length;
    expect(marketplaceCount).toBe(expected);
  });
});

describe("shard 6 — property, suburb, investing-cities", () => {
  it("contains property hub pages", async () => {
    const urls = new Set(await getShardUrls(6));
    expect(urls.has("https://invest.com.au/property")).toBe(true);
    expect(urls.has("https://invest.com.au/property/listings")).toBe(true);
    expect(urls.has("https://invest.com.au/property/suburbs")).toBe(true);
  });

  it("contains /investing hub", async () => {
    const urls = await getShardUrls(6);
    expect(urls).toContain("https://invest.com.au/investing");
  });
});

describe("shard 7 — misc (quotes, newsletter, grants, events, afsl)", () => {
  it("contains quote category×state pages", async () => {
    const urls = new Set(await getShardUrls(7));
    expect(urls.has("https://invest.com.au/quotes/by/financial_planner/nsw")).toBe(true);
  });

  it("contains /newsletter archive page", async () => {
    const urls = await getShardUrls(7);
    expect(urls).toContain("https://invest.com.au/newsletter");
  });

  it("contains grants industry pages", async () => {
    const urls = new Set(await getShardUrls(7));
    expect(urls.has("https://invest.com.au/grants/tech")).toBe(true);
  });

  it("contains /investing-for hub and occupation pages", async () => {
    const urls = new Set(await getShardUrls(7));
    expect(urls.has("https://invest.com.au/investing-for")).toBe(true);
    expect(urls.has("https://invest.com.au/investing-for/doctor")).toBe(true);
  });
});

// ── Cross-shard union checks ───────────────────────────────────────────────────

describe("union of all shards", () => {
  it("includes /marketplace", async () => {
    const urls = await getAllUrls();
    expect(urls).toContain("https://invest.com.au/marketplace");
  });

  it("includes /testimonials (shard 0)", async () => {
    const urls = await getAllUrls();
    expect(urls).toContain("https://invest.com.au/testimonials");
  });

  it("includes /feed (shard 0)", async () => {
    const urls = await getAllUrls();
    expect(urls).toContain("https://invest.com.au/feed");
  });

  it("includes /tax-return (shard 0)", async () => {
    const urls = await getAllUrls();
    expect(urls).toContain("https://invest.com.au/tax-return");
  });

  it("does NOT include any /account/* paths (noindex)", async () => {
    const urls = await getAllUrls();
    const accountUrls = urls.filter((u) => u.includes("/account/"));
    expect(accountUrls).toEqual([]);
  });

  it("does NOT include any /admin/* paths", async () => {
    const urls = await getAllUrls();
    const adminUrls = urls.filter((u) => u.includes("/admin/") || u.endsWith("/admin"));
    expect(adminUrls).toEqual([]);
  });

  it("has no duplicate URLs across shards", async () => {
    const urls = await getAllUrls();
    const urlSet = new Set(urls);
    // Build a map of URL → count for a helpful failure message
    const dupeMap: Record<string, number> = {};
    for (const url of urls) {
      dupeMap[url] = (dupeMap[url] ?? 0) + 1;
    }
    const dupes = Object.entries(dupeMap)
      .filter(([, count]) => count > 1)
      .map(([url]) => url);
    expect(dupes, `duplicate URLs across shards: ${JSON.stringify(dupes)}`).toEqual([]);
    expect(urls.length).toBe(urlSet.size);
  });

  it("covers all expected category shards (0-7 all return entries or empty for DB-driven)", async () => {
    const shardIds = generateSitemaps().map((s) => s.id);
    const results = await Promise.all(
      shardIds.map(async (id) => ({ id, count: (await sitemap({ id })).length })),
    );
    // Shards with purely static content must be non-empty
    const staticShards = [0, 1, 4, 5, 6, 7];
    for (const { id, count } of results) {
      if (staticShards.includes(id)) {
        expect(count, `shard ${id} should be non-empty`).toBeGreaterThan(0);
      }
    }
  });
});
