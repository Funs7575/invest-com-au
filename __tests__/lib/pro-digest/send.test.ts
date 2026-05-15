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

import { runProDigest } from "@/lib/pro-digest";

// ─── Helpers ────────────────────────────────────────────────────────────

function queueDigestForPros(
  pros: Array<{
    id: number;
    name: string;
    email: string | null;
    specialty_tags?: string[];
  }>,
  options: { briefs?: unknown[] } = {},
) {
  dbQueue.length = 0;
  dbIdx = 0;
  // 1) professionals list
  dbQueue.push({
    data: pros.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      specialty_tags: p.specialty_tags ?? [],
      location_state: null,
    })),
  });
  const briefs = options.briefs ?? [
    {
      id: 100,
      slug: "smsf-setup-help",
      job_title: "SMSF setup help",
      brief_template: "smsf_setup",
      brief_payload: { budget_band: "5k_10k", location_state: "NSW" },
      created_at: new Date().toISOString(),
    },
  ];
  // For each pro:
  //   - prior-send check (maybeSingle)
  //   - briefs list (limit)
  //   - insert (idempotency row)
  for (const p of pros) {
    if (!p.email) continue;
    dbQueue.push({ data: null }); // prior send: none
    dbQueue.push({ data: briefs }); // briefs list
    dbQueue.push({ error: null }); // insert idempotency row
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe("runProDigest — Resend send wiring", () => {
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

  it("calls Resend with the pro's email, HTML body, and plain-text fallback", async () => {
    queueDigestForPros([
      { id: 1, name: "Acme Advice", email: "pro@example.com" },
    ]);

    const result = await runProDigest(new Date("2026-05-18T23:00:00Z"));

    expect(result.pros_sent).toBe(1);
    expect(result.pros_failed).toBe(0);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);

    const arg = mockSendEmail.mock.calls[0]![0] as {
      to: string;
      subject: string;
      html: string;
      text?: string;
      from?: string;
    };
    expect(arg.to).toBe("pro@example.com");
    expect(arg.subject).toMatch(/new brief/i);
    expect(arg.html).toContain("Weekly Brief Digest");
    expect(arg.html).toContain("SMSF setup help");
    expect(arg.html).toContain("View brief");
    expect(arg.text).toBeDefined();
    expect(arg.text).toContain("Invest.com.au");
    expect(arg.text).toContain("SMSF setup help");
    expect(arg.text).toContain("View brief:");
  });

  it("does not block subsequent recipients when one Resend call fails", async () => {
    queueDigestForPros([
      { id: 1, name: "Pro One", email: "pro1@example.com" },
      { id: 2, name: "Pro Two", email: "pro2@example.com" },
      { id: 3, name: "Pro Three", email: "pro3@example.com" },
    ]);
    mockSendEmail
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce({ ok: true });

    const result = await runProDigest(new Date("2026-05-18T23:00:00Z"));

    expect(mockSendEmail).toHaveBeenCalledTimes(3);
    expect(result.pros_considered).toBe(3);
    expect(result.pros_sent).toBe(2);
    expect(result.pros_failed).toBe(1);
  });

  it("counts a recipient as failed when Resend returns ok=false but continues with the rest", async () => {
    queueDigestForPros([
      { id: 1, name: "Pro One", email: "pro1@example.com" },
      { id: 2, name: "Pro Two", email: "pro2@example.com" },
    ]);
    mockSendEmail
      .mockResolvedValueOnce({ ok: false, error: "HTTP 422" })
      .mockResolvedValueOnce({ ok: true });

    const result = await runProDigest(new Date("2026-05-18T23:00:00Z"));

    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(result.pros_sent).toBe(1);
    expect(result.pros_failed).toBe(1);
  });

  it("skips Resend gracefully (counts as failed, no throw) when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    queueDigestForPros([
      { id: 1, name: "Acme Advice", email: "pro@example.com" },
    ]);

    const result = await runProDigest(new Date("2026-05-18T23:00:00Z"));

    expect(mockSendEmail).not.toHaveBeenCalled();
    expect(result.pros_sent).toBe(0);
    expect(result.pros_failed).toBe(1);
  });
});
