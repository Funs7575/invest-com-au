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

const recordDecisionMock = vi.fn();
const clearDecisionMock = vi.fn(async (..._args: unknown[]) => undefined);
vi.mock("@/lib/team-brief-decisions", () => ({
  recordDecision: (...args: unknown[]) => recordDecisionMock(...args),
  clearDecision: (...args: unknown[]) => clearDecisionMock(...args),
}));

const maybeSingleResults: Array<{ data: unknown }> = [];
function pushResult(data: unknown) {
  maybeSingleResults.push({ data });
}
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    const chain: Record<string, unknown> = {};
    const fn = () => chain;
    chain.select = fn;
    chain.eq = fn;
    chain.maybeSingle = () =>
      Promise.resolve(maybeSingleResults.shift() ?? { data: null });
    return { from: () => chain };
  }),
}));

import { POST, DELETE } from "@/app/api/teams/[slug]/decisions/route";

function ctx() {
  return { params: Promise.resolve({ slug: "alpha-squad" }) };
}

function makeReq(method: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/teams/alpha-squad/decisions", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const VALID_POST = { briefId: 42, decision: "not_for_us", reason: "out of scope" };

describe("POST /api/teams/[slug]/decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleResults.length = 0;
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    expect((await POST(makeReq("POST", VALID_POST), ctx())).status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(null);
    expect((await POST(makeReq("POST", VALID_POST), ctx())).status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    expect((await POST(makeReq("POST", { briefId: 1, decision: "maybe" }), ctx())).status).toBe(400);
  });

  it("returns 404 when team not found", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult(null);
    expect((await POST(makeReq("POST", VALID_POST), ctx())).status).toBe(404);
  });

  it("returns 403 when not an active member", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult({ id: 5 });
    pushResult(null);
    expect((await POST(makeReq("POST", VALID_POST), ctx())).status).toBe(403);
  });

  it("records the decision and returns it", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult({ id: 5 });
    pushResult({ id: 9 });
    recordDecisionMock.mockResolvedValueOnce({ id: 1, decision: "not_for_us" });
    const res = await POST(makeReq("POST", VALID_POST), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ decision: { id: 1 } });
  });

  it("returns 500 when recordDecision throws", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult({ id: 5 });
    pushResult({ id: 9 });
    recordDecisionMock.mockRejectedValueOnce(new Error("boom"));
    expect((await POST(makeReq("POST", VALID_POST), ctx())).status).toBe(500);
  });
});

describe("DELETE /api/teams/[slug]/decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleResults.length = 0;
    isAllowedMock.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(null);
    expect((await DELETE(makeReq("DELETE", { briefId: 1 }), ctx())).status).toBe(401);
  });

  it("returns 400 on invalid body", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    expect((await DELETE(makeReq("DELETE", { briefId: -1 }), ctx())).status).toBe(400);
  });

  it("returns 403 when not an active member", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult({ id: 5 });
    pushResult(null);
    expect((await DELETE(makeReq("DELETE", { briefId: 1 }), ctx())).status).toBe(403);
  });

  it("clears the decision and returns ok", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult({ id: 5 });
    pushResult({ id: 9 });
    const res = await DELETE(makeReq("DELETE", { briefId: 1 }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(clearDecisionMock).toHaveBeenCalled();
  });
});
