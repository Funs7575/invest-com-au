import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn<
    (...args: unknown[]) => Promise<{ ok: boolean; error?: string }>
  >(async () => ({ ok: true })),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

interface DbResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}
const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select",
    "update",
    "insert",
    "delete",
    "eq",
    "neq",
    "lt",
    "lte",
    "gte",
    "is",
    "in",
    "not",
    "or",
    "order",
    "limit",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  const r = { data: res.data ?? null, error: res.error ?? null };
  chain.maybeSingle = vi.fn(() => Promise.resolve(r));
  chain.single = vi.fn(() => Promise.resolve(r));
  chain.then = (resolve: (v: typeof r) => unknown) =>
    Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { error: null })),
  })),
}));

import { runTaxNurture, stepForAgeDays } from "@/lib/tax-nurture";

// ─── Fixture helpers ────────────────────────────────────────────────────

const NOW = new Date("2026-05-15T12:00:00Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe("stepForAgeDays", () => {
  it("maps 14 days to step 1", () => {
    expect(stepForAgeDays(14)).toBe(1);
  });
  it("maps 21 days to step 2", () => {
    expect(stepForAgeDays(21)).toBe(2);
  });
  it("maps 28 days to step 3", () => {
    expect(stepForAgeDays(28)).toBe(3);
  });
  it("returns null for ages outside the buckets", () => {
    expect(stepForAgeDays(13)).toBeNull();
    expect(stepForAgeDays(15)).toBeNull();
    expect(stepForAgeDays(20)).toBeNull();
    expect(stepForAgeDays(29)).toBeNull();
  });
});

describe("runTaxNurture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbQueue.length = 0;
    dbIdx = 0;
    mockSendEmail.mockResolvedValue({ ok: true });
    process.env.RESEND_API_KEY = "re_test_key";
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("sends step 1 (educational) email for a 14-day-old plan", async () => {
    dbQueue.push({
      data: [
        {
          id: 101,
          email: "investor@example.com",
          auth_user_id: null,
          created_at: daysAgo(14),
          linked_brief_id: null,
        },
      ],
    });
    dbQueue.push({ data: null }); // prior send check — none
    dbQueue.push({ error: null }); // insert marker

    const result = await runTaxNurture(NOW);

    expect(result.considered).toBe(1);
    expect(result.sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const arg = mockSendEmail.mock.calls[0]![0] as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(arg.to).toBe("investor@example.com");
    expect(arg.subject).toMatch(/5 things/i);
    expect(arg.html).toContain("EOFY");
    expect(arg.text).toContain("EOFY");
  });

  it("sends step 2 (SMSF vertical) email for a 21-day-old plan", async () => {
    dbQueue.push({
      data: [
        {
          id: 102,
          email: "smsf@example.com",
          auth_user_id: null,
          created_at: daysAgo(21),
          linked_brief_id: null,
        },
      ],
    });
    dbQueue.push({ data: null });
    dbQueue.push({ error: null });

    const result = await runTaxNurture(NOW);

    expect(result.sent).toBe(1);
    const arg = mockSendEmail.mock.calls[0]![0] as {
      subject: string;
      html: string;
    };
    expect(arg.subject).toMatch(/SMSF/i);
    expect(arg.html).toContain("self-managed super fund");
  });

  it("sends step 3 (soft CTA) email for a 28-day-old plan, with plan_id in CTA href", async () => {
    dbQueue.push({
      data: [
        {
          id: 103,
          email: "cta@example.com",
          auth_user_id: null,
          created_at: daysAgo(28),
          linked_brief_id: null,
        },
      ],
    });
    dbQueue.push({ data: null });
    dbQueue.push({ error: null });

    const result = await runTaxNurture(NOW);

    expect(result.sent).toBe(1);
    const arg = mockSendEmail.mock.calls[0]![0] as {
      subject: string;
      html: string;
      text: string;
    };
    expect(arg.subject).toMatch(/tax pro/i);
    expect(arg.html).toContain("plan_id=103");
    expect(arg.text).toContain("plan_id=103");
  });

  it("skips plans whose age is not 14/21/28 days", async () => {
    dbQueue.push({
      data: [
        {
          id: 200,
          email: "stale@example.com",
          auth_user_id: null,
          created_at: daysAgo(17), // not on a bucket boundary
          linked_brief_id: null,
        },
      ],
    });
    // No subsequent queries should be made for this plan.

    const result = await runTaxNurture(NOW);

    expect(result.considered).toBe(1);
    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("is idempotent: skips when (plan_id, step) already exists in tax_nurture_sends", async () => {
    dbQueue.push({
      data: [
        {
          id: 300,
          email: "already@example.com",
          auth_user_id: null,
          created_at: daysAgo(14),
          linked_brief_id: null,
        },
      ],
    });
    // prior send for (300, step 1) exists
    dbQueue.push({ data: { id: 999 } });

    const result = await runTaxNurture(NOW);

    expect(result.considered).toBe(1);
    expect(result.skipped_idempotent).toBe(1);
    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("counts skipped_no_email when the plan has no email", async () => {
    dbQueue.push({
      data: [
        {
          id: 400,
          email: null,
          auth_user_id: null,
          created_at: daysAgo(14),
          linked_brief_id: null,
        },
      ],
    });

    const result = await runTaxNurture(NOW);

    expect(result.skipped_no_email).toBe(1);
    expect(result.sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("treats a unique-constraint violation on the marker insert as idempotent", async () => {
    dbQueue.push({
      data: [
        {
          id: 500,
          email: "race@example.com",
          auth_user_id: null,
          created_at: daysAgo(14),
          linked_brief_id: null,
        },
      ],
    });
    dbQueue.push({ data: null }); // prior send: none
    dbQueue.push({ error: { message: "duplicate key value", code: "23505" } });

    const result = await runTaxNurture(NOW);

    expect(result.skipped_idempotent).toBe(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("does not block other plans when one Resend call throws", async () => {
    dbQueue.push({
      data: [
        {
          id: 601,
          email: "a@example.com",
          auth_user_id: null,
          created_at: daysAgo(14),
          linked_brief_id: null,
        },
        {
          id: 602,
          email: "b@example.com",
          auth_user_id: null,
          created_at: daysAgo(14),
          linked_brief_id: null,
        },
      ],
    });
    // Plan 601: prior=null, insert ok
    dbQueue.push({ data: null });
    dbQueue.push({ error: null });
    // Plan 602: prior=null, insert ok
    dbQueue.push({ data: null });
    dbQueue.push({ error: null });

    mockSendEmail
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ ok: true });

    const result = await runTaxNurture(NOW);

    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
  });
});
