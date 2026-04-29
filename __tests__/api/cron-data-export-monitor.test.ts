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

const mockSendEmail = vi.fn(async () => ({ ok: true }));
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

type ExportRow = { id: string; user_id: string; email: string; requested_at: string };

let staleRows: ExportRow[] | null = [];
let fetchError: { message: string } | null = null;

function makeChain() {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "lt", "lte", "gte", "is", "in", "order", "limit"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: { data: ExportRow[] | null; error: typeof fetchError }) => unknown) =>
    Promise.resolve(resolve({ data: staleRows, error: fetchError }));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain()),
  })),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/data-export-monitor/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/data-export-monitor") as unknown as NextRequest;
}

const nowMs = Date.now();
// Row older than 7 days (reminder bucket)
const reminderRow: ExportRow = {
  id: "r1",
  user_id: "u1",
  email: "user@example.com",
  requested_at: new Date(nowMs - 10 * 24 * 60 * 60 * 1000).toISOString(),
};
// Row older than 25 days (urgent bucket)
const urgentRow: ExportRow = {
  id: "r2",
  user_id: "u2",
  email: "user2@example.com",
  requested_at: new Date(nowMs - 27 * 24 * 60 * 60 * 1000).toISOString(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/data-export-monitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    staleRows = [];
    fetchError = null;
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue({ ok: true });
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_EMAILS;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterAll(() => { vi.restoreAllMocks(); });

  it("exports nodejs runtime and maxDuration=30", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(30);
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response("Unauthorized", { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when the DB query fails", async () => {
    fetchError = { message: "DB connection timeout" };
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("DB connection timeout");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns {ok:true, stale_count:0} when no stale requests", async () => {
    staleRows = [];
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.stale_count).toBe(0);
    expect(body.urgent_count).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns error when no admin email env var is configured", async () => {
    staleRows = [reminderRow];
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/No admin email/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("picks ADMIN_NOTIFICATION_EMAIL first, then ADMIN_EMAIL, then ADMIN_EMAILS[0]", async () => {
    staleRows = [reminderRow];
    process.env.ADMIN_EMAILS = "fallback@example.com,other@example.com";
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockSendEmail.mock.calls[0]?.[0]?.to).toBe("fallback@example.com");
  });

  it("happy path — reminder-only rows: sends one email with correct subject", async () => {
    staleRows = [reminderRow];
    process.env.ADMIN_NOTIFICATION_EMAIL = "admin@invest.com.au";
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.stale_count).toBe(1);
    expect(body.urgent_count).toBe(0);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const call = mockSendEmail.mock.calls[0]?.[0] as { to: string; subject: string };
    expect(call.to).toBe("admin@invest.com.au");
    expect(call.subject).not.toMatch(/URGENT/i);
  });

  it("happy path — urgent rows: subject contains URGENT and correct counts", async () => {
    staleRows = [urgentRow, reminderRow]; // urgentRow is older than 25 days
    process.env.ADMIN_NOTIFICATION_EMAIL = "admin@invest.com.au";
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.stale_count).toBe(2);
    expect(body.urgent_count).toBe(1);
    const subject = (mockSendEmail.mock.calls[0]?.[0] as { subject: string }).subject;
    expect(subject).toMatch(/URGENT/i);
  });

  it("returns ok=false when sendEmail fails", async () => {
    staleRows = [reminderRow];
    process.env.ADMIN_NOTIFICATION_EMAIL = "admin@invest.com.au";
    mockSendEmail.mockResolvedValueOnce({ ok: false, error: "rate limited" });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("rate limited");
    // Counts still present in response
    expect(body.stale_count).toBe(1);
  });

  it("alert_sent_to is included in the success response", async () => {
    staleRows = [reminderRow];
    process.env.ADMIN_NOTIFICATION_EMAIL = "admin@invest.com.au";
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.alert_sent_to).toBe("admin@invest.com.au");
  });
});
