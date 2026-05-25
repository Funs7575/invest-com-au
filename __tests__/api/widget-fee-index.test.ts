import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, OPTIONS } from "@/app/api/widget/fee-index/route";

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
  const url = new URL("http://localhost/api/widget/fee-index");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const BROKER = {
  name: "Stake",
  slug: "stake",
  asx_fee: "$3.00",
  asx_fee_value: 3.0,
  us_fee: "$0.00",
  us_fee_value: 0.0,
  fx_rate: "0.6%",
  rating: 4.5,
  logo_url: null,
  color: "#7c3aed",
  icon: "S",
};

const BROKER_B = {
  name: "CommSec",
  slug: "commsec",
  asx_fee: "$9.95",
  asx_fee_value: 9.95,
  us_fee: "$19.95",
  us_fee_value: 19.95,
  fx_rate: "0.7%",
  rating: 4.2,
  logo_url: null,
  color: "#000000",
  icon: "C",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/widget/fee-index", () => {
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

  it("sets 1h public Cache-Control", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toMatch(/public/);
    expect(cc).toMatch(/max-age=3600/);
    expect(cc).toMatch(/s-maxage=3600/);
  });

  it("embeds broker data as JSON in JS payload", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("Stake");
    expect(body).toContain("stake");
    expect(body).toContain("BROKERS");
  });

  it("includes Shadow DOM setup", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("attachShadow");
    expect(body).toContain("data-invest-fee-index-widget");
  });

  it("includes factual fee data disclaimer", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("General information only");
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

  it("dark theme when ?theme=dark", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ theme: "dark" }));
    const body = await res.text();
    expect(body).toContain('"dark"');
  });

  it("uses rating sort when ?sort=rating (ascending:false)", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ sort: "rating" }));
    const orderCalls = (chain.order as ReturnType<typeof vi.fn>).mock.calls;
    expect(orderCalls.some((c) => c[0] === "rating")).toBe(true);
  });

  it("uses asx_fee_value sort by default", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    const orderCalls = (chain.order as ReturnType<typeof vi.fn>).mock.calls;
    expect(orderCalls.some((c) => c[0] === "asx_fee_value")).toBe(true);
  });

  it("uses us_fee_value sort when ?sort=us_fee", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ sort: "us_fee" }));
    const orderCalls = (chain.order as ReturnType<typeof vi.fn>).mock.calls;
    expect(orderCalls.some((c) => c[0] === "us_fee_value")).toBe(true);
  });

  it("clamps limit to 20 when ?limit=50", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "50" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(20);
  });

  it("uses default limit 10 when absent", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(10);
  });

  it("handles empty broker result gracefully", async () => {
    mockFrom.mockReturnValue(makeChain([]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("BROKERS = []");
  });

  it("includes both broker names in payload when two brokers provided", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER, BROKER_B]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("Stake");
    expect(body).toContain("CommSec");
  });

  it("queries only non-crypto active brokers", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "status" && c[1] === "active")).toBe(true);
    expect(eqCalls.some((c) => c[0] === "is_crypto" && c[1] === false)).toBe(true);
  });

  it("includes a link to invest.com.au/fee-index", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("fee-index");
  });

  // ─── Partner ref tests ────────────────────────────────────────────────────

  it("threads ?ref= partner ID through outbound links when provided", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ ref: "finblog" }));
    const body = await res.text();
    expect(body).toContain("ref=finblog");
    expect(body).toContain("source=fee-index-widget");
    expect(body).toContain("REF_PARAM");
  });

  it("uses default widget ref when ?ref= is absent", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("ref=widget");
    expect(body).toContain("source=fee-index-embed");
  });

  it("URL-encodes the partner ref value", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ ref: "fin blog" }));
    const body = await res.text();
    expect(body).toContain("fin%20blog");
  });
});

describe("OPTIONS /api/widget/fee-index", () => {
  it("returns 204 with CORS headers for preflight", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
    expect(res.headers.get("Vary")).toBe("Origin");
  });
});
