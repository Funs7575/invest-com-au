import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

const mockClassifyDispute = vi.fn();
vi.mock("@/lib/advisor-lead-disputes", () => ({
  classifyDispute: (...args: unknown[]) => mockClassifyDispute(...args),
}));

const mockRecordFinancialAudit = vi.fn();
vi.mock("@/lib/financial-audit", () => ({
  recordFinancialAudit: (...args: unknown[]) => mockRecordFinancialAudit(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "admin@invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

import {
  buildClassifierContext,
  autoResolveDispute,
  notifyAdminEscalated,
} from "@/lib/advisor-lead-dispute-resolver";

// ── Query builder helpers ────────────────────────────────────────────────────

/** Chainable select query ending at maybeSingle(). */
function maybySingle(data: unknown, error: unknown = null) {
  const b = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error })),
  };
  return b;
}

/** Chainable select query ending at single(). */
function singleResult(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
  };
}

/** Select query where gte() is the terminal (for count queries). */
function countQuery(count: number) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn(() => Promise.resolve({ count, error: null })),
  };
}

/**
 * A chainable update builder where the chain IS a real Promise (via
 * Object.assign), so `await chain` works natively after any number of
 * .eq() calls, and .in() also resolves immediately.
 */
function updateChain(error: unknown = null) {
  const prom = Promise.resolve({ error });
  const chain = Object.assign(prom, {
    eq: vi.fn(),
    in: vi.fn(() => prom),
  });
  chain.eq.mockReturnValue(chain);
  return { update: vi.fn().mockReturnValue(chain) };
}

/**
 * Insert chain that returns the inserted row (for advisor_credit_ledger).
 *   .insert(row).select("*").single() → { data, error }
 */
function insertChain(row: Record<string, unknown>) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn(() => Promise.resolve({ data: row, error: null })),
      }),
    }),
  };
}

/** Helper: build the 4 mockFrom slots that recordLedgerEntry consumes
 * for a fresh credit insert (no prior idempotent row, advisor exists,
 * insert succeeds, cache update succeeds).
 */
function pushLedgerEntrySlots(opts: {
  professionalId: number;
  amountCents: number;
  beforeBalance: number;
  ledgerId: number;
  kind: string;
  refType: string;
  refId: string;
}) {
  const afterBalance = opts.beforeBalance + opts.amountCents;
  // 1. Idempotency check on advisor_credit_ledger (returns null = first time)
  mockFrom.mockImplementationOnce(() => maybySingle(null));
  // 2. Read professionals row (current balance + lifetime totals)
  mockFrom.mockImplementationOnce(() =>
    singleResult({
      credit_balance_cents: opts.beforeBalance,
      lifetime_credit_cents: 0,
      lifetime_lead_spend_cents: 0,
    }),
  );
  // 3. Insert into advisor_credit_ledger
  mockFrom.mockImplementationOnce(() =>
    insertChain({
      id: opts.ledgerId,
      professional_id: opts.professionalId,
      amount_cents: opts.amountCents,
      balance_after_cents: afterBalance,
      kind: opts.kind,
      reference_type: opts.refType,
      reference_id: opts.refId,
    }),
  );
  // 4. Update professionals.credit_balance_cents (cache write)
  mockFrom.mockImplementationOnce(() => updateChain());
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const DISPUTE_ID = 42;
const LEAD_ID = 10;
const ADVISOR_ID = 7;

const DISPUTE = {
  id: DISPUTE_ID,
  lead_id: LEAD_ID,
  professional_id: ADVISOR_ID,
  reason: "spam",
  reason_code: "spam_likely",
  details: null,
  status: "pending",
};
const LEAD = {
  id: LEAD_ID,
  user_name: "Jane",
  user_email: "jane@test.com",
  user_phone: "0411111111",
  message: "hi",
  source_page: "/invest",
  utm_source: null,
  utm_campaign: null,
  quality_score: 50,
  quality_signals: {},
  bill_amount_cents: 4900,
  created_at: "2026-01-01T00:00:00Z",
  responded_at: null,
};
const ADVISOR = {
  id: ADVISOR_ID,
  type: "financial_planner",
  specialties: ["super"],
  location_state: "NSW",
  office_states: ["NSW"],
  service_areas: null,
  min_client_balance_cents: 0,
  accepts_international_clients: false,
};

function setupContextMocks() {
  mockFrom
    .mockImplementationOnce(() => maybySingle(DISPUTE))         // lead_disputes
    .mockImplementationOnce(() => maybySingle(LEAD))            // professional_leads (lead)
    .mockImplementationOnce(() => maybySingle(ADVISOR))         // professionals
    .mockImplementationOnce(() => countQuery(0));               // prior leads count
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("buildClassifierContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { ok: false } when dispute not found", async () => {
    mockFrom.mockImplementationOnce(() => maybySingle(null));
    const result = await buildClassifierContext(DISPUTE_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("dispute_not_found");
  });

  it("returns { ok: false } when dispute DB errors", async () => {
    mockFrom.mockImplementationOnce(() => maybySingle(null, { message: "db error" }));
    const result = await buildClassifierContext(DISPUTE_ID);
    expect(result.ok).toBe(false);
  });

  it("returns { ok: false } when dispute is not pending", async () => {
    mockFrom.mockImplementationOnce(() =>
      maybySingle({ ...DISPUTE, status: "approved" })
    );
    const result = await buildClassifierContext(DISPUTE_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("dispute_already_approved");
  });

  it("returns { ok: false } when lead not found", async () => {
    mockFrom
      .mockImplementationOnce(() => maybySingle(DISPUTE))
      .mockImplementationOnce(() => maybySingle(null));
    const result = await buildClassifierContext(DISPUTE_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("lead_not_found");
  });

  it("returns { ok: false } when advisor not found", async () => {
    mockFrom
      .mockImplementationOnce(() => maybySingle(DISPUTE))
      .mockImplementationOnce(() => maybySingle(LEAD))
      .mockImplementationOnce(() => maybySingle(null));
    const result = await buildClassifierContext(DISPUTE_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("advisor_not_found");
  });

  it("returns full context on success", async () => {
    setupContextMocks();
    const result = await buildClassifierContext(DISPUTE_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ctx.lead.id).toBe(LEAD_ID);
    expect(result.ctx.advisor.id).toBe(ADVISOR_ID);
    expect(result.ctx.reason).toBe("spam_likely");
    expect(result.disputeStatus).toBe("pending");
    expect(result.billAmountCents).toBe(4900);
  });

  it("includes priorLeadsByEmail count in context", async () => {
    mockFrom
      .mockImplementationOnce(() => maybySingle(DISPUTE))
      .mockImplementationOnce(() => maybySingle(LEAD))
      .mockImplementationOnce(() => maybySingle(ADVISOR))
      .mockImplementationOnce(() => countQuery(3));
    const result = await buildClassifierContext(DISPUTE_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ctx.priorLeadsByEmail).toBe(3);
  });

  it("parses reason_code from reason text when reason_code is null", async () => {
    const disputeNoCode = { ...DISPUTE, reason_code: null, reason: "unreachable" };
    mockFrom
      .mockImplementationOnce(() => maybySingle(disputeNoCode))
      .mockImplementationOnce(() => maybySingle(LEAD))
      .mockImplementationOnce(() => maybySingle(ADVISOR))
      .mockImplementationOnce(() => countQuery(0));
    const result = await buildClassifierContext(DISPUTE_ID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ctx.reason).toBe("unreachable");
  });
});

describe("autoResolveDispute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mockReset clears the mockImplementationOnce queue so unconsumed mocks
    // from a prior test (e.g. advisor-email maybySingle when RESEND_API_KEY
    // is absent) don't bleed into the next test's from() call sequence.
    mockFrom.mockReset();
    mockRecordFinancialAudit.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("returns applied:false when context build fails", async () => {
    mockFrom.mockImplementationOnce(() => maybySingle(null));
    const result = await autoResolveDispute(DISPUTE_ID);
    expect(result.applied).toBe(false);
    expect(result.verdict).toBe("escalate");
    expect(result.refundedCents).toBe(0);
  });

  it("escalate verdict — updates dispute status and returns applied:true", async () => {
    setupContextMocks();
    mockClassifyDispute.mockReturnValue({
      verdict: "escalate",
      confidence: "low",
      reasons: ["low_quality"],
    });
    mockFrom
      .mockImplementationOnce(() => updateChain()); // lead_disputes update (escalated)

    const result = await autoResolveDispute(DISPUTE_ID);
    expect(result.applied).toBe(true);
    expect(result.verdict).toBe("escalate");
    expect(result.refundedCents).toBe(0);
  });

  it("reject verdict — closes dispute without refund", async () => {
    setupContextMocks();
    mockClassifyDispute.mockReturnValue({
      verdict: "reject",
      confidence: "high",
      reasons: ["spam_pattern_not_matched"],
    });
    mockFrom
      .mockImplementationOnce(() => updateChain()); // lead_disputes update (rejected)

    const result = await autoResolveDispute(DISPUTE_ID);
    expect(result.applied).toBe(true);
    expect(result.verdict).toBe("reject");
    expect(result.refundedCents).toBe(0);
  });

  it("refund verdict — credits advisor balance via ledger and closes dispute", async () => {
    setupContextMocks();
    mockClassifyDispute.mockReturnValue({
      verdict: "refund",
      confidence: "high",
      reasons: ["spam_likely"],
    });
    // applyRefund routes the credit through recordLedgerEntry now.
    pushLedgerEntrySlots({
      professionalId: 1,
      amountCents: 4900,
      beforeBalance: 10000,
      ledgerId: 99,
      kind: "lead_dispute_refund",
      refType: "advisor_lead_disputes",
      refId: String(DISPUTE_ID),
    });
    mockFrom
      .mockImplementationOnce(() => updateChain())                                  // mark lead
      .mockImplementationOnce(() => updateChain())                                  // waive billing
      .mockImplementationOnce(() => updateChain());                                 // close dispute
    // notifyAdvisorRefund (fire-and-forget)
    mockFrom
      .mockImplementationOnce(() => maybySingle({ name: "Bob", email: "bob@b.com" }));

    const result = await autoResolveDispute(DISPUTE_ID);
    expect(result.applied).toBe(true);
    expect(result.verdict).toBe("refund");
    expect(result.refundedCents).toBe(4900);
  });

  it("refund with 0 cents — skips credit update and audit trail", async () => {
    const zeroCentLead = { ...LEAD, bill_amount_cents: 0 };
    mockFrom
      .mockImplementationOnce(() => maybySingle(DISPUTE))
      .mockImplementationOnce(() => maybySingle(zeroCentLead))
      .mockImplementationOnce(() => maybySingle(ADVISOR))
      .mockImplementationOnce(() => countQuery(0));
    mockClassifyDispute.mockReturnValue({ verdict: "refund", confidence: "medium", reasons: [] });
    mockFrom
      .mockImplementationOnce(() => updateChain())  // mark lead
      .mockImplementationOnce(() => updateChain())  // waive billing
      .mockImplementationOnce(() => updateChain()); // close dispute
    mockFrom
      .mockImplementationOnce(() => maybySingle({ name: "Bob", email: "bob@b.com" }));

    const result = await autoResolveDispute(DISPUTE_ID);
    expect(result.refundedCents).toBe(0);
    expect(mockRecordFinancialAudit).not.toHaveBeenCalled();
  });

  it("credit ledger error — falls back to escalate", async () => {
    setupContextMocks();
    mockClassifyDispute.mockReturnValue({ verdict: "refund", confidence: "high", reasons: [] });
    // Idempotency check passes (no prior row), but the professionals
    // read fails — recordLedgerEntry throws, dispute resolver escalates.
    mockFrom
      .mockImplementationOnce(() => maybySingle(null))                              // no prior ledger row
      .mockImplementationOnce(() => singleResult(null, { message: "advisor read failed" })) // read fails
      .mockImplementationOnce(() => updateChain());                                 // escalated fallback dispute update

    const result = await autoResolveDispute(DISPUTE_ID);
    expect(result.verdict).toBe("escalate");
    expect(result.applied).toBe(true);
  });

  it("records financial audit on successful refund", async () => {
    setupContextMocks();
    mockClassifyDispute.mockReturnValue({ verdict: "refund", confidence: "high", reasons: [] });
    pushLedgerEntrySlots({
      professionalId: 1,
      amountCents: 4900,
      beforeBalance: 0,
      ledgerId: 100,
      kind: "lead_dispute_refund",
      refType: "advisor_lead_disputes",
      refId: String(DISPUTE_ID),
    });
    mockFrom
      .mockImplementationOnce(() => updateChain())   // mark lead
      .mockImplementationOnce(() => updateChain())   // waive billing
      .mockImplementationOnce(() => updateChain());  // close dispute
    mockFrom.mockImplementationOnce(() => maybySingle(null)); // no email found

    await autoResolveDispute(DISPUTE_ID);
    expect(mockRecordFinancialAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "refund",
        resourceType: "advisor_credit_balance",
        amountCents: 4900,
      }),
    );
  });
});

describe("notifyAdminEscalated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("calls Resend API with dispute details when RESEND_API_KEY is set", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);
    process.env.RESEND_API_KEY = "test-key";

    await notifyAdminEscalated(DISPUTE_ID, "Bob Advisor", "Jane Lead", "spam_likely", null, ["spam_likely"]);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((mockFetch.mock.calls[0]?.[1] as RequestInit)?.body as string);
    expect(body.to).toContain("admin@invest.com.au");
    expect(body.subject).toContain("escalated");

    delete process.env.RESEND_API_KEY;
  });

  it("does not call fetch when RESEND_API_KEY is absent", async () => {
    delete process.env.RESEND_API_KEY;
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    await notifyAdminEscalated(DISPUTE_ID, "Bob", "Jane", "spam", null, []);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not throw when fetch rejects (fire-and-forget)", async () => {
    process.env.RESEND_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    await expect(
      notifyAdminEscalated(DISPUTE_ID, "Bob", "Jane", "spam", null, []),
    ).resolves.not.toThrow();

    delete process.env.RESEND_API_KEY;
  });
});
