import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/seo", () => ({
  CURRENT_YEAR: 2026,
}));

import { GET } from "@/app/api/broker-health/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(slug?: string): NextRequest {
  const url = `http://localhost/api/broker-health${slug !== undefined ? `?slug=${encodeURIComponent(slug)}` : ""}`;
  return new NextRequest(url);
}

function makeBrokerBuilder(data: unknown = null, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
  };
}

function makeBroker(overrides = {}) {
  return {
    slug: "stake",
    name: "Stake",
    rating: 4.7,
    regulated_by: "ASIC — AFSL 509799",
    year_founded: 2017,
    headquarters: "Sydney, Australia",
    chess_sponsored: true,
    is_crypto: false,
    platform_type: "share_broker",
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/broker-health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when slug is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/slug/i);
  });

  it("returns 404 when broker not found", async () => {
    mockAdminFrom.mockReturnValue(makeBrokerBuilder(null, { message: "not found" }));
    const res = await GET(makeGet("unknown-broker"));
    expect(res.status).toBe(404);
  });

  it("returns safety score and label for a well-regulated broker", async () => {
    const broker = makeBroker(); // ASIC + AFSL + CHESS + Sydney HQ + 9 years + rating 4.7
    mockAdminFrom.mockReturnValue(makeBrokerBuilder(broker));
    const res = await GET(makeGet("stake"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.slug).toBe("stake");
    expect(data.name).toBe("Stake");
    expect(data.safety_score).toBeGreaterThan(0);
    expect(["Strong", "Moderate", "Caution"]).toContain(data.safety_label);
    expect(Array.isArray(data.factors)).toBe(true);
  });

  it("gives +25 for ASIC regulation", async () => {
    const broker = makeBroker({
      regulated_by: "ASIC",
      chess_sponsored: false,
      year_founded: null,
      rating: null,
      headquarters: "",
      platform_type: "other",
    });
    mockAdminFrom.mockReturnValue(makeBrokerBuilder(broker));
    const res = await GET(makeGet("stake"));
    const data = await res.json();
    const asicFactor = data.factors.find((f: { label: string }) => f.label === "ASIC regulated");
    expect(asicFactor?.points).toBe(25);
  });

  it("gives +20 for CHESS sponsored", async () => {
    const broker = makeBroker({ chess_sponsored: true, regulated_by: "", year_founded: null, rating: null });
    mockAdminFrom.mockReturnValue(makeBrokerBuilder(broker));
    const res = await GET(makeGet("stake"));
    const data = await res.json();
    const chessFactor = data.factors.find((f: { label: string }) => f.label === "CHESS sponsored");
    expect(chessFactor?.points).toBe(20);
  });

  it("gives +20 years points for broker operating 20+ years (2026 - 2000 = 26)", async () => {
    const broker = makeBroker({ year_founded: 2000, chess_sponsored: false, regulated_by: "", rating: null });
    mockAdminFrom.mockReturnValue(makeBrokerBuilder(broker));
    const res = await GET(makeGet("stake"));
    const data = await res.json();
    const yearsFactor = data.factors.find((f: { label: string }) => f.label === "Years operating");
    expect(yearsFactor?.points).toBe(20);
  });

  it("returns safety_label=Strong for score >= 80", async () => {
    const broker = makeBroker({
      regulated_by: "ASIC — AFSL 509799", // +25 + 10
      chess_sponsored: true,               // +20
      year_founded: 2000,                  // +20
      rating: 4.8,                         // +10
      platform_type: "share_broker",       // +5
      headquarters: "Sydney, Australia",   // +5
      is_crypto: false,
    });
    // Total: 25+10+20+20+10+5+5 = 95
    mockAdminFrom.mockReturnValue(makeBrokerBuilder(broker));
    const res = await GET(makeGet("stake"));
    const data = await res.json();
    expect(data.safety_label).toBe("Strong");
    expect(data.safety_score).toBeGreaterThanOrEqual(80);
  });

  it("includes Cache-Control header on success", async () => {
    mockAdminFrom.mockReturnValue(makeBrokerBuilder(makeBroker()));
    const res = await GET(makeGet("stake"));
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=86400");
  });

  it("returns 500 on unexpected throw", async () => {
    mockAdminFrom.mockImplementation(() => { throw new Error("boom"); });
    const res = await GET(makeGet("stake"));
    expect(res.status).toBe(500);
  });
});
