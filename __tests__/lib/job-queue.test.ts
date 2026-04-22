import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Capture insert calls + let individual tests force errors.
let insertError: { message: string } | null = null;
const insertCalls: Record<string, unknown>[] = [];
let rpcError: { message: string } | null = null;
const rpcCalls: { fn: string }[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table !== "job_queue") throw new Error(`unexpected table: ${table}`);
  return {
    insert: (payload: Record<string, unknown>) => ({
      select: () => ({
        single: async () => {
          insertCalls.push(payload);
          if (insertError) return { data: null, error: insertError };
          return { data: { id: 42 }, error: null };
        },
      }),
    }),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: async (fn: string) => {
      rpcCalls.push({ fn });
      return { data: null, error: rpcError };
    },
  })),
}));

// Don't actually trigger advisor-health — stub it so the send_email
// + recompute handlers can be tested in isolation.
vi.mock("@/lib/advisor-health", () => ({
  recomputeAdvisorHealth: vi.fn(async () => undefined),
}));

import {
  enqueueJob,
  computeNextAttempt,
  registerJobHandler,
  getJobHandler,
  listRegisteredJobTypes,
} from "@/lib/job-queue";

// ─── Tests ───────────────────────────────────────────────────────────

describe("computeNextAttempt (pure exponential backoff)", () => {
  const NOW = new Date("2026-04-23T00:00:00.000Z");

  it("uses 30s for the first attempt", () => {
    const next = computeNextAttempt(1, NOW);
    expect(next.getTime() - NOW.getTime()).toBe(30_000);
  });

  it("uses 120s (2m) for attempt 2", () => {
    const next = computeNextAttempt(2, NOW);
    expect(next.getTime() - NOW.getTime()).toBe(120_000);
  });

  it("uses 900s (15m) for attempt 3", () => {
    const next = computeNextAttempt(3, NOW);
    expect(next.getTime() - NOW.getTime()).toBe(900_000);
  });

  it("uses 3600s (1h) for attempt 4", () => {
    const next = computeNextAttempt(4, NOW);
    expect(next.getTime() - NOW.getTime()).toBe(3_600_000);
  });

  it("caps at 14_400s (4h) from attempt 5 onwards", () => {
    const a5 = computeNextAttempt(5, NOW);
    const a6 = computeNextAttempt(6, NOW);
    const a99 = computeNextAttempt(99, NOW);
    expect(a5.getTime() - NOW.getTime()).toBe(14_400_000);
    expect(a6.getTime() - NOW.getTime()).toBe(14_400_000);
    expect(a99.getTime() - NOW.getTime()).toBe(14_400_000);
  });

  it("clamps attempts less than 1 back to the first slot", () => {
    const a0 = computeNextAttempt(0, NOW);
    const aNeg = computeNextAttempt(-3, NOW);
    expect(a0.getTime() - NOW.getTime()).toBe(30_000);
    expect(aNeg.getTime() - NOW.getTime()).toBe(30_000);
  });

  it("uses the real current time when now argument is omitted", () => {
    const before = Date.now();
    const next = computeNextAttempt(1);
    const after = Date.now();
    expect(next.getTime()).toBeGreaterThanOrEqual(before + 30_000 - 5);
    expect(next.getTime()).toBeLessThanOrEqual(after + 30_000 + 5);
  });
});

describe("enqueueJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCalls.length = 0;
    insertError = null;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("inserts with defaults — status=ready, max_attempts=5, scheduled_at≈now", async () => {
    const before = Date.now();
    const id = await enqueueJob("send_email", { to: "a@b.com" });
    const after = Date.now();

    expect(id).toBe(42);
    expect(insertCalls).toHaveLength(1);
    const row = insertCalls[0] as Record<string, unknown>;
    expect(row.job_type).toBe("send_email");
    expect(row.status).toBe("ready");
    expect(row.max_attempts).toBe(5);
    expect(row.payload).toEqual({ to: "a@b.com" });
    const scheduled = Date.parse(row.scheduled_at as string);
    expect(scheduled).toBeGreaterThanOrEqual(before - 100);
    expect(scheduled).toBeLessThanOrEqual(after + 100);
  });

  it("honours delaySeconds for future scheduling", async () => {
    const before = Date.now();
    await enqueueJob("x", {}, { delaySeconds: 60 });
    const scheduled = Date.parse(
      (insertCalls[0] as Record<string, unknown>).scheduled_at as string,
    );
    expect(scheduled - before).toBeGreaterThanOrEqual(59_000);
    expect(scheduled - before).toBeLessThanOrEqual(61_000);
  });

  it("honours an explicit scheduledAt over delaySeconds", async () => {
    const target = new Date("2030-06-01T12:00:00.000Z");
    await enqueueJob("x", {}, { delaySeconds: 60, scheduledAt: target });
    expect((insertCalls[0] as Record<string, unknown>).scheduled_at).toBe(
      target.toISOString(),
    );
  });

  it("honours custom maxAttempts", async () => {
    await enqueueJob("x", {}, { maxAttempts: 2 });
    expect((insertCalls[0] as Record<string, unknown>).max_attempts).toBe(2);
  });

  it("returns null when the insert errors", async () => {
    insertError = { message: "unique violation" };
    const id = await enqueueJob("x", {});
    expect(id).toBeNull();
  });
});

describe("handler registry", () => {
  it("registers and retrieves a handler", () => {
    const h = async () => ({ ok: true }) as const;
    registerJobHandler("__test_reg_1", h);
    expect(getJobHandler("__test_reg_1")).toBe(h);
  });

  it("overwrites an existing handler with the same name", () => {
    const first = async () => ({ ok: true }) as const;
    const second = async () => ({ ok: false, error: "x" }) as const;
    registerJobHandler("__test_reg_2", first);
    registerJobHandler("__test_reg_2", second);
    expect(getJobHandler("__test_reg_2")).toBe(second);
  });

  it("returns undefined for an unknown job type", () => {
    expect(getJobHandler("__not_registered__")).toBeUndefined();
  });

  it("includes built-in handlers in the registry list", () => {
    const types = listRegisteredJobTypes();
    expect(types).toContain("send_email");
    expect(types).toContain("recompute_advisor_health");
    expect(types).toContain("refresh_cohort_metrics");
    expect(types).toContain("generate_article_draft");
    // Returned sorted
    expect([...types]).toEqual([...types].sort());
  });
});

describe("built-in handlers", () => {
  const originalFetch = globalThis.fetch;
  const originalResend = process.env.RESEND_API_KEY;
  const originalCronSecret = process.env.CRON_SECRET;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.RESEND_API_KEY = originalResend;
    process.env.CRON_SECRET = originalCronSecret;
    rpcError = null;
    rpcCalls.length = 0;
  });

  it("send_email: rejects a payload missing required fields (not retryable)", async () => {
    const handler = getJobHandler("send_email")!;
    const res = await handler({ to: "a@b.com" });
    expect(res).toEqual({
      ok: false,
      error: "missing to/subject/html",
      retryable: false,
    });
  });

  it("send_email: flags retryable when RESEND_API_KEY is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    const handler = getJobHandler("send_email")!;
    const res = await handler({ to: "a@b.com", subject: "x", html: "<p/>" });
    expect(res).toMatchObject({ ok: false, retryable: true });
  });

  it("send_email: returns ok on a 2xx resend response", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    globalThis.fetch = vi.fn(
      async () => new Response("{}", { status: 200 }),
    ) as unknown as typeof fetch;
    const handler = getJobHandler("send_email")!;
    const res = await handler({ to: "a@b.com", subject: "x", html: "<p/>" });
    expect(res).toEqual({ ok: true });
  });

  it("send_email: 4xx from resend is non-retryable", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    globalThis.fetch = vi.fn(
      async () => new Response("bad", { status: 400 }),
    ) as unknown as typeof fetch;
    const handler = getJobHandler("send_email")!;
    const res = await handler({ to: "a@b.com", subject: "x", html: "<p/>" });
    expect(res).toMatchObject({ ok: false, retryable: false });
  });

  it("send_email: 429 from resend is retryable", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    globalThis.fetch = vi.fn(
      async () => new Response("slow down", { status: 429 }),
    ) as unknown as typeof fetch;
    const handler = getJobHandler("send_email")!;
    const res = await handler({ to: "a@b.com", subject: "x", html: "<p/>" });
    expect(res).toMatchObject({ ok: false, retryable: true });
  });

  it("send_email: 5xx from resend is retryable", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    globalThis.fetch = vi.fn(
      async () => new Response("boom", { status: 503 }),
    ) as unknown as typeof fetch;
    const handler = getJobHandler("send_email")!;
    const res = await handler({ to: "a@b.com", subject: "x", html: "<p/>" });
    expect(res).toMatchObject({ ok: false, retryable: true });
  });

  it("recompute_advisor_health: rejects a non-numeric advisor_id (non-retryable)", async () => {
    const handler = getJobHandler("recompute_advisor_health")!;
    const res = await handler({ advisor_id: "not-a-number" });
    expect(res).toEqual({
      ok: false,
      error: "invalid advisor_id",
      retryable: false,
    });
  });

  it("recompute_advisor_health: runs on a valid advisor id", async () => {
    const handler = getJobHandler("recompute_advisor_health")!;
    const res = await handler({ advisor_id: 123 });
    expect(res).toEqual({ ok: true });
  });

  it("refresh_cohort_metrics: calls the RPC and flags retryable on error", async () => {
    rpcError = { message: "deadlock" };
    const handler = getJobHandler("refresh_cohort_metrics")!;
    const res = await handler({});
    expect(rpcCalls).toContainEqual({ fn: "refresh_advisor_cohort_metrics" });
    expect(res).toMatchObject({ ok: false, retryable: true });
  });

  it("refresh_cohort_metrics: returns ok when the RPC succeeds", async () => {
    rpcError = null;
    const handler = getJobHandler("refresh_cohort_metrics")!;
    const res = await handler({});
    expect(res).toEqual({ ok: true });
  });

  it("generate_article_draft: rejects when CRON_SECRET missing (retryable)", async () => {
    delete process.env.CRON_SECRET;
    const handler = getJobHandler("generate_article_draft")!;
    const res = await handler({ calendar_id: 5 });
    expect(res).toMatchObject({ ok: false, retryable: true });
  });

  it("generate_article_draft: rejects non-numeric calendar_id (non-retryable)", async () => {
    process.env.CRON_SECRET = "x";
    const handler = getJobHandler("generate_article_draft")!;
    const res = await handler({ calendar_id: "nope" });
    expect(res).toMatchObject({ ok: false, retryable: false });
  });

  it("generate_article_draft: 4xx HTTP is non-retryable", async () => {
    process.env.CRON_SECRET = "x";
    globalThis.fetch = vi.fn(
      async () => new Response("bad", { status: 404 }),
    ) as unknown as typeof fetch;
    const handler = getJobHandler("generate_article_draft")!;
    const res = await handler({ calendar_id: 7 });
    expect(res).toMatchObject({ ok: false, retryable: false });
  });

  it("generate_article_draft: 5xx HTTP is retryable", async () => {
    process.env.CRON_SECRET = "x";
    globalThis.fetch = vi.fn(
      async () => new Response("boom", { status: 503 }),
    ) as unknown as typeof fetch;
    const handler = getJobHandler("generate_article_draft")!;
    const res = await handler({ calendar_id: 7 });
    expect(res).toMatchObject({ ok: false, retryable: true });
  });
});
