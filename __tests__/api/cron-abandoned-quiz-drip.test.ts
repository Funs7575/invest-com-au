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

const mockIsFeatureDisabled = vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false);
vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: (...args: unknown[]) => mockIsFeatureDisabled(...args),
}));

const mockBuildEmailToUserIdMap = vi.fn<(...args: unknown[]) => Promise<Map<string, string>>>(
  async () => new Map<string, string>(),
);
const mockNotifyUser = vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false);
vi.mock("@/lib/notifications", () => ({
  buildEmailToUserIdMap: (...args: unknown[]) => mockBuildEmailToUserIdMap(...args),
  notifyUser: (...args: unknown[]) => mockNotifyUser(...args),
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

import { GET, runtime, maxDuration } from "@/app/api/cron/abandoned-quiz-drip/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/abandoned-quiz-drip") as unknown as NextRequest;
}

const now = Date.now();

function lead(overrides: Record<string, unknown> = {}) {
  return {
    id: "lead-1",
    email: "quiz@example.com",
    name: "Alice",
    captured_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3d ago
    drip_step: 0,
    drip_last_sent_at: null,
    unsubscribed: false,
    converted_at: null,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/abandoned-quiz-drip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbIdx = 0;
    dbQueue.length = 0;
    mockIsFeatureDisabled.mockResolvedValue(false);
    mockBuildEmailToUserIdMap.mockResolvedValue(new Map());
    mockNotifyUser.mockResolvedValue(false);
    vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
    delete process.env.RESEND_API_KEY;
  });

  afterAll(() => { vi.restoreAllMocks(); });

  it("exports nodejs runtime and maxDuration=120", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(120);
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response("Unauthorized", { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
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
    // buildEmailToUserIdMap calls supabase internally — but it's mocked; only quiz_leads call is real
    dbQueue.push({ data: null, error: { message: "DB unreachable" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("fetch_failed");
  });

  it("returns zero stats when no leads", async () => {
    dbQueue.push({ data: [], error: null });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scanned).toBe(0);
    expect(body.sent_step_1).toBe(0);
  });

  it("sends step-1 for lead that is 2+ days old with drip_step=0", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const twoDayLead = lead({ captured_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), drip_step: 0 });
    dbQueue.push({ data: [twoDayLead], error: null }); // quiz_leads fetch
    dbQueue.push({ error: null }); // update drip_step
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent_step_1).toBe(1);
    expect(body.sent_step_2).toBe(0);
    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ method: "POST" }));
  });

  it("sends step-2 for lead at 7+ days with drip_step=1 and last-sent 24h+ ago", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const sevenDayLead = lead({
      captured_at: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
      drip_step: 1,
      drip_last_sent_at: new Date(now - 25 * 60 * 60 * 1000).toISOString(), // 25h ago
    });
    dbQueue.push({ data: [sevenDayLead], error: null });
    dbQueue.push({ error: null }); // update
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent_step_2).toBe(1);
    expect(body.sent_step_1).toBe(0);
  });

  it("sends step-3 for lead at 14+ days with drip_step=2 and last-sent 24h+ ago", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const fourteenDayLead = lead({
      captured_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(),
      drip_step: 2,
      drip_last_sent_at: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
    });
    dbQueue.push({ data: [fourteenDayLead], error: null });
    dbQueue.push({ error: null }); // update
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent_step_3).toBe(1);
  });

  it("skips lead when no eligible next step and increments skipped", async () => {
    // Lead at 1 day with step=0 — not yet ready for step 1 (needs 2d)
    const tooNewLead = lead({ captured_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), drip_step: 0 });
    dbQueue.push({ data: [tooNewLead], error: null });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe(1);
    expect(body.sent_step_1).toBe(0);
    // No update DB call
    expect(dbIdx).toBe(1);
  });

  it("fires in-app notification when user has registered post-quiz", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    const emailMap = new Map([["quiz@example.com", "user-uuid-1"]]);
    mockBuildEmailToUserIdMap.mockResolvedValueOnce(emailMap);
    mockNotifyUser.mockResolvedValueOnce(true);
    const twoDayLead = lead({ drip_step: 0 });
    dbQueue.push({ data: [twoDayLead], error: null });
    dbQueue.push({ error: null }); // update
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.inboxed).toBe(1);
    expect(mockNotifyUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-uuid-1" }));
  });
});
