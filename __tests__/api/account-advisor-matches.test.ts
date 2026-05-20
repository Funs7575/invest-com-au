import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn(async () => ({
  data: { user: { id: "u1", email: "user@example.com" } },
  error: null,
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));

const mockGetInvestorProfile = vi.fn(async () => null);

vi.mock("@/lib/investor-profiles", () => ({
  getInvestorProfile: (...args: unknown[]) => mockGetInvestorProfile(...args),
}));

import { GET } from "@/app/api/account/advisor-matches/route";

describe("/api/account/advisor-matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } }, error: null });
    mockGetInvestorProfile.mockResolvedValue(null);
    // Reset from to return advisors list
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: [], error: null });
      return b;
    });
  });

  it("rejects unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns advisors list for authenticated user with no profile", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("advisors");
    expect(json).toHaveProperty("match_basis");
    expect(Array.isArray(json.advisors)).toBe(true);
  });

  it("returns 500 when query fails", async () => {
    mockFrom.mockImplementation(() => {
      const b = makeBuilder({ data: null, error: { message: "db error" } });
      return b;
    });
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("applies FHB filter when profile.isFhb is true", async () => {
    mockGetInvestorProfile.mockResolvedValue({ isFhb: true, budgetBand: null });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.match_basis).toBe("First home buyer specialists");
  });

  it("applies pre-retiree filter when profile.isPreRetiree is true", async () => {
    mockGetInvestorProfile.mockResolvedValue({ isPreRetiree: true, budgetBand: null });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.match_basis).toBe("Retirement planning specialists");
  });
});
