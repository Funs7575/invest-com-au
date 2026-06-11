import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockIsFlagEnabled } = vi.hoisted(() => ({
  mockIsFlagEnabled: vi.fn(async () => true),
}));
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: mockIsFlagEnabled,
}));

const { mockRecordLedgerEntry } = vi.hoisted(() => ({
  mockRecordLedgerEntry: vi.fn(async () => ({
    entry: {},
    balanceAfterCents: 1000,
    idempotent: false,
  })),
}));
vi.mock("@/lib/advisor-credit-ledger", () => ({
  recordLedgerEntry: mockRecordLedgerEntry,
}));

const { mockWarning, mockClawback, mockReopened } = vi.hoisted(() => ({
  mockWarning: vi.fn(async () => true),
  mockClawback: vi.fn(async () => true),
  mockReopened: vi.fn(async () => true),
}));
vi.mock("@/lib/marketplace-emails", () => ({
  sendProviderSlaWarning: mockWarning,
  sendProviderSlaClawback: mockClawback,
  sendConsumerSlaReopened: mockReopened,
}));

const { mockEnqueue } = vi.hoisted(() => ({
  mockEnqueue: vi.fn(async () => true),
}));
vi.mock("@/lib/user-notifications", () => ({
  enqueueUserNotificationByEmail: mockEnqueue,
}));

const { mockNotifyEligible } = vi.hoisted(() => ({
  mockNotifyEligible: vi.fn(async () => {}),
}));
vi.mock("@/lib/briefs/notify", () => ({
  notifyEligibleProviders: mockNotifyEligible,
}));

const { mockRunStandingOrders } = vi.hoisted(() => ({
  mockRunStandingOrders: vi.fn(async () => ({ executed: true, accepted: false })),
}));
vi.mock("@/lib/briefs/standing-orders", () => ({
  runStandingOrdersForBrief: mockRunStandingOrders,
}));

// Table-aware supabase admin mock: from(table) shifts the next queued
// result for that table (falling back to an empty result), so multi-step
// flows (scan → exemption reads → release update) can be scripted.
type QueuedResult = { data?: unknown; error?: unknown; count?: number | null };
const { tableQueues, mockFrom } = vi.hoisted(() => {
  const tableQueues = new Map<string, QueuedResult[]>();
  function makeBuilder(result: QueuedResult) {
    const b: Record<string, unknown> = {};
    for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter","contains"]) {
      b[m] = vi.fn(() => b);
    }
    b.then = (cb: (v: unknown) => unknown) =>
      Promise.resolve(cb({ data: null, error: null, count: null, ...result }));
    return b;
  }
  const mockFrom = vi.fn((table: string) => {
    const queue = tableQueues.get(table);
    const result = queue && queue.length > 0 ? queue.shift()! : {};
    return makeBuilder(result);
  });
  return { tableQueues, mockFrom };
});
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { sweepBriefSla, RESPONSE_SLA_HOURS } from "@/lib/briefs/sla";

function queue(table: string, ...results: QueuedResult[]) {
  tableQueues.set(table, [...(tableQueues.get(table) ?? []), ...results]);
}

const NOW = new Date("2026-06-11T12:00:00.000Z");

function makeBreachedBrief(overrides: Record<string, unknown> = {}) {
  return {
    id: 77,
    slug: "stuck-brief",
    flow_type: "accept",
    status: "open",
    tracker_status: "new",
    risk_review_status: "clear",
    accepted_by_professional_id: 42,
    accepted_by_team_id: null,
    accepted_at: new Date(
      NOW.getTime() - (RESPONSE_SLA_HOURS + 2) * 3_600_000,
    ).toISOString(),
    accept_credits_cost: 3,
    pricing_tier_at_accept: "standard",
    job_title: "Help with SMSF",
    job_description: "desc",
    budget_band: "2k_5k",
    advisor_types: null,
    location: "NSW",
    contact_name: "Sam",
    contact_email: "sam@example.com",
    brief_template: "smsf_property",
    brief_payload: {},
    provider_preference: "any",
    routing_mode: "smart_match",
    target_professional_id: null,
    target_firm_id: null,
    target_team_id: null,
    listing_id: null,
    ends_at: "2026-07-01T00:00:00.000Z",
    created_at: "2026-06-08T00:00:00.000Z",
    ...overrides,
  };
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("sweepBriefSla", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableQueues.clear();
    mockIsFlagEnabled.mockResolvedValue(true);
  });

  it("is a no-op when the response_guarantee flag is off", async () => {
    mockIsFlagEnabled.mockResolvedValue(false);
    const stats = await sweepBriefSla(NOW);
    expect(stats).toEqual({ scanned: 0, warned: 0, clawedBack: 0, creditsRefunded: 0 });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("claws back a silent accept: refund, release, events, exclusion fan-out", async () => {
    const brief = makeBreachedBrief();
    // 1: candidate scan; 2: release update succeeds
    queue("advisor_auctions", { data: [brief] }, { data: { id: 77 } });
    queue("brief_messages", { data: [] });
    queue("brief_disputes", { data: [] });
    // sla events read (none yet), then insert of the clawback row
    queue("brief_sla_events", { data: [] }, { data: null });
    queue("brief_tracker_events", { data: null });
    queue("professionals", { data: { name: "Pro Penny", email: "penny@pro.com" } });

    const stats = await sweepBriefSla(NOW);
    await flushAsync();

    expect(stats.scanned).toBe(1);
    expect(stats.clawedBack).toBe(1);
    expect(stats.creditsRefunded).toBe(3);

    expect(mockRecordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalId: 42,
        amountCents: 300,
        kind: "sla_refund",
        referenceType: "brief_sla_refund",
        // Scoped to brief + provider so a different provider breaching on a
        // re-accepted brief gets a fresh refund, not a dedupe.
        referenceId: "77:42",
      }),
    );
    expect(mockNotifyEligible).toHaveBeenCalledWith(
      expect.objectContaining({ id: 77, accepted_by_professional_id: null }),
      3,
      { excludeProfessionalId: 42 },
    );
    expect(mockRunStandingOrders).toHaveBeenCalledWith(77, {
      excludeProfessionalId: 42,
    });
    expect(mockClawback).toHaveBeenCalled();
    expect(mockReopened).toHaveBeenCalledWith(
      expect.objectContaining({ consumerEmail: "sam@example.com" }),
    );
    expect(mockEnqueue).toHaveBeenCalled();
  });

  it("skips the refund for success_only accepts but still releases", async () => {
    const brief = makeBreachedBrief({ pricing_tier_at_accept: "success_only" });
    queue("advisor_auctions", { data: [brief] }, { data: { id: 77 } });
    queue("brief_messages", { data: [] });
    queue("brief_disputes", { data: [] });
    queue("brief_sla_events", { data: [] }, { data: null });
    queue("brief_tracker_events", { data: null });
    queue("professionals", { data: { name: "Pro", email: "p@p.com" } });

    const stats = await sweepBriefSla(NOW);
    await flushAsync();

    expect(stats.clawedBack).toBe(1);
    expect(stats.creditsRefunded).toBe(0);
    expect(mockRecordLedgerEntry).not.toHaveBeenCalled();
  });

  it("exempts briefs where the provider has already messaged", async () => {
    const brief = makeBreachedBrief();
    queue("advisor_auctions", { data: [brief] });
    queue("brief_messages", { data: [{ id: 1 }] });
    queue("brief_disputes", { data: [] });
    queue("brief_sla_events", { data: [] });

    const stats = await sweepBriefSla(NOW);
    expect(stats.scanned).toBe(1);
    expect(stats.clawedBack).toBe(0);
    expect(mockRecordLedgerEntry).not.toHaveBeenCalled();
  });

  it("warns (once) inside the warning window instead of clawing back", async () => {
    const brief = makeBreachedBrief({
      accepted_at: new Date(NOW.getTime() - 19 * 3_600_000).toISOString(),
    });
    queue("advisor_auctions", { data: [brief] });
    queue("brief_messages", { data: [] });
    queue("brief_disputes", { data: [] });
    queue("brief_sla_events", { data: [] }, { data: null });
    queue("professionals", { data: { name: "Pro", email: "p@p.com" } });

    const stats = await sweepBriefSla(NOW);
    await flushAsync();

    expect(stats.warned).toBe(1);
    expect(stats.clawedBack).toBe(0);
    expect(mockWarning).toHaveBeenCalledWith(
      expect.objectContaining({ briefSlug: "stuck-brief" }),
    );
    expect(mockRecordLedgerEntry).not.toHaveBeenCalled();
  });

  it("does not double-claw when a clawback event already exists", async () => {
    const brief = makeBreachedBrief();
    queue("advisor_auctions", { data: [brief] });
    queue("brief_messages", { data: [] });
    queue("brief_disputes", { data: [] });
    queue("brief_sla_events", {
      data: [{ event_type: "clawback", professional_id: 42 }],
    });

    const stats = await sweepBriefSla(NOW);
    expect(stats.clawedBack).toBe(0);
    expect(mockRecordLedgerEntry).not.toHaveBeenCalled();
  });
});
