import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET, POST } from "@/app/api/quotes/[slug]/qa/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const SLUG = "my-job-abc123";

function makeGetReq(slug = SLUG, ip = "1.2.3.4"): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new NextRequest(`http://localhost/api/quotes/${slug}/qa`, {
    method: "GET",
    headers: { "x-forwarded-for": ip },
  });
  return [req, { params: Promise.resolve({ slug }) }];
}

function makePostReq(body: unknown, slug = SLUG, ip = "1.2.3.4"): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new NextRequest(`http://localhost/api/quotes/${slug}/qa`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ slug }) }];
}

const AUCTION = {
  id: 7,
  slug: SLUG,
  contact_email: "owner@example.com",
  contact_name: "Jane Owner",
};

const QA_ROW = {
  id: 1,
  auction_id: 7,
  advisor_id: null,
  author_display_name: "Jane Owner",
  body: "What is your availability?",
  is_question: true,
  parent_id: null,
  created_at: "2026-05-04T10:00:00Z",
  professionals: null,
};

function makeAdmin({
  auction = AUCTION as typeof AUCTION | null,
  qa = [QA_ROW] as typeof QA_ROW[] | null,
  professional = null as { id: number; name: string } | null,
  insertResult = { data: { id: 99 }, error: null } as { data: { id: number } | null; error: { message: string } | null },
} = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "advisor_auctions") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: auction }),
      };
    }
    if (table === "quote_qa") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: qa }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(insertResult),
      };
    }
    if (table === "professionals") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: professional }),
      };
    }
    return {};
  });
}

// ── GET tests ──────────────────────────────────────────────────────────────────

describe("GET /api/quotes/[slug]/qa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: null } });
    makeAdmin();
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const [req, ctx] = makeGetReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(429);
  });

  it("returns 404 when auction slug not found", async () => {
    makeAdmin({ auction: null });
    const [req, ctx] = makeGetReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 200 with qa array on success", async () => {
    const [req, ctx] = makeGetReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { qa: typeof QA_ROW[] };
    expect(body.qa).toHaveLength(1);
    expect(body.qa[0]?.body).toBe("What is your availability?");
  });

  it("returns empty array when no Q&A exists", async () => {
    makeAdmin({ qa: [] });
    const [req, ctx] = makeGetReq();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { qa: unknown[] };
    expect(body.qa).toEqual([]);
  });
});

// ── POST tests ─────────────────────────────────────────────────────────────────

describe("POST /api/quotes/[slug]/qa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({ data: { user: null } });
    makeAdmin();
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const [req, ctx] = makePostReq({ body: "Hello there" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest(`http://localhost/api/quotes/${SLUG}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req, { params: Promise.resolve({ slug: SLUG }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when body is too short (< 4 chars)", async () => {
    const [req, ctx] = makePostReq({
      body: "Hi",
      contact_email: "owner@example.com",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const j = await res.json() as { error: string };
    expect(j.error).toMatch(/4 characters/i);
  });

  it("returns 400 when body exceeds 2000 chars", async () => {
    const [req, ctx] = makePostReq({
      body: "x".repeat(2001),
      contact_email: "owner@example.com",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when auction slug not found", async () => {
    makeAdmin({ auction: null });
    const [req, ctx] = makePostReq({ body: "Is this still open?", contact_email: "owner@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 401 when no session and contact_email does not match", async () => {
    const [req, ctx] = makePostReq({ body: "Is this still open?", contact_email: "stranger@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("returns 401 when no session and contact_email omitted", async () => {
    const [req, ctx] = makePostReq({ body: "Is this still open?" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("returns 200 via owner auth (contact_email matches case-insensitively)", async () => {
    const [req, ctx] = makePostReq({
      body: "Is the budget negotiable?",
      contact_email: "OWNER@EXAMPLE.COM",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const j = await res.json() as { success: boolean; id: number };
    expect(j.success).toBe(true);
    expect(j.id).toBe(99);
  });

  it("uses contact_name from auction as display name when display_name omitted", async () => {
    const insertSpy = vi.fn().mockReturnThis();
    const singleSpy = vi.fn().mockResolvedValue({ data: { id: 50 }, error: null });
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "advisor_auctions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: AUCTION }),
        };
      }
      if (table === "quote_qa") {
        return { insert: insertSpy, single: singleSpy };
      }
      if (table === "professionals") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        };
      }
      return {};
    });
    const [req, ctx] = makePostReq({ body: "Is the budget negotiable?", contact_email: "owner@example.com" });
    await POST(req, ctx);
    const callArg = insertSpy.mock.calls[0]?.[0] as { author_display_name: string };
    expect(callArg?.author_display_name).toBe("Jane Owner");
  });

  it("returns 200 via advisor auth (Supabase session + professionals row)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "advisor@firm.com" } } });
    makeAdmin({ professional: { id: 42, name: "John Advisor" } });
    const [req, ctx] = makePostReq({ body: "We specialise in this.", is_question: false });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
  });

  it("falls back to owner auth when session user has no professionals row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: "someone@example.com" } } });
    makeAdmin({ professional: null });
    const [req, ctx] = makePostReq({
      body: "Is this still open?",
      contact_email: "owner@example.com",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
  });

  it("returns 500 when DB insert fails", async () => {
    makeAdmin({ insertResult: { data: null, error: { message: "constraint violation" } } });
    const [req, ctx] = makePostReq({ body: "Is this still open?", contact_email: "owner@example.com" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
  });
});
