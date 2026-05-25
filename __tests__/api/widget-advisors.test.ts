import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, OPTIONS } from "@/app/api/widget/advisors/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeChain(data: unknown[] = []) {
  const c: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit"];
  for (const m of methods) c[m] = vi.fn(() => c);
  c.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve(resolve({ data, error: null }));
  return c;
}

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/widget/advisors");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

const ADVISOR = {
  id: 1,
  slug: "alice-smith",
  name: "Alice Smith",
  firm_name: "Smith Financial",
  type: "financial-planner",
  location_state: "NSW",
  location_suburb: "Sydney",
  location_display: "Sydney, NSW",
  photo_url: null,
  fee_structure: "fee-for-service",
  initial_consultation_free: true,
  rating: 4.7,
  review_count: 42,
  verified: true,
  offer_text: "Free first session",
  offer_active: true,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/widget/advisors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("returns 200 application/javascript with CORS headers", async () => {
    mockFrom.mockReturnValue(makeChain([ADVISOR]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    expect(res.headers.get("Vary")).toBe("Origin");
    expect(res.headers.get("Cache-Control")).toMatch(/public/);
  });

  it("sets 1h public Cache-Control", async () => {
    mockFrom.mockReturnValue(makeChain([ADVISOR]));
    const res = await GET(makeReq());
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toMatch(/max-age=3600/);
    expect(cc).toMatch(/s-maxage=3600/);
  });

  it("embeds advisor data as JSON in JS payload", async () => {
    mockFrom.mockReturnValue(makeChain([ADVISOR]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("Alice Smith");
    expect(body).toContain("alice-smith");
    expect(body).toContain("ADVISORS");
  });

  it("includes Shadow DOM setup in the JS", async () => {
    mockFrom.mockReturnValue(makeChain([ADVISOR]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("attachShadow");
    expect(body).toContain("data-invest-advisors-widget");
  });

  it("includes general-advice disclaimer", async () => {
    mockFrom.mockReturnValue(makeChain([ADVISOR]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("General information only");
    expect(body).toContain("Not financial advice");
    expect(body).toContain("DISCLAIMER");
  });

  it("includes a link back to invest.com.au", async () => {
    mockFrom.mockReturnValue(makeChain([ADVISOR]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("invest.com.au");
  });

  it("filters by type when ?type= provided", async () => {
    const chain = makeChain([ADVISOR]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ type: "financial-planner" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "type" && c[1] === "financial-planner")).toBe(true);
  });

  it("filters by state when ?state= provided", async () => {
    const chain = makeChain([ADVISOR]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ state: "NSW" }));
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "location_state" && c[1] === "NSW")).toBe(true);
  });

  it("does not add type filter when ?type= is absent", async () => {
    const chain = makeChain([ADVISOR]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "type")).toBe(false);
  });

  it("clamps limit to 10 when ?limit=20", async () => {
    const chain = makeChain([ADVISOR]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "20" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(10);
  });

  it("clamps limit to 1 when ?limit=0", async () => {
    const chain = makeChain([ADVISOR]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "0" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(1);
  });

  it("uses default limit 5 when ?limit= is absent", async () => {
    const chain = makeChain([ADVISOR]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(5);
  });

  it("dark theme when ?theme=dark", async () => {
    mockFrom.mockReturnValue(makeChain([ADVISOR]));
    const res = await GET(makeReq({ theme: "dark" }));
    const body = await res.text();
    expect(body).toContain('"dark"');
  });

  it("handles empty advisor result gracefully", async () => {
    mockFrom.mockReturnValue(makeChain([]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("ADVISORS = []");
  });

  // ─── Partner ref tests ────────────────────────────────────────────────────

  it("threads ?ref= partner ID through outbound links when provided", async () => {
    mockFrom.mockReturnValue(makeChain([ADVISOR]));
    const res = await GET(makeReq({ ref: "moneymag" }));
    const body = await res.text();
    expect(body).toContain("ref=moneymag");
    expect(body).toContain("source=advisor-widget");
    expect(body).toContain("REF_PARAM");
  });

  it("uses default widget ref when ?ref= is absent", async () => {
    mockFrom.mockReturnValue(makeChain([ADVISOR]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("ref=widget");
    expect(body).toContain("source=advisor-embed");
  });

  it("URL-encodes the partner ref value", async () => {
    mockFrom.mockReturnValue(makeChain([ADVISOR]));
    const res = await GET(makeReq({ ref: "my partner" }));
    const body = await res.text();
    // The raw space should be encoded
    expect(body).toContain("my%20partner");
  });

  it("queries only active professionals", async () => {
    const chain = makeChain([ADVISOR]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq());
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "status" && c[1] === "active")).toBe(true);
  });
});

describe("OPTIONS /api/widget/advisors", () => {
  it("returns 204 with CORS headers for preflight", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
    expect(res.headers.get("Vary")).toBe("Origin");
  });
});
