import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// Pin pitch pricing so cost assertions are deterministic (3 credits base, no rules).
vi.mock("@/lib/prospect-pool/pitch-pricing", () => ({
  estimatePitchCredits: vi.fn(async () => 3),
  BASE_PITCH_COST_CENTS: 300,
  pitchCreditsFromCents: (c: number) => Math.max(1, Math.round(c / 100)),
}));

const { mockClassify } = vi.hoisted(() => ({
  mockClassify: vi.fn(() => ({
    verdict: "auto_publish",
    confidence: "high",
    riskScore: 0,
    reasons: ["clean"],
  })),
}));
vi.mock("@/lib/text-moderation", () => ({ classifyText: mockClassify }));

const { mockRecordLedgerEntry } = vi.hoisted(() => ({
  mockRecordLedgerEntry: vi.fn(async () => ({
    entry: {},
    balanceAfterCents: 5000,
    idempotent: false,
  })),
}));
vi.mock("@/lib/advisor-credit-ledger", () => ({
  recordLedgerEntry: mockRecordLedgerEntry,
}));

// Table-aware supabase admin mock (same harness as briefs-sla-sweep.test.ts):
// from(table) shifts the next queued result for that table.
type QueuedResult = { data?: unknown; error?: unknown; count?: number | null };
const { tableQueues, capturedInserts, mockFrom } = vi.hoisted(() => {
  const tableQueues = new Map<string, QueuedResult[]>();
  const capturedInserts = new Map<string, unknown[]>();
  function makeBuilder(table: string, result: QueuedResult) {
    const b: Record<string, unknown> = {};
    for (const m of [
      "select", "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not",
      "or", "order", "limit", "range", "single", "maybeSingle", "filter", "contains",
    ]) {
      b[m] = vi.fn(() => b);
    }
    b.insert = vi.fn((payload: unknown) => {
      const arr = capturedInserts.get(table) ?? [];
      arr.push(payload);
      capturedInserts.set(table, arr);
      return b;
    });
    b.update = vi.fn(() => b);
    b.upsert = vi.fn(() => b);
    b.delete = vi.fn(() => b);
    b.then = (cb: (v: unknown) => unknown) =>
      Promise.resolve(cb({ data: null, error: null, count: null, ...result }));
    return b;
  }
  const mockFrom = vi.fn((table: string) => {
    const queue = tableQueues.get(table);
    const result = queue && queue.length > 0 ? queue.shift()! : {};
    return makeBuilder(table, result);
  });
  return { tableQueues, capturedInserts, mockFrom };
});
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  sendPitch,
  acceptPitch,
  declinePitch,
  setProspectStatus,
  effectiveStatus,
} from "@/lib/prospect-pool";
import type { ProspectPoolRow } from "@/lib/prospect-pool/types";

function queue(table: string, ...results: QueuedResult[]) {
  tableQueues.set(table, [...(tableQueues.get(table) ?? []), ...results]);
}

const ACTIVE_PROSPECT = {
  id: "prospect-1",
  snapshot: { advisorType: "smsf-accountant", advisorTypeLabel: "SMSF Accountant", state: "NSW", budgetBand: "large" },
  status: "active",
  expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
};

beforeEach(() => {
  tableQueues.clear();
  capturedInserts.clear();
  mockRecordLedgerEntry.mockClear();
  mockClassify.mockReset();
  mockClassify.mockReturnValue({
    verdict: "auto_publish",
    confidence: "high",
    riskScore: 0,
    reasons: ["clean"],
  });
});

describe("sendPitch — moderation", () => {
  it("rejects a pitch the moderator does not auto_publish (422 reasons)", async () => {
    mockClassify.mockReturnValue({
      verdict: "escalate",
      confidence: "high",
      riskScore: 50,
      reasons: ["forward_looking_requires_licensed_review"],
    });
    const res = await sendPitch({
      professionalId: 7,
      prospectId: "prospect-1",
      body: "You should move your super into property — guaranteed 20% returns.",
      feeBand: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("moderation_rejected");
      expect(res.moderationReasons).toContain("forward_looking_requires_licensed_review");
    }
    // No ledger debit on a rejected pitch.
    expect(mockRecordLedgerEntry).not.toHaveBeenCalled();
  });

  it("rejects an over-length body before any DB work", async () => {
    const res = await sendPitch({
      professionalId: 7,
      prospectId: "prospect-1",
      body: "x".repeat(301),
      feeBand: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("body_too_long");
  });
});

describe("sendPitch — caps + suppression + debit", () => {
  it("debits credits via the lead_spend ledger path on a clean pitch", async () => {
    queue("prospect_pool", { data: ACTIVE_PROSPECT });
    queue("advisor_pitches",
      { data: null }, // no existing pitch by this adviser
      { count: 0 },   // monthly cap window
      { data: { id: "pitch-1", prospect_id: "prospect-1", professional_id: 7, credits_cost: 3, status: "pending" } }, // insert returns row
    );

    const res = await sendPitch({
      professionalId: 7,
      prospectId: "prospect-1",
      body: "I help SMSF trustees set up and run compliant funds. Happy to walk you through setup and costs.",
      feeBand: "$1,500–$2,500 setup",
    });

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.creditsSpent).toBe(3);
    expect(mockRecordLedgerEntry).toHaveBeenCalledTimes(1);
    const call = (mockRecordLedgerEntry.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(call.kind).toBe("lead_spend");
    expect(call.amountCents).toBe(-300); // 3 credits * 100
    expect(call.referenceType).toBe("advisor_pitch");
  });

  it("suppresses an adviser the prospect previously declined", async () => {
    queue("prospect_pool", { data: ACTIVE_PROSPECT });
    queue("advisor_pitches", { data: { status: "declined" } });
    const res = await sendPitch({
      professionalId: 7,
      prospectId: "prospect-1",
      body: "Let me help with your SMSF.",
      feeBand: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("previously_declined");
    expect(mockRecordLedgerEntry).not.toHaveBeenCalled();
  });

  it("blocks a second pitch from the same adviser (cap of 1)", async () => {
    queue("prospect_pool", { data: ACTIVE_PROSPECT });
    queue("advisor_pitches", { data: { status: "pending" } });
    const res = await sendPitch({
      professionalId: 7,
      prospectId: "prospect-1",
      body: "Following up on my SMSF help.",
      feeBand: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("already_pitched");
  });

  it("enforces the <=3 pitches/prospect/month cap", async () => {
    queue("prospect_pool", { data: ACTIVE_PROSPECT });
    queue("advisor_pitches",
      { data: null }, // no existing pitch by this adviser
      { count: 3 },   // already 3 pitches this month
    );
    const res = await sendPitch({
      professionalId: 9,
      prospectId: "prospect-1",
      body: "I can help with your SMSF setup and ongoing compliance.",
      feeBand: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("monthly_cap_reached");
    expect(mockRecordLedgerEntry).not.toHaveBeenCalled();
  });

  it("rolls back the pitch row + reports insufficient_credits when the debit throws", async () => {
    queue("prospect_pool", { data: ACTIVE_PROSPECT });
    queue("advisor_pitches",
      { data: null },
      { count: 0 },
      { data: { id: "pitch-x", credits_cost: 3, status: "pending" } },
    );
    mockRecordLedgerEntry.mockRejectedValueOnce(new Error("insufficient balance"));
    const res = await sendPitch({
      professionalId: 7,
      prospectId: "prospect-1",
      body: "I help SMSF trustees with compliant fund setup and admin.",
      feeBand: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("insufficient_credits");
  });

  it("rejects pitching an inactive prospect", async () => {
    queue("prospect_pool", {
      data: { ...ACTIVE_PROSPECT, status: "paused" },
    });
    const res = await sendPitch({
      professionalId: 7,
      prospectId: "prospect-1",
      body: "I can help with your SMSF.",
      feeBand: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("prospect_inactive");
  });
});

describe("acceptPitch — bootstrap brief + reveal", () => {
  it("creates an already-accepted advisor_auctions row with real contact + 0 cost", async () => {
    queue("advisor_pitches", {
      data: {
        id: "pitch-1",
        prospect_id: "prospect-1",
        professional_id: 7,
        status: "pending",
        prospect_pool: { user_id: "user-1", snapshot: ACTIVE_PROSPECT.snapshot },
      },
    });
    queue("professionals", { data: { id: 7, name: "Sam Adviser", email: "sam@firm.com" } });
    queue("advisor_auctions", { data: { id: 555, slug: "offer-smsf-accountant-enquiry-abc" } });

    const res = await acceptPitch({
      userId: "user-1",
      pitchId: "pitch-1",
      contactEmail: "consumer@example.com",
      contactName: "Pat Consumer",
      contactPhone: null,
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.briefId).toBe(555);
      expect(res.briefSlug).toContain("offer-");
      expect(res.adviserEmail).toBe("sam@firm.com");
    }

    const briefInsert = capturedInserts.get("advisor_auctions")?.[0] as Record<string, unknown>;
    expect(briefInsert.flow_type).toBe("accept");
    expect(briefInsert.source).toBe("open_to_offers");
    expect(briefInsert.contact_email).toBe("consumer@example.com");
    expect(briefInsert.accepted_by_professional_id).toBe(7);
    expect(briefInsert.accept_credits_cost).toBe(0); // adviser already paid for the pitch
    expect(briefInsert.accepted_at).toBeTruthy();
  });

  it("rejects accepting a pitch that isn't the caller's", async () => {
    queue("advisor_pitches", {
      data: {
        id: "pitch-1",
        status: "pending",
        prospect_pool: { user_id: "someone-else", snapshot: {} },
      },
    });
    const res = await acceptPitch({
      userId: "user-1",
      pitchId: "pitch-1",
      contactEmail: "consumer@example.com",
      contactName: null,
      contactPhone: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("pitch_not_found");
  });

  it("rejects accepting a non-pending pitch", async () => {
    queue("advisor_pitches", {
      data: {
        id: "pitch-1",
        status: "accepted",
        prospect_pool: { user_id: "user-1", snapshot: {} },
      },
    });
    const res = await acceptPitch({
      userId: "user-1",
      pitchId: "pitch-1",
      contactEmail: "consumer@example.com",
      contactName: null,
      contactPhone: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not_pending");
  });
});

describe("declinePitch — refund via established primitive", () => {
  it("refunds the adviser's credits with the dispute-refund kind", async () => {
    queue("advisor_pitches", {
      data: {
        id: "pitch-1",
        prospect_id: "prospect-1",
        professional_id: 7,
        credits_cost: 3,
        status: "pending",
        prospect_pool: { user_id: "user-1", snapshot: ACTIVE_PROSPECT.snapshot },
      },
    });
    queue("professionals", { data: { name: "Sam Adviser", email: "sam@firm.com" } });

    const res = await declinePitch({ userId: "user-1", pitchId: "pitch-1" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.creditsRefunded).toBe(3);

    expect(mockRecordLedgerEntry).toHaveBeenCalledTimes(1);
    const call = (mockRecordLedgerEntry.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(call.kind).toBe("lead_dispute_refund");
    expect(call.amountCents).toBe(300); // positive refund
    expect(call.referenceType).toBe("advisor_pitch_refund");
  });

  it("reports 0 refunded when the refund is idempotent (already refunded)", async () => {
    queue("advisor_pitches", {
      data: {
        id: "pitch-1",
        prospect_id: "prospect-1",
        professional_id: 7,
        credits_cost: 3,
        status: "pending",
        prospect_pool: { user_id: "user-1", snapshot: ACTIVE_PROSPECT.snapshot },
      },
    });
    queue("professionals", { data: { name: "Sam", email: "sam@firm.com" } });
    mockRecordLedgerEntry.mockResolvedValueOnce({ entry: {}, balanceAfterCents: 5000, idempotent: true });

    const res = await declinePitch({ userId: "user-1", pitchId: "pitch-1" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.creditsRefunded).toBe(0);
  });
});

describe("setProspectStatus + effectiveStatus", () => {
  it("updates status to paused/expired", async () => {
    queue("prospect_pool", { error: null });
    expect(await setProspectStatus("user-1", "paused")).toBe(true);
  });

  it("reports an active-but-expired row as expired (renewal nudge)", () => {
    const row: ProspectPoolRow = {
      id: "p1",
      user_id: "user-1",
      snapshot: {} as never,
      status: "active",
      expires_at: new Date(Date.now() - 1000).toISOString(),
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(effectiveStatus(row)).toBe("expired");
  });

  it("keeps a live active row active", () => {
    const row: ProspectPoolRow = {
      id: "p1",
      user_id: "user-1",
      snapshot: {} as never,
      status: "active",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    expect(effectiveStatus(row)).toBe("active");
  });
});
