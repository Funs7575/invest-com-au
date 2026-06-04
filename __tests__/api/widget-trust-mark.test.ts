import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("@/lib/supabase/static", () => ({
  createStaticClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/afsl-register", () => ({
  normaliseAfslNumber: (s: string) => s.replace(/\D/g, ""),
}));

import { GET, OPTIONS } from "@/app/api/widget/trust-mark/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Each call to mockFrom() returns a fresh single-result chain. Pass a queue so
// successive .from() calls (entity lookup, then afsl_register lookup) resolve
// to different data.
function singleResult(data: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve({ data, error: null }));
  return c;
}

function makeReq(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/widget/trust-mark");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/widget/trust-mark — validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("returns 400 JS comment when ?type is neither advisor nor firm", async () => {
    const res = await GET(makeReq({ type: "broker", slug: "x" }));
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    const body = await res.text();
    expect(body).toContain('?type= must be');
  });

  it("returns 400 when ?slug is missing", async () => {
    const res = await GET(makeReq({ type: "advisor" }));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain("missing ?slug=");
  });

  it("returns 400 when advisor is not found", async () => {
    mockFrom.mockReturnValue(singleResult(null));
    const res = await GET(makeReq({ type: "advisor", slug: "ghost" }));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain("advisor not found");
  });

  it("returns 400 when firm is not found", async () => {
    mockFrom.mockReturnValue(singleResult(null));
    const res = await GET(makeReq({ type: "firm", slug: "ghost" }));
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain("firm not found");
  });
});

describe("GET /api/widget/trust-mark — advisor badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("returns 200 JS with CORS + cache headers for a verified advisor", async () => {
    mockFrom
      .mockReturnValueOnce(
        singleResult({ name: "Jane Adviser", afsl_number: "123456", verified: true, slug: "jane" }),
      )
      .mockReturnValueOnce(singleResult({ status: "current" }));
    const res = await GET(makeReq({ type: "advisor", slug: "jane" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Cache-Control")).toMatch(/public, max-age=3600/);

    const body = await res.text();
    expect(body).toContain("Verified by invest.com.au");
    expect(body).toContain("Jane Adviser");
    expect(body).toContain("https://invest.com.au/advisor/jane");
    expect(body).toContain("AFSL ");
    expect(body).toContain("123456");
    expect(body).toContain("Current"); // afsl_register status=current
  });

  it("shows the verification-pending notice for an unverified advisor", async () => {
    mockFrom
      .mockReturnValueOnce(
        singleResult({ name: "Pending Co", afsl_number: null, verified: false, slug: "pending" }),
      );
    const res = await GET(makeReq({ type: "advisor", slug: "pending" }));
    const body = await res.text();
    expect(body).toContain("Verification pending");
  });

  it("omits the AFSL line when the advisor has no AFSL number", async () => {
    mockFrom.mockReturnValueOnce(
      singleResult({ name: "No Afsl", afsl_number: null, verified: true, slug: "noafsl" }),
    );
    const res = await GET(makeReq({ type: "advisor", slug: "noafsl" }));
    const body = await res.text();
    // The .itm-afsl CSS rule is always in the stylesheet; the AFSL line markup
    // (`<div class="itm-afsl">AFSL ...`) is only emitted when a number exists.
    expect(body).not.toContain('<div class="itm-afsl">AFSL ');
  });
});

describe("GET /api/widget/trust-mark — firm badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("renders a verified firm badge with profile link to /firm/<slug>", async () => {
    mockFrom
      .mockReturnValueOnce(singleResult({ name: "Acme Wealth", afsl_number: "999", slug: "acme" }))
      .mockReturnValueOnce(singleResult(null)); // afsl not 'current'
    const res = await GET(makeReq({ type: "firm", slug: "acme" }));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("Acme Wealth");
    expect(body).toContain("https://invest.com.au/firm/acme");
    // Firms are always considered verified — no pending notice.
    expect(body).not.toContain("Verification pending");
  });

  it("compact mode applies the inline (no-card) sizing", async () => {
    mockFrom.mockReturnValueOnce(singleResult({ name: "Acme", afsl_number: null, slug: "acme" }));
    const res = await GET(makeReq({ type: "firm", slug: "acme", compact: "1" }));
    const body = await res.text();
    expect(body).toContain("8px 12px"); // compact padding
  });
});

describe("OPTIONS /api/widget/trust-mark", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });
});
