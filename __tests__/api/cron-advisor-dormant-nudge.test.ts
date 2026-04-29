import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
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

const mockIsFeatureDisabled = vi.fn(async () => false);
vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: (...args: unknown[]) => mockIsFeatureDisabled(...args),
}));

vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: unknown) => String(s ?? "") }));

vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("ok", { status: 200 }))));

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
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { error: null })),
  })),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/advisor-dormant-nudge/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/advisor-dormant-nudge") as unknown as NextRequest;
}

const now = Date.now();
const THIRTY_ONE_DAYS_AGO = new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString();
const SIXTY_ONE_DAYS_AGO  = new Date(now - 61 * 24 * 60 * 60 * 1000).toISOString();
const NINETY_ONE_DAYS_AGO = new Date(now - 91 * 24 * 60 * 60 * 1000).toISOString();
const FIVE_DAYS_AGO       = new Date(now -  5 * 24 * 60 * 60 * 1000).toISOString();

function advisor(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1",
    name: "Alice",
    email: "alice@example.com",
    created_at: THIRTY_ONE_DAYS_AGO,
    last_login_at: null,
    advisor_dormant_nudged_at: null,
    status: "active",
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/advisor-dormant-nudge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbIdx = 0;
    dbQueue.length = 0;
    mockIsFeatureDisabled.mockResolvedValue(false);
    vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
    delete process.env.RESEND_API_KEY;
  });

  afterAll(() => { vi.restoreAllMocks(); });

  it("exports nodejs runtime and maxDuration=120", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(120);
  });

  it("returns 401 when requireCronAuth rejects, no DB calls", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response("Unauthorized", { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(dbIdx).toBe(0);
  });

  it("returns skipped when kill switch is on", async () => {
    mockIsFeatureDisabled.mockResolvedValueOnce(true);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("kill_switch_on");
    expect(dbIdx).toBe(0);
  });

  it("returns 500 fetch_failed when DB query errors", async () => {
    dbQueue.push({ data: null, error: { message: "connection refused" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("fetch_failed");
  });

  it("returns all-zero stats when no advisors", async () => {
    dbQueue.push({ data: [], error: null });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scanned).toBe(0);
    expect(body.nudged_30).toBe(0);
    expect(body.nudged_60).toBe(0);
    expect(body.skipped).toBe(0);
    expect(dbIdx).toBe(1); // only the select
  });

  it("nudges 30d dormant advisor and stamps nudged_at", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    dbQueue.push({ data: [advisor({ last_login_at: THIRTY_ONE_DAYS_AGO })], error: null });
    dbQueue.push({ error: null }); // update advisor_dormant_nudged_at
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.nudged_30).toBe(1);
    expect(body.nudged_60).toBe(0);
    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
    expect(dbIdx).toBe(2);
  });

  it("nudges 60d dormant advisor with different email tier", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    dbQueue.push({ data: [advisor({ last_login_at: SIXTY_ONE_DAYS_AGO })], error: null });
    dbQueue.push({ error: null }); // update
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.nudged_60).toBe(1);
    expect(body.nudged_30).toBe(0);
  });

  it("skips advisor dormant >90 days", async () => {
    dbQueue.push({ data: [advisor({ created_at: NINETY_ONE_DAYS_AGO, last_login_at: NINETY_ONE_DAYS_AGO })], error: null });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.nudged_30).toBe(0);
    // No update call
    expect(dbIdx).toBe(1);
  });

  it("skips advisor nudged within 14 days", async () => {
    dbQueue.push({ data: [advisor({ last_login_at: THIRTY_ONE_DAYS_AGO, advisor_dormant_nudged_at: FIVE_DAYS_AGO })], error: null });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.nudged_30).toBe(0);
    expect(dbIdx).toBe(1);
  });
});
