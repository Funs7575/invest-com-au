import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

const mockRequireCronAuth = vi.fn();
vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...a: unknown[]) => mockRequireCronAuth(...a),
}));

const mockSendQuoteReview = vi.fn();
vi.mock("@/lib/quote-emails", () => ({
  sendQuoteReviewRequestEmail: (...a: unknown[]) => mockSendQuoteReview(...a),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/cron/quote-review-requests/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/quote-review-requests", {
    headers: { Authorization: "Bearer test-secret" },
  }) as unknown as NextRequest;
}

type ChainResult = { data: unknown; error?: { message: string } | null };

function makeChain(result: ChainResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "not", "lte", "limit", "update"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: ChainResult) => unknown) => Promise.resolve(resolve(result));
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/cron/quote-review-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    mockSendQuoteReview.mockResolvedValue(true);
    process.env.CRON_SECRET = "test-secret";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.CRON_SECRET;
  });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when DB fetch fails", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null, error: { message: "DB error" } }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("fetch_failed");
  });

  it("returns { sent:0, scanned:0 } when no awarded jobs", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: [] }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; scanned: number };
    expect(body.sent).toBe(0);
    expect(body.scanned).toBe(0);
  });

  it("skips jobs without contact_email or winning_bid_id", async () => {
    const jobs = [
      { id: 1, slug: "j1", job_title: "J1", contact_email: null, contact_name: "Alice", winning_bid_id: 10, updated_at: new Date(Date.now() - 15 * 86400_000).toISOString() },
      { id: 2, slug: "j2", job_title: "J2", contact_email: "x@example.com", contact_name: "Bob", winning_bid_id: null, updated_at: new Date(Date.now() - 15 * 86400_000).toISOString() },
    ];
    mockAdminFrom.mockReturnValue(makeChain({ data: jobs }));
    const res = await GET(makeReq());
    const body = await res.json() as { sent: number; skipped: number };
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(2);
  });

  it("skips when winning bid not found in DB", async () => {
    const jobs = [{ id: 3, slug: "j3", job_title: "J3", contact_email: "x@example.com", contact_name: "Carol", winning_bid_id: 99, updated_at: new Date(Date.now() - 15 * 86400_000).toISOString() }];
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: jobs });
      return makeChain({ data: null }); // bid not found
    });
    const res = await GET(makeReq());
    const body = await res.json() as { skipped: number };
    expect(body.skipped).toBe(1);
    expect(mockSendQuoteReview).not.toHaveBeenCalled();
  });

  it("skips when advisor not found", async () => {
    const jobs = [{ id: 4, slug: "j4", job_title: "J4", contact_email: "y@example.com", contact_name: "Dave", winning_bid_id: 5, updated_at: new Date(Date.now() - 15 * 86400_000).toISOString() }];
    const bid = { advisor_id: 77 };
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: jobs });
      if (callCount === 2) return makeChain({ data: bid });
      return makeChain({ data: null }); // advisor not found
    });
    const res = await GET(makeReq());
    const body = await res.json() as { skipped: number };
    expect(body.skipped).toBe(1);
  });

  it("sends review request email and increments sent on happy path", async () => {
    const jobs = [{ id: 5, slug: "test-slug", job_title: "Find Planner", contact_email: "client@example.com", contact_name: "Alice Smith", winning_bid_id: 7, updated_at: new Date(Date.now() - 15 * 86400_000).toISOString() }];
    const bid = { advisor_id: 88 };
    const advisor = { name: "Jane Advisor" };
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: jobs });
      if (callCount === 2) return makeChain({ data: bid });
      if (callCount === 3) return makeChain({ data: advisor });
      return makeChain({ data: null }); // update
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(1);
    expect(mockSendQuoteReview).toHaveBeenCalledWith(
      "client@example.com",
      "Alice",
      "Jane Advisor",
      "Find Planner",
      "test-slug",
      expect.any(String) // token
    );
  });

  it("counts skipped when sendQuoteReviewRequestEmail returns false", async () => {
    mockSendQuoteReview.mockResolvedValue(false);
    const jobs = [{ id: 6, slug: "j6", job_title: "J6", contact_email: "z@example.com", contact_name: null, winning_bid_id: 8, updated_at: new Date(Date.now() - 15 * 86400_000).toISOString() }];
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: jobs });
      if (callCount === 2) return makeChain({ data: { advisor_id: 1 } });
      if (callCount === 3) return makeChain({ data: { name: "Adv" } });
      return makeChain({ data: null });
    });
    const res = await GET(makeReq());
    const body = await res.json() as { sent: number; skipped: number };
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
  });
});
