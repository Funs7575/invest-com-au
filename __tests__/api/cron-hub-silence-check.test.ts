import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, fn: (req: NextRequest) => Promise<Response>) => fn,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "ops@invest.com.au" }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

// Supabase admin mock — sequential queue of responses per `from()` call
let dbQueue: Array<{ data: unknown; error: unknown }> = [];
let dbIdx = 0;

function makeChain(res: { data: unknown; error: unknown }) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    not: () => chain,
    in: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: () => Promise.resolve(res),
    then: (resolve: (v: typeof res) => unknown) => Promise.resolve(res).then(resolve),
  };
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { data: null, error: null })),
  }),
}));

const fetchMock = vi.fn<typeof fetch>(() => Promise.resolve(new Response("{}", { status: 200 })));
vi.stubGlobal("fetch", fetchMock);

// ── Constants ─────────────────────────────────────────────────────────────────

// Wed 2026-05-06 11:00 AEST = 01:00 UTC → business hours
const BUSINESS_UTC = new Date("2026-05-06T01:00:00Z");
// Sat 2026-05-09 11:00 AEST = 01:00 UTC → weekend
const WEEKEND_UTC = new Date("2026-05-09T01:00:00Z");

// ── Import module (after mocks declared; vi.mock is hoisted) ──────────────────

const { GET, isBusinessHoursAest } =
  await import("@/app/api/cron/hub-silence-check/route");

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeReq() {
  return new NextRequest("http://localhost/api/cron/hub-silence-check", {
    headers: { authorization: "Bearer test-secret" },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  fetchMock.mockClear();
  vi.useFakeTimers();
  vi.setSystemTime(BUSINESS_UTC);
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.RESEND_API_KEY;
});

describe("module exports", () => {
  it("exports runtime = nodejs", async () => {
    const mod = await import("@/app/api/cron/hub-silence-check/route");
    expect(mod.runtime).toBe("nodejs");
  });
  it("exports maxDuration = 60", async () => {
    const mod = await import("@/app/api/cron/hub-silence-check/route");
    expect(mod.maxDuration).toBe(60);
  });
});

describe("isBusinessHoursAest", () => {
  it("returns true at 11:00 AEST on a Wednesday", () => {
    expect(isBusinessHoursAest(BUSINESS_UTC)).toBe(true);
  });
  it("returns false on a Saturday", () => {
    expect(isBusinessHoursAest(WEEKEND_UTC)).toBe(false);
  });
  it("returns false before 09:00 AEST", () => {
    // Wed 08:59 AEST = Tue 22:59 UTC
    expect(isBusinessHoursAest(new Date("2026-05-05T22:59:00Z"))).toBe(false);
  });
  it("returns false at 17:00 AEST exactly", () => {
    // Wed 17:00 AEST = Wed 07:00 UTC
    expect(isBusinessHoursAest(new Date("2026-05-06T07:00:00Z"))).toBe(false);
  });
  it("returns false on Sunday", () => {
    expect(isBusinessHoursAest(new Date("2026-05-10T02:00:00Z"))).toBe(false);
  });
});

describe("GET /api/cron/hub-silence-check", () => {
  it("returns 401 when cron auth fails", async () => {
    const { requireCronAuth } = await import("@/lib/cron-auth");
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("skips and returns 200 outside AEST business hours", async () => {
    vi.setSystemTime(WEEKEND_UTC);
    const res = await GET(makeReq());
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.skipped).toMatch(/business hours/);
  });

  it("returns 500 when professionals query errors", async () => {
    dbQueue = [{ data: null, error: { message: "DB refused" } }];
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns 500 when leads query errors", async () => {
    dbQueue = [
      { data: [{ id: 1, type: "financial_planner" }], error: null },
      { data: null, error: { message: "timeout" } },
    ];
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns early with hubs=0 when no active professionals exist", async () => {
    dbQueue = [{ data: [], error: null }];
    const res = await GET(makeReq());
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.hubs).toBe(0);
    expect(body.silenced).toBe(0);
  });

  it("reports silenced=0 when all hubs have recent leads (within threshold)", async () => {
    // financial_planner threshold = 2h; lead 30 min ago → silence 0.5h < 2h
    const recent = new Date(BUSINESS_UTC.getTime() - 30 * 60 * 1000).toISOString();
    dbQueue = [
      { data: [{ id: 1, type: "financial_planner" }], error: null },
      { data: [{ professional_id: 1, created_at: recent }], error: null },
    ];
    const res = await GET(makeReq());
    const body = await res.json() as Record<string, unknown>;
    expect(body.silenced).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fires alert when hub silence just crosses threshold window", async () => {
    // financial_planner threshold=2h; last lead 2.5h ago → silence ∈ [2h, 3h] → alert
    process.env.RESEND_API_KEY = "re_test_key";
    const lastAt = new Date(BUSINESS_UTC.getTime() - 2.5 * 60 * 60 * 1000).toISOString();
    dbQueue = [
      { data: [{ id: 1, type: "financial_planner" }], error: null },
      { data: [{ professional_id: 1, created_at: lastAt }], error: null },
    ];
    const res = await GET(makeReq());
    const body = await res.json() as Record<string, unknown>;
    expect(body.silenced).toBe(1);
    expect((body.breakdown as Array<Record<string, string>>)[0]!.hub).toBe("financial_planner");
    expect(fetchMock).toHaveBeenCalledOnce();
    const sent = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as Record<string, unknown>;
    expect(sent.subject as string).toMatch(/HUB SILENCE/);
    expect(sent.text as string).toContain("financial_planner");
  });

  it("does NOT alert when silence exceeds the threshold+window (already alerted earlier)", async () => {
    // financial_planner threshold=2h; last lead 4h ago → silence 4h > 3h (2+1) → no alert
    process.env.RESEND_API_KEY = "re_test_key";
    const lastAt = new Date(BUSINESS_UTC.getTime() - 4 * 60 * 60 * 1000).toISOString();
    dbQueue = [
      { data: [{ id: 1, type: "financial_planner" }], error: null },
      { data: [{ professional_id: 1, created_at: lastAt }], error: null },
    ];
    const res = await GET(makeReq());
    const body = await res.json() as Record<string, unknown>;
    expect(body.silenced).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips email when RESEND_API_KEY is absent even if silence detected", async () => {
    delete process.env.RESEND_API_KEY;
    const lastAt = new Date(BUSINESS_UTC.getTime() - 2.5 * 60 * 60 * 1000).toISOString();
    dbQueue = [
      { data: [{ id: 1, type: "financial_planner" }], error: null },
      { data: [{ professional_id: 1, created_at: lastAt }], error: null },
    ];
    await GET(makeReq());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses DEFAULT_SILENCE_HOURS (8h) for unknown hub types", async () => {
    // unknown hub; silence 8.5h → ∈ [8h, 9h] → alert
    process.env.RESEND_API_KEY = "re_test_key";
    const lastAt = new Date(BUSINESS_UTC.getTime() - 8.5 * 60 * 60 * 1000).toISOString();
    dbQueue = [
      { data: [{ id: 99, type: "mystery_advisor" }], error: null },
      { data: [{ professional_id: 99, created_at: lastAt }], error: null },
    ];
    const res = await GET(makeReq());
    const body = await res.json() as Record<string, unknown>;
    expect(body.silenced).toBe(1);
  });

  it("email text includes admin advisors dashboard link", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const lastAt = new Date(BUSINESS_UTC.getTime() - 2.5 * 60 * 60 * 1000).toISOString();
    dbQueue = [
      { data: [{ id: 1, type: "financial_planner" }], error: null },
      { data: [{ professional_id: 1, created_at: lastAt }], error: null },
    ];
    await GET(makeReq());
    const sent = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string) as Record<string, unknown>;
    expect(sent.text as string).toContain("/admin/advisors");
  });
});
