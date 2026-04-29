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

// sendEmail mock — controls whether the email send succeeds
const mockSendEmail = vi.fn(async () => ({ ok: true }));
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

// Two call types per row:
//   1. select pending rows (one call)
//   2. update reminder_sent_at (one call per row that sent successfully)
// We use a queue of results consumed in order.
interface DbResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
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

import { GET, runtime, maxDuration } from "@/app/api/cron/account-deletion-reminder/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/account-deletion-reminder") as unknown as NextRequest;
}

const IN_5_DAYS = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
const PENDING_ROWS = [
  { id: "r1", email: "alice@example.com", scheduled_purge_at: IN_5_DAYS },
  { id: "r2", email: "bob@example.com",   scheduled_purge_at: IN_5_DAYS },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/account-deletion-reminder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbIdx = 0;
    dbQueue.length = 0;
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue({ ok: true });
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterAll(() => { vi.restoreAllMocks(); });

  it("exports nodejs runtime and maxDuration=60", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("returns 401 when requireCronAuth rejects, makes no DB calls", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response("Unauthorized", { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(dbIdx).toBe(0);
  });

  it("returns ok=true skipping gracefully when table doesn't exist yet (42P01)", async () => {
    dbQueue.push({ data: null, error: { message: "relation does not exist", code: "42P01" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("table_not_migrated");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns ok=true skipping when error message contains 'does not exist'", async () => {
    dbQueue.push({ data: null, error: { message: "table account_deletion_requests does not exist" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe("table_not_migrated");
  });

  it("returns 500 on unexpected DB error", async () => {
    dbQueue.push({ data: null, error: { message: "connection refused" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("connection refused");
  });

  it("returns {ok:true, sent:0, failed:0} when no pending rows", async () => {
    dbQueue.push({ data: [], error: null });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.failed).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("happy path — sends reminder emails and stamps reminder_sent_at for each row", async () => {
    // select → 2 rows; then one update per row
    dbQueue.push({ data: PENDING_ROWS, error: null });
    dbQueue.push({ error: null }); // update r1
    dbQueue.push({ error: null }); // update r2
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(2);
    expect(body.failed).toBe(0);
    expect(body.total).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    // Each email is to the correct recipient
    expect(mockSendEmail.mock.calls[0]?.[0]).toMatchObject({ to: "alice@example.com" });
    expect(mockSendEmail.mock.calls[1]?.[0]).toMatchObject({ to: "bob@example.com" });
  });

  it("increments failed and skips stamp when sendEmail returns ok=false", async () => {
    dbQueue.push({ data: [PENDING_ROWS[0]], error: null });
    mockSendEmail.mockResolvedValueOnce({ ok: false, error: "rate limited" });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false); // failed !== 0
    expect(body.sent).toBe(0);
    expect(body.failed).toBe(1);
    // No update should have been called (stamp is skipped on failure)
    expect(dbIdx).toBe(1);
  });

  it("email subject includes the purge-date countdown", async () => {
    dbQueue.push({ data: [PENDING_ROWS[0]], error: null });
    dbQueue.push({ error: null });
    await GET(makeReq());
    const subject = mockSendEmail.mock.calls[0]?.[0]?.subject as string;
    expect(subject).toMatch(/Final reminder/i);
    expect(subject).toMatch(/day/i);
  });

  it("stamp update fires after each successful send (verified by sent count)", async () => {
    // select → 1 row; update → success; confirms stamp-then-count path
    dbQueue.push({ data: [PENDING_ROWS[0]], error: null });
    dbQueue.push({ error: null }); // reminder_sent_at stamp
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.failed).toBe(0);
    // 2 from() calls: 1 select + 1 update
    expect(dbIdx).toBe(2);
  });
});
