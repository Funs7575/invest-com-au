import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────
// Must be hoisted so they are available inside the vi.mock factory bodies.

const { mockIsAllowed, mockRequireAdvisorSession, mockResolveFirmAdminContext, mockAdminFrom } =
  vi.hoisted(() => ({
    mockIsAllowed: vi.fn().mockResolvedValue(true),
    mockRequireAdvisorSession: vi.fn(),
    mockResolveFirmAdminContext: vi.fn(),
    mockAdminFrom: vi.fn(),
  }));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "ip:test",
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/firm-billing", () => ({
  resolveFirmAdminContext: (...args: unknown[]) => mockResolveFirmAdminContext(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

// ── Route under test (imported after all mocks) ───────────────────────────────
import { GET } from "@/app/api/firm-portal/lead-quality/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Chainable Supabase builder stub — every method returns itself and awaiting
 * the chain anywhere resolves to `result`. Use mockReturnValueOnce to script
 * multiple sequential queries in one test.
 */
function makeBuilder(result: { data?: unknown; error?: unknown; count?: number | null } = {}) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "eq", "in", "gte", "order", "limit", "insert", "update",
    "maybeSingle", "single",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({ data: result.data ?? null, error: result.error ?? null, count: result.count ?? null }),
    );
  return b;
}

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/firm-portal/lead-quality", { method: "GET" });
}

const FIRM_CTX = { advisorId: 10, firmId: 5 };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/firm-portal/lead-quality — auth + rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many/i);
  });

  it("returns 401 when there is no advisor session", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/unauthorized/i);
  });

  it("returns 403 when caller is not a firm admin", async () => {
    mockRequireAdvisorSession.mockResolvedValueOnce(10);
    mockResolveFirmAdminContext.mockResolvedValueOnce(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/firm admin/i);
  });
});

describe("GET /api/firm-portal/lead-quality — DB error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(10);
    mockResolveFirmAdminContext.mockResolvedValue(FIRM_CTX);
  });

  it("returns 500 when the members query fails", async () => {
    mockAdminFrom.mockReturnValue(
      makeBuilder({ data: null, error: { message: "db down" } }),
    );
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to load/i);
  });

  it("returns 500 when the leads query fails", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      // first call: professionals (success with one member)
      if (call === 1) return makeBuilder({ data: [{ id: 99 }], error: null });
      // second call: professional_leads (error)
      return makeBuilder({ data: null, error: { message: "leads query boom" } });
    });
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/failed to load/i);
  });
});

describe("GET /api/firm-portal/lead-quality — success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(10);
    mockResolveFirmAdminContext.mockResolvedValue(FIRM_CTX);
  });

  it("returns empty-firm payload when no active members exist", async () => {
    // professionals returns empty array
    mockAdminFrom.mockReturnValue(makeBuilder({ data: [], error: null }));
    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.firmId).toBe(FIRM_CTX.firmId);
    expect(body.totalLeads).toBe(0);
    expect(body.funnel).toEqual([]);
    expect(body.tierBreakdown).toEqual([]);
    expect(body.conversionRate).toBeNull();
  });

  it("returns 200 with computed analytics for a firm with leads", async () => {
    const leads = [
      { pipeline_stage: "won", lead_tier: "exclusive", quality_score: 95, utm_source: "google" },
      { pipeline_stage: "won", lead_tier: "qualified", quality_score: 75, utm_source: "google" },
      { pipeline_stage: "new", lead_tier: "standard", quality_score: 30, utm_source: null },
      { pipeline_stage: "lost", lead_tier: "standard", quality_score: null, utm_source: "direct" },
    ];

    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) {
        // professionals: two active members
        return makeBuilder({ data: [{ id: 11 }, { id: 12 }], error: null });
      }
      if (call === 2) {
        // professional_leads
        return makeBuilder({ data: leads, error: null });
      }
      // benchmark queries — advisor_firms + subsequent batched queries
      return makeBuilder({ data: [], error: null });
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.firmId).toBe(FIRM_CTX.firmId);
    expect(body.totalLeads).toBe(4);
    expect(body.memberCount).toBe(2);
    expect(body.wonCount).toBe(2);
    expect(body.lostCount).toBe(1);

    // conversionRate = 2/4 = 50%
    expect(body.conversionRate).toBe(50);

    // Cache-Control header
    expect(res.headers.get("Cache-Control")).toContain("private");
    expect(res.headers.get("Cache-Control")).toContain("max-age=900");

    // windowDays present
    expect(body.windowDays).toBe(90);

    // tier breakdown contains standard, qualified, exclusive
    const tiers = body.tierBreakdown as Array<{ tier: string; count: number }>;
    expect(tiers.find((t) => t.tier === "exclusive")?.count).toBe(1);
    expect(tiers.find((t) => t.tier === "qualified")?.count).toBe(1);
    expect(tiers.find((t) => t.tier === "standard")?.count).toBe(2);

    // quality distribution
    const dist = body.qualityDistribution as Array<{ bucket: string; count: number }>;
    expect(dist.find((d) => d.bucket === "excellent")?.count).toBe(1);
    expect(dist.find((d) => d.bucket === "good")?.count).toBe(1);
    expect(dist.find((d) => d.bucket === "poor")?.count).toBe(1);
    expect(dist.find((d) => d.bucket === "unscored")?.count).toBe(1);

    // topSources: google should be first (2 occurrences)
    const sources = body.topSources as Array<{ source: string; count: number }>;
    expect(sources[0]?.source).toBe("google");
    expect(sources[0]?.count).toBe(2);

    // benchmarks object present (may be null values since < 3 firms)
    expect(body.benchmarks).toBeDefined();
  });

  it("returns benchmarks when >= 3 firms each have leads", async () => {
    // Script: professionals → leads → advisor_firms → batch members → firm lead counts (3×)
    const members = [{ id: 11 }];
    const leads = [
      { pipeline_stage: "won", lead_tier: "exclusive", quality_score: 90, utm_source: "google" },
    ];

    // For benchmark: 3 firms with 1 member each and 1 won lead each
    const firmRows = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const batchMemberRows = [
      { id: 101, firm_id: 1 },
      { id: 102, firm_id: 2 },
      { id: 103, firm_id: 3 },
    ];
    const firmLeadRows = [
      { pipeline_stage: "won" },
    ];

    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder({ data: members, error: null });       // own members
      if (call === 2) return makeBuilder({ data: leads, error: null });          // own leads
      if (call === 3) return makeBuilder({ data: firmRows, error: null });       // advisor_firms
      if (call === 4) return makeBuilder({ data: batchMemberRows, error: null }); // batch professionals
      // 3 firm-lead queries (one per firm in firmMemberMap)
      return makeBuilder({ data: firmLeadRows, error: null });
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.benchmarks.medianConversionRate).not.toBeNull();
    expect(typeof body.benchmarks.medianConversionRate).toBe("number");
  });

  it("survives a benchmark computation error gracefully (best-effort)", async () => {
    let call = 0;
    mockAdminFrom.mockImplementation(() => {
      call += 1;
      if (call === 1) return makeBuilder({ data: [{ id: 11 }], error: null });
      if (call === 2) return makeBuilder({ data: [{ pipeline_stage: "won", lead_tier: null, quality_score: null, utm_source: null }], error: null });
      // advisor_firms throws to trigger catch in benchmark block
      if (call === 3) {
        const b = makeBuilder({ data: null, error: null });
        // Override then to throw
        (b as { then: unknown }).then = () => { throw new Error("benchmark explode"); };
        return b;
      }
      return makeBuilder({ data: [], error: null });
    });

    const res = await GET(makeGet());
    // Should still succeed — benchmarks are best-effort
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.benchmarks.medianConversionRate).toBeNull();
  });
});
