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

// Stripe isn't invoked in the tests below (checkAutoTopup is a
// background fire-and-forget that we never await in main-path
// assertions). Mock the module anyway so imports succeed.
vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    paymentIntents: { create: vi.fn(async () => ({ id: "pi_x" })) },
  })),
}));

type Wallet = {
  id: number;
  broker_slug: string;
  balance_cents: number;
  lifetime_deposited_cents: number;
  lifetime_spent_cents: number;
  auto_topup_enabled?: boolean;
};

let currentWallet: Wallet | null = null;
let insertedTxn: Record<string, unknown> | null = null;
let existingStripeTxn: Record<string, unknown> | null = null;
let walletUpdateBlocked = false;
let walletInsertError: { message: string } | null = null;
let txnInsertError: { message: string } | null = null;

const txnInsertCalls: Record<string, unknown>[] = [];
const walletUpdateCalls: { payload: Record<string, unknown>; id: number; expected: number }[] =
  [];
const txnDeleteCalls: number[] = [];
const adminWalletUpdateCalls: Record<string, unknown>[] = [];

const mockFrom = vi.fn((table: string) => {
  if (table === "broker_wallets") {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: currentWallet, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => {
            if (walletInsertError) return { data: null, error: walletInsertError };
            currentWallet = {
              id: 1,
              broker_slug: "stake",
              balance_cents: 0,
              lifetime_deposited_cents: 0,
              lifetime_spent_cents: 0,
            };
            return { data: currentWallet, error: null };
          },
        }),
      }),
      update: (payload: Record<string, unknown>) => {
        // Admin adjustWallet has only .eq(id) — no optimistic lock.
        // The other callers chain .eq(id).eq(balance_cents).select().maybeSingle().
        return {
          eq: (col: string, val: unknown) => {
            if (col === "id") {
              // Return another chain that either terminates (.eq then)
              // or keeps chaining for select().maybeSingle()
              const nextChain = {
                eq: (_col2: string, expected: unknown) => ({
                  select: () => ({
                    maybeSingle: async () => {
                      walletUpdateCalls.push({
                        payload,
                        id: val as number,
                        expected: expected as number,
                      });
                      if (walletUpdateBlocked) {
                        return { data: null, error: null };
                      }
                      // Happy: mutate in-memory
                      if (currentWallet) {
                        currentWallet = { ...currentWallet, ...(payload as Partial<Wallet>) };
                      }
                      return { data: currentWallet, error: null };
                    },
                  }),
                }),
                // For adjustWallet: awaited directly via then on .eq
                then: (cb: (v: { data: null; error: null }) => unknown) => {
                  adminWalletUpdateCalls.push(payload);
                  if (currentWallet) {
                    currentWallet = { ...currentWallet, ...(payload as Partial<Wallet>) };
                  }
                  return Promise.resolve(cb({ data: null, error: null }));
                },
              };
              return nextChain;
            }
            throw new Error("unexpected update chain");
          },
        };
      },
    };
  }
  if (table === "wallet_transactions") {
    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: existingStripeTxn, error: null }),
        }),
      }),
      insert: (row: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            if (txnInsertError) return { data: null, error: txnInsertError };
            txnInsertCalls.push(row);
            insertedTxn = { id: 100 + txnInsertCalls.length, ...row };
            return { data: insertedTxn, error: null };
          },
        }),
      }),
      delete: () => ({
        eq: async (_col: string, id: number) => {
          txnDeleteCalls.push(id);
          return { data: null, error: null };
        },
      }),
    };
  }
  if (table === "broker_accounts") {
    return {
      select: () => ({
        eq: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    };
  }
  if (table === "marketplace_invoices") {
    return {
      insert: () => ({
        select: () => ({
          single: async () => ({ data: { id: 77 }, error: null }),
        }),
      }),
    };
  }
  throw new Error(`unexpected table: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  getOrCreateWallet,
  getWalletBalance,
  creditWallet,
  debitWallet,
  refundWallet,
  adjustWallet,
} from "@/lib/marketplace/wallet";

// ─── Tests ───────────────────────────────────────────────────────────

describe("marketplace/wallet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentWallet = null;
    insertedTxn = null;
    existingStripeTxn = null;
    walletUpdateBlocked = false;
    walletInsertError = null;
    txnInsertError = null;
    txnInsertCalls.length = 0;
    walletUpdateCalls.length = 0;
    txnDeleteCalls.length = 0;
    adminWalletUpdateCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("getOrCreateWallet + getWalletBalance", () => {
    it("returns an existing wallet unchanged", async () => {
      currentWallet = {
        id: 5,
        broker_slug: "stake",
        balance_cents: 7500,
        lifetime_deposited_cents: 10_000,
        lifetime_spent_cents: 2500,
      };
      const res = await getOrCreateWallet("stake");
      expect(res.id).toBe(5);
      expect(res.balance_cents).toBe(7500);
    });

    it("creates a wallet when none exists", async () => {
      currentWallet = null;
      const res = await getOrCreateWallet("stake");
      expect(res.id).toBe(1);
      expect(res.balance_cents).toBe(0);
    });

    it("throws when insert errors", async () => {
      currentWallet = null;
      walletInsertError = { message: "db down" };
      await expect(getOrCreateWallet("stake")).rejects.toThrow(/db down/);
    });

    it("getWalletBalance returns the balance_cents", async () => {
      currentWallet = {
        id: 1,
        broker_slug: "stake",
        balance_cents: 12345,
        lifetime_deposited_cents: 0,
        lifetime_spent_cents: 0,
      };
      expect(await getWalletBalance("stake")).toBe(12345);
    });
  });

  describe("creditWallet", () => {
    it("throws on non-positive amount", async () => {
      await expect(creditWallet("stake", 0, "x")).rejects.toThrow(/positive/);
      await expect(creditWallet("stake", -10, "x")).rejects.toThrow(/positive/);
    });

    it("is idempotent on duplicate Stripe payment intent", async () => {
      const existing = {
        id: 999,
        broker_slug: "stake",
        amount_cents: 5000,
        stripe_payment_intent_id: "pi_abc",
      };
      existingStripeTxn = existing;
      const res = await creditWallet(
        "stake",
        5000,
        "Top-up",
        { type: "stripe", id: "s1", stripe_payment_intent_id: "pi_abc" },
      );
      expect(res).toEqual(existing);
      // Didn't insert a new transaction or touch the balance
      expect(txnInsertCalls).toHaveLength(0);
      expect(walletUpdateCalls).toHaveLength(0);
    });

    it("credits the wallet and inserts a deposit txn", async () => {
      currentWallet = {
        id: 1,
        broker_slug: "stake",
        balance_cents: 1000,
        lifetime_deposited_cents: 1000,
        lifetime_spent_cents: 0,
      };
      const txn = await creditWallet(
        "stake",
        500,
        "Top-up",
        undefined,
        "admin@x.com",
      );
      expect(txnInsertCalls).toHaveLength(1);
      expect(txnInsertCalls[0]).toMatchObject({
        broker_slug: "stake",
        type: "deposit",
        amount_cents: 500,
        balance_after_cents: 1500,
        description: "Top-up",
        created_by: "admin@x.com",
      });
      expect(walletUpdateCalls).toHaveLength(1);
      expect(walletUpdateCalls[0]?.payload).toMatchObject({
        balance_cents: 1500,
        lifetime_deposited_cents: 1500,
      });
      // Optimistic lock checked previous balance
      expect(walletUpdateCalls[0]?.expected).toBe(1000);
      expect(txn).toMatchObject({ amount_cents: 500, type: "deposit" });
    });

    it("rolls back the txn when the optimistic lock fails", async () => {
      currentWallet = {
        id: 1,
        broker_slug: "stake",
        balance_cents: 1000,
        lifetime_deposited_cents: 0,
        lifetime_spent_cents: 0,
      };
      walletUpdateBlocked = true;
      await expect(creditWallet("stake", 500, "x")).rejects.toThrow(/concurrently/);
      expect(txnInsertCalls).toHaveLength(1);
      expect(txnDeleteCalls).toHaveLength(1); // rollback
    });
  });

  describe("debitWallet", () => {
    it("rejects a non-positive debit", async () => {
      await expect(debitWallet("stake", 0, "x")).rejects.toThrow(/positive/);
    });

    it("rejects when balance is insufficient", async () => {
      currentWallet = {
        id: 1,
        broker_slug: "stake",
        balance_cents: 100,
        lifetime_deposited_cents: 100,
        lifetime_spent_cents: 0,
      };
      await expect(debitWallet("stake", 500, "x")).rejects.toThrow(/Insufficient/);
      expect(txnInsertCalls).toHaveLength(0);
    });

    it("debits the wallet + inserts a spend txn", async () => {
      currentWallet = {
        id: 1,
        broker_slug: "stake",
        balance_cents: 1000,
        lifetime_deposited_cents: 1000,
        lifetime_spent_cents: 0,
      };
      const txn = await debitWallet("stake", 300, "CPC spend");
      expect(txn).toMatchObject({ type: "spend", amount_cents: 300 });
      expect(walletUpdateCalls[0]?.payload).toMatchObject({
        balance_cents: 700,
        lifetime_spent_cents: 300,
      });
    });
  });

  describe("refundWallet", () => {
    it("rejects a non-positive refund", async () => {
      await expect(refundWallet("stake", 0, "x")).rejects.toThrow(/positive/);
    });

    it("credits the wallet back + floors lifetime_spent at 0", async () => {
      currentWallet = {
        id: 1,
        broker_slug: "stake",
        balance_cents: 200,
        lifetime_deposited_cents: 1000,
        lifetime_spent_cents: 50,
      };
      await refundWallet("stake", 100, "Refund 1");
      expect(txnInsertCalls[0]?.type).toBe("refund");
      expect(walletUpdateCalls[0]?.payload).toMatchObject({
        balance_cents: 300,
        lifetime_spent_cents: 0, // floored (50 - 100 would be negative)
      });
    });

    it("rolls back when optimistic lock fails", async () => {
      currentWallet = {
        id: 1,
        broker_slug: "stake",
        balance_cents: 500,
        lifetime_deposited_cents: 1000,
        lifetime_spent_cents: 500,
      };
      walletUpdateBlocked = true;
      await expect(refundWallet("stake", 100, "x")).rejects.toThrow(
        /concurrently/,
      );
      expect(txnDeleteCalls).toHaveLength(1);
    });
  });

  describe("adjustWallet (admin)", () => {
    it("rejects an adjustment that would make balance negative", async () => {
      currentWallet = {
        id: 1,
        broker_slug: "stake",
        balance_cents: 100,
        lifetime_deposited_cents: 100,
        lifetime_spent_cents: 0,
      };
      await expect(
        adjustWallet("stake", -200, "r", "admin@x.com"),
      ).rejects.toThrow(/negative/);
    });

    it("records a positive adjustment against lifetime_deposited", async () => {
      currentWallet = {
        id: 1,
        broker_slug: "stake",
        balance_cents: 100,
        lifetime_deposited_cents: 100,
        lifetime_spent_cents: 50,
      };
      const txn = await adjustWallet("stake", 200, "Goodwill", "admin@x.com");
      expect(txn).toMatchObject({ type: "adjustment", amount_cents: 200 });
      expect(adminWalletUpdateCalls[0]).toMatchObject({
        balance_cents: 300,
        lifetime_deposited_cents: 300,
      });
    });

    it("records a negative adjustment against lifetime_spent (absolute)", async () => {
      currentWallet = {
        id: 1,
        broker_slug: "stake",
        balance_cents: 500,
        lifetime_deposited_cents: 500,
        lifetime_spent_cents: 100,
      };
      await adjustWallet("stake", -200, "Clawback", "admin@x.com");
      expect(adminWalletUpdateCalls[0]).toMatchObject({
        balance_cents: 300,
        lifetime_spent_cents: 300, // 100 + |−200|
      });
    });
  });
});
