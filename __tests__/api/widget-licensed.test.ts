import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

const { mockCatalogue } = vi.hoisted(() => ({ mockCatalogue: vi.fn() }));
vi.mock("@/lib/widget/types", () => ({
  getWidgetCatalogueEntry: (...args: unknown[]) => mockCatalogue(...args),
}));

import { GET, OPTIONS } from "@/app/api/widget/licensed/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Single-result builder (license lookup): .select().eq().eq().maybeSingle()
function licenseResult(data: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) c[m] = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve({ data, error: null }));
  return c;
}

// Then-able broker list builder
function brokerResult(rows: unknown[]) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit", "in", "not"]) c[m] = vi.fn(() => c);
  c.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve(resolve({ data: rows, error: null }));
  return c;
}

function makeReq(params: Record<string, string> = {}, headers: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/widget/licensed");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), { headers });
}

const BROKER = {
  name: "Stake", slug: "stake", asx_fee: "$3", us_fee: "$0", fx_rate: "0.6%",
  rating: 4.5, chess_sponsored: true, platform_type: "share_broker", logo_url: null,
  color: "#7c3aed", icon: "S", deal: null, deal_text: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/widget/licensed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCatalogue.mockReturnValue(undefined);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  });

  it("returns 200 application/javascript with CORS headers", async () => {
    mockFrom.mockReturnValue(brokerResult([BROKER]));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/application\/javascript/);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });

  it("includes the attribution footer + public cache without a license", async () => {
    mockFrom.mockReturnValue(brokerResult([BROKER]));
    const res = await GET(makeReq());
    const body = await res.text();
    expect(body).toContain("Powered by");
    expect(res.headers.get("Cache-Control")).toMatch(/public, max-age=3600/);
  });

  it("ignores a malformed license token (no wlt_ prefix) — keeps branding", async () => {
    mockFrom.mockReturnValue(brokerResult([BROKER]));
    const res = await GET(makeReq({ license: "not-a-token" }));
    const body = await res.text();
    expect(body).toContain("Powered by");
    // No license lookup performed — only the brokers query.
    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("brokers");
  });

  it("strips the footer + uses private cache for a valid license with no domain allowlist", async () => {
    mockFrom
      .mockReturnValueOnce(licenseResult({ id: "lic-1", allowed_domains: [] }))
      .mockReturnValueOnce(brokerResult([BROKER]));
    const res = await GET(makeReq({ license: "wlt_secret" }));
    const body = await res.text();
    expect(body).toContain("white-label: attribution footer omitted");
    expect(body).not.toContain("Powered by");
    expect(res.headers.get("Cache-Control")).toMatch(/private, max-age=900/);
    expect(mockFrom).toHaveBeenCalledWith("widget_licenses");
  });

  it("keeps branding when a licensed origin is NOT in the allowlist", async () => {
    mockFrom
      .mockReturnValueOnce(licenseResult({ id: "lic-1", allowed_domains: ["acme.com"] }))
      .mockReturnValueOnce(brokerResult([BROKER]));
    const res = await GET(makeReq({ license: "wlt_secret" }, { origin: "https://evil.example" }));
    const body = await res.text();
    expect(body).toContain("Powered by");
    expect(res.headers.get("Cache-Control")).toMatch(/public/);
  });

  it("strips the footer when the request origin matches the allowlist", async () => {
    mockFrom
      .mockReturnValueOnce(licenseResult({ id: "lic-1", allowed_domains: ["acme.com"] }))
      .mockReturnValueOnce(brokerResult([BROKER]));
    const res = await GET(makeReq({ license: "wlt_secret" }, { origin: "https://acme.com" }));
    const body = await res.text();
    expect(body).toContain("white-label: attribution footer omitted");
  });

  it("keeps branding when the license is inactive / not found", async () => {
    mockFrom
      .mockReturnValueOnce(licenseResult(null))
      .mockReturnValueOnce(brokerResult([BROKER]));
    const res = await GET(makeReq({ license: "wlt_revoked" }));
    const body = await res.text();
    expect(body).toContain("Powered by");
  });

  it("filters brokers by slug list when ?brokers= provided", async () => {
    const chain = brokerResult([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ brokers: "stake,commsec" }));
    const inCalls = (chain.in as ReturnType<typeof vi.fn>).mock.calls;
    expect(inCalls[0]).toEqual(["slug", ["stake", "commsec"]]);
  });

  it("applies the catalogue platform_type filter for a known ?widget= slug", async () => {
    mockCatalogue.mockReturnValue({ heading: "Top AU Crypto Exchanges", filter: "crypto" });
    const chain = brokerResult([BROKER]);
    mockFrom.mockReturnValue(chain);
    const res = await GET(makeReq({ widget: "top-crypto" }));
    const body = await res.text();
    expect(body).toContain("Top AU Crypto Exchanges");
    const eqCalls = (chain.eq as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((c) => c[0] === "platform_type" && c[1] === "crypto_exchange")).toBe(true);
  });

  it("compact layout when ?type=compact", async () => {
    mockFrom.mockReturnValue(brokerResult([BROKER]));
    const res = await GET(makeReq({ type: "compact" }));
    const body = await res.text();
    expect(body).toContain('"compact"');
  });

  it("clamps limit to 10 when ?limit=99", async () => {
    const chain = brokerResult([BROKER]);
    mockFrom.mockReturnValue(chain);
    await GET(makeReq({ limit: "99" }));
    expect((chain.limit as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toBe(10);
  });
});

describe("OPTIONS /api/widget/licensed", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });
});
