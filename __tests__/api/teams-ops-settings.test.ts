import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (..._args: unknown[]) => isAllowedMock(),
  ipKey: () => "test-ip",
}));

const requireAdvisorSessionMock = vi.fn<() => Promise<number | null>>();
vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: () => requireAdvisorSessionMock(),
}));

// Queued results, consumed in route order:
//   1. team lookup (maybeSingle)
//   2. membership lookup (maybeSingle)
//   3. (round_robin only) active-members .in() lookup -> awaited chain
//   4. update().eq() -> awaited chain ({ error })
const maybeSingleResults: Array<{ data: unknown }> = [];
const inResults: Array<{ data: unknown }> = [];
const updateResults: Array<{ error: unknown }> = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    function makeChain() {
      const chain: Record<string, unknown> = {};
      const self = () => chain;
      chain.select = self;
      chain.eq = self;
      chain.maybeSingle = () =>
        Promise.resolve(maybeSingleResults.shift() ?? { data: null });
      // .in() is terminal (awaited) for the active-members validation.
      chain.in = () => Promise.resolve(inResults.shift() ?? { data: [] });
      return chain;
    }
    return {
      from: () => {
        const chain = makeChain() as Record<string, unknown>;
        // update().eq() is terminal returning { error }.
        chain.update = () => ({
          eq: () => Promise.resolve(updateResults.shift() ?? { error: null }),
        });
        return chain;
      },
    };
  }),
}));

import { PATCH } from "@/app/api/teams/[slug]/ops-settings/route";

function ctx() {
  return { params: Promise.resolve({ slug: "alpha-squad" }) };
}

function patchReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/teams/alpha-squad/ops-settings", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/teams/[slug]/ops-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleResults.length = 0;
    inResults.length = 0;
    updateResults.length = 0;
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    expect((await PATCH(patchReq({ auto_claim_mode: "manual" }), ctx())).status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(null);
    expect((await PATCH(patchReq({ auto_claim_mode: "manual" }), ctx())).status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    expect((await PATCH(patchReq({ auto_claim_mode: "chaos" }), ctx())).status).toBe(400);
  });

  it("returns 404 when team not found", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    maybeSingleResults.push({ data: null });
    expect((await PATCH(patchReq({ auto_claim_mode: "manual" }), ctx())).status).toBe(404);
  });

  it("returns 403 when not an active member", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    maybeSingleResults.push({ data: { id: 5 } });
    maybeSingleResults.push({ data: null });
    expect((await PATCH(patchReq({ auto_claim_mode: "manual" }), ctx())).status).toBe(403);
  });

  it("returns 400 when round_robin members are not active", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    maybeSingleResults.push({ data: { id: 5 } });
    maybeSingleResults.push({ data: { id: 9 } });
    inResults.push({ data: [{ professional_id: 7 }] }); // 8 is missing
    const res = await PATCH(
      patchReq({ auto_claim_mode: "round_robin", auto_claim_member_ids: [7, 8] }),
      ctx(),
    );
    expect(res.status).toBe(400);
  });

  it("returns ok with no-op when no updatable fields supplied", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    maybeSingleResults.push({ data: { id: 5 } });
    maybeSingleResults.push({ data: { id: 9 } });
    const res = await PATCH(patchReq({}), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("updates specialty_tags and returns ok", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    maybeSingleResults.push({ data: { id: 5 } });
    maybeSingleResults.push({ data: { id: 9 } });
    updateResults.push({ error: null });
    const res = await PATCH(patchReq({ specialty_tags: ["tax", "smsf"] }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("returns 500 when the update errors", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    maybeSingleResults.push({ data: { id: 5 } });
    maybeSingleResults.push({ data: { id: 9 } });
    updateResults.push({ error: { message: "boom" } });
    const res = await PATCH(patchReq({ specialty_tags: ["tax"] }), ctx());
    expect(res.status).toBe(500);
  });
});
