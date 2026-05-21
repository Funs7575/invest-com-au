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

const createFixedQuoteMock = vi.fn();
vi.mock("@/lib/expert-teams/fixed-quotes", () => ({
  createFixedQuote: (...args: unknown[]) => createFixedQuoteMock(...args),
}));

vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn(async () => undefined) }));
vi.mock("@/lib/seo", () => ({ SITE_URL: "https://invest.com.au" }));

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

import { POST } from "@/app/api/teams/[slug]/quotes/route";

function ctx() {
  return { params: Promise.resolve({ slug: "alpha-squad" }) };
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/teams/alpha-squad/quotes", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const VALID = {
  brief_id: 42,
  amount_cents: 250000,
  scope_items: [{ label: "Tax return", estimated_hours: 4 }],
};

const TEAM = { id: 5, name: "Alpha Squad" };
const BRIEF = {
  id: 42,
  slug: "brief-42",
  job_title: "Tax help",
  contact_email: "client@example.com",
  contact_name: "Client",
  status: "open",
  accepted_by_team_id: 5,
};

describe("POST /api/teams/[slug]/quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleResults.length = 0;
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

  it("returns 400 on invalid body", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    expect((await POST(postReq({ brief_id: 0, amount_cents: -1, scope_items: [] }), ctx())).status).toBe(400);
  });

  it("returns 404 when team not found", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult(null);
    expect((await POST(postReq(VALID), ctx())).status).toBe(404);
  });

  it("returns 403 when not an active member", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult(TEAM);
    pushResult(null);
    expect((await POST(postReq(VALID), ctx())).status).toBe(403);
  });

  it("returns 404 when brief not accepted by this team", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult(TEAM);
    pushResult({ id: 9 });
    pushResult({ ...BRIEF, accepted_by_team_id: 999 });
    expect((await POST(postReq(VALID), ctx())).status).toBe(404);
  });

  it("returns 409 when brief is not open", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult(TEAM);
    pushResult({ id: 9 });
    pushResult({ ...BRIEF, status: "closed" });
    expect((await POST(postReq(VALID), ctx())).status).toBe(409);
  });

  it("returns 409 when quote creation is blocked", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult(TEAM);
    pushResult({ id: 9 });
    pushResult(BRIEF);
    createFixedQuoteMock.mockResolvedValueOnce(null);
    expect((await POST(postReq(VALID), ctx())).status).toBe(409);
  });

  it("creates a quote and returns the token", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult(TEAM);
    pushResult({ id: 9 });
    pushResult(BRIEF);
    createFixedQuoteMock.mockResolvedValueOnce({
      id: 77,
      review_token: "tok_abc",
      amount_cents: 250000,
      expires_at: "2026-06-01T00:00:00Z",
    });
    const res = await POST(postReq(VALID), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ quote_id: 77, review_token: "tok_abc" });
  });

  it("returns 500 when createFixedQuote throws", async () => {
    requireAdvisorSessionMock.mockResolvedValueOnce(1);
    pushResult(TEAM);
    pushResult({ id: 9 });
    pushResult(BRIEF);
    createFixedQuoteMock.mockRejectedValueOnce(new Error("boom"));
    expect((await POST(postReq(VALID), ctx())).status).toBe(500);
  });
});
