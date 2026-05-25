import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";

const { mockGetUser, mockRequireStartupSession } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRequireStartupSession: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(),
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/require-startup-session", () => ({
  requireStartupSession: mockRequireStartupSession,
}));

import { POST as roundPOST } from "@/app/api/startups/round/route";
import { POST as grantPOST } from "@/app/api/startups/data-room/grant/route";

function makeReq(body: unknown): NextRequest {
  return new Request("http://localhost/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const validPricedRound = {
  instrument: "priced_equity",
  target_aud_cents: 100_000_000,
  min_ticket_aud_cents: 1_000_000,
  valuation_cap_aud_cents: 500_000_000,
  wholesale_only: true,
};

const validGrant = {
  file_id: "11111111-1111-1111-1111-111111111111",
  inquiry_id: "22222222-2222-2222-2222-222222222222",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  mockRequireStartupSession.mockResolvedValue("startup-1");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("startup capital-raising compliance gate", () => {
  describe("round creation", () => {
    it("returns 403 when raises are disabled (env unset)", async () => {
      vi.stubEnv("STARTUP_RAISES_ENABLED", "");
      const res = await roundPOST(makeReq(validPricedRound));
      expect(res.status).toBe(403);
      const json = (await res.json()) as { error: string };
      expect(json.error).toMatch(/temporarily unavailable/i);
    });

    it("still returns 401 when unauthenticated (auth precedes the gate)", async () => {
      vi.stubEnv("STARTUP_RAISES_ENABLED", "true");
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const res = await roundPOST(makeReq(validPricedRound));
      expect(res.status).toBe(401);
    });

    it("rejects retail (non-wholesale) rounds even when enabled", async () => {
      vi.stubEnv("STARTUP_RAISES_ENABLED", "true");
      const res = await roundPOST(
        makeReq({ ...validPricedRound, wholesale_only: false }),
      );
      expect(res.status).toBe(403);
      const json = (await res.json()) as { error: string };
      expect(json.error).toMatch(/wholesale/i);
    });
  });

  describe("data-room grant", () => {
    it("returns 403 when raises are disabled (env unset)", async () => {
      vi.stubEnv("STARTUP_RAISES_ENABLED", "");
      const res = await grantPOST(makeReq(validGrant));
      expect(res.status).toBe(403);
      const json = (await res.json()) as { error: string };
      expect(json.error).toMatch(/temporarily unavailable/i);
    });

    it("returns 401 when there is no startup session", async () => {
      mockRequireStartupSession.mockResolvedValueOnce(null);
      const res = await grantPOST(makeReq(validGrant));
      expect(res.status).toBe(401);
    });
  });
});
