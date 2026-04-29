import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/fee-report/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(token?: string): NextRequest {
  const url = new URL("http://localhost/api/fee-report");
  if (token) url.searchParams.set("token", token);
  return new NextRequest(url);
}

const BROKERS = [
  { name: "CommSec", slug: "commsec", platform_type: "share_broker", asx_fee: "$19.95", us_fee: "$19.95", fx_rate: 0.6, inactivity_fee: null, chess_sponsored: true, smsf_support: true, rating: 4.2, min_deposit: 0 },
  { name: "Binance", slug: "binance", platform_type: "crypto_exchange", asx_fee: "0.1%", us_fee: null, fx_rate: null, inactivity_fee: null, chess_sponsored: false, smsf_support: false, rating: 4.0, min_deposit: 0 },
];

function makeQueryBuilder(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve({ data, error })),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/fee-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 500 when no brokers found", async () => {
    mockAdminFrom.mockReturnValue(makeQueryBuilder([]));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/no data/i);
  });

  it("returns 500 when brokers is null", async () => {
    mockAdminFrom.mockReturnValue(makeQueryBuilder(null));
    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });

  it("returns HTML content-type on success", async () => {
    mockAdminFrom.mockReturnValue(makeQueryBuilder(BROKERS));
    const res = await GET(makeGet("some-token"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/html/);
  });

  it("returns HTML body with broker names", async () => {
    mockAdminFrom.mockReturnValue(makeQueryBuilder(BROKERS));
    const res = await GET(makeGet());
    const html = await res.text();
    expect(html).toContain("CommSec");
    expect(html).toContain("Binance");
  });

  it("includes current year in HTML title", async () => {
    mockAdminFrom.mockReturnValue(makeQueryBuilder(BROKERS));
    const res = await GET(makeGet());
    const html = await res.text();
    expect(html).toContain(String(new Date().getFullYear()));
  });

  it("includes broker count in subtitle", async () => {
    mockAdminFrom.mockReturnValue(makeQueryBuilder(BROKERS));
    const res = await GET(makeGet());
    const html = await res.text();
    expect(html).toContain("2 platforms");
  });

  it("sets Cache-Control public max-age=86400", async () => {
    mockAdminFrom.mockReturnValue(makeQueryBuilder(BROKERS));
    const res = await GET(makeGet());
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
  });

  it("queries brokers table with active filter and rating order", async () => {
    const builder = makeQueryBuilder(BROKERS);
    mockAdminFrom.mockReturnValue(builder);
    await GET(makeGet());
    expect(mockAdminFrom).toHaveBeenCalledWith("brokers");
    expect(builder.eq).toHaveBeenCalledWith("status", "active");
    expect(builder.order).toHaveBeenCalledWith("rating", { ascending: false });
  });
});
