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

// Use a real ReferralError so `instanceof` in the route works. The class
// must be created inside vi.hoisted so it exists when the hoisted vi.mock
// factory runs (see CLAUDE.md vi.mock hoisting note).
const { ReferralError, createReferralMock } = vi.hoisted(() => {
  class ReferralError extends Error {
    constructor(
      public code: string,
      message?: string,
    ) {
      super(message ?? code);
      this.name = "ReferralError";
    }
  }
  return { ReferralError, createReferralMock: vi.fn() };
});
vi.mock("@/lib/team-brief-referrals", () => ({
  ReferralError,
  createReferral: (...args: unknown[]) => createReferralMock(...args),
}));

vi.mock("@/lib/marketplace-squad-emails", () => ({
  sendReferralReceivedEmail: vi.fn(async () => undefined),
}));

// from-team lookup returns { data, error }.
const teamResults: Array<{ data: unknown; error: unknown }> = [];
function pushTeam(data: unknown, error: unknown = null) {
  teamResults.push({ data, error });
}
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    const chain: Record<string, unknown> = {};
    const fn = () => chain;
    chain.select = fn;
    chain.eq = fn;
    chain.maybeSingle = () =>
      Promise.resolve(teamResults.shift() ?? { data: null, error: null });
    return { from: () => chain };
  }),
}));

import { POST } from "@/app/api/teams/[slug]/referrals/route";

function ctx() {
  return { params: Promise.resolve({ slug: "alpha-squad" }) };
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/teams/alpha-squad/referrals", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const VALID = { briefId: 42, toTeamId: 9, note: "good fit for you" };
const FROM_TEAM = { id: 5, name: "Alpha Squad", verification_status: "verified" };

describe("POST /api/teams/[slug]/referrals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teamResults.length = 0;
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    expect((await POST(postReq(VALID), ctx())).status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(null);
    expect((await POST(postReq(VALID), ctx())).status).toBe(401);
  });

  it("returns 500 when the team lookup errors", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushTeam(null, { message: "boom" });
    expect((await POST(postReq(VALID), ctx())).status).toBe(500);
  });

  it("returns 404 when from-team not found", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushTeam(null);
    expect((await POST(postReq(VALID), ctx())).status).toBe(404);
  });

  it("returns 400 on invalid body", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushTeam(FROM_TEAM);
    expect((await POST(postReq({ briefId: 0, toTeamId: 0 }), ctx())).status).toBe(400);
  });

  it("creates a referral and returns 201", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushTeam(FROM_TEAM);
    createReferralMock.mockResolvedValueOnce({ id: 11, status: "pending" });
    const res = await POST(postReq(VALID), ctx());
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ referral: { id: 11 } });
  });

  it("maps ReferralError(not_team_member) to 403", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushTeam(FROM_TEAM);
    createReferralMock.mockRejectedValueOnce(new ReferralError("not_team_member"));
    const res = await POST(postReq(VALID), ctx());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "not_team_member" });
  });

  it("maps ReferralError(duplicate_referral) to 409", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushTeam(FROM_TEAM);
    createReferralMock.mockRejectedValueOnce(new ReferralError("duplicate_referral"));
    expect((await POST(postReq(VALID), ctx())).status).toBe(409);
  });

  it("maps ReferralError(self_referral_not_allowed) to 400", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushTeam(FROM_TEAM);
    createReferralMock.mockRejectedValueOnce(new ReferralError("self_referral_not_allowed"));
    expect((await POST(postReq(VALID), ctx())).status).toBe(400);
  });

  it("returns 500 on a non-ReferralError throw", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushTeam(FROM_TEAM);
    createReferralMock.mockRejectedValueOnce(new Error("boom"));
    expect((await POST(postReq(VALID), ctx())).status).toBe(500);
  });
});
