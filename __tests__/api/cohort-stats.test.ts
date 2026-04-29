import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockServerFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: (...args: unknown[]) => mockServerFrom(...args) }),
}));

import { GET } from "@/app/api/cohort-stats/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/cohort-stats");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function makeChainBuilder(result: { data: unknown; error: unknown }) {
  const b: Record<string, unknown> = {};
  b.select = vi.fn(() => b);
  b.eq = vi.fn(() => b);
  b.in = vi.fn(() => b);
  b.then = vi.fn((cb: (v: typeof result) => void) => { cb(result); return Promise.resolve(result); });
  return b;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/cohort-stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when experience or range is missing", async () => {
    const res = await GET(makeGet({ experience: "beginner" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/experience|range/i);
  });

  it("returns 400 when both params are missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
  });

  it("returns sufficient_data:false when fewer than 50 results", async () => {
    // 3 rows — below the 50 threshold
    const rows = Array(3).fill({ top_match_slug: "stake" });
    mockServerFrom.mockReturnValue(makeChainBuilder({ data: rows, error: null }));

    const res = await GET(makeGet({ experience: "beginner", range: "small" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sufficient_data).toBe(false);
    expect(data.total_count).toBe(3);
    expect(data.broker_distribution).toEqual([]);
  });

  it("returns broker distribution when 50+ results", async () => {
    const quizRows = [
      ...Array(30).fill({ top_match_slug: "stake" }),
      ...Array(25).fill({ top_match_slug: "commsec" }),
    ];
    const brokerRows = [
      { slug: "stake", name: "Stake" },
      { slug: "commsec", name: "CommSec" },
    ];

    mockServerFrom
      .mockReturnValueOnce(makeChainBuilder({ data: quizRows, error: null }))
      .mockReturnValueOnce(makeChainBuilder({ data: brokerRows, error: null }));

    const res = await GET(makeGet({ experience: "beginner", range: "medium" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sufficient_data).toBe(true);
    expect(data.total_count).toBe(55);
    expect(data.broker_distribution[0].broker_name).toBe("Stake");
    expect(data.broker_distribution[0].count).toBe(30);
  });

  it("includes optional interest filter when provided", async () => {
    const rows = Array(3).fill({ top_match_slug: "stake" });
    const builder = makeChainBuilder({ data: rows, error: null });
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ experience: "beginner", range: "medium", interest: "grow" }));
    expect(builder.eq).toHaveBeenCalledWith("trading_interest", "grow");
  });

  it("does not call trading_interest eq when interest is absent", async () => {
    const rows = Array(3).fill({ top_match_slug: "stake" });
    const builder = makeChainBuilder({ data: rows, error: null });
    mockServerFrom.mockReturnValue(builder);

    await GET(makeGet({ experience: "beginner", range: "medium" }));
    // Should only be called for experience_level and investment_range
    const eqCalls = (builder.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c: unknown[]) => c[0] === "trading_interest")).toBe(false);
  });

  it("returns 500 when DB query fails", async () => {
    mockServerFrom.mockReturnValue(makeChainBuilder({ data: null, error: { message: "DB error" } }));
    const res = await GET(makeGet({ experience: "beginner", range: "medium" }));
    expect(res.status).toBe(500);
  });

  it("builds correct cohort_label from params", async () => {
    const rows = Array(3).fill({ top_match_slug: null });
    mockServerFrom.mockReturnValue(makeChainBuilder({ data: rows, error: null }));

    const res = await GET(makeGet({ experience: "intermediate", range: "large", interest: "income" }));
    const data = await res.json();
    expect(data.cohort_label).toContain("Intermediate");
    expect(data.cohort_label).toContain("$50k-$100k");
    expect(data.cohort_label).toContain("Income");
  });
});
