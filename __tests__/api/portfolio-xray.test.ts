import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn((req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown"),
}));

const mockLookupTicker = vi.fn();
const TICKER_MAP_FIXTURE = {
  VAS: { sector: "ETF-AU", country: "AU", dividend_yield_est: 0.04 },
  IVV: { sector: "ETF-US", country: "US", dividend_yield_est: 0.015 },
};

vi.mock("@/lib/ticker-sectors", () => ({
  lookupTicker: (...args: unknown[]) => mockLookupTicker(...args),
  TICKER_MAP: {
    VAS: { sector: "ETF-AU", country: "AU", dividend_yield_est: 0.04 },
    IVV: { sector: "ETF-US", country: "US", dividend_yield_est: 0.015 },
  },
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/portfolio-xray/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/portfolio-xray", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const AU_HOLDING = { ticker: "VAS", name: "Vanguard ASX 300", quantity: 100, price: 100, value: 10000 };

// ── Tests ──────────────────────────────────────────────────────────────────────

// This endpoint is disabled (410 Gone): it emitted imperative "switch broker" /
// risk directives with no compliance filter and had no live UI caller (the
// /portfolio-xray page computes client-side). The behavioural assertions for the
// (retained) analysis impl are intentionally dropped — re-add them if the endpoint
// is rebuilt behind a compliance gate.
describe("POST /api/portfolio-xray (disabled)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockLookupTicker.mockImplementation((ticker: string) => {
      return TICKER_MAP_FIXTURE[ticker as keyof typeof TICKER_MAP_FIXTURE] ?? null;
    });
  });

  it("returns 410 Gone for a valid portfolio", async () => {
    const res = await POST(makePost({ holdings: [AU_HOLDING] }));
    expect(res.status).toBe(410);
    expect((await res.json()).error).toMatch(/no longer available/i);
  });

  it("returns 410 even for empty bodies (no analysis runs)", async () => {
    const res = await POST(makePost({ holdings: [] }));
    expect(res.status).toBe(410);
  });

  it("does not consume the rate limiter or hit the DB when disabled", async () => {
    await POST(makePost({ holdings: [AU_HOLDING] }));
    expect(mockIsAllowed).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
