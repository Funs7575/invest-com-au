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

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/quotes/[slug]/reopen/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(body: unknown, slug = "my-job-abc123", ip = "1.2.3.4"): [NextRequest, { params: Promise<{ slug: string }> }] {
  const req = new NextRequest(`http://localhost/api/quotes/${slug}/reopen`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
  return [req, { params: Promise.resolve({ slug }) }];
}

const VALID_BODY = { contact_email: "owner@example.com" };

function makeAuction(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    slug: "my-job-abc123",
    status: "expired",
    contact_email: "owner@example.com",
    ends_at: new Date(Date.now() - 86400_000).toISOString(),
    reopened_count: 0,
    winning_bid_id: null,
    ...overrides,
  };
}

function makeAdmin({
  auction = makeAuction() as Record<string, unknown> | null,
  updateErr = null as { message: string } | null,
} = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "advisor_auctions") {
      const updateChain = {
        eq: vi.fn().mockReturnThis(),
        then: (cb: (v: { error: typeof updateErr }) => void) => {
          cb({ error: updateErr });
          return Promise.resolve({ error: updateErr });
        },
      };
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: auction, error: null }),
        update: vi.fn(() => updateChain),
      };
    }
    return {};
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/quotes/[slug]/reopen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    makeAdmin();
  });

  // ── Rate limiting ────────────────────────────────────────────────────────────

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(429);
  });

  // ── Input validation ─────────────────────────────────────────────────────────

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/quotes/my-job/reopen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "my-job" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when contact_email is missing", async () => {
    const [req, ctx] = makeReq({});
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when contact_email is not a valid email", async () => {
    const [req, ctx] = makeReq({ contact_email: "not-an-email" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  // ── Authorization gates ──────────────────────────────────────────────────────

  it("returns 404 when job slug not found", async () => {
    makeAdmin({ auction: null });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when contact_email does not match auction owner", async () => {
    makeAdmin({ auction: makeAuction({ contact_email: "different@example.com" }) });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });

  it("returns 400 when job already has an accepted bid", async () => {
    makeAdmin({ auction: makeAuction({ winning_bid_id: 42 }) });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/accepted quote/i);
  });

  it("returns 400 when reopened_count has reached the limit of 2", async () => {
    makeAdmin({ auction: makeAuction({ reopened_count: 2 }) });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/re-open limit/i);
  });

  it("returns 400 when reopened_count exceeds the limit", async () => {
    makeAdmin({ auction: makeAuction({ reopened_count: 3 }) });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  // ── Happy path ───────────────────────────────────────────────────────────────

  it("returns 200 with success, ends_at, and incremented reopened_count", async () => {
    const [req, ctx] = makeReq(VALID_BODY);
    const before = Date.now();
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; ends_at: string; reopened_count: number };
    expect(body.success).toBe(true);
    expect(body.reopened_count).toBe(1);
    const endsAt = new Date(body.ends_at).getTime();
    expect(endsAt).toBeGreaterThan(before + 6 * 86400_000);
    expect(endsAt).toBeLessThan(before + 8 * 86400_000);
  });

  it("allows reopen when reopened_count is 1 (one slot remaining)", async () => {
    makeAdmin({ auction: makeAuction({ reopened_count: 1 }) });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
    const body = await res.json() as { reopened_count: number };
    expect(body.reopened_count).toBe(2);
  });

  it("email verification is case-insensitive", async () => {
    const [req, ctx] = makeReq({ contact_email: "OWNER@EXAMPLE.COM" });
    const res = await POST(req, ctx);
    expect(res.status).toBe(200);
  });

  // ── Error handling ───────────────────────────────────────────────────────────

  it("returns 500 when DB update fails", async () => {
    makeAdmin({ updateErr: { message: "deadlock detected" } });
    const [req, ctx] = makeReq(VALID_BODY);
    const res = await POST(req, ctx);
    expect(res.status).toBe(500);
  });
});
