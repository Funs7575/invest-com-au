/**
 * Tests for POST /api/pro-affiliate/links
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockRequireAdvisorSession, mockGetOrCreateLink, mockGetAdminEmails } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true),
  mockGetUser: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ data: { user: { id: "u1", email: "admin@invest.com.au" } }, error: null })),
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => 1),
  mockGetOrCreateLink: vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ token: "tok_abc123", url: "https://invest.com.au?ref=tok_abc123" })),
  mockGetAdminEmails: vi.fn<(...args: unknown[]) => unknown>(() => ["admin@invest.com.au"]),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: mockGetAdminEmails,
  ADMIN_EMAILS: ["admin@invest.com.au"],
}));

vi.mock("@/lib/pro-affiliate/links", () => ({
  getOrCreateLink: mockGetOrCreateLink,
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/pro-affiliate/links/route";

const VALID_BODY = { pro_slug: "john-smith", pro_kind: "professional" };

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/pro-affiliate/links", {
    method: "POST",
    body: JSON.stringify(body ?? VALID_BODY),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

describe("POST /api/pro-affiliate/links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "admin@invest.com.au" } }, error: null });
    mockGetAdminEmails.mockReturnValue(["admin@invest.com.au"]);
    mockGetOrCreateLink.mockResolvedValue({ token: "tok_abc123", url: "https://invest.com.au?ref=tok_abc123" });

    const chain: Record<string, unknown> = {};
    for (const m of ["select","eq","in","maybeSingle"]) chain[m] = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(async () => ({ data: { id: 1 }, error: null }));
    mockAdminFrom.mockReturnValue(chain);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 400 for missing pro_slug", async () => {
    const res = await POST(makeReq({ pro_kind: "professional" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid pro_kind", async () => {
    const res = await POST(makeReq({ pro_slug: "john-smith", pro_kind: "invalid" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with link for admin user", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.link).toBeDefined();
  });

  it("returns 401 when not admin and no advisor session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u2", email: "regular@example.com" } }, error: null });
    mockGetAdminEmails.mockReturnValue(["admin@invest.com.au"]);
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });
});
