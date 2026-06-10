/**
 * Tests for GET /api/account/profile-share/[token]
 *
 * Auth: PUBLIC — the token IS the auth factor. No session required.
 * Rate-limit: 60/min/IP via isAllowed().
 * Delegates data fetching to lib/profile-share.ts → getProfileShare().
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetProfileShare = vi.fn(
  async (_token: unknown): Promise<{
    snapshot: Record<string, unknown>;
    wasConsumedPreviously: boolean;
    expiresAt: string;
  } | null> => null,
);

vi.mock("@/lib/profile-share", () => ({
  getProfileShare: (...args: unknown[]) => mockGetProfileShare(args[0]),
}));

const mockIsAllowed = vi.fn(async (): Promise<boolean> => true);

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._a: unknown[]) => mockIsAllowed(),
  ipKey: () => "test-ip",
}));

import { GET } from "@/app/api/account/profile-share/[token]/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeReq(token: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/account/profile-share/${token}`,
    {
      method: "GET",
      headers: { "x-forwarded-for": "1.2.3.4" },
    },
  );
}

function makeParams(token: string): { params: Promise<{ token: string }> } {
  return { params: Promise.resolve({ token }) };
}

const validToken = "a".repeat(48); // 24-byte hex token

const mockSnapshot = {
  goals: { is_fhb: true, is_pre_retiree: false, is_business_owner: false,
           is_cross_border: false, is_hnw: false, budget_band: null,
           experience_level: null, primary_vertical: null, display_name: null },
  quiz: null,
  watchlist: [],
  health: null,
  created_at: "2026-01-01T00:00:00Z",
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/account/profile-share/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetProfileShare.mockResolvedValue(null);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeReq(validToken), makeParams(validToken));
    expect(res.status).toBe(429);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/too many/i);
  });

  it("returns 404 when token not found / expired / revoked", async () => {
    mockGetProfileShare.mockResolvedValue(null);
    const res = await GET(makeReq(validToken), makeParams(validToken));
    expect(res.status).toBe(404);
    const json = await res.json() as { error: string };
    expect(json.error).toMatch(/not found|expired|revoked/i);
  });

  it("returns 200 with snapshot when token is valid (first read)", async () => {
    mockGetProfileShare.mockResolvedValue({
      snapshot: mockSnapshot,
      wasConsumedPreviously: false,
      expiresAt: "2026-06-01T00:00:00Z",
    });
    const res = await GET(makeReq(validToken), makeParams(validToken));
    expect(res.status).toBe(200);
    const json = await res.json() as {
      snapshot: unknown;
      was_consumed_previously: boolean;
      expires_at: string;
    };
    expect(json).toHaveProperty("snapshot");
    expect(json.was_consumed_previously).toBe(false);
    expect(json.expires_at).toBe("2026-06-01T00:00:00Z");
  });

  it("returns was_consumed_previously=true on subsequent reads", async () => {
    mockGetProfileShare.mockResolvedValue({
      snapshot: mockSnapshot,
      wasConsumedPreviously: true,
      expiresAt: "2026-06-01T00:00:00Z",
    });
    const res = await GET(makeReq(validToken), makeParams(validToken));
    expect(res.status).toBe(200);
    const json = await res.json() as { was_consumed_previously: boolean };
    expect(json.was_consumed_previously).toBe(true);
  });

  it("calls getProfileShare with the resolved token from params", async () => {
    const token = "b".repeat(48);
    mockGetProfileShare.mockResolvedValue({
      snapshot: mockSnapshot,
      wasConsumedPreviously: false,
      expiresAt: "2026-06-01T00:00:00Z",
    });
    await GET(makeReq(token), makeParams(token));
    expect(mockGetProfileShare).toHaveBeenCalledWith(token);
  });

  it("returns snapshot contents including goals and watchlist", async () => {
    const snapshot = {
      ...mockSnapshot,
      goals: { is_fhb: true, is_pre_retiree: false, is_business_owner: false,
               is_cross_border: false, is_hnw: true, budget_band: "1m",
               experience_level: "advanced", primary_vertical: "etf", display_name: "Bob" },
      watchlist: [{ item_type: "etf", item_slug: "vas", display_name: "VAS" }],
    };
    mockGetProfileShare.mockResolvedValue({
      snapshot,
      wasConsumedPreviously: false,
      expiresAt: "2026-06-01T00:00:00Z",
    });
    const res = await GET(makeReq(validToken), makeParams(validToken));
    expect(res.status).toBe(200);
    const json = await res.json() as { snapshot: typeof snapshot };
    expect(json.snapshot.goals).toMatchObject({ is_fhb: true, is_hnw: true, display_name: "Bob" });
    expect(json.snapshot.watchlist).toHaveLength(1);
  });
});
