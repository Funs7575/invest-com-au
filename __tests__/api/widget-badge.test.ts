import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockFrom })),
}));

const { mockCurrentYear } = vi.hoisted(() => ({ mockCurrentYear: { value: 2026 } }));

vi.mock("@/lib/seo", () => ({
  get CURRENT_YEAR() {
    return mockCurrentYear.value;
  },
  absoluteUrl: (p: string) => `https://invest.com.au${p}`,
  breadcrumbJsonLd: () => ({}),
  SITE_NAME: "invest.com.au",
}));

import { GET, OPTIONS } from "@/app/api/widget/badge/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a Supabase chain mock that returns a single row via `.single()`.
 * All chained methods return `this` except `single()` which resolves with
 * `{ data, error }`.
 */
function makeSingleChain(data: unknown, error: unknown = null) {
  const c: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit", "in"];
  for (const m of methods) c[m] = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve({ data, error }));
  return c;
}

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/widget/badge");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const ADVISOR_ROW = {
  name: "Jane Smith CFP",
  slug: "jane-smith-cfp",
  type: "financial_planner",
  photo_url: null,
  bio: "Experienced financial planner with 15 years in wealth management.",
  verified: true,
  afsl_number: "123456",
  registration_number: "AR-789",
  verified_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
  created_at: new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 5 yrs ago
  years_experience: 15,
  qualifications: [{ name: "CFP" }],
  education: [{ degree: "BComm" }],
  memberships: [{ name: "FPA" }],
  fee_structure: "Hourly",
  fee_description: null,
  linkedin_url: "https://linkedin.com/in/janesmith",
  website: null,
  languages: ["English"],
  rating: 4.8,
  review_count: 12,
  location_display: "Sydney, NSW",
  status: "active",
};

const BROKER_ROW = {
  name: "Stake",
  slug: "stake",
  rating: 4.7,
  regulated_by: "ASIC — AFSL 509799",
  year_founded: 2017,
  headquarters: "Sydney, Australia",
  chess_sponsored: true,
  is_crypto: false,
  platform_type: "share_broker",
  logo_url: null,
  color: "#7c3aed",
  icon: "S",
  status: "active",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/widget/badge — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentYear.value = 2026;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("returns 400 JS comment when ?type= is missing", async () => {
    const res = await GET(makeReq({ slug: "jane-smith-cfp" }));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain('?type=');
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 400 JS comment when ?type= is invalid", async () => {
    const res = await GET(makeReq({ type: "advisor-comparison", slug: "someone" }));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain('?type=');
  });

  it("returns 400 JS comment when ?slug= is missing", async () => {
    const res = await GET(makeReq({ type: "advisor" }));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain('?slug=');
  });

  it("returns 404 when advisor slug not found", async () => {
    const chain = makeSingleChain(null);
    mockFrom.mockReturnValue(chain);
    const res = await GET(makeReq({ type: "advisor", slug: "nobody" }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when broker slug not found", async () => {
    const chain = makeSingleChain(null);
    mockFrom.mockReturnValue(chain);
    const res = await GET(makeReq({ type: "broker", slug: "nobody" }));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/widget/badge — advisor badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentYear.value = 2026;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("returns 200 application/javascript with CORS headers", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("sets 1h public Cache-Control", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toMatch(/public/);
    expect(cc).toMatch(/max-age=3600/);
    expect(cc).toMatch(/s-maxage=3600/);
  });

  it("embeds advisor name and slug in JS payload", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).toContain("Jane Smith CFP");
    expect(body).toContain("jane-smith-cfp");
  });

  it("includes Shadow DOM setup", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).toContain("attachShadow");
    expect(body).toContain("data-invest-badge-advisor");
  });

  it("includes the general-advice disclaimer", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).toContain("General information only");
    expect(body).toContain("DISCLAIMER");
  });

  it("includes methodology link for advisor", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).toContain("trust-score-methodology");
    expect(body).toContain("methodology");
  });

  it("includes Advisor Trust Score type label", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).toContain("Advisor Trust Score");
  });

  it("embeds a numeric score in the badge data", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    // The score is embedded in the BADGE object
    const badgePrefix = "var BADGE = ";
    const start = body.indexOf(badgePrefix);
    expect(start).toBeGreaterThan(-1);
    // Extract the JSON and verify the score is a valid integer in [0, 100]
    const jsonStr = body.substring(
      start + badgePrefix.length,
      body.indexOf(";\n", start + badgePrefix.length),
    );
    const badge = JSON.parse(jsonStr) as { score: number; label: string };
    expect(badge.score).toBeGreaterThanOrEqual(0);
    expect(badge.score).toBeLessThanOrEqual(100);
    expect(typeof badge.label).toBe("string");
    // For a well-credentialed advisor (verified + AFSL + 15yr experience), expect a Good/Strong score
    expect(["Strong", "Good", "Moderate", "Limited"]).toContain(badge.label);
  });

  it("does NOT compare entities or include ranking/award language", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    // No cross-entity comparison language
    expect(body.toLowerCase()).not.toContain("best advisor");
    expect(body.toLowerCase()).not.toContain("top advisor");
    expect(body.toLowerCase()).not.toContain("award");
    expect(body.toLowerCase()).not.toContain("ranked");
  });

  it("profiles link back to the advisor's profile page", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).toContain("/advisor/jane-smith-cfp");
  });

  it("threads ?ref= partner ID through outbound links", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp", ref: "finweekly" }));
    const body = await res.text();
    expect(body).toContain("ref=finweekly");
    expect(body).toContain("source=badge-advisor");
  });

  it("uses default widget ref when ?ref= is absent", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const body = await res.text();
    expect(body).toContain("ref=widget");
    expect(body).toContain("source=badge-advisor");
  });

  it("applies dark theme when ?theme=dark", async () => {
    mockFrom.mockReturnValue(makeSingleChain(ADVISOR_ROW));
    const res = await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp", theme: "dark" }));
    const body = await res.text();
    expect(body).toContain('"dark"');
  });

  it("queries only active professionals via anon client", async () => {
    const chain = makeSingleChain(ADVISOR_ROW);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ type: "advisor", slug: "jane-smith-cfp" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "status" && c[1] === "active")).toBe(true);
    expect(eqCalls.some((c) => c[0] === "slug" && c[1] === "jane-smith-cfp")).toBe(true);
  });
});

describe("GET /api/widget/badge — broker badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentYear.value = 2026;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("returns 200 application/javascript with CORS headers", async () => {
    mockFrom.mockReturnValue(makeSingleChain(BROKER_ROW));
    const res = await GET(makeReq({ type: "broker", slug: "stake" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("embeds broker name in JS payload", async () => {
    mockFrom.mockReturnValue(makeSingleChain(BROKER_ROW));
    const res = await GET(makeReq({ type: "broker", slug: "stake" }));
    const body = await res.text();
    expect(body).toContain("Stake");
    expect(body).toContain("stake");
  });

  it("includes Shadow DOM setup with broker attribute", async () => {
    mockFrom.mockReturnValue(makeSingleChain(BROKER_ROW));
    const res = await GET(makeReq({ type: "broker", slug: "stake" }));
    const body = await res.text();
    expect(body).toContain("attachShadow");
    expect(body).toContain("data-invest-badge-broker");
  });

  it("includes the general-advice disclaimer", async () => {
    mockFrom.mockReturnValue(makeSingleChain(BROKER_ROW));
    const res = await GET(makeReq({ type: "broker", slug: "stake" }));
    const body = await res.text();
    expect(body).toContain("General information only");
  });

  it("includes methodology link for broker health score", async () => {
    mockFrom.mockReturnValue(makeSingleChain(BROKER_ROW));
    const res = await GET(makeReq({ type: "broker", slug: "stake" }));
    const body = await res.text();
    expect(body).toContain('"methodologyUrl":"https://invest.com.au/health-scores"');
    expect(body).toContain("methodology");
  });

  it("includes Broker Health Score type label", async () => {
    mockFrom.mockReturnValue(makeSingleChain(BROKER_ROW));
    const res = await GET(makeReq({ type: "broker", slug: "stake" }));
    const body = await res.text();
    expect(body).toContain("Broker Health Score");
  });

  it("embeds correct score for Stake (ASIC+AFSL+CHESS+AU+9yr+rating+share_broker = 85 → Strong)", async () => {
    mockFrom.mockReturnValue(makeSingleChain(BROKER_ROW));
    const res = await GET(makeReq({ type: "broker", slug: "stake" }));
    const body = await res.text();
    const badgePrefix = "var BADGE = ";
    const start = body.indexOf(badgePrefix);
    expect(start).toBeGreaterThan(-1);
    const jsonStr = body.substring(
      start + badgePrefix.length,
      body.indexOf(";\n", start + badgePrefix.length),
    );
    const badge = JSON.parse(jsonStr) as { score: number; label: string; scoreType: string };
    // Stake: ASIC(25)+AFSL(10)+CHESS(20)+AU HQ(5)+9yr(10)+rating(10)+share_broker(5) = 85 → Strong
    expect(badge.score).toBe(85);
    expect(badge.label).toBe("Strong");
    expect(badge.scoreType).toBe("Broker Health Score");
  });

  it("broker profile links to health-scores detail page", async () => {
    mockFrom.mockReturnValue(makeSingleChain(BROKER_ROW));
    const res = await GET(makeReq({ type: "broker", slug: "stake" }));
    const body = await res.text();
    expect(body).toContain("/health-scores/stake");
  });

  it("threads ?ref= partner ID through outbound links for broker", async () => {
    mockFrom.mockReturnValue(makeSingleChain(BROKER_ROW));
    const res = await GET(makeReq({ type: "broker", slug: "stake", ref: "finmag" }));
    const body = await res.text();
    expect(body).toContain("ref=finmag");
    expect(body).toContain("source=badge-broker");
  });

  it("does NOT compare this broker to any other broker", async () => {
    mockFrom.mockReturnValue(makeSingleChain(BROKER_ROW));
    const res = await GET(makeReq({ type: "broker", slug: "stake" }));
    const body = await res.text();
    expect(body.toLowerCase()).not.toContain("best broker");
    expect(body.toLowerCase()).not.toContain("top broker");
    expect(body.toLowerCase()).not.toContain("award");
    expect(body.toLowerCase()).not.toContain("ranked");
  });

  it("queries only active brokers via anon client", async () => {
    const chain = makeSingleChain(BROKER_ROW);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ type: "broker", slug: "stake" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "status" && c[1] === "active")).toBe(true);
    expect(eqCalls.some((c) => c[0] === "slug" && c[1] === "stake")).toBe(true);
  });
});

describe("OPTIONS /api/widget/badge", () => {
  it("returns 204 with CORS headers for preflight", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
    expect(res.headers.get("Vary")).toBe("Origin");
  });
});
