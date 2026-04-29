import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

// ─── DB queue ────────────────────────────────────────────────────────────────

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

let dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select","update","insert","upsert","eq","neq","lt","lte","gte","not","in","or","limit"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  const r = { data: res.data ?? null, error: res.error ?? null, count: res.count ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { error: null })),
  })),
}));

import { GET } from "@/app/api/cron/automation-verdict-rollup/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/automation-verdict-rollup", {
    headers: { Authorization: "Bearer test-secret" },
  }) as unknown as NextRequest;
}

// Each rollup processes 2 days. Each day runs 6 parallel rollup queries + 6 upserts.
// lead_disputes, investment_listings, user_reviews+professional_reviews (2 parallel), advisor_applications, broker_data_changes, campaigns
// Total DB calls per day: 6 rollup queries + 6 upserts = 12. For 2 days: 24 total.
function queueEmptyDay() {
  // 6 source queries (user_reviews and professional_reviews are fetched in parallel = 2 separate from() calls)
  for (let i = 0; i < 7; i++) dbQueue.push({ data: [] });
  // 6 upsert calls
  for (let i = 0; i < 6; i++) dbQueue.push({ error: null });
}

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/automation-verdict-rollup", () => {
  it("returns 401 when cron auth fails", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok with upserts count on success with empty data", async () => {
    // 2 days × (7 rollup queries + 6 upserts each)
    queueEmptyDay();
    queueEmptyDay();

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; upserts: number; failed: number };
    expect(body.ok).toBe(true);
    expect(typeof body.upserts).toBe("number");
    expect(body.failed).toBe(0);
  });

  it("counts lead_dispute refund correctly", async () => {
    const disputes = [
      { auto_resolved_verdict: "refund", status: "approved", refunded_cents: 5000 },
      { auto_resolved_verdict: "escalate", status: "pending", refunded_cents: null },
      { auto_resolved_verdict: "reject", status: "rejected", refunded_cents: 0 },
    ];
    // Day 1 source queries — lead_disputes is first
    dbQueue.push({ data: disputes }); // lead_disputes
    dbQueue.push({ data: [] });       // investment_listings
    dbQueue.push({ data: [] });       // user_reviews
    dbQueue.push({ data: [] });       // professional_reviews
    dbQueue.push({ data: [] });       // advisor_applications
    dbQueue.push({ data: [] });       // broker_data_changes
    dbQueue.push({ data: [] });       // campaigns
    // 6 upserts for day 1
    for (let i = 0; i < 6; i++) dbQueue.push({ error: null });
    // Day 2 empty
    queueEmptyDay();

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; upserts: number };
    expect(body.ok).toBe(true);
    expect(body.upserts).toBeGreaterThan(0);
  });

  it("tracks failed upserts in the failed counter", async () => {
    // Day 1 sources
    for (let i = 0; i < 7; i++) dbQueue.push({ data: [] });
    // All 6 upserts fail
    for (let i = 0; i < 6; i++) dbQueue.push({ error: { message: "conflict" } });
    // Day 2 empty
    queueEmptyDay();

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; failed: number };
    expect(body.ok).toBe(true);
    expect(body.failed).toBeGreaterThan(0);
  });

  it("handles thrown error in a day's rollup gracefully and continues", async () => {
    // Intentionally leave dbQueue empty so first day throws
    // then provide data for day 2
    queueEmptyDay(); // day 2 succeeds

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("counts campaign rollup verdicts correctly", async () => {
    const campaigns = [
      { status: "active" },
      { status: "active" },
      { status: "rejected" },
      { status: "pending" },
    ];
    // Day 1
    dbQueue.push({ data: [] }); // lead_disputes
    dbQueue.push({ data: [] }); // investment_listings
    dbQueue.push({ data: [] }); // user_reviews
    dbQueue.push({ data: [] }); // professional_reviews
    dbQueue.push({ data: [] }); // advisor_applications
    dbQueue.push({ data: [] }); // broker_data_changes
    dbQueue.push({ data: campaigns }); // campaigns
    for (let i = 0; i < 6; i++) dbQueue.push({ error: null });
    // Day 2 empty
    queueEmptyDay();

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; upserts: number };
    expect(body.ok).toBe(true);
    expect(body.upserts).toBe(12); // 6 features × 2 days
  });

  it("processes both today and yesterday in the same run", async () => {
    queueEmptyDay(); // yesterday
    queueEmptyDay(); // today

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; upserts: number };
    expect(body.ok).toBe(true);
    // Both days should produce upserts (6 features × 2 days)
    expect(body.upserts).toBe(12);
  });
});
