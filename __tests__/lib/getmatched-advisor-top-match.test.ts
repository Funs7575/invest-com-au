import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFlag, mockFrom, mockComputeTopMatches } = vi.hoisted(() => ({
  mockFlag: vi.fn(),
  mockFrom: vi.fn(),
  mockComputeTopMatches: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({ isFlagEnabled: mockFlag }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: mockFrom }) }));
vi.mock("@/lib/getmatched/top-match", () => ({ computeTopMatches: mockComputeTopMatches }));

import { topMatchesForRoute, computeTopAdvisors } from "@/lib/getmatched/advisor-top-match";
import type { RouteType } from "@/lib/getmatched/types";

// P3 ladder rule 0 (user agency): a named type now always claims the lead, so
// the named tax agent here allocates exactly as stated.
const ADVISOR_ROW = {
  id: 1, slug: "jane-tax", name: "Jane Tax", firm_name: "Acme",
  type: "tax_agent", photo_url: "p.jpg", rating: 4.8, review_count: 21,
  location_display: "Sydney", location_state: "NSW",
  specialties: ["Crypto Tax"], verified: true,
  initial_consultation_free: true,
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
