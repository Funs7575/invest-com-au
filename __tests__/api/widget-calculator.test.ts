import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, OPTIONS } from "@/app/api/widget/calculator/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(data: unknown[] = []) {
  const c: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit", "not"];
  for (const m of methods) c[m] = vi.fn(() => c);
  c.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve(resolve({ data, error: null }));
  return c;
}

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/widget/calculator");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const BROKER = {
  name: "Stake",
  slug: "stake",
  asx_fee_value: 3,
  us_fee_value: 0,
  fx_rate: 0.6,
  logo_url: null,
  color: "#7c3aed",
  icon: "S",
  affiliate_url: "https://stake.com.au?ref=invest",
};

const BROKER_B = {
  name: "CommSec",
  slug: "commsec",
  asx_fee_value: 9.5,
  us_fee_value: 19.95,
  fx_rate: 0.7,
  logo_url: null,
  color: "#000000",
  icon: "C",
  affiliate_url: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/widget/calculator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("sets 1h public Cache-Control for CDN caching", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toMatch(/public/);
    expect(cc).toMatch(/max-age=3600/);
    expect(cc).toMatch(/s-maxage=3600/);
  });

  it("embeds broker data as JSON in the JS payload", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("Stake");
    expect(body).toContain("stake");
    expect(body).toContain("BROKERS");
  });

  it("includes the general-advice disclaimer text", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("General information only");
    expect(body).toContain("Not financial advice");
    expect(body).toContain("DISCLAIMER");
  });

  it("defaults to ASX market", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain('"asx"');
  });

  it("sets US market when ?market=us", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ market: "us" }));
    const body = await res.text();
    expect(body).toContain('"us"');
  });

  it("ignores invalid market param and falls back to asx", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ market: "crypto" }));
    const body = await res.text();
    expect(body).toContain('"asx"');
  });

  it("sets dark theme when ?theme=dark", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ theme: "dark" }));
    const body = await res.text();
    expect(body).toContain('"dark"');
  });

  it("defaults to light theme", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain('"light"');
  });

  it("clamps limit to 10 when ?limit=99", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "99" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(10);
  });

  it("clamps limit to 1 when ?limit=0", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "0" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(1);
  });

  it("applies default amount 5000 when ?amount= is absent", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("DEFAULT_AMOUNT");
    expect(body).toContain("5000");
  });

  it("accepts custom ?amount= value", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ amount: "25000" }));
    const body = await res.text();
    expect(body).toContain("25000");
  });

  it("caps ?amount= at 1000000", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ amount: "9999999" }));
    const body = await res.text();
    // 9999999 should not appear; 1000000 (the cap) should
    expect(body).toContain("1000000");
    expect(body).not.toContain("9999999");
  });

  it("handles empty broker result without throwing", async () => {
    mockFrom.mockReturnValue(makeChain([]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("BROKERS = []");
  });

  it("queries only non-crypto active brokers", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "status" && c[1] === "active")).toBe(true);
    expect(eqCalls.some((c) => c[0] === "is_crypto" && c[1] === false)).toBe(true);
  });

  it("includes calc logic (computeResults) and Shadow DOM setup in the JS", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("attachShadow");
    expect(body).toContain("computeResults");
    expect(body).toContain("totalCost");
  });

  it("includes a link back to invest.com.au in the JS payload", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("invest.com.au");
  });

  it("renders sorted cheapest-first logic in JS (references totalCost sort)", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER, BROKER_B]));
    const res = await GET(makeReq());
    const body = await res.text();
    // The sort comparator is embedded in the JS
    expect(body).toContain("totalCost");
    // Both brokers are embedded
    expect(body).toContain("CommSec");
  });

  it("uses the affiliate_url when present in broker data", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    // The JS references affiliate_url to build the CTA link
    expect(body).toContain("affiliate_url");
  });
});

describe("OPTIONS /api/widget/calculator", () => {
  it("returns 204 with CORS headers for preflight", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
    expect(res.headers.get("Vary")).toBe("Origin");
  });
});
