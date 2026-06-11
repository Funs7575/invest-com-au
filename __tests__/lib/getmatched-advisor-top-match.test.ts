import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFlag, mockFrom, mockComputeTopMatches, mockFetchStats, mockRankByOutcomes } =
  vi.hoisted(() => ({
    mockFlag: vi.fn(),
    mockFrom: vi.fn(),
    mockComputeTopMatches: vi.fn(),
    mockFetchStats: vi.fn(),
    mockRankByOutcomes: vi.fn(),
  }));

vi.mock("@/lib/feature-flags", () => ({ isFlagEnabled: mockFlag }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mockFrom }) }));
vi.mock("@/lib/getmatched/top-match", () => ({ computeTopMatches: mockComputeTopMatches }));
vi.mock("@/lib/advisor-match-ranking", () => ({
  fetchAdvisorOutcomeStats: mockFetchStats,
  rankByOutcomes: mockRankByOutcomes,
}));

import { topMatchesForRoute, computeTopAdvisors } from "@/lib/getmatched/advisor-top-match";
import type { RouteType } from "@/lib/getmatched/types";

// P3 ladder rule 0 (user agency): a named type now always claims the lead, so
// the named tax agent here allocates exactly as stated.
const ADVISOR_ROW = {
  id: 1, slug: "jane-tax", name: "Jane Tax", firm_name: "Acme",
  type: "tax_agent", photo_url: "p.jpg", rating: 4.8, review_count: 21,
  location_display: "Sydney", location_state: "NSW",
  specialties: ["Crypto Tax"], verified: true,
  fee_description: "From $300/hr",
  initial_consultation_free: true,
};

// Lower-rated second candidate: the pure engine ranks Jane (4.8 × 21 reviews,
// matching specialty) ahead of Tom — P9 tests reorder them via outcome stats.
const ADVISOR_ROW_2 = {
  ...ADVISOR_ROW,
  id: 2, slug: "tom-tax", name: "Tom Tax",
  rating: 4.0, review_count: 3, specialties: [],
  location_display: "Brisbane", fee_description: "From $250/hr",
};

function chain(rows: unknown[], error: { message: string } | null = null) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order"]) q[m] = vi.fn(() => q);
  q.limit = vi.fn(() => Promise.resolve({ data: rows, error }));
  return q;
}

const resolved = (route: RouteType) => ({ route, vertical: null });

describe("topMatchesForRoute (Decision Engine P2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => chain([ADVISOR_ROW]));
    // P9 default: no outcome history → pure engine order, blending skipped.
    mockFetchStats.mockResolvedValue([]);
  });

  it("compare route delegates to the broker top-match (behaviour unchanged)", async () => {
    mockComputeTopMatches.mockResolvedValue([{ kind: "broker", slug: "b" }]);
    const out = await topMatchesForRoute({}, resolved("compare"));
    expect(mockComputeTopMatches).toHaveBeenCalled();
    expect(out[0]).toMatchObject({ kind: "broker" });
    expect(mockFlag).not.toHaveBeenCalled();
  });

  it("non-advisor routes return [] without touching the flag or DB", async () => {
    expect(await topMatchesForRoute({}, resolved("guide"))).toEqual([]);
    expect(mockFlag).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("non-advisor route with a platforms hero lane returns broker matches", async () => {
    mockComputeTopMatches.mockResolvedValue([{ kind: "broker", slug: "b" }]);
    const out = await topMatchesForRoute({}, resolved("guide"), 3, {
      hero: "platforms",
      secondary: [],
    });
    expect(mockComputeTopMatches).toHaveBeenCalled();
    expect(out[0]).toMatchObject({ kind: "broker" });
  });

  it("non-advisor route with platforms as a secondary lane returns broker matches", async () => {
    mockComputeTopMatches.mockResolvedValue([{ kind: "broker", slug: "b" }]);
    const out = await topMatchesForRoute({}, resolved("browse"), 3, {
      hero: "listings",
      secondary: ["platforms"],
    });
    expect(mockComputeTopMatches).toHaveBeenCalled();
    expect(out[0]).toMatchObject({ kind: "broker" });
  });

  it("non-advisor route with lanes but no platforms lane still returns []", async () => {
    const out = await topMatchesForRoute({}, resolved("guide"), 3, {
      hero: "education",
      secondary: ["brief"],
    });
    expect(out).toEqual([]);
    expect(mockComputeTopMatches).not.toHaveBeenCalled();
  });

  it("advisor route with flag OFF returns [] (dark launch — zero live change)", async () => {
    mockFlag.mockResolvedValue(false);
    expect(await topMatchesForRoute({ intent: "help" }, resolved("individual"))).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("advisor route with flag ON returns real ranked advisors in TopMatch shape", async () => {
    mockFlag.mockResolvedValue(true);
    const out = await topMatchesForRoute(
      { intent: "help", help_sub: "tax_agent", help_preference: "individual" },
      resolved("individual"),
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "advisor",
      slug: "jane-tax",
      cta_href: "/advisor/jane-tax",
      tier: 1,
      rating: 4.8,
      rating_count: 21,
    });
    // The "why" is attribute-driven (her own matching specialty), not generic.
    expect(out[0]!.one_line_why).toBe("Specialises in Crypto Tax");
    // P7 comparison fields ride along, display-safe only.
    expect(out[0]).toMatchObject({
      location_display: "Sydney",
      fee_description: "From $300/hr",
      specialties_preview: ["Crypto Tax"],
    });
  });

  it("fail-soft: flag read or DB error never breaks resolve", async () => {
    mockFlag.mockRejectedValue(new Error("flags down"));
    expect(await topMatchesForRoute({ intent: "help" }, resolved("individual"))).toEqual([]);

    mockFlag.mockResolvedValue(true);
    mockFrom.mockImplementation(() => chain([], { message: "db down" }));
    expect(await topMatchesForRoute({ intent: "help" }, resolved("individual"))).toEqual([]);
  });

  it("computeTopAdvisors filters by the allocated single advisor type", async () => {
    const q = chain([ADVISOR_ROW]);
    mockFrom.mockImplementation(() => q);
    await computeTopAdvisors({ intent: "help", help_sub: "tax_agent", help_preference: "individual" });
    expect(q.eq).toHaveBeenCalledWith("type", "tax_agent");
  });
});

describe("computeTopAdvisors outcome learning (Decision Engine P9)", () => {
  const TAX_ANSWERS = { intent: "help", help_sub: "tax_agent", help_preference: "individual" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => chain([ADVISOR_ROW, ADVISOR_ROW_2]));
    mockFetchStats.mockResolvedValue([]);
  });

  it("no outcome history → rankByOutcomes never consulted, engine order intact", async () => {
    const out = await computeTopAdvisors(TAX_ANSWERS);
    expect(out.map((m) => m.slug)).toEqual(["jane-tax", "tom-tax"]);
    expect(mockRankByOutcomes).not.toHaveBeenCalled();
  });

  it("real engagement history re-orders the lane via the shared rankByOutcomes", async () => {
    mockFetchStats.mockResolvedValue([{ advisorId: 2, matchCount: 12, engagementCount: 9 }]);
    // Shared ranker says Tom's historical engagement outweighs the fit gap.
    mockRankByOutcomes.mockReturnValue([{ id: 2 }, { id: 1 }]);

    const out = await computeTopAdvisors(TAX_ANSWERS);

    expect(out.map((m) => m.slug)).toEqual(["tom-tax", "jane-tax"]);
    // Tier follows the blended order — the lane's #1 is genuinely #1.
    expect(out[0]).toMatchObject({ tier: 1, ref_id: 2 });
    expect(out[1]).toMatchObject({ tier: 2, ref_id: 1 });
    // The ranker received the engine's candidates (id + matchScore), not rows.
    const [cands] = mockRankByOutcomes.mock.calls[0]!;
    expect(cands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 1, matchScore: expect.any(Number) }),
        expect.objectContaining({ id: 2, matchScore: expect.any(Number) }),
      ]),
    );
  });

  it("fail-soft: outcome-stats errors never break the lane (engine order kept)", async () => {
    mockFetchStats.mockRejectedValue(new Error("stats query down"));
    const out = await computeTopAdvisors(TAX_ANSWERS);
    expect(out.map((m) => m.slug)).toEqual(["jane-tax", "tom-tax"]);
  });
});
