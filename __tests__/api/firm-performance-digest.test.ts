import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockRequireCronAuth,
  mockFrom,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockRequireCronAuth: vi.fn(),
  mockFrom: vi.fn(),
  mockSendEmail: vi.fn(),
}));

vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: mockRequireCronAuth }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock("@/lib/resend", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/url", () => ({ getSiteUrl: vi.fn(() => "https://invest.com.au") }));
vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: vi.fn(async (_name: string, fn: () => Promise<{ response: Response }>) => {
    const result = await fn();
    return result.response;
  }),
}));

import { GET } from "@/app/api/cron/firm-performance-digest/route";

function makeReq(): NextRequest {
  return new NextRequest("http://localhost/api/cron/firm-performance-digest", {
    headers: { Authorization: "Bearer test-cron-secret" },
  });
}

/**
 * Makes a mock Supabase chain that is:
 * - Chainable: every builder method (select, eq, not, gte, lte, in, order) returns `this`
 * - Awaitable: `await chain` resolves to `{ data, error }`
 */
function makeChain(data: unknown, error: unknown = null) {
  const terminal = { data, error };
  // Build as a plain object that is also PromiseLike
  const chain: Record<string, unknown> & { then: (r: (v: typeof terminal) => void) => void } = {
    then: (resolve: (v: typeof terminal) => void) => resolve(terminal),
  };
  for (const m of ["select", "eq", "not", "gte", "lte", "in", "order", "limit"]) {
    chain[m] = vi.fn(() => chain);
  }
  // single/maybeSingle return Promises (they are awaited separately)
  chain["single"] = vi.fn(() => Promise.resolve(terminal));
  chain["maybeSingle"] = vi.fn(() => Promise.resolve(terminal));
  return chain;
}

const ADMIN_ROWS = [
  { id: 1, name: "Alice Smith", email: "alice@firm.com", firm_id: 10 },
  { id: 2, name: "Bob Jones", email: "bob@firm.com", firm_id: 10 },
];

const MEMBER_ROWS = [
  { id: 1, name: "Alice Smith" },
  { id: 2, name: "Bob Jones" },
  { id: 3, name: "Carol Brown" },
];

const METRIC_ROWS = [
  { professional_id: 1, profile_views: 120, enquiry_count: 8, booking_clicks: 3 },
  { professional_id: 2, profile_views: 80, enquiry_count: 5, booking_clicks: 2 },
  { professional_id: 3, profile_views: 50, enquiry_count: 12, booking_clicks: 1 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireCronAuth.mockReturnValue(null);
  mockSendEmail.mockResolvedValue({ ok: true });
});

describe("GET /api/cron/firm-performance-digest", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(
      new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns sent:0 when no firm admins exist", async () => {
    mockFrom.mockReturnValue(makeChain([]));
    const res = await GET(makeReq());
    const body = (await res.json()) as { success: boolean; sent: number };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.sent).toBe(0);
  });

  it("sends digest emails when firm admins and metrics exist", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain(ADMIN_ROWS);
      if (callCount === 2) return makeChain(MEMBER_ROWS);
      if (callCount === 3) return makeChain(METRIC_ROWS);
      return makeChain([]);
    });

    const res = await GET(makeReq());
    const body = (await res.json()) as { success: boolean; sent: number };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.sent).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);

    const firstCall = mockSendEmail.mock.calls[0]?.[0] as { to: string; subject: string; html: string };
    expect(firstCall.to).toBe("alice@firm.com");
    expect(firstCall.subject).toContain("weekly performance");
    // Carol has highest enquiries (12)
    expect(firstCall.html).toContain("Carol Brown");
  });

  it("continues sending if sendEmail throws for one admin", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain(ADMIN_ROWS);
      if (callCount === 2) return makeChain(MEMBER_ROWS);
      if (callCount === 3) return makeChain(METRIC_ROWS);
      return makeChain([]);
    });
    mockSendEmail
      .mockRejectedValueOnce(new Error("email failed"))
      .mockResolvedValueOnce({ ok: true });

    const res = await GET(makeReq());
    const body = (await res.json()) as { success: boolean; sent: number };
    expect(body.sent).toBe(1);
  });

  it("returns 500 when admin query errors", async () => {
    mockFrom.mockReturnValue(makeChain(null, { message: "db error" }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("skips firms with no active members", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain(ADMIN_ROWS);
      if (callCount === 2) return makeChain([]);
      return makeChain([]);
    });

    const res = await GET(makeReq());
    const body = (await res.json()) as { success: boolean; sent: number };
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
