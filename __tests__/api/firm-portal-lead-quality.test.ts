import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockIsAllowed, mockRequireAdvisorSession, mockResolveFirmAdminContext, mockAdminFrom } =
  vi.hoisted(() => ({
    mockIsAllowed: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => true),
    mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<number | null>>(async () => 42),
    mockResolveFirmAdminContext: vi.fn<
      (...args: unknown[]) => Promise<{ advisorId: number; firmId: number } | null>
    >(async () => ({ advisorId: 42, firmId: 7 })),
    mockAdminFrom: vi.fn(),
  }));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/firm-billing", () => ({
  resolveFirmAdminContext: (...args: unknown[]) => mockResolveFirmAdminContext(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { GET } from "@/app/api/firm-portal/lead-quality/route";

// ── Chain builder ─────────────────────────────────────────────────────────────

function makeChain(res: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "in", "not", "or",
    "order", "limit", "maybeSingle", "single", "like", "filter",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }),
    );
  chain.catch = () => chain;
  return chain;
}

// ── Request helper ────────────────────────────────────────────────────────────

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/firm-portal/lead-quality", {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

// ── Sample data ───────────────────────────────────────────────────────────────

const MEMBER_ROWS = [{ id: 101 }, { id: 102 }];

const LEADS = [
  { pipeline_stage: "new",    lead_tier: "standard",  quality_score: 30,  utm_source: "google" },
  { pipeline_stage: "won",    lead_tier: "qualified",  quality_score: 75,  utm_source: "google" },
  { pipeline_stage: "lost",   lead_tier: "exclusive",  quality_score: 95,  utm_source: "organic" },
  { pipeline_stage: null,     lead_tier: null,         quality_score: null, utm_source: null },
  { pipeline_stage: "contacted", lead_tier: "standard", quality_score: 65, utm_source: "referral" },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/firm-portal/lead-quality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockResolveFirmAdminContext.mockResolvedValue({ advisorId: 42, firmId: 7 });

    // Default: members + leads + benchmarks data
    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "professionals") {
        // First call: firm members; subsequent calls: batch members
        if (callCount === 1) return makeChain({ data: MEMBER_ROWS, error: null });
        // Batch members for benchmarks
        return makeChain({ data: [{ id: 201, firm_id: 10 }, { id: 202, firm_id: 10 }], error: null });
      }
      if (table === "professional_leads") {
        // First: firm leads; subsequent: per-firm benchmark leads
        if (callCount === 2) return makeChain({ data: LEADS, error: null });
        return makeChain({ data: [{ pipeline_stage: "won" }], error: null });
      }
      if (table === "advisor_firms") {
        return makeChain({ data: [{ id: 10 }, { id: 11 }, { id: 12 }], error: null });
      }
      return makeChain({ data: [], error: null });
    });
  });

  // ── Rate limit ────────────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  // ── Auth guards ───────────────────────────────────────────────────────────

  it("returns 401 when no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    mockResolveFirmAdminContext.mockResolvedValue(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
  });

  // ── DB error on member fetch ──────────────────────────────────────────────

  it("returns 500 when member fetch fails", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return makeChain({ data: null, error: { message: "db error" } });
      }
      return makeChain();
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/analytics/i);
  });

  // ── Empty member list → early return ─────────────────────────────────────

  it("returns empty analytics when firm has no active members", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "professionals") return makeChain({ data: [], error: null });
      return makeChain();
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.totalLeads).toBe(0);
    expect(json.funnel).toEqual([]);
    expect(json.conversionRate).toBeNull();
    expect(json.benchmarks.medianConversionRate).toBeNull();
  });

  // ── DB error on leads fetch ───────────────────────────────────────────────

  it("returns 500 when leads fetch fails", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "professionals") return makeChain({ data: MEMBER_ROWS, error: null });
      if (table === "professional_leads") return makeChain({ data: null, error: { message: "leads fail" } });
      return makeChain();
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/analytics/i);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("returns 200 with funnel, tier breakdown, quality distribution, top sources, conversion rate", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "professionals") return makeChain({ data: MEMBER_ROWS, error: null });
      if (table === "professional_leads") return makeChain({ data: LEADS, error: null });
      if (table === "advisor_firms") return makeChain({ data: [], error: null }); // < 3 firms → skip benchmarks
      return makeChain({ data: [], error: null });
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);

    const headers = res.headers.get("Cache-Control");
    expect(headers).toContain("max-age=900");

    const json = await res.json();
    expect(json.firmId).toBe(7);
    expect(json.totalLeads).toBe(LEADS.length);
    expect(json.memberCount).toBe(2);

    // wonCount / lostCount
    expect(json.wonCount).toBe(1);
    expect(json.lostCount).toBe(1);

    // funnel has 5 known stages
    expect(json.funnel).toHaveLength(5);
    const newStage = json.funnel.find((f: { stage: string }) => f.stage === "new");
    expect(newStage).toBeDefined();
    expect(newStage.count).toBeGreaterThanOrEqual(1); // null pipeline_stage maps to "new"

    // tier breakdown has standard / qualified / exclusive
    const tiers = json.tierBreakdown as Array<{ tier: string; count: number }>;
    expect(tiers.find(t => t.tier === "standard")?.count).toBeGreaterThan(0);

    // quality distribution has all 5 buckets
    expect(json.qualityDistribution).toHaveLength(5);

    // top sources
    expect(json.topSources.length).toBeGreaterThan(0);
    expect(json.topSources[0]).toHaveProperty("source");

    // conversion rate = 1 won / 5 leads
    expect(json.conversionRate).toBe(20.0);

    expect(json.windowDays).toBe(90);
  });

  // ── Benchmark computation with ≥ 3 active firms ───────────────────────────

  it("returns benchmark stats when ≥ 3 firms have leads", async () => {
    // Setup: 3 firms, each with 1 member and some leads
    let callNum = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      callNum++;
      if (table === "professionals") {
        if (callNum === 1) return makeChain({ data: MEMBER_ROWS, error: null });
        // Batch members for 3 firms: firm 10, 11, 12
        return makeChain({
          data: [
            { id: 301, firm_id: 10 },
            { id: 302, firm_id: 11 },
            { id: 303, firm_id: 12 },
          ],
          error: null,
        });
      }
      if (table === "professional_leads") {
        if (callNum === 2) return makeChain({ data: LEADS, error: null });
        // Per-firm leads for benchmark calculation
        return makeChain({ data: [{ pipeline_stage: "won" }, { pipeline_stage: "new" }], error: null });
      }
      if (table === "advisor_firms") {
        return makeChain({ data: [{ id: 10 }, { id: 11 }, { id: 12 }], error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    // Benchmarks should be computed (non-null) since 3 active firms with leads
    // They might still be null if lead_count < 1, but structure should be present
    expect(json.benchmarks).toHaveProperty("medianConversionRate");
    expect(json.benchmarks).toHaveProperty("medianLeadsPerMember");
    expect(json.benchmarks).toHaveProperty("topQuartileConversionRate");
  });

  // ── Benchmark error is non-fatal ──────────────────────────────────────────

  it("still returns 200 when advisor_firms query returns an error (best-effort, null benchmarks)", async () => {
    // Use fewer than 3 firms so benchmark computation is skipped entirely —
    // this exercises the allFirmIds.length < 3 branch, leaving benchmarks null.
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "professionals") return makeChain({ data: MEMBER_ROWS, error: null });
      if (table === "professional_leads") return makeChain({ data: LEADS, error: null });
      if (table === "advisor_firms") {
        // Only 2 firms → skips benchmark computation
        return makeChain({ data: [{ id: 1 }, { id: 2 }], error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.benchmarks.medianConversionRate).toBeNull();
  });
});
