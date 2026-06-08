import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

interface LedgerRow {
  id: number;
  professional_id: number;
  amount_cents: number;
  balance_after_cents: number;
  kind: string;
  reference_type: string | null;
  reference_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

interface ProRow {
  id: number;
  credit_balance_cents: number;
  lifetime_credit_cents: number;
  lifetime_lead_spend_cents: number;
}

let ledger: LedgerRow[] = [];
let pros: ProRow[] = [];
let nextLedgerId = 1;

/**
 * Optional hook a test can install to simulate a concurrent writer landing
 * between the helper's stale read and the atomic mutation. Called once,
 * inside the RPC, before the lock+increment is applied. Cleared each reset.
 */
let onRpcBeforeApply: (() => void) | null = null;

/**
 * When true, the RPC stub reports itself as not-installed (mirrors an env
 * where the migration hasn't been applied), forcing the optimistic-lock
 * fallback path. Cleared each reset.
 */
let rpcMissing = false;

/**
 * One-shot hook fired inside the professionals optimistic UPDATE, BEFORE the
 * lock predicate is evaluated — used to simulate a concurrent writer moving
 * the balance between the helper's read and its cache UPDATE (fallback path).
 */
let onProUpdateBeforeLock: (() => void) | null = null;

function reset() {
  ledger = [];
  pros = [
    { id: 1, credit_balance_cents: 0, lifetime_credit_cents: 0, lifetime_lead_spend_cents: 0 },
    { id: 2, credit_balance_cents: 5000, lifetime_credit_cents: 5000, lifetime_lead_spend_cents: 0 },
  ];
  nextLedgerId = 1;
  onRpcBeforeApply = null;
  rpcMissing = false;
  onProUpdateBeforeLock = null;
}

const supabaseStub = {
  from(table: string) {
    if (table === "advisor_credit_ledger") {
      return ledgerTableStub();
    }
    if (table === "professionals") {
      return prosTableStub();
    }
    throw new Error(`unexpected table: ${table}`);
  },
  // Atomic balance mutation. Models the real RPC: locks the row, applies the
  // signed delta + lifetime roll-ups, enforces the negative-balance guard.
  rpc(fn: string, params: Record<string, unknown>) {
    if (fn !== "apply_credit_ledger_balance") {
      return Promise.resolve({ data: null, error: { code: "PGRST202", message: "not found" } });
    }
    if (rpcMissing) {
      return Promise.resolve({
        data: null,
        error: { code: "42883", message: "function apply_credit_ledger_balance does not exist" },
      });
    }
    const proId = params.p_professional_id as number;
    const delta = params.p_delta_cents as number;
    const allowNegative = params.p_allow_negative as boolean;
    const creditDelta = (params.p_lifetime_credit_delta_cents as number) ?? 0;
    const spendDelta = (params.p_lifetime_spend_delta_cents as number) ?? 0;

    // Simulate a concurrent writer mutating the row *before* we lock it.
    if (onRpcBeforeApply) {
      const hook = onRpcBeforeApply;
      onRpcBeforeApply = null;
      hook();
    }

    const pro = pros.find((p) => p.id === proId);
    if (!pro) {
      return Promise.resolve({
        data: null,
        error: { code: "P0002", message: "advisor not found" },
      });
    }
    const newBalance = (pro.credit_balance_cents ?? 0) + delta;
    if (delta < 0 && !allowNegative && newBalance < 0) {
      return Promise.resolve({
        data: null,
        error: { code: "23514", message: "insufficient balance for advisor" },
      });
    }
    pro.credit_balance_cents = newBalance;
    pro.lifetime_credit_cents = (pro.lifetime_credit_cents ?? 0) + Math.max(creditDelta, 0);
    pro.lifetime_lead_spend_cents =
      (pro.lifetime_lead_spend_cents ?? 0) + Math.max(spendDelta, 0);
    return Promise.resolve({ data: newBalance, error: null });
  },
};

function ledgerTableStub() {
  const filters: Record<string, unknown> = {};
  let rangeArgs: [number, number] | null = null;
  let countMode = false;

  let pendingUpdate: Partial<LedgerRow> | null = null;
  let deleteMode = false;

  const builder = {
    select: vi.fn((_cols: string, opts?: { count?: string }) => {
      if (opts?.count === "exact") countMode = true;
      return builder;
    }),
    insert: vi.fn((row: Partial<LedgerRow>) => insertOp(row)),
    update: vi.fn((u: Partial<LedgerRow>) => {
      pendingUpdate = u;
      return builder;
    }),
    delete: vi.fn(() => {
      deleteMode = true;
      return builder;
    }),
    eq: vi.fn((col: string, val: unknown) => {
      filters[col] = val;
      // Terminal eq for an update/delete on advisor_credit_ledger (always
      // keyed by id in the helper) — apply it and resolve as a thenable.
      if ((pendingUpdate || deleteMode) && col === "id") {
        const target = ledger.find((l) => l.id === val);
        if (deleteMode) {
          ledger = ledger.filter((l) => l.id !== val);
        } else if (target && pendingUpdate) {
          Object.assign(target, pendingUpdate);
        }
        pendingUpdate = null;
        deleteMode = false;
        return Promise.resolve({ data: null, error: null });
      }
      return builder;
    }),
    gt: vi.fn((col: string, val: unknown) => {
      filters[`__gt_${col}`] = val;
      return builder;
    }),
    lte: vi.fn((col: string, val: unknown) => {
      filters[`__lte_${col}`] = val;
      return builder;
    }),
    not: vi.fn((col: string, _op: string, _val: unknown) => {
      filters[`__notNull_${col}`] = true;
      return builder;
    }),
    order: vi.fn(() => builder),
    range: vi.fn((from: number, to: number) => {
      rangeArgs = [from, to];
      return resolveSelect();
    }),
    maybeSingle: () => {
      const matches = applyFilters(ledger, filters);
      return Promise.resolve({ data: matches[0] ?? null, error: null });
    },
    single: () => {
      const matches = applyFilters(ledger, filters);
      return Promise.resolve(
        matches[0]
          ? { data: matches[0], error: null }
          : { data: null, error: { message: "no row" } },
      );
    },
    then: (cb: (v: { data: LedgerRow[]; error: null }) => unknown) =>
      Promise.resolve({ data: applyFilters(ledger, filters), error: null }).then(cb),
  } as Record<string, unknown> & PromiseLike<{ data: LedgerRow[]; error: null }>;

  function resolveSelect() {
    const matched = applyFilters(ledger, filters);
    const sliced = rangeArgs
      ? matched.slice(rangeArgs[0], rangeArgs[1] + 1)
      : matched;
    if (countMode) {
      return Promise.resolve({ data: sliced, error: null, count: matched.length });
    }
    return Promise.resolve({ data: sliced, error: null });
  }

  function insertOp(row: Partial<LedgerRow>) {
    const refType = row.reference_type ?? null;
    const refId = row.reference_id ?? null;
    if (refType !== null && refId !== null) {
      const existing = ledger.find(
        (l) => l.kind === row.kind && l.reference_type === refType && l.reference_id === refId,
      );
      if (existing) {
        return chainSelectSingle(null, { code: "23505", message: "duplicate key" });
      }
    }
    const inserted: LedgerRow = {
      id: nextLedgerId++,
      professional_id: row.professional_id ?? 0,
      amount_cents: row.amount_cents ?? 0,
      balance_after_cents: row.balance_after_cents ?? 0,
      kind: row.kind ?? "topup",
      reference_type: refType,
      reference_id: refId,
      description: row.description ?? "",
      metadata: row.metadata ?? {},
      expires_at: row.expires_at ?? null,
      created_by: row.created_by ?? null,
      created_at: new Date().toISOString(),
    };
    ledger.push(inserted);
    return chainSelectSingle(inserted, null);
  }

  function chainSelectSingle(data: LedgerRow | null, error: { code?: string; message: string } | null) {
    return {
      select: vi.fn(() => ({
        single: () => Promise.resolve({ data, error }),
      })),
    };
  }

  return builder;
}

function prosTableStub() {
  let updates: Record<string, unknown> | null = null;
  const filters: Record<string, unknown> = {};

  // Apply a pending optimistic UPDATE. Models real PostgREST semantics: a
  // WHERE that matches 0 rows returns { data: [], error: null } — NOT an
  // error. Returns the affected rows (for `.select("id")`).
  function applyUpdate(): { data: ProRow[]; error: null } {
    if (!updates) return { data: [], error: null };
    // Simulate a concurrent writer landing right before the lock check.
    if (onProUpdateBeforeLock) {
      const hook = onProUpdateBeforeLock;
      onProUpdateBeforeLock = null;
      hook();
    }
    const id = filters["id"] as number | undefined;
    const pro = pros.find((p) => p.id === id);
    const balanceCheck = filters["credit_balance_cents"];
    updates = null;
    if (!pro) return { data: [], error: null };
    if (typeof balanceCheck === "number" && pro.credit_balance_cents !== balanceCheck) {
      return { data: [], error: null }; // optimistic lock missed — 0 rows
    }
    Object.assign(pro, filters["__updates"] ?? {});
    return { data: [pro], error: null };
  }

  const builder = {
    select: vi.fn(() => {
      // `.update(...).eq(...).eq(...).select("id")` — terminal for the
      // optimistic fallback. Return affected rows as a thenable.
      if (updates) {
        const result = applyUpdate();
        return Promise.resolve(result);
      }
      return builder;
    }),
    update: vi.fn((u: Record<string, unknown>) => {
      updates = u;
      filters["__updates"] = u;
      return builder;
    }),
    eq: vi.fn((col: string, val: unknown) => {
      filters[col] = val;
      return builder;
    }),
    single: () => {
      const id = filters["id"] as number | undefined;
      const pro = pros.find((p) => p.id === id);
      if (!pro) return Promise.resolve({ data: null, error: { message: "not found" } });
      return Promise.resolve({ data: pro, error: null });
    },
    maybeSingle: () => {
      const id = filters["id"] as number | undefined;
      const pro = pros.find((p) => p.id === id);
      return Promise.resolve({ data: pro ?? null, error: null });
    },
    then: (cb: (v: { data: ProRow[]; error: null }) => unknown) => {
      // For an update without `.select()`/`.single()` — apply and resolve.
      const result = applyUpdate();
      return Promise.resolve(result).then(cb);
    },
  };
  return builder;
}

function applyFilters(rows: LedgerRow[], filters: Record<string, unknown>) {
  return rows
    .filter((r) => {
      for (const [key, val] of Object.entries(filters)) {
        if (key.startsWith("__gt_")) {
          const col = key.slice(5) as keyof LedgerRow;
          if (!(typeof r[col] === "number" && (r[col] as number) > (val as number))) return false;
          continue;
        }
        if (key.startsWith("__lte_")) {
          const col = key.slice(6) as keyof LedgerRow;
          const cellVal = r[col];
          if (cellVal == null) return false;
          if (cellVal > val!) return false;
          continue;
        }
        if (key.startsWith("__notNull_")) {
          const col = key.slice(10) as keyof LedgerRow;
          if (r[col] == null) return false;
          continue;
        }
        if ((r as unknown as Record<string, unknown>)[key] !== val) return false;
      }
      return true;
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => supabaseStub,
}));

beforeEach(() => {
  reset();
});

describe("recordLedgerEntry", () => {
  it("inserts a topup row, updates the cache, and returns the post-balance", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: 4900,
      kind: "topup",
      description: "test",
      referenceType: "advisor_credit_topup",
      referenceId: "42",
      createdBy: "webhook",
    });
    expect(result.idempotent).toBe(false);
    expect(result.balanceAfterCents).toBe(4900);
    expect(pros.find((p) => p.id === 1)?.credit_balance_cents).toBe(4900);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.kind).toBe("topup");
  });

  it("is idempotent under (kind, reference_type, reference_id) triple", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    await recordLedgerEntry({
      professionalId: 1,
      amountCents: 4900,
      kind: "topup",
      description: "first",
      referenceType: "advisor_credit_topup",
      referenceId: "42",
    });
    const second = await recordLedgerEntry({
      professionalId: 1,
      amountCents: 4900,
      kind: "topup",
      description: "duplicate replay",
      referenceType: "advisor_credit_topup",
      referenceId: "42",
    });
    expect(second.idempotent).toBe(true);
    expect(ledger).toHaveLength(1); // no double insert
    expect(pros.find((p) => p.id === 1)?.credit_balance_cents).toBe(4900); // no double credit
  });

  it("debits balance for negative amounts (lead_spend)", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 5000;
    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: -3900,
      kind: "lead_spend",
      description: "lead",
      referenceType: "professional_lead",
      referenceId: "9",
    });
    expect(result.balanceAfterCents).toBe(1100);
    expect(pros[0]?.credit_balance_cents).toBe(1100);
    expect(pros[0]?.lifetime_lead_spend_cents).toBe(3900);
  });

  it("rejects a lead_spend that would drive the balance below zero (NegativeBalanceError)", async () => {
    const { recordLedgerEntry, NegativeBalanceError } = await import(
      "@/lib/advisor-credit-ledger"
    );
    pros[0]!.credit_balance_cents = 100;
    await expect(
      recordLedgerEntry({
        professionalId: 1,
        amountCents: -2500, // > balance
        kind: "lead_spend",
        description: "overspend",
        referenceType: "brief_accept",
        referenceId: "500",
      }),
    ).rejects.toBeInstanceOf(NegativeBalanceError);
    // No ledger row, no cache mutation.
    expect(ledger).toHaveLength(0);
    expect(pros[0]!.credit_balance_cents).toBe(100);
  });

  it("rejects a success_bonus_award spend that would go negative", async () => {
    const { recordLedgerEntry, NegativeBalanceError } = await import(
      "@/lib/advisor-credit-ledger"
    );
    pros[0]!.credit_balance_cents = 50;
    await expect(
      recordLedgerEntry({
        professionalId: 1,
        amountCents: -300,
        kind: "success_bonus_award",
        description: "success overspend",
        referenceType: "success_charge",
        referenceId: "9",
      }),
    ).rejects.toBeInstanceOf(NegativeBalanceError);
    expect(ledger).toHaveLength(0);
  });

  it("allows a spend that lands exactly at zero", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 2500;
    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: -2500,
      kind: "lead_spend",
      description: "exact",
      referenceType: "brief_accept",
      referenceId: "501",
    });
    expect(result.balanceAfterCents).toBe(0);
    expect(pros[0]!.credit_balance_cents).toBe(0);
  });

  it("respects allowNegativeBalance opt-out for floored spend kinds", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 100;
    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: -2500,
      kind: "lead_spend",
      description: "forced negative",
      referenceType: "brief_accept",
      referenceId: "502",
      allowNegativeBalance: true,
    });
    expect(result.balanceAfterCents).toBe(-2400);
    expect(pros[0]!.credit_balance_cents).toBe(-2400);
  });

  it("does NOT floor non-prepaid-spend kinds (chargeback_clawback may go negative)", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 100;
    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: -500,
      kind: "chargeback_clawback",
      description: "clawback of already-spent credit",
      referenceType: "stripe_charge",
      referenceId: "ch_neg",
    });
    expect(result.balanceAfterCents).toBe(-400);
    expect(pros[0]!.credit_balance_cents).toBe(-400);
  });

  it("increments lifetime_credit_cents only for credit kinds", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    await recordLedgerEntry({
      professionalId: 1,
      amountCents: 10000,
      kind: "topup",
      description: "topup",
      referenceType: "advisor_credit_topup",
      referenceId: "100",
    });
    await recordLedgerEntry({
      professionalId: 1,
      amountCents: 5000,
      kind: "refund_to_credit",
      description: "refund",
      referenceType: "stripe_charge",
      referenceId: "ch_abc",
    });
    expect(pros[0]?.lifetime_credit_cents).toBe(15000);
  });

  it("does not double-count lifetime_credit on idempotent re-runs", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    await recordLedgerEntry({
      professionalId: 1,
      amountCents: 10000,
      kind: "topup",
      description: "first",
      referenceType: "advisor_credit_topup",
      referenceId: "100",
    });
    await recordLedgerEntry({
      professionalId: 1,
      amountCents: 10000,
      kind: "topup",
      description: "replay",
      referenceType: "advisor_credit_topup",
      referenceId: "100",
    });
    expect(pros[0]?.lifetime_credit_cents).toBe(10000); // not 20000
    expect(pros[0]?.credit_balance_cents).toBe(10000);
  });

  it("throws when the advisor doesn't exist", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    await expect(
      recordLedgerEntry({
        professionalId: 999,
        amountCents: 1000,
        kind: "topup",
        description: "no advisor",
      }),
    ).rejects.toThrow();
  });
});

describe("recordLedgerEntry — atomic balance via RPC (lost-update protection)", () => {
  it("uses the locked balance, not the stale read, when a concurrent write lands in between", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 1000;

    // A concurrent +500 top-up lands AFTER this call's stale read (1000) but
    // BEFORE the atomic increment. The old read-modify-write loop would have
    // overwritten the cache to 1000+200=1200, losing the concurrent +500.
    // The atomic RPC locks the current (1500) row, so the result is 1700.
    onRpcBeforeApply = () => {
      pros[0]!.credit_balance_cents = 1500;
    };

    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: 200,
      kind: "topup",
      description: "topup racing a concurrent topup",
      referenceType: "advisor_credit_topup",
      referenceId: "race-1",
    });

    expect(result.balanceAfterCents).toBe(1700);
    expect(pros[0]?.credit_balance_cents).toBe(1700); // concurrent +500 NOT lost
  });

  it("corrects the ledger row's balance_after_cents to the authoritative locked value", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 1000;
    onRpcBeforeApply = () => {
      pros[0]!.credit_balance_cents = 1500; // concurrent write
    };
    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: 200,
      kind: "topup",
      description: "race",
      referenceType: "advisor_credit_topup",
      referenceId: "race-2",
    });
    // The stored ledger row's snapshot must match the true post-balance,
    // not the stale 1200 computed off the pre-race read.
    expect(result.entry.balance_after_cents).toBe(1700);
    expect(ledger.find((l) => l.reference_id === "race-2")?.balance_after_cents).toBe(1700);
  });
});

describe("recordLedgerEntry — negative-balance guard", () => {
  it("rejects a lead_spend that would drive the balance below zero and does NOT mutate the cache", async () => {
    const { recordLedgerEntry, NegativeBalanceError } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 1000;
    await expect(
      recordLedgerEntry({
        professionalId: 1,
        amountCents: -3000, // over-spend
        kind: "lead_spend",
        description: "lead over balance",
        referenceType: "professional_lead",
        referenceId: "over-1",
      }),
    ).rejects.toBeInstanceOf(NegativeBalanceError);
    // Cache untouched.
    expect(pros[0]?.credit_balance_cents).toBe(1000);
  });

  it("rolls back the inserted ledger row when the guard trips (SUM stays consistent)", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 1000;
    await expect(
      recordLedgerEntry({
        professionalId: 1,
        amountCents: -3000,
        kind: "lead_spend",
        description: "over",
        referenceType: "professional_lead",
        referenceId: "over-2",
      }),
    ).rejects.toThrow();
    // No orphaned spend row left behind.
    expect(ledger.find((l) => l.reference_id === "over-2")).toBeUndefined();
    expect(ledger).toHaveLength(0);
  });

  it("allows a spend that exactly zeroes the balance", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 3000;
    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: -3000,
      kind: "lead_spend",
      description: "exact",
      referenceType: "professional_lead",
      referenceId: "exact-1",
    });
    expect(result.balanceAfterCents).toBe(0);
    expect(pros[0]?.credit_balance_cents).toBe(0);
  });

  it("lets correction kinds (expiry) drive the balance negative by default", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 1000;
    // Credit expired but was already spent → balance legitimately goes negative.
    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: -3000,
      kind: "expiry",
      description: "expiry past spend",
      referenceType: "advisor_credit_ledger",
      referenceId: "exp-1",
    });
    expect(result.balanceAfterCents).toBe(-2000);
    expect(pros[0]?.credit_balance_cents).toBe(-2000);
  });

  it("lets admin_adjustment drive the balance negative by default (admin override)", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 500;
    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: -2000,
      kind: "admin_adjustment",
      description: "clawback",
      referenceType: "admin",
      referenceId: "adj-1",
    });
    expect(result.balanceAfterCents).toBe(-1500);
  });

  it("honours an explicit allowNegative override on a lead_spend", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 1000;
    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: -3000,
      kind: "lead_spend",
      description: "forced negative",
      referenceType: "professional_lead",
      referenceId: "forced-1",
      allowNegative: true,
    });
    expect(result.balanceAfterCents).toBe(-2000);
  });

  it("honours an explicit allowNegative=false override on a correction kind", async () => {
    const { recordLedgerEntry, NegativeBalanceError } = await import("@/lib/advisor-credit-ledger");
    pros[0]!.credit_balance_cents = 1000;
    await expect(
      recordLedgerEntry({
        professionalId: 1,
        amountCents: -3000,
        kind: "admin_adjustment",
        description: "guarded admin debit",
        referenceType: "admin",
        referenceId: "guarded-1",
        allowNegative: false,
      }),
    ).rejects.toBeInstanceOf(NegativeBalanceError);
    expect(pros[0]?.credit_balance_cents).toBe(1000);
  });
});

describe("recordLedgerEntry — optimistic-lock fallback (RPC unavailable)", () => {
  it("succeeds via the fallback when the RPC is not installed", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    rpcMissing = true;
    pros[0]!.credit_balance_cents = 1000;
    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: 500,
      kind: "topup",
      description: "fallback topup",
      referenceType: "advisor_credit_topup",
      referenceId: "fb-1",
    });
    expect(result.balanceAfterCents).toBe(1500);
    expect(pros[0]?.credit_balance_cents).toBe(1500);
    // lifetime_credit_cents seeded at 0; the +500 topup rolls it up to 500.
    expect(pros[0]?.lifetime_credit_cents).toBe(500);
  });

  it("fallback retries against the refreshed balance after a lost optimistic lock", async () => {
    const { recordLedgerEntry } = await import("@/lib/advisor-credit-ledger");
    rpcMissing = true;
    pros[0]!.credit_balance_cents = 1000;
    // The helper reads 1000, then a concurrent writer moves it to 1500 just
    // before the first optimistic UPDATE. That UPDATE (WHERE balance=1000)
    // matches 0 rows. The FIX: detect the 0-row update, refetch (1500), and
    // retry the predicate against 1500 — NOT silently claim success against
    // the stale value. End state must be 1500 + 200 = 1700, never 1200.
    onProUpdateBeforeLock = () => {
      pros[0]!.credit_balance_cents = 1500;
    };
    const result = await recordLedgerEntry({
      professionalId: 1,
      amountCents: 200,
      kind: "topup",
      description: "fallback retry",
      referenceType: "advisor_credit_topup",
      referenceId: "fb-retry-1",
    });
    expect(result.balanceAfterCents).toBe(1700);
    expect(pros[0]?.credit_balance_cents).toBe(1700); // concurrent write NOT lost
  });

  it("fallback enforces the negative-balance guard and rolls back the ledger row", async () => {
    const { recordLedgerEntry, NegativeBalanceError } = await import("@/lib/advisor-credit-ledger");
    rpcMissing = true;
    pros[0]!.credit_balance_cents = 500;
    await expect(
      recordLedgerEntry({
        professionalId: 1,
        amountCents: -2000,
        kind: "lead_spend",
        description: "fallback over-spend",
        referenceType: "professional_lead",
        referenceId: "fb-over-1",
      }),
    ).rejects.toBeInstanceOf(NegativeBalanceError);
    expect(pros[0]?.credit_balance_cents).toBe(500);
    expect(ledger.find((l) => l.reference_id === "fb-over-1")).toBeUndefined();
  });
});

describe("computeBalance", () => {
  it("sums all ledger amounts for a professional", async () => {
    const { recordLedgerEntry, computeBalance } = await import("@/lib/advisor-credit-ledger");
    await recordLedgerEntry({
      professionalId: 1, amountCents: 10000, kind: "topup",
      description: "t1", referenceType: "advisor_credit_topup", referenceId: "1",
    });
    await recordLedgerEntry({
      professionalId: 1, amountCents: -3000, kind: "lead_spend",
      description: "s1", referenceType: "professional_lead", referenceId: "11",
    });
    await recordLedgerEntry({
      professionalId: 1, amountCents: 1500, kind: "refund_to_credit",
      description: "r1", referenceType: "stripe_charge", referenceId: "ch_1",
    });
    expect(await computeBalance(1)).toBe(8500);
  });

  it("returns 0 for an advisor with no ledger rows", async () => {
    const { computeBalance } = await import("@/lib/advisor-credit-ledger");
    expect(await computeBalance(1)).toBe(0);
  });
});

describe("getLedgerPage", () => {
  it("returns rows newest first with the total count", async () => {
    const { recordLedgerEntry, getLedgerPage } = await import("@/lib/advisor-credit-ledger");
    for (let i = 0; i < 5; i++) {
      await recordLedgerEntry({
        professionalId: 1,
        amountCents: 1000,
        kind: "topup",
        description: `t${i}`,
        referenceType: "advisor_credit_topup",
        referenceId: String(i),
      });
    }
    const page = await getLedgerPage(1, { limit: 3, offset: 0 });
    expect(page.rows).toHaveLength(3);
    expect(page.total).toBe(5);
  });
});
