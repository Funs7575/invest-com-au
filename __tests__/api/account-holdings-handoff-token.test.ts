/**
 * Tests for GET /api/account/holdings/handoff/[token]
 *
 * Auth: PUBLIC — the token IS the auth factor (random opaque UUID, 14-day TTL,
 * single-consumption). No session required.
 * Delegates to lib/investor-handoff.ts → getHandoff().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetHandoff = vi.fn(
  async (_token: unknown): Promise<{
    intent: string;
    holdings: unknown[];
    created_at: string;
  } | null> => null,
);

vi.mock("@/lib/investor-handoff", () => ({
  getHandoff: (...args: unknown[]) => mockGetHandoff(args[0]),
}));

import { GET } from "@/app/api/account/holdings/handoff/[token]/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const validToken = "550e8400-e29b-41d4-a716-446655440000";

function makeReq(token: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/account/holdings/handoff/${token}`,
    { method: "GET" },
  );
}

function makeParams(token: string): { params: Promise<{ token: string }> } {
  return { params: Promise.resolve({ token }) };
}

const mockHandoffResult = {
  intent: "tax-prep",
  holdings: [
    {
      ticker: "VAS",
      exchange: "ASX",
      shares: 100,
      cost_basis_per_share_cents: 9500,
      acquired_at: "2024-01-15",
      broker_slug: "selfwealth",
      notes: null,
    },
  ],
  created_at: "2026-05-01T00:00:00Z",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/account/holdings/handoff/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHandoff.mockResolvedValue(null);
  });

  it("returns 400 when token is empty string", async () => {
    const res = await GET(makeReq(""), makeParams(""));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("invalid_token");
  });

  it("returns 400 when token exceeds 200 characters", async () => {
    const longToken = "x".repeat(201);
    const res = await GET(makeReq(longToken), makeParams(longToken));
    expect(res.status).toBe(400);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("invalid_token");
  });

  it("returns 404 when handoff is not found / expired / consumed", async () => {
    mockGetHandoff.mockResolvedValue(null);
    const res = await GET(makeReq(validToken), makeParams(validToken));
    expect(res.status).toBe(404);
    const json = await res.json() as { error: string };
    expect(json.error).toBe("not_found");
  });

  it("calls getHandoff with the resolved token from params", async () => {
    mockGetHandoff.mockResolvedValue(null);
    await GET(makeReq(validToken), makeParams(validToken));
    expect(mockGetHandoff).toHaveBeenCalledWith(validToken);
  });

  it("returns 200 with holdings snapshot when token is valid", async () => {
    mockGetHandoff.mockResolvedValue(mockHandoffResult);
    const res = await GET(makeReq(validToken), makeParams(validToken));
    expect(res.status).toBe(200);
    const json = await res.json() as typeof mockHandoffResult;
    expect(json).toHaveProperty("intent", "tax-prep");
    expect(json).toHaveProperty("holdings");
    expect(Array.isArray(json.holdings)).toBe(true);
    expect(json.holdings).toHaveLength(1);
    expect(json).toHaveProperty("created_at", "2026-05-01T00:00:00Z");
  });

  it("sets Cache-Control: private, no-store on successful response", async () => {
    mockGetHandoff.mockResolvedValue(mockHandoffResult);
    const res = await GET(makeReq(validToken), makeParams(validToken));
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns holdings details correctly (ticker, exchange, shares, etc.)", async () => {
    mockGetHandoff.mockResolvedValue(mockHandoffResult);
    const res = await GET(makeReq(validToken), makeParams(validToken));
    const json = await res.json() as { holdings: Array<{ ticker: string; shares: number }> };
    const holding = json.holdings[0];
    expect(holding).toBeDefined();
    expect(holding?.ticker).toBe("VAS");
    expect(holding?.shares).toBe(100);
  });

  it("does NOT require auth — no supabase client mocking needed", async () => {
    // The route has no supabase import; this confirms that by simply running
    // without any supabase mock and still getting a 404 (not 401/500)
    mockGetHandoff.mockResolvedValue(null);
    const res = await GET(makeReq(validToken), makeParams(validToken));
    expect(res.status).toBe(404); // Not 401 — auth is not checked
  });

  it("returns 400 for token exactly at 200 chars boundary (exactly 200 chars is valid)", async () => {
    // 200 chars is the max allowed length, should pass token validation
    // and proceed to getHandoff (which returns null → 404)
    const borderToken = "a".repeat(200);
    mockGetHandoff.mockResolvedValue(null);
    const res = await GET(makeReq(borderToken), makeParams(borderToken));
    // 200-char token passes the guard; getHandoff returns null → 404
    expect(res.status).toBe(404);
  });
});
