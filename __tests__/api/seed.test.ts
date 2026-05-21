import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetUser, mockFrom } = vi.hoisted(() => {
  function makeBuilder(result: unknown = { data: [], error: null }) {
    const b: Record<string, unknown> = {};
    for (const m of [
      "select", "insert", "update", "upsert", "delete",
      "eq", "neq", "gt", "gte", "lt", "lte", "in", "is",
      "not", "or", "order", "limit", "range", "single",
      "maybeSingle", "filter", "contains",
    ]) {
      b[m] = vi.fn(() => b);
    }
    b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
    return b;
  }
  return {
    mockGetUser: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ data: { user: { id: "u1", email: "finn@invest.com.au" } }, error: null })),
    mockFrom: vi.fn(() => makeBuilder({ data: [], error: null })),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Mock site-data.json with minimal structure
vi.mock("@/data/site-data.json", () => ({
  default: {
    brokers: [
      {
        name: "Test Broker",
        slug: "test-broker",
        color: "#000",
        icon: "icon.png",
        ctaText: "Open Account",
        tagline: "Test tagline",
        asxFee: "$5",
        asxFeeValue: 5,
        usFee: "$0",
        usFeeValue: 0,
        fxRate: 0.5,
        chessSponsored: true,
        inactivityFee: false,
        paymentMethods: [],
        smsfSupport: false,
        minDeposit: 0,
        platforms: [],
        pros: [],
        cons: [],
        affiliateUrl: "https://example.com",
        rating: 4,
        layer: 1,
      },
    ],
    articles: [
      {
        title: "Test Article",
        slug: "test-article",
        excerpt: "Test excerpt",
        category: "investing",
        tags: [],
        date: "2026-01-01",
        readTime: 5,
        evergreen: true,
        relatedBrokers: [],
        relatedCalc: null,
        sections: [],
      },
    ],
    scenarios: [
      {
        slug: "test-scenario",
        title: "Test Scenario",
        heroTitle: "Hero Title",
        icon: "icon",
        problem: "Problem",
        solution: "Solution",
        brokers: [],
        considerations: [],
      },
    ],
  },
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["finn@invest.com.au"],
}));

import { POST } from "@/app/api/seed/route";


describe("/api/seed", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "finn@invest.com.au" } }, error: null });
    mockFrom.mockImplementation(() => {
      function makeBuilder() {
        const b: Record<string, unknown> = {};
        for (const m of ["select","upsert","insert","update","delete","eq","single","maybeSingle","or","in","order","limit","range","filter","contains","neq","gt","gte","lt","lte","not","is"]) {
          b[m] = vi.fn(() => b);
        }
        b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb({ data: [], error: null }));
        return b;
      }
      return makeBuilder();
    });
  });

  it("returns 403 in production environment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await POST();
    vi.unstubAllEnvs();
    expect(res.status).toBe(403);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST();
    expect([401, 403]).toContain(res.status);
  });

  it("returns 401 when user is not admin", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "regular@example.com" } }, error: null });
    const res = await POST();
    expect(res.status).toBe(401);
  });
});
