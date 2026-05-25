import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockFrom })),
}));

// CURRENT_YEAR must be hoisted so the mock factory can reference it before
// the module is loaded. Using vi.hoisted to avoid the vi.mock hoisting trap.
const { mockCurrentYear } = vi.hoisted(() => ({ mockCurrentYear: { value: 2026 } }));

vi.mock("@/lib/seo", () => ({
  get CURRENT_YEAR() {
    return mockCurrentYear.value;
  },
  absoluteUrl: (p: string) => `https://invest.com.au${p}`,
  breadcrumbJsonLd: () => ({}),
  SITE_NAME: "invest.com.au",
}));

import { GET, OPTIONS } from "@/app/api/widget/health-scores/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(data: unknown[] = []) {
  const c: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit", "in"];
  for (const m of methods) c[m] = vi.fn(() => c);
  c.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve(resolve({ data, error: null }));
  return c;
}

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/widget/health-scores");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const BROKER = {
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
};

const BROKER_CRYPTO = {
  name: "CoinSpot",
  slug: "coinspot",
  rating: 4.2,
  regulated_by: "AUSTRAC",
  year_founded: 2013,
  headquarters: "Melbourne, Australia",
  chess_sponsored: false,
  is_crypto: true,
  platform_type: "crypto_exchange",
  logo_url: null,
  color: "#f59e0b",
  icon: "CS",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/widget/health-scores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentYear.value = 2026;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("returns 200 application/javascript with CORS headers", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    expect(res.headers.get("Vary")).toBe("Origin");
  });

  it("sets 24h public Cache-Control", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toMatch(/public/);
    expect(cc).toMatch(/max-age=86400/);
    expect(cc).toMatch(/s-maxage=86400/);
  });

  it("embeds scored broker data in the JS payload", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("Stake");
    expect(body).toContain("stake");
    expect(body).toContain("BROKERS");
    expect(body).toContain("safety_score");
    expect(body).toContain("safety_label");
  });

  it("includes Shadow DOM setup", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("attachShadow");
    expect(body).toContain("data-invest-health-widget");
  });

  it("includes general-advice disclaimer", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("General information only");
    expect(body).toContain("DISCLAIMER");
  });

  it("computes Strong label for well-regulated CHESS broker (Stake: ASIC+AFSL+CHESS+AU HQ+9yr+4.7 = ≥80)", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    // Stake with ASIC(25)+AFSL(10)+CHESS(20)+AU HQ(5)+9yr(10)+rating(10) = 80 → Strong
    expect(body).toContain("Strong");
  });

  it("computes lower score for crypto broker without ASIC/AFSL/CHESS", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER_CRYPTO]));
    const res = await GET(makeReq());
    const body = await res.text();
    // CoinSpot: AUSTRAC does not contain "asic"/"afsl", no CHESS.
    // AU HQ(5) + 13yr(15 since 2013 = ≥10yr) + rating(8) = 28 → Caution
    // The safety_label in the serialised JSON should be "Caution" not "Strong".
    // We parse the BROKERS JSON blob from the body to assert the label precisely.
    // Use indexOf/substring to avoid the dotAll /s flag (only valid for es2018+)
    const prefix = "var BROKERS = ";
    const start = body.indexOf(prefix);
    const match = start !== -1 ? [null, body.substring(start + prefix.length, body.indexOf(";\n", start + prefix.length))] : null;
    expect(match).toBeTruthy();
    if (match) {
      const brokers = JSON.parse(match[1]) as { safety_label: string }[];
      expect(brokers[0]?.safety_label).not.toBe("Strong");
    }
  });

  it("calls .in() with slugs when ?brokers= provided", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ brokers: "stake,commsec" }));
    expect((chain.in as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([
      "slug", ["stake", "commsec"],
    ]);
  });

  it("does not call .in() when no brokers param", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    expect((chain.in as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("clamps limit to 10 when ?limit=15", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "15" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(10);
  });

  it("uses default limit 5 when absent", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(5);
  });

  it("dark theme when ?theme=dark", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ theme: "dark" }));
    const body = await res.text();
    expect(body).toContain('"dark"');
  });

  it("handles empty broker result gracefully", async () => {
    mockFrom.mockReturnValue(makeChain([]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("BROKERS = []");
  });

  it("queries only active brokers via anon client", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "status" && c[1] === "active")).toBe(true);
  });

  it("includes a link to invest.com.au/health-scores", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("health-scores");
  });

  // ─── Score-breakdown fields ───────────────────────────────────────────────

  it("embeds score_breakdown with expected keys", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("score_breakdown");
    expect(body).toContain('"asic"');
    expect(body).toContain('"afsl"');
    expect(body).toContain('"chess"');
  });

  // ─── Partner ref tests ────────────────────────────────────────────────────

  it("threads ?ref= partner ID through outbound links when provided", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ ref: "finweekly" }));
    const body = await res.text();
    expect(body).toContain("ref=finweekly");
    expect(body).toContain("source=health-scores-widget");
    expect(body).toContain("REF_PARAM");
  });

  it("uses default widget ref when ?ref= is absent", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("ref=widget");
    expect(body).toContain("source=health-scores-embed");
  });

  it("URL-encodes the partner ref value", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ ref: "fin weekly" }));
    const body = await res.text();
    expect(body).toContain("fin%20weekly");
  });
});

describe("OPTIONS /api/widget/health-scores", () => {
  it("returns 204 with CORS headers for preflight", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
    expect(res.headers.get("Vary")).toBe("Origin");
  });
});
