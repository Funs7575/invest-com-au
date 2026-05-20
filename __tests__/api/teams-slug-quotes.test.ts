/* eslint-disable @typescript-eslint/no-explicit-any -- test ctx/param casts */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is",
    "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter", "contains",
  ]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const { mockIsAllowed, mockRequireAdvisorSession, mockFrom, mockCreateFixedQuote, mockSendEmail } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockRequireAdvisorSession: vi.fn(async () => 42),
  mockFrom: vi.fn(),
  mockCreateFixedQuote: vi.fn(async () => ({
    id: 1,
    review_token: "tok_abc",
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    amount_cents: 50000,
  })),
  mockSendEmail: vi.fn(async () => ({ id: "email-id" })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/expert-teams/fixed-quotes", () => ({
  createFixedQuote: mockCreateFixedQuote,
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: mockSendEmail,
}));

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));

import { POST } from "@/app/api/teams/[slug]/quotes/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/teams/test-squad/quotes", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

function makeCtx(slug = "test-squad") {
  return { params: Promise.resolve({ slug }) };
}

const validBody = {
  brief_id: 1,
  amount_cents: 50000,
  scope_items: [{ label: "Portfolio review", estimated_hours: 2 }],
};

describe("/api/teams/[slug]/quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockCreateFixedQuote.mockResolvedValue({
      id: 1,
      review_token: "tok_abc",
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      amount_cents: 50000,
    });
    // Default: team + membership + brief all found
    mockFrom.mockImplementation((table: string) => {
      if (table === "expert_teams") {
        return makeBuilder({ data: { id: 1, name: "Test Squad" }, error: null });
      }
      if (table === "expert_team_members") {
        return makeBuilder({ data: { id: 10 }, error: null });
      }
      if (table === "advisor_auctions") {
        return makeBuilder({
          data: { id: 1, slug: "brief-1", job_title: "Investment Review", contact_email: "client@example.com", contact_name: "Client", status: "open", accepted_by_team_id: 1 },
          error: null,
        });
      }
      return makeBuilder();
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid body (missing brief_id)", async () => {
    const res = await POST(makeReq({ amount_cents: 5000, scope_items: [] }), makeCtx() as any);
    expect(res.status).toBe(400);
  });

  it("returns 404 when squad not found", async () => {
    mockFrom.mockImplementation(() => makeBuilder({ data: null, error: null }));
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(404);
  });

  it("returns 403 when not squad member", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "expert_teams") {
        return makeBuilder({ data: { id: 1, name: "Test Squad" }, error: null });
      }
      return makeBuilder({ data: null, error: null });
    });
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(403);
  });

  it("returns 200 with quote_id and review_token on success", async () => {
    const res = await POST(makeReq(validBody), makeCtx() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("quote_id");
    expect(json).toHaveProperty("review_token");
  });
});