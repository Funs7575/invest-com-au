import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

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

// Unwrap wrapCronHandler so GET is callable without touching cron_run_log.
vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

type RewardRow = {
  id: number;
  referral_code: string;
  referrer_email: string;
  referred_email: string;
  trigger_event: string;
  reward_cents: number;
  payout_method?: string | null;
};

type AdvisorRow = { id: number; credit_balance_cents: number };

// Shared state across mocks — reset in beforeEach
let rewardsToReturn: RewardRow[] = [];
let fetchError: { message: string } | null = null;
let advisorByEmail: Map<string, AdvisorRow> = new Map();
let featureDisabled = false;

// Capture calls
type UpdateCall = { id: number; payload: Record<string, unknown>; statusGuard?: unknown };
const rewardUpdateCalls: UpdateCall[] = [];
const financialAuditCalls: Record<string, unknown>[] = [];
const notifyUserCalls: Record<string, unknown>[] = [];

// recordLedgerEntry mock — captures inputs and lets a test force idempotency
// (mid-crash retry: the ledger triple already exists) or a throw.
const ledgerCalls: Record<string, unknown>[] = [];
// Map referenceId → { idempotent, balanceAfterCents } overrides.
let ledgerIdempotentForRefId: Map<string, boolean> = new Map();
let ledgerThrowForRefId: Map<string, string> = new Map();

const mockFrom = vi.fn((table: string) => {
  if (table === "referral_rewards") {
    return {
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({
              data: fetchError ? null : rewardsToReturn,
              error: fetchError,
            }),
          }),
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        // First .eq is the id filter; reward-paid flips chain a second
        // .eq("status","pending") guard — rejection updates do not.
        eq: (_col: string, id: number) => {
          const recordAndReturn = () => {
            rewardUpdateCalls.push({ id, payload });
            return { data: null, error: null };
          };
          // Return a thenable that ALSO exposes a second .eq for the
          // status-guarded paid flip.
          const thenable = {
            eq: (_col2: string, statusGuard: unknown) => {
              rewardUpdateCalls.push({ id, payload, statusGuard });
              return Promise.resolve({ data: null, error: null });
            },
            then: (resolve: (v: { data: null; error: null }) => unknown) =>
              Promise.resolve(resolve(recordAndReturn())),
          };
          return thenable;
        },
      }),
    };
  }

  if (table === "professionals") {
    return {
      select: () => ({
        ilike: (_col: string, email: string) => ({
          maybeSingle: async () => {
            const adv = advisorByEmail.get(email.toLowerCase());
            return { data: adv ?? null, error: null };
          },
        }),
      }),
    };
  }

  throw new Error(`unexpected table: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: vi.fn(async () => featureDisabled),
}));

vi.mock("@/lib/financial-audit", () => ({
  recordFinancialAudit: vi.fn(async (entry: Record<string, unknown>) => {
    financialAuditCalls.push(entry);
  }),
}));

vi.mock("@/lib/advisor-credit-ledger", () => ({
  recordLedgerEntry: vi.fn(async (input: Record<string, unknown>) => {
    ledgerCalls.push(input);
    const refId = String(input.referenceId);
    const thrown = ledgerThrowForRefId.get(refId);
    if (thrown) throw new Error(thrown);
    const idempotent = ledgerIdempotentForRefId.get(refId) ?? false;
    // Look up the seeded prior balance for this professional id so the
    // returned balance_after mirrors the real helper. On an idempotent
    // re-run the helper returns the EXISTING balance (no double-add).
    const proId = input.professionalId as number;
    const seeded = [...advisorByEmail.values()].find((a) => a.id === proId);
    const current = seeded?.credit_balance_cents ?? 0;
    const balanceAfterCents = idempotent
      ? current
      : current + (input.amountCents as number);
    return {
      entry: { id: 1 },
      balanceAfterCents,
      idempotent,
    };
  }),
}));

vi.mock("@/lib/notifications", () => ({
  buildEmailToUserIdMap: vi.fn(async () => {
    const m = new Map<string, string>();
    m.set("referrer@example.com", "user-abc");
    return m;
  }),
  notifyUser: vi.fn(async (input: Record<string, unknown>) => {
    notifyUserCalls.push(input);
    return true;
  }),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/referral-payouts/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { isFeatureDisabled } from "@/lib/admin/classifier-config";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/referral-payouts") as unknown as NextRequest;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("GET /api/cron/referral-payouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rewardsToReturn = [];
    fetchError = null;
    advisorByEmail = new Map();
    featureDisabled = false;
    rewardUpdateCalls.length = 0;
    financialAuditCalls.length = 0;
    notifyUserCalls.length = 0;
    ledgerCalls.length = 0;
    ledgerIdempotentForRefId = new Map();
    ledgerThrowForRefId = new Map();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("exports nodejs runtime and maxDuration = 120", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(120);
  });

  it("auth short-circuits before any DB access", async () => {
    const unauthResponse = new Response("Unauthorized", { status: 401 });
    vi.mocked(requireCronAuth).mockReturnValueOnce(unauthResponse as never);

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(rewardUpdateCalls).toHaveLength(0);
    expect(ledgerCalls).toHaveLength(0);
    expect(financialAuditCalls).toHaveLength(0);
  });

  it("returns skipped when the kill switch is on", async () => {
    featureDisabled = true;

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true, skipped: "kill_switch_on" });
    expect(vi.mocked(isFeatureDisabled)).toHaveBeenCalledWith("referral_payouts");
    // No DB work done
    expect(rewardUpdateCalls).toHaveLength(0);
    expect(ledgerCalls).toHaveLength(0);
  });

  it("returns 500 when the initial fetch errors", async () => {
    fetchError = { message: "db down" };

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json).toEqual({ ok: false, error: "fetch_failed" });
    expect(rewardUpdateCalls).toHaveLength(0);
  });

  it("returns zero counters when no rewards are pending (idempotent no-op)", async () => {
    rewardsToReturn = [];

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      ok: true,
      scanned: 0,
      paid: 0,
      rejected: 0,
      manual: 0,
      failed: 0,
      inboxed: 0,
    });
  });

  it("skips non-credit_balance payouts (bank/stripe go manual)", async () => {
    rewardsToReturn = [
      {
        id: 1,
        referral_code: "REF1",
        referrer_email: "x@x.com",
        referred_email: "y@y.com",
        trigger_event: "first_deposit",
        reward_cents: 2500,
        payout_method: "bank",
      },
      {
        id: 2,
        referral_code: "REF2",
        referrer_email: "a@a.com",
        referred_email: "b@b.com",
        trigger_event: "first_deposit",
        reward_cents: 2500,
        payout_method: "stripe",
      },
    ];

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.scanned).toBe(2);
    expect(json.manual).toBe(2);
    expect(json.paid).toBe(0);
    expect(json.rejected).toBe(0);
    // Reward + ledger untouched — admin handles manually
    expect(rewardUpdateCalls).toHaveLength(0);
    expect(ledgerCalls).toHaveLength(0);
    expect(financialAuditCalls).toHaveLength(0);
  });

  it("rejects a reward when the referrer isn't an advisor", async () => {
    rewardsToReturn = [
      {
        id: 11,
        referral_code: "REF1",
        referrer_email: "ghost@example.com",
        referred_email: "u@example.com",
        trigger_event: "first_deposit",
        reward_cents: 5000,
      },
    ];
    // advisorByEmail deliberately empty → maybeSingle returns null

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.rejected).toBe(1);
    expect(json.paid).toBe(0);

    expect(rewardUpdateCalls).toHaveLength(1);
    expect(rewardUpdateCalls[0]).toMatchObject({
      id: 11,
      payload: {
        status: "rejected",
        rejection_reason: "referrer_email_not_found_in_professionals",
      },
    });
    // No credit + no audit row
    expect(ledgerCalls).toHaveLength(0);
    expect(financialAuditCalls).toHaveLength(0);
  });

  it("credits via the ledger, stamps the reward paid (status-guarded), writes audit, inboxes referrer", async () => {
    rewardsToReturn = [
      {
        id: 42,
        referral_code: "REFX",
        referrer_email: "REFERRER@example.com",
        referred_email: "new@example.com",
        trigger_event: "first_deposit",
        reward_cents: 7500,
        payout_method: "credit_balance",
      },
    ];
    advisorByEmail.set("referrer@example.com", {
      id: 99,
      credit_balance_cents: 12500,
    });

    const res = await GET(makeReq());
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.paid).toBe(1);
    expect(json.rejected).toBe(0);
    expect(json.failed).toBe(0);
    expect(json.inboxed).toBe(1);

    // Credit routed through the ledger with the idempotent reference triple
    // keyed to the reward id.
    expect(ledgerCalls).toHaveLength(1);
    expect(ledgerCalls[0]).toMatchObject({
      professionalId: 99,
      amountCents: 7500,
      kind: "referral_payout",
      referenceType: "referral_reward",
      referenceId: "42",
      createdBy: "cron:referral-payouts",
    });

    // Reward marked paid with the status='pending' guard (second .eq)
    const rewardUpdate = rewardUpdateCalls.find((c) => c.id === 42);
    expect(rewardUpdate?.payload.status).toBe("paid");
    expect(rewardUpdate?.payload.payout_method).toBe("credit_balance");
    expect(rewardUpdate?.payload.payout_reference).toBe("advisor_99");
    expect(rewardUpdate?.payload.paid_at).toEqual(expect.any(String));
    expect(rewardUpdate?.statusGuard).toBe("pending");

    // Audit row shaped correctly (new balance = 12500 + 7500)
    expect(financialAuditCalls).toHaveLength(1);
    expect(financialAuditCalls[0]).toMatchObject({
      actorType: "cron",
      actorId: "referral-payouts",
      action: "credit",
      resourceType: "advisor_credit_balance",
      resourceId: 99,
      amountCents: 7500,
      oldValue: { credit_balance_cents: 12500 },
      newValue: { credit_balance_cents: 20000 },
    });

    // Notification idempotency key is per reward id
    expect(notifyUserCalls).toHaveLength(1);
    expect(notifyUserCalls[0]).toMatchObject({
      userId: "user-abc",
      type: "referral",
      emailDeliveryKey: "referral_reward:42",
    });
  });

  it("IDEMPOTENT: a 2nd run after a mid-crash does NOT double-credit and writes no 2nd audit row", async () => {
    // Scenario: a prior fire crashed AFTER crediting the ledger but BEFORE
    // flipping the reward to 'paid'. The reward is still 'pending', so this
    // run re-picks it. The ledger triple already exists → recordLedgerEntry
    // returns idempotent:true and does NOT mutate the balance again.
    rewardsToReturn = [
      {
        id: 42,
        referral_code: "REFX",
        referrer_email: "referrer@example.com",
        referred_email: "new@example.com",
        trigger_event: "first_deposit",
        reward_cents: 7500,
        payout_method: "credit_balance",
      },
    ];
    advisorByEmail.set("referrer@example.com", {
      id: 99,
      credit_balance_cents: 20000, // already includes the prior credit
    });
    ledgerIdempotentForRefId.set("42", true); // triple already landed

    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    // Ledger was called once (idempotently) — the helper itself is the guard.
    expect(ledgerCalls).toHaveLength(1);
    expect(vi.mocked(recordLedgerEntry)).toHaveReturnedTimes(1);

    // The reward is still flipped to paid (idempotently, status-guarded), but
    // because the credit was idempotent NO second financial-audit row is
    // written — we must not log a phantom second movement.
    expect(financialAuditCalls).toHaveLength(0);

    // The reward paid-flip still fired with the status guard.
    const rewardUpdate = rewardUpdateCalls.find((c) => c.id === 42);
    expect(rewardUpdate?.payload.status).toBe("paid");
    expect(rewardUpdate?.statusGuard).toBe("pending");
  });

  it("marks failed when the ledger entry throws — reward stays pending, no audit, no inbox", async () => {
    rewardsToReturn = [
      {
        id: 7,
        referral_code: "R",
        referrer_email: "referrer@example.com",
        referred_email: "b@b.com",
        trigger_event: "first_deposit",
        reward_cents: 1000,
      },
    ];
    advisorByEmail.set("referrer@example.com", {
      id: 5,
      credit_balance_cents: 0,
    });
    ledgerThrowForRefId.set("7", "ledger insert failed");

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.paid).toBe(0);
    expect(json.failed).toBe(1);

    // No audit row, no reward status change, no inbox notification
    expect(financialAuditCalls).toHaveLength(0);
    expect(rewardUpdateCalls).toHaveLength(0);
    expect(notifyUserCalls).toHaveLength(0);
  });

  it("defaults payout_method to credit_balance when the column is null", async () => {
    rewardsToReturn = [
      {
        id: 1,
        referral_code: "R",
        referrer_email: "referrer@example.com",
        referred_email: "b@b.com",
        trigger_event: "first_deposit",
        reward_cents: 1000,
        payout_method: null,
      },
    ];
    advisorByEmail.set("referrer@example.com", {
      id: 5,
      credit_balance_cents: 0,
    });

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.paid).toBe(1);
    expect(json.manual).toBe(0);
    expect(ledgerCalls).toHaveLength(1);
  });

  it("mixes outcomes across a batch (paid + rejected + manual)", async () => {
    rewardsToReturn = [
      {
        id: 1,
        referral_code: "a",
        referrer_email: "referrer@example.com",
        referred_email: "x@x.com",
        trigger_event: "first_deposit",
        reward_cents: 100,
      },
      {
        id: 2,
        referral_code: "b",
        referrer_email: "nobody@example.com",
        referred_email: "y@y.com",
        trigger_event: "first_deposit",
        reward_cents: 200,
      },
      {
        id: 3,
        referral_code: "c",
        referrer_email: "z@z.com",
        referred_email: "a@a.com",
        trigger_event: "first_deposit",
        reward_cents: 300,
        payout_method: "bank",
      },
    ];
    advisorByEmail.set("referrer@example.com", {
      id: 10,
      credit_balance_cents: 0,
    });

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.scanned).toBe(3);
    expect(json.manual).toBe(1); // id 3 — bank payout
    expect(json.rejected).toBe(1); // id 2 — not an advisor
    expect(json.paid).toBe(1); // id 1 — credited successfully
    expect(json.failed).toBe(0);

    // Exactly one ledger credit (for the paid row)
    expect(ledgerCalls).toHaveLength(1);
    expect(ledgerCalls[0]).toMatchObject({
      professionalId: 10,
      amountCents: 100,
      kind: "referral_payout",
      referenceId: "1",
    });

    // One audit row for the paid credit
    expect(financialAuditCalls).toHaveLength(1);
    expect(financialAuditCalls[0]).toMatchObject({ resourceId: 10, amountCents: 100 });
  });

  it("does not inbox when no matching auth user exists (userId lookup miss)", async () => {
    rewardsToReturn = [
      {
        id: 50,
        referral_code: "R",
        referrer_email: "noauth@example.com",
        referred_email: "b@b.com",
        trigger_event: "first_deposit",
        reward_cents: 1000,
      },
    ];
    advisorByEmail.set("noauth@example.com", {
      id: 77,
      credit_balance_cents: 0,
    });

    const res = await GET(makeReq());
    const json = await res.json();
    expect(json.paid).toBe(1);
    expect(json.inboxed).toBe(0);
    expect(notifyUserCalls).toHaveLength(0);
  });
});
