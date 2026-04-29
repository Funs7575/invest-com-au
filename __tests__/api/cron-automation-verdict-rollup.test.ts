import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({ wrapCronHandler: (_n: string, h: unknown) => h }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/cron/automation-verdict-rollup/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "upsert", "eq", "gte", "lte", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/automation-verdict-rollup", { method: "GET" });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
});

describe("GET /api/cron/automation-verdict-rollup", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok with zero upserts when all tables are empty", async () => {
    // The handler processes 2 days (yesterday + today).
    // Per day: 6 rollup calls (lead_disputes, investment_listings,
    //   user_reviews + professional_reviews [Promise.all], advisor_applications,
    //   broker_data_changes, campaigns) = 7 from() calls (text_moderation does 2).
    // Then for each of the 6 result rows, 1 upsert call.
    // So per day: 7 select + 6 upsert = 13. For 2 days: 26.
    mockCreateAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "automation_verdict_daily") return makeChain({ data: null, error: null }); // upsert
        return makeChain({ data: [], error: null }); // any source table
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    // 6 features × 2 days = 12 upserts (all succeed)
    expect(body.upserts).toBe(12);
    expect(body.failed).toBe(0);
  });

  it("counts upsert failures in stats.failed", async () => {
    mockCreateAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "automation_verdict_daily") return makeChain({ data: null, error: { message: "conflict" } });
        return makeChain({ data: [], error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.failed).toBe(12); // all upserts fail
    expect(body.upserts).toBe(0);
  });

  it("aggregates lead_disputes verdicts correctly", async () => {
    const disputes = [
      { auto_resolved_verdict: "refund", status: "approved", refunded_cents: 2000 },
      { auto_resolved_verdict: "escalate", status: "pending", refunded_cents: null },
      { auto_resolved_verdict: "reject", status: "rejected", refunded_cents: 0 },
    ];
    const upsertedRows: unknown[] = [];
    mockCreateAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "automation_verdict_daily") {
          const chain = makeChain({ data: null, error: null });
          const origUpsert = chain.upsert as ReturnType<typeof vi.fn>;
          origUpsert.mockImplementation((row: unknown) => { upsertedRows.push(row); return chain; });
          return chain;
        }
        if (table === "lead_disputes") return makeChain({ data: disputes, error: null });
        return makeChain({ data: [], error: null });
      }),
    } as never);
    await GET(makeReq());
    // Find the lead_disputes row from today's day
    const ldRows = upsertedRows.filter((r) => (r as { feature: string }).feature === "lead_disputes");
    expect(ldRows.length).toBeGreaterThanOrEqual(1);
    const row = ldRows[ldRows.length - 1] as { auto_acted: number; escalated: number; refunded_cents: number };
    expect(row.auto_acted).toBe(2); // refund + reject
    expect(row.escalated).toBe(1);
    expect(row.refunded_cents).toBe(2000);
  });

  it("continues to next day when one day's rollup throws", async () => {
    let callCount = 0;
    mockCreateAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        callCount++;
        if (callCount <= 2 && table === "lead_disputes") throw new Error("first day explodes");
        if (table === "automation_verdict_daily") return makeChain({ data: null, error: null });
        return makeChain({ data: [], error: null });
      }),
    } as never);
    const res = await GET(makeReq());
    const body = await res.json();
    // One day failed, one day succeeded (6 upserts)
    expect(body.ok).toBe(true);
    expect(body.failed).toBeGreaterThanOrEqual(1);
  });
});
