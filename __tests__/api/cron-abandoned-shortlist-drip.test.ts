import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockIsFlagEnabled = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: (...args: unknown[]) => mockIsFlagEnabled(...args),
}));

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

const mockIsFeatureDisabled = vi.fn<(...args: unknown[]) => Promise<boolean>>(
  async () => false,
);
vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: (...args: unknown[]) => mockIsFeatureDisabled(...args),
}));

vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: unknown) => String(s ?? "") }));

const mockSendEmail = vi.fn<(...args: unknown[]) => Promise<{ ok: boolean; error?: string }>>(
  async () => ({ ok: true }),
);
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
}

const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "update", "insert", "delete",
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

import {
  GET,
  runtime,
  maxDuration,
} from "@/app/api/cron/abandoned-shortlist-drip/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request(
    "http://localhost/api/cron/abandoned-shortlist-drip",
  ) as unknown as NextRequest;
}

const FOUR_DAYS_AGO = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
const ONE_DAY_AGO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/abandoned-shortlist-drip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFlagEnabled.mockResolvedValue(true);
    dbIdx = 0;
    dbQueue.length = 0;
    mockIsFeatureDisabled.mockResolvedValue(false);
    mockSendEmail.mockResolvedValue({ ok: true });
    process.env.RESEND_API_KEY = "re_test_key";
  });

  afterAll(() => {
    vi.restoreAllMocks();
    delete process.env.RESEND_API_KEY;
  });

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
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns skipped when kill switch is on, no DB calls", async () => {
    mockIsFeatureDisabled.mockResolvedValueOnce(true);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("kill_switch_on");
    expect(dbIdx).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns early when RESEND_API_KEY is missing — no DB calls, no error", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("no_resend_api_key");
    expect(dbIdx).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns zero stats when no eligible users found", async () => {
    // shortlist: only 1 user with 1 row → fails count >= 2 filter.
    dbQueue.push({
      data: [{ user_id: "u1", broker_slug: "selfwealth", added_at: FOUR_DAYS_AGO }],
      error: null,
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.considered).toBe(0);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
    // No further DB calls — short-circuited after the first query.
    expect(dbIdx).toBe(1);
  });

  it("excludes users whose oldest shortlist entry is < 3 days old", async () => {
    dbQueue.push({
      data: [
        { user_id: "u1", broker_slug: "selfwealth", added_at: ONE_DAY_AGO },
        { user_id: "u1", broker_slug: "stake", added_at: ONE_DAY_AGO },
      ],
      error: null,
    });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.considered).toBe(0);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("happy path — sends email and writes drip log row", async () => {
    dbQueue.push({
      data: [
        { user_id: "u1", broker_slug: "selfwealth", added_at: FOUR_DAYS_AGO },
        { user_id: "u1", broker_slug: "stake", added_at: FOUR_DAYS_AGO },
      ],
      error: null,
    }); // user_shortlisted_brokers
    dbQueue.push({
      data: [{ id: "u1", email: "user@example.com" }],
      error: null,
    }); // profiles
    dbQueue.push({ data: [], error: null }); // email_suppression_list
    dbQueue.push({ data: [], error: null }); // bounced captures
    dbQueue.push({ data: [], error: null }); // prior sends in investor_drip_log
    dbQueue.push({ error: null }); // insert investor_drip_log

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.considered).toBe(1);
    expect(body.sent).toBe(1);
    expect(body.suppressed).toBe(0);
    expect(body.already_sent).toBe(0);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: expect.stringContaining("saved"),
      }),
    );
  });

  it("skips email in suppression list", async () => {
    dbQueue.push({
      data: [
        { user_id: "u1", broker_slug: "selfwealth", added_at: FOUR_DAYS_AGO },
        { user_id: "u1", broker_slug: "stake", added_at: FOUR_DAYS_AGO },
      ],
      error: null,
    });
    dbQueue.push({
      data: [{ id: "u1", email: "bad@example.com" }],
      error: null,
    });
    dbQueue.push({ data: [{ email: "bad@example.com" }], error: null }); // suppressed
    dbQueue.push({ data: [], error: null }); // bounced captures
    dbQueue.push({ data: [], error: null }); // prior sends

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.suppressed).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips email marked bounced in email_captures", async () => {
    dbQueue.push({
      data: [
        { user_id: "u1", broker_slug: "selfwealth", added_at: FOUR_DAYS_AGO },
        { user_id: "u1", broker_slug: "stake", added_at: FOUR_DAYS_AGO },
      ],
      error: null,
    });
    dbQueue.push({
      data: [{ id: "u1", email: "bounce@example.com" }],
      error: null,
    });
    dbQueue.push({ data: [], error: null }); // suppression list
    dbQueue.push({ data: [{ email: "bounce@example.com" }], error: null }); // bounced
    dbQueue.push({ data: [], error: null }); // prior sends

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.suppressed).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("skips users already sent (idempotent across runs)", async () => {
    dbQueue.push({
      data: [
        { user_id: "u1", broker_slug: "selfwealth", added_at: FOUR_DAYS_AGO },
        { user_id: "u1", broker_slug: "stake", added_at: FOUR_DAYS_AGO },
      ],
      error: null,
    });
    dbQueue.push({
      data: [{ id: "u1", email: "user@example.com" }],
      error: null,
    });
    dbQueue.push({ data: [], error: null }); // suppression
    dbQueue.push({ data: [], error: null }); // bounced
    dbQueue.push({ data: [{ email: "user@example.com" }], error: null }); // prior sends — already done

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.already_sent).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("counts no_email when profile lookup returns no email", async () => {
    dbQueue.push({
      data: [
        { user_id: "u1", broker_slug: "selfwealth", added_at: FOUR_DAYS_AGO },
        { user_id: "u1", broker_slug: "stake", added_at: FOUR_DAYS_AGO },
      ],
      error: null,
    });
    dbQueue.push({ data: [], error: null }); // profiles — no row for u1

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.considered).toBe(1);
    expect(body.no_email).toBe(1);
    expect(body.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("counts errors when sendEmail fails — does not write drip log row", async () => {
    mockSendEmail.mockResolvedValueOnce({ ok: false, error: "HTTP 500" });
    dbQueue.push({
      data: [
        { user_id: "u1", broker_slug: "selfwealth", added_at: FOUR_DAYS_AGO },
        { user_id: "u1", broker_slug: "stake", added_at: FOUR_DAYS_AGO },
      ],
      error: null,
    });
    dbQueue.push({
      data: [{ id: "u1", email: "user@example.com" }],
      error: null,
    });
    dbQueue.push({ data: [], error: null });
    dbQueue.push({ data: [], error: null });
    dbQueue.push({ data: [], error: null });
    // No insert call should follow — but if it did, queue an error to
    // surface that as a test failure via dbIdx.
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.errors).toBe(1);
    expect(body.sent).toBe(0);
    // 5 queries used: shortlist, profiles, suppression, bounced, prior sends.
    expect(dbIdx).toBe(5);
  });
});
