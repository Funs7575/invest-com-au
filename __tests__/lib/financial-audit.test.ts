import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

let periodClosed = false;
vi.mock("@/lib/financial-periods", () => ({
  isPeriodClosedAt: vi.fn(async () => periodClosed),
}));

let insertError: { message: string } | null = null;
let throwOnFrom = false;

type Row = Record<string, unknown>;
const insertCalls: Row[] = [];

const mockFrom = vi.fn(() => {
  if (throwOnFrom) throw new Error("connection refused");
  return {
    insert: async (row: Row) => {
      insertCalls.push(row);
      return { data: null, error: insertError };
    },
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { recordFinancialAudit } from "@/lib/financial-audit";

// ─── Tests ───────────────────────────────────────────────────────────

describe("recordFinancialAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertError = null;
    periodClosed = false;
    throwOnFrom = false;
    insertCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("inserts the audit row with snake_case column names", async () => {
    await recordFinancialAudit({
      actorType: "admin",
      actorId: "admin-user-1",
      action: "refund",
      resourceType: "advisor_invoice",
      resourceId: 4242,
      amountCents: -12345,
      reason: "customer requested cancellation",
      context: { ticket: "T-101" },
    });

    expect(insertCalls).toHaveLength(1);
    const row = insertCalls[0]!;
    expect(row).toMatchObject({
      actor_type: "admin",
      actor_id: "admin-user-1",
      action: "refund",
      resource_type: "advisor_invoice",
      resource_id: "4242", // coerced to string
      amount_cents: -12345,
      currency: "AUD", // default
      reason: "customer requested cancellation",
      context: { ticket: "T-101" },
    });
  });

  it("coerces numeric resourceId to a string (the DB column is text)", async () => {
    await recordFinancialAudit({
      actorType: "cron",
      action: "credit",
      resourceType: "advisor_wallet",
      resourceId: 12345,
    });
    expect(insertCalls[0]!.resource_id).toBe("12345");
  });

  it("preserves string resourceIds untouched", async () => {
    await recordFinancialAudit({
      actorType: "cron",
      action: "credit",
      resourceType: "advisor_wallet",
      resourceId: "uuid-abc",
    });
    expect(insertCalls[0]!.resource_id).toBe("uuid-abc");
  });

  it("defaults currency to AUD when omitted", async () => {
    await recordFinancialAudit({
      actorType: "system",
      action: "charge",
      resourceType: "subscription",
      resourceId: 1,
      amountCents: 9900,
    });
    expect(insertCalls[0]!.currency).toBe("AUD");
  });

  it("honours a non-AUD currency when provided", async () => {
    await recordFinancialAudit({
      actorType: "system",
      action: "charge",
      resourceType: "subscription",
      resourceId: 1,
      amountCents: 9900,
      currency: "USD",
    });
    expect(insertCalls[0]!.currency).toBe("USD");
  });

  it("nulls optional fields when omitted (actorId / amountCents / reason / context)", async () => {
    await recordFinancialAudit({
      actorType: "system",
      action: "adjustment",
      resourceType: "ledger",
      resourceId: 1,
    });
    expect(insertCalls[0]).toMatchObject({
      actor_id: null,
      amount_cents: null,
      old_value: null,
      new_value: null,
      reason: null,
      context: null,
    });
  });

  it("CRITICAL: refuses to insert when the period is closed (AFSL s912D immutability)", async () => {
    periodClosed = true;

    await recordFinancialAudit({
      actorType: "admin",
      action: "refund",
      resourceType: "advisor_invoice",
      resourceId: 42,
      amountCents: -100,
    });

    // No insert ever landed
    expect(insertCalls).toHaveLength(0);
  });

  it("never throws — swallows insert errors (fire-and-forget contract)", async () => {
    insertError = { message: "fk violation" };
    await expect(
      recordFinancialAudit({
        actorType: "admin",
        action: "credit",
        resourceType: "wallet",
        resourceId: 1,
      }),
    ).resolves.toBeUndefined();
  });

  it("never throws — swallows thrown createAdminClient errors", async () => {
    throwOnFrom = true;
    await expect(
      recordFinancialAudit({
        actorType: "admin",
        action: "credit",
        resourceType: "wallet",
        resourceId: 1,
      }),
    ).resolves.toBeUndefined();
    expect(insertCalls).toHaveLength(0);
  });
});
