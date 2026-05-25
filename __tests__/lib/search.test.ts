import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Hoist mock functions before module imports
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

// glossary-extended is a large server-only file; provide a minimal stub
vi.mock("@/lib/glossary-extended", () => ({
  FULL_GLOSSARY_ENTRIES: [
    {
      term: "CGT",
      slug: "cgt",
      definition: "Capital Gains Tax — tax on profit from selling an asset.",
      category: "Tax",
    },
    {
      term: "ETF",
      slug: "etf",
      definition: "Exchange-Traded Fund — a basket of securities traded on the ASX.",
      category: "General",
    },
    {
      term: "SMSF",
      slug: "smsf",
      definition: "Self-Managed Super Fund — a super fund you control.",
      category: "Super",
    },
  ],
}));

import {
  sanitiseQuery,
  searchTools,
  searchGlossaryStatic,
  searchAll,
  TOOLS_INDEX,
} from "@/lib/search";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a Supabase-style chainable query builder that resolves to `result`. */
function makeChain(result: { data: unknown[] | null; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "select", "eq", "textSearch", "order", "limit"]) {
    chain[m] = vi.fn(() => chain);
  }
  // Make it thenable so `await supabase.from(...)....limit(n)` works
  chain.then = (resolve: (v: typeof result) => void) => {
    resolve(result);
    return Promise.resolve(result);
  };
  return chain;
}

// ─── sanitiseQuery ────────────────────────────────────────────────────────────

describe("sanitiseQuery", () => {
  it("strips control characters", () => {
    expect(sanitiseQuery("hello\x00world\x1f")).toBe("helloworld");
  });

  it("truncates at 200 chars", () => {
    const long = "a".repeat(250);
    expect(sanitiseQuery(long)).toHaveLength(200);
  });

  it("trims whitespace", () => {
    expect(sanitiseQuery("  ETF  ")).toBe("ETF");
  });

  it("passes through normal text unchanged", () => {
    expect(sanitiseQuery("CommSec ETF")).toBe("CommSec ETF");
  });
});

// ─── searchTools ──────────────────────────────────────────────────────────────

describe("searchTools", () => {
  it("matches by title (case-insensitive)", () => {
    const hits = searchTools("mortgage");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]).toBeDefined();
    expect(hits[0]!.title.toLowerCase()).toContain("mortgage");
  });

  it("matches by description", () => {
    const hits = searchTools("capital gains");
    // CGT Calculator has "capital gains" in description
    expect(hits.some((h) => h.slug === "cgt-calculator")).toBe(true);
  });

  it("matches by slug", () => {
    const hits = searchTools("cgt");
    expect(hits.some((h) => h.slug === "cgt-calculator")).toBe(true);
  });

  it("respects the cap", () => {
    const hits = searchTools("calculator", 2);
    expect(hits).toHaveLength(2);
  });

  it("returns empty array for unrecognised query", () => {
    expect(searchTools("zzzzzznonexistent")).toHaveLength(0);
  });

  it("TOOLS_INDEX has no duplicate slugs", () => {
    const slugs = TOOLS_INDEX.map((t) => t.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });
});

// ─── searchGlossaryStatic ─────────────────────────────────────────────────────

describe("searchGlossaryStatic", () => {
  it("matches term names", () => {
    const hits = searchGlossaryStatic("CGT");
    expect(hits[0]).toBeDefined();
    expect(hits[0]!.term).toBe("CGT");
  });

  it("matches definition text", () => {
    const hits = searchGlossaryStatic("basket of securities");
    expect(hits.some((h) => h.slug === "etf")).toBe(true);
  });

  it("term matches rank ahead of definition-only matches", () => {
    // "fund" appears in both SMSF (term) and ETF (definition "basket... fund")
    const hits = searchGlossaryStatic("fund");
    const smsf = hits.findIndex((h) => h.slug === "smsf");
    const etf = hits.findIndex((h) => h.slug === "etf");
    // SMSF has "Fund" in its term — should appear before ETF definition match
    if (smsf !== -1 && etf !== -1) {
      expect(smsf).toBeLessThan(etf);
    }
  });

  it("respects the cap", () => {
    const hits = searchGlossaryStatic("a", 2);
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it("returns empty array for no match", () => {
    expect(searchGlossaryStatic("zzzznonexistent")).toHaveLength(0);
  });
});

// ─── searchAll ────────────────────────────────────────────────────────────────

describe("searchAll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries all three DB tables in parallel and merges results", async () => {
    const brokerChain = makeChain({
      data: [{ slug: "commsec", name: "CommSec", tagline: "Australia's #1 broker" }],
      error: null,
    });
    const advisorChain = makeChain({
      data: [{ slug: "jane-smith", name: "Jane Smith", type: "financial-planner", location_display: "Sydney NSW", firm_name: "Smith Wealth" }],
      error: null,
    });
    const articleChain = makeChain({
      data: [{ slug: "cgt-guide", title: "CGT Guide", excerpt: "How CGT works.", category: "tax" }],
      error: null,
    });

    mockFrom
      .mockReturnValueOnce(brokerChain)
      .mockReturnValueOnce(advisorChain)
      .mockReturnValueOnce(articleChain);

    const results = await searchAll("CommSec CGT");

    expect(results.brokers).toHaveLength(1);
    expect(results.brokers[0]).toBeDefined();
    expect(results.brokers[0]!.slug).toBe("commsec");
    expect(results.advisors).toHaveLength(1);
    expect(results.articles).toHaveLength(1);
    expect(results.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("also returns static glossary and tools", async () => {
    const emptyChain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(emptyChain);

    const results = await searchAll("CGT calculator");

    // CGT should match glossary (stub) and cgt-calculator tool
    expect(results.glossary.length).toBeGreaterThan(0);
    expect(results.tools.some((t) => t.slug === "cgt-calculator")).toBe(true);
  });

  it("returns empty arrays when DB queries error", async () => {
    const errorChain = makeChain({ data: null, error: { message: "DB error" } });
    mockFrom.mockReturnValue(errorChain);

    const results = await searchAll("commsec");

    expect(results.brokers).toEqual([]);
    expect(results.advisors).toEqual([]);
    expect(results.articles).toEqual([]);
  });

  it("honours per-category caps", async () => {
    const manyBrokers = Array.from({ length: 10 }, (_, i) => ({
      slug: `broker-${i}`,
      name: `Broker ${i}`,
      tagline: null,
    }));
    const brokerChain = makeChain({ data: manyBrokers, error: null });
    const emptyChain = makeChain({ data: [], error: null });

    mockFrom
      .mockReturnValueOnce(brokerChain)
      .mockReturnValueOnce(emptyChain)
      .mockReturnValueOnce(emptyChain);

    // DB respects the limit we pass — simulate by returning the capped set
    const results = await searchAll("broker", { brokers: 3 });
    // The chain mock returns all 10; actual capping is done by Supabase .limit()
    // We just verify the chain received .limit(3) — checked via spy
    expect(brokerChain.limit).toHaveBeenCalledWith(3);
  });

  it("includes durationMs in the response", async () => {
    const emptyChain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(emptyChain);

    const results = await searchAll("test");
    expect(typeof results.durationMs).toBe("number");
    expect(results.durationMs).toBeGreaterThanOrEqual(0);
  });
});
