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

const mockSendQuoteExpiry = vi.fn();
vi.mock("@/lib/quote-emails", () => ({
  sendQuoteExpiryReminderEmail: (...a: unknown[]) => mockSendQuoteExpiry(...a),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { GET } from "@/app/api/cron/quote-expiry-reminders/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/quote-expiry-reminders", {
    headers: { Authorization: "Bearer test-secret" },
  }) as unknown as NextRequest;
}

type ChainResult = { data: unknown; error?: { message: string } | null };

function makeChain(result: ChainResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "gte", "lte", "not", "limit", "order", "update"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: ChainResult) => unknown) => Promise.resolve(resolve(result));
  return c;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/cron/quote-expiry-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    mockSendQuoteExpiry.mockResolvedValue(true);
  });

  afterEach(() => { vi.restoreAllMocks(); });

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

  it("returns { sent:0, skipped:0, scanned:0 } when no expiring jobs", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: [] }));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; skipped: number; scanned: number };
    expect(body.sent).toBe(0);
    expect(body.scanned).toBe(0);
  });

  it("skips jobs without contact_email", async () => {
    const jobs = [{ id: 1, slug: "j1", job_title: "Job 1", contact_email: null, contact_name: "Alice", ends_at: new Date(Date.now() + 23 * 3600_000).toISOString() }];
    mockAdminFrom.mockReturnValue(makeChain({ data: jobs }));
    const res = await GET(makeReq());
    const body = await res.json() as { sent: number; skipped: number };
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
  });

  it("marks no-bid jobs as reminded and skips sending email", async () => {
    const jobs = [{ id: 2, slug: "j2", job_title: "Job 2", contact_email: "user@example.com", contact_name: "Bob", ends_at: new Date(Date.now() + 23 * 3600_000).toISOString() }];
    // first call: jobs query; second: bids (empty); third: update stamp
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: jobs });
      if (callCount === 2) return makeChain({ data: [] });
      return makeChain({ data: null });
    });
    const res = await GET(makeReq());
    const body = await res.json() as { sent: number; skipped: number };
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(mockSendQuoteExpiry).not.toHaveBeenCalled();
  });

  it("sends email and increments sent on happy path", async () => {
    const jobs = [{ id: 3, slug: "j3", job_title: "Find Advisor", contact_email: "client@example.com", contact_name: "Alice Smith", ends_at: new Date(Date.now() + 23 * 3600_000).toISOString() }];
    const bids = [{ id: 10, bid_amount: 250, advisor_id: 99 }];
    const advisor = { name: "Jane Doe" };
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: jobs });
      if (callCount === 2) return makeChain({ data: bids });
      if (callCount === 3) {
        const c = makeChain({ data: advisor });
        return c;
      }
      return makeChain({ data: null });
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; skipped: number };
    expect(body.sent).toBe(1);
    expect(mockSendQuoteExpiry).toHaveBeenCalledWith(
      "client@example.com",
      "Alice",
      "Find Advisor",
      "j3",
      1,
      250,
      "Jane Doe"
    );
  });

  it("counts skipped when sendQuoteExpiryReminderEmail returns false", async () => {
    mockSendQuoteExpiry.mockResolvedValue(false);
    const jobs = [{ id: 4, slug: "j4", job_title: "Job 4", contact_email: "x@example.com", contact_name: "X", ends_at: new Date(Date.now() + 23 * 3600_000).toISOString() }];
    const bids = [{ id: 20, bid_amount: 150, advisor_id: 77 }];
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: jobs });
      if (callCount === 2) return makeChain({ data: bids });
      if (callCount === 3) return makeChain({ data: { name: "Advisor" } });
      return makeChain({ data: null });
    });
    const res = await GET(makeReq());
    const body = await res.json() as { sent: number; skipped: number };
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
  });

  it("uses first word of contact_name as firstName and falls back to 'there'", async () => {
    const jobs = [{ id: 5, slug: "j5", job_title: "J5", contact_email: "y@example.com", contact_name: null, ends_at: new Date(Date.now() + 23 * 3600_000).toISOString() }];
    const bids = [{ id: 30, bid_amount: 100, advisor_id: 55 }];
    let callCount = 0;
    mockAdminFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: jobs });
      if (callCount === 2) return makeChain({ data: bids });
      if (callCount === 3) return makeChain({ data: null }); // no advisor found
      return makeChain({ data: null });
    });
    await GET(makeReq());
    expect(mockSendQuoteExpiry).toHaveBeenCalledWith(
      "y@example.com",
      "there",
      "J5",
      "j5",
      1,
      100,
      null
    );
  });
});
