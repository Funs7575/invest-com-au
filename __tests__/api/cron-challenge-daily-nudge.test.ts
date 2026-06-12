import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockIsFlagEnabled, mockSendEmail } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn(
    async (..._a: unknown[]): Promise<boolean> => true,
  ),
  mockSendEmail: vi.fn(
    async (..._a: unknown[]): Promise<{ ok: boolean; error?: string }> => ({
      ok: true,
    }),
  ),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...a: unknown[]) => mockIsFlagEnabled(...a),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: (...a: unknown[]) => mockSendEmail(...a),
}));

vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

// withCronRunLog pass-through.
vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: vi.fn(
    async (
      _name: string,
      fn: () => Promise<{ response: unknown; stats?: Record<string, unknown> }>,
    ) => (await fn()).response,
  ),
}));

// ─── Per-table Supabase admin builder ─────────────────────────────────────────

interface TableState {
  selectData?: unknown;
  selectError?: unknown;
}

// Tracks update() calls so we can assert idempotency stamping.
const updateCalls: { table: string; payload: Record<string, unknown> }[] = [];
let tableData: Record<string, TableState> = {};

function makeBuilder(table: string) {
  const state = tableData[table] ?? {};
  const terminal = { data: state.selectData ?? null, error: state.selectError ?? null };
  const builder: Record<string, unknown> = {
    then: (resolve: (v: typeof terminal) => unknown) =>
      Promise.resolve(resolve(terminal)),
  };
  const passthrough = [
    "select", "eq", "neq", "in", "is", "or", "order", "limit", "gte", "lt",
    "single", "maybeSingle",
  ];
  for (const m of passthrough) builder[m] = vi.fn(() => builder);
  builder.update = vi.fn((payload: Record<string, unknown>) => {
    updateCalls.push({ table, payload });
    return builder;
  });
  return builder;
}

const mockFrom = vi.fn((table: string) => makeBuilder(table));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: (t: string) => mockFrom(t) })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { GET, runtime } from "@/app/api/cron/challenge-daily-nudge/route";

const SECRET = "test-cron-secret-challenge-nudge-9999";

function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/challenge-daily-nudge", {
    headers,
  }) as unknown as NextRequest;
}
function authedReq(): NextRequest {
  return req({ authorization: `Bearer ${SECRET}` });
}

// An "active" cohort: starts today (UTC), no end → active, day 1.
function activeCohort() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: "ch1",
    slug: "investment-ready-21",
    title: "Get Investment-Ready in 21 Days",
    description: null,
    curriculum_key: "investment-ready-21",
    starts_at: today,
    ends_at: null,
    enrolment_open: true,
    max_cohort: null,
    club_id: null,
    created_at: today,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  updateCalls.length = 0;
  tableData = {};
  mockIsFlagEnabled.mockResolvedValue(true);
  mockSendEmail.mockResolvedValue({ ok: true });
  process.env.CRON_SECRET = SECRET;
  process.env.RESEND_API_KEY = "re_test";
});
afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.RESEND_API_KEY;
});

describe("challenge-daily-nudge — auth + exports", () => {
  it("runs on the nodejs runtime", () => {
    expect(runtime).toBe("nodejs");
  });
  it("401s without the cron bearer", async () => {
    const res = await GET(req({ authorization: "Bearer nope" }));
    expect(res.status).toBe(401);
  });
});

describe("challenge-daily-nudge — gate 1: feature flag", () => {
  it("no-ops when the flag is off (fail-closed)", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const res = await GET(authedReq());
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, skipped: "flag_off" });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});

describe("challenge-daily-nudge — sends + gate 2 (preferences/suppression)", () => {
  it("emails an enrolled, opted-in user today's task and stamps idempotency", async () => {
    tableData = {
      challenges: { selectData: [activeCohort()] },
      challenge_enrolments: {
        selectData: [{ id: "e1", user_id: "u1", last_nudge_on: null }],
      },
      profiles: {
        selectData: [{ id: "u1", email: "u1@example.com", email_weekly_digest: true }],
      },
    };
    const res = await GET(authedReq());
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, sent: 1 });
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    // Idempotency: last_nudge_on stamped to today's date after a successful send.
    const stamp = updateCalls.find((c) => c.table === "challenge_enrolments");
    expect(stamp?.payload.last_nudge_on).toBe(new Date().toISOString().slice(0, 10));
  });

  it("does NOT email a user who opted out of lifecycle emails (gate 2a)", async () => {
    tableData = {
      challenges: { selectData: [activeCohort()] },
      challenge_enrolments: {
        selectData: [{ id: "e1", user_id: "u1", last_nudge_on: null }],
      },
      profiles: {
        selectData: [{ id: "u1", email: "u1@example.com", email_weekly_digest: false }],
      },
    };
    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(updateCalls.find((c) => c.table === "challenge_enrolments")).toBeUndefined();
  });

  it("does not stamp idempotency when the send is suppressed/fails (retryable)", async () => {
    mockSendEmail.mockResolvedValue({ ok: false, error: "suppressed" });
    tableData = {
      challenges: { selectData: [activeCohort()] },
      challenge_enrolments: {
        selectData: [{ id: "e1", user_id: "u1", last_nudge_on: null }],
      },
      profiles: {
        selectData: [{ id: "u1", email: "u1@example.com", email_weekly_digest: true }],
      },
    };
    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    // sendEmail was attempted, but no idempotency stamp → next run retries.
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(updateCalls.find((c) => c.table === "challenge_enrolments")).toBeUndefined();
  });

  it("skips cohorts that are not active (no sends)", async () => {
    const future = { ...activeCohort(), starts_at: "2099-01-01", ends_at: "2099-02-01" };
    tableData = { challenges: { selectData: [future] } };
    const res = await GET(authedReq());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("no-ops when RESEND_API_KEY is unset", async () => {
    process.env.RESEND_API_KEY = "";
    const res = await GET(authedReq());
    const body = await res.json();
    expect(body).toMatchObject({ skipped: "no_resend" });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
