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

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAIL: "admin@invest.com.au",
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => "https://invest.com.au",
}));

// DB call queue — consumed in order.
// The route calls supabase.from("professional_leads") once per SLA tier
// (hot, warm, cold) in that order.
interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
}

const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "update", "insert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or", "order", "limit",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  const r = { data: res.data ?? null, error: res.error ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { data: null, error: null })),
  })),
}));

// Suppress fetch (Resend alert email) by default; individual tests can override.
vi.stubGlobal(
  "fetch",
  vi.fn(() => Promise.resolve(new Response(JSON.stringify({ id: "email-1" }), { status: 200 }))),
);

import { GET, runtime, maxDuration } from "@/app/api/cron/lead-sla-check/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/lead-sla-check") as unknown as NextRequest;
}

function lead(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    user_name: "Alice Smith",
    user_email: "alice@example.com",
    quality_score: 75,
    created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(), // 6 min ago
    professional_id: 42,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/lead-sla-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbQueue.length = 0;
    dbIdx = 0;
    vi.unstubAllEnvs();
    vi.stubEnv("RESEND_API_KEY", "test-resend-key");
  });

  it("exports runtime=nodejs and maxDuration=60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response("Unauthorized", { status: 401 }) as unknown as ReturnType<typeof requireCronAuth>,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok:true with breaches:0 when no leads breach SLA", async () => {
    // Three tier queries, all return empty
    dbQueue.push({ data: [] }, { data: [] }, { data: [] });

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; breaches: number };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.breaches).toBe(0);
    // No alert email sent
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("detects a single hot lead breach and sends alert", async () => {
    const hotLead = lead({ quality_score: 85, id: 10 });
    dbQueue.push(
      { data: [hotLead] }, // hot tier
      { data: [] },        // warm tier
      { data: [] },        // cold tier
    );

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; breaches: number; breakdown: Array<{ tier: string; count: number }> };
    expect(body.ok).toBe(true);
    expect(body.breaches).toBe(1);
    expect(body.breakdown).toEqual([{ tier: "hot", count: 1 }]);

    // Alert email sent to admin
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const emailBody = JSON.parse(init.body as string) as { subject: string; text: string; to: string[] };
    expect(emailBody.subject).toMatch(/\[LEAD SLA\]/);
    expect(emailBody.subject).toMatch(/1 lead past SLA/);
    expect(emailBody.text).toMatch(/HOT/);
    expect(emailBody.text).toMatch(/5 min/);
    expect(emailBody.text).toMatch(/Lead #10/);
    expect(emailBody.to).toContain("admin@invest.com.au");
  });

  it("detects warm lead breach", async () => {
    const warmLead = lead({ quality_score: 55, id: 20 });
    dbQueue.push(
      { data: [] },
      { data: [warmLead] },
      { data: [] },
    );

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; breaches: number; breakdown: Array<{ tier: string; count: number }> };
    expect(body.breaches).toBe(1);
    expect(body.breakdown).toEqual([{ tier: "warm", count: 1 }]);
    const emailBody = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string) as { text: string };
    expect(emailBody.text).toMatch(/WARM/);
    expect(emailBody.text).toMatch(/30 min/);
  });

  it("detects cold lead breach with null quality_score", async () => {
    const coldLead = lead({ quality_score: null, id: 30 });
    dbQueue.push(
      { data: [] },
      { data: [] },
      { data: [coldLead] },
    );

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; breaches: number; breakdown: Array<{ tier: string; count: number }> };
    expect(body.breaches).toBe(1);
    expect(body.breakdown).toEqual([{ tier: "cold", count: 1 }]);
    const emailBody = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string) as { text: string };
    expect(emailBody.text).toMatch(/COLD/);
    expect(emailBody.text).toMatch(/4 h/);
    expect(emailBody.text).toMatch(/unscored/);
  });

  it("aggregates breaches across multiple tiers", async () => {
    dbQueue.push(
      { data: [lead({ id: 1 }), lead({ id: 2 })] }, // 2 hot
      { data: [lead({ quality_score: 50, id: 3 })] }, // 1 warm
      { data: [] },
    );

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; breaches: number; breakdown: Array<{ tier: string; count: number }> };
    expect(body.breaches).toBe(3);
    expect(body.breakdown).toEqual([
      { tier: "hot", count: 2 },
      { tier: "warm", count: 1 },
    ]);
    expect(vi.mocked(fetch).mock.calls[0]).toBeTruthy();
    const subj = (JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string) as { subject: string }).subject;
    expect(subj).toMatch(/3 leads past SLA/);
  });

  it("continues to next tier when one tier DB query errors", async () => {
    dbQueue.push(
      { error: { message: "DB error" } }, // hot fails
      { data: [lead({ quality_score: 50, id: 5 })] }, // warm succeeds
      { data: [] },
    );

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; breaches: number };
    // Should still return the warm breach
    expect(body.breaches).toBe(1);
  });

  it("skips alert email when RESEND_API_KEY is not set", async () => {
    vi.unstubAllEnvs();
    dbQueue.push(
      { data: [lead({ id: 99 })] },
      { data: [] },
      { data: [] },
    );

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; breaches: number };
    expect(body.breaches).toBe(1);
    // fetch should not be called (no API key)
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("does not throw when alert fetch rejects (fire-and-forget)", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));
    dbQueue.push(
      { data: [lead({ id: 7 })] },
      { data: [] },
      { data: [] },
    );

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; breaches: number };
    // Route should still return ok
    expect(body.ok).toBe(true);
    expect(body.breaches).toBe(1);
  });

  it("includes admin dashboard link in alert text", async () => {
    dbQueue.push(
      { data: [lead({ id: 8 })] },
      { data: [] },
      { data: [] },
    );

    await GET(makeReq());
    const emailBody = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string) as { text: string };
    expect(emailBody.text).toMatch(/invest\.com\.au\/admin\/advisors/);
  });
});
