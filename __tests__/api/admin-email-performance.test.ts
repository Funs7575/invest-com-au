import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({ requireAdmin: () => mockRequireAdmin() }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "order", "limit"]) b[m] = vi.fn(() => b);
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

// email_captures is queried 3 times (full list, bounced count, bounce list) with
// different shapes; resolve those by call order. Everything else is by table name.
let tableResults: Record<string, unknown> = {};
let emailCapturesQueue: unknown[] = [];
const mockFrom = vi.fn((table: string) => {
  if (table === "email_captures" && emailCapturesQueue.length) {
    return makeBuilder(emailCapturesQueue.shift());
  }
  return makeBuilder(tableResults[table] ?? { data: [], error: null });
});
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/admin/email-performance/route";

function makeReq(period?: string): NextRequest {
  const url = period
    ? `http://localhost/api/admin/email-performance?period=${period}`
    : "http://localhost/api/admin/email-performance";
  return new Request(url) as unknown as NextRequest;
}

describe("/api/admin/email-performance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ ok: true, email: "admin@invest.com.au", userId: "u1" });
    tableResults = {};
    emailCapturesQueue = [];
  });

  it("denies non-admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("aggregates metrics including quiz_leads (service-role-only)", async () => {
    emailCapturesQueue = [
      // 1: full capture list
      { data: [
        { id: 1, source: "popup", created_at: "2026-06-01T00:00:00Z", utm_source: "google", status: "active" },
        { id: 2, source: "popup", created_at: "2026-06-02T00:00:00Z", utm_source: null, status: "active" },
      ], error: null },
      // 2: bounced count
      { data: null, count: 1, error: null },
      // 3: bounce list
      { data: [{ email: "bounce@x.com", status: "bounced" }], error: null },
    ];
    tableResults = {
      quiz_leads: { data: [{ email: "q@x.com", unsubscribed: false, created_at: "2026-06-01T00:00:00Z" }], count: 0, error: null },
      fee_alert_subscriptions: { data: [{ email: "f@x.com", verified: true }, { email: "g@x.com", verified: false }], error: null },
      investor_drip_log: { data: [{ email: "d@x.com", template_id: "welcome", sent_at: "2026-06-01T00:00:00Z" }], error: null },
    };
    const res = await GET(makeReq("30d"));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.totalCaptures).toBe(2);
    expect(json.totalQuiz).toBe(1); // would be 0 reading via the browser anon client
    expect(json.totalFeeAlerts).toBe(1); // only verified
    expect(json.dripsSent).toBe(1);
    expect(json.capturesBySource).toEqual([["popup", 2]]);
    expect(json.capturesByUtm).toEqual([["google", 1]]);
    expect(json.recentBounces).toEqual(["bounce@x.com"]);
  });

  it("returns 500 when a read errors", async () => {
    tableResults = { quiz_leads: { data: null, error: { message: "denied" } } };
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });
});
