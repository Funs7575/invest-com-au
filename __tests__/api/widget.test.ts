import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, OPTIONS } from "@/app/api/widget/route";

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
  const url = new URL("http://localhost/api/widget");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const BROKER = {
  name: "Stake", slug: "stake", asx_fee: "$3", us_fee: "$0", fx_rate: "0.6%",
  rating: 4.5, chess_sponsored: true, platform_type: "broker", logo_url: null,
  color: "#7c3aed", icon: "S", deal: null, deal_text: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/widget", () => {
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
    expect(res.headers.get("Cache-Control")).toMatch(/public/);
  });

  it("embeds broker data as JSON in JS payload", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("Stake");
    expect(body).toContain("stake");
    expect(body).toContain("BROKERS");
  });

  it("uses table layout by default", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain('"table"');
  });

  it("compact layout when ?type=compact", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ type: "compact" }));
    const body = await res.text();
    expect(body).toContain('"compact"');
  });

  it("dark theme when ?theme=dark", async () => {
    mockFrom.mockReturnValue(makeChain([BROKER]));
    const res = await GET(makeReq({ theme: "dark" }));
    const body = await res.text();
    expect(body).toContain('"dark"');
  });

  it("clamps limit to 10 when ?limit=15", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "15" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(10);
  });

  it("clamps limit to 1 when ?limit=-3 (negative, but truthy so not defaulted)", async () => {
    const chain = makeChain([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "-3" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(1);
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

  it("handles empty broker result gracefully", async () => {
    mockFrom.mockReturnValue(makeChain([]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("BROKERS = []");
  });
});

describe("OPTIONS /api/widget", () => {
  it("returns 204 with CORS headers for preflight", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });
});
