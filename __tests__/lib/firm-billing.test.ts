import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  getFirmBillingSummary,
  resolveFirmAdminContext,
  LOW_BALANCE_THRESHOLD_CENTS,
} from "@/lib/firm-billing";

const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

interface MemberRow {
  id: number;
  name: string;
  slug: string;
  email: string;
  role: string | null;
  is_firm_admin: boolean | null;
  status: string | null;
  credit_balance_cents: number | null;
  lifetime_credit_cents: number | null;
  lifetime_lead_spend_cents: number | null;
  auto_recharge_enabled: boolean | null;
  stripe_customer_id: string | null;
  stripe_default_payment_method: string | null;
  last_login_at: string | null;
}

function row(overrides: Partial<MemberRow>): MemberRow {
  return {
    id: 1,
    name: "Member",
    slug: "member",
    email: "m@example.com",
    role: "member",
    is_firm_admin: false,
    status: "active",
    credit_balance_cents: 10000,
    lifetime_credit_cents: 10000,
    lifetime_lead_spend_cents: 0,
    auto_recharge_enabled: false,
    stripe_customer_id: null,
    stripe_default_payment_method: null,
    last_login_at: "2026-05-17T12:00:00Z",
    ...overrides,
  };
}

function mockFirmAndMembers(
  firmStatus: "active" | "pending" | null,
  rows: MemberRow[] | null,
  firmId = 7,
) {
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "advisor_firms") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: firmStatus
            ? { id: firmId, slug: "acme", name: "Acme", status: firmStatus }
            : null,
          error: firmStatus ? null : { message: "not found" },
        }),
      };
    }
    if (table === "professionals") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: undefined,
        single: vi.fn(),
        maybeSingle: vi.fn(),
        // For the firm-billing summary query we resolve via awaiting the
        // builder directly after `order()`.
        ...{
          __resolve: rows,
        },
      } as unknown as Record<string, unknown>;
    }
    return {};
  });

  // Override mockAdminFrom to make the chain awaitable after `.order()`.
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "advisor_firms") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: firmStatus
            ? { id: firmId, slug: "acme", name: "Acme", status: firmStatus }
            : null,
          error: firmStatus ? null : { message: "not found" },
        }),
      };
    }
    if (table === "professionals") {
      const result = { data: rows, error: rows ? null : { message: "err" } };
      const builder: Record<string, unknown> = {};
      builder.select = vi.fn(() => builder);
      builder.eq = vi.fn(() => builder);
      builder.in = vi.fn(() => builder);
      builder.order = vi.fn(() => builder);
      builder.then = (cb: (v: typeof result) => unknown) => Promise.resolve(cb(result));
      builder.catch = () => Promise.resolve();
      return builder;
    }
    return {};
  });
}

describe("getFirmBillingSummary", () => {
  beforeEach(() => {
    mockAdminFrom.mockReset();
  });

  it("returns null when firm is not active", async () => {
    mockFirmAndMembers("pending", []);
    const out = await getFirmBillingSummary(7);
    expect(out).toBeNull();
  });

  it("returns null when firm does not exist", async () => {
    mockFirmAndMembers(null, null);
    const out = await getFirmBillingSummary(99);
    expect(out).toBeNull();
  });

  it("aggregates active members and ignores pending in totals", async () => {
    mockFirmAndMembers("active", [
      row({
        id: 1,
        name: "Alice (admin)",
        is_firm_admin: true,
        credit_balance_cents: 12000,
        lifetime_credit_cents: 25000,
        lifetime_lead_spend_cents: 13000,
        stripe_customer_id: "cus_admin",
      }),
      row({
        id: 2,
        name: "Bob",
        credit_balance_cents: 8000,
        lifetime_credit_cents: 8000,
        lifetime_lead_spend_cents: 0,
      }),
      row({
        id: 3,
        name: "Carol pending",
        status: "pending",
        credit_balance_cents: 9999,
        lifetime_credit_cents: 9999,
      }),
    ]);

    const out = await getFirmBillingSummary(7);
    expect(out).not.toBeNull();
    expect(out!.totalCreditBalanceCents).toBe(20000);
    expect(out!.totalLifetimeCreditCents).toBe(33000);
    expect(out!.totalLifetimeSpendCents).toBe(13000);
    expect(out!.activeMemberCount).toBe(2);
    expect(out!.pendingMemberCount).toBe(1);
    expect(out!.members).toHaveLength(3);
  });

  it("flags members below the low-balance threshold", async () => {
    mockFirmAndMembers("active", [
      row({ id: 1, credit_balance_cents: 100 }),
      row({ id: 2, credit_balance_cents: LOW_BALANCE_THRESHOLD_CENTS }),
      row({ id: 3, credit_balance_cents: LOW_BALANCE_THRESHOLD_CENTS - 1 }),
    ]);

    const out = await getFirmBillingSummary(7);
    expect(out!.lowBalanceMemberCount).toBe(2);
    expect(out!.members.find((m) => m.id === 1)?.isLowBalance).toBe(true);
    expect(out!.members.find((m) => m.id === 2)?.isLowBalance).toBe(false);
    expect(out!.members.find((m) => m.id === 3)?.isLowBalance).toBe(true);
  });

  it("picks the firm admin's Stripe customer as the payment method when available", async () => {
    mockFirmAndMembers("active", [
      row({
        id: 1,
        name: "Bob (member)",
        is_firm_admin: false,
        stripe_customer_id: "cus_bob",
        lifetime_credit_cents: 50000,
      }),
      row({
        id: 2,
        name: "Alice (admin)",
        is_firm_admin: true,
        stripe_customer_id: "cus_alice",
        lifetime_credit_cents: 100,
      }),
    ]);

    const out = await getFirmBillingSummary(7);
    expect(out!.paymentMethod).toEqual({
      advisorId: 2,
      advisorName: "Alice (admin)",
      stripeCustomerId: "cus_alice",
    });
  });

  it("falls back to highest-lifetime-credit non-admin when no admin has a Stripe customer", async () => {
    mockFirmAndMembers("active", [
      row({
        id: 1,
        name: "Alice (admin)",
        is_firm_admin: true,
        stripe_customer_id: null,
      }),
      row({
        id: 2,
        name: "Bob",
        stripe_customer_id: "cus_bob",
        lifetime_credit_cents: 200,
      }),
      row({
        id: 3,
        name: "Carol",
        stripe_customer_id: "cus_carol",
        lifetime_credit_cents: 5000,
      }),
    ]);

    const out = await getFirmBillingSummary(7);
    expect(out!.paymentMethod?.advisorId).toBe(3);
  });

  it("returns null payment method when no member has a Stripe customer", async () => {
    mockFirmAndMembers("active", [
      row({ id: 1, is_firm_admin: true, stripe_customer_id: null }),
      row({ id: 2, stripe_customer_id: null }),
    ]);

    const out = await getFirmBillingSummary(7);
    expect(out!.paymentMethod).toBeNull();
  });

  it("maps hasSavedCard from stripe_default_payment_method", async () => {
    mockFirmAndMembers("active", [
      row({ id: 1, stripe_default_payment_method: "pm_123" }),
      row({ id: 2, stripe_default_payment_method: null }),
    ]);
    const out = await getFirmBillingSummary(7);
    expect(out!.members.find((m) => m.id === 1)?.hasSavedCard).toBe(true);
    expect(out!.members.find((m) => m.id === 2)?.hasSavedCard).toBe(false);
  });
});

describe("resolveFirmAdminContext", () => {
  beforeEach(() => {
    mockAdminFrom.mockReset();
  });

  it("returns context for firm admins", async () => {
    mockAdminFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 42, firm_id: 7, is_firm_admin: true },
        error: null,
      }),
    }));
    const out = await resolveFirmAdminContext(42);
    expect(out).toEqual({ advisorId: 42, firmId: 7 });
  });

  it("returns null for non-admin firm members", async () => {
    mockAdminFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 42, firm_id: 7, is_firm_admin: false },
        error: null,
      }),
    }));
    const out = await resolveFirmAdminContext(42);
    expect(out).toBeNull();
  });

  it("returns null for solo advisors with no firm", async () => {
    mockAdminFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 42, firm_id: null, is_firm_admin: false },
        error: null,
      }),
    }));
    const out = await resolveFirmAdminContext(42);
    expect(out).toBeNull();
  });

  it("returns null when the advisor row is missing", async () => {
    mockAdminFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
    const out = await resolveFirmAdminContext(99);
    expect(out).toBeNull();
  });
});
