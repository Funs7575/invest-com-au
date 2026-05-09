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

function reset() {
  ledger = [];
  pros = [
    { id: 1, credit_balance_cents: 0, lifetime_credit_cents: 0, lifetime_lead_spend_cents: 0 },
    { id: 2, credit_balance_cents: 5000, lifetime_credit_cents: 5000, lifetime_lead_spend_cents: 0 },
  ];
  nextLedgerId = 1;
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
};

function ledgerTableStub() {
  const filters: Record<string, unknown> = {};
  let rangeArgs: [number, number] | null = null;
  let countMode = false;

  const builder = {
    select: vi.fn((_cols: string, opts?: { count?: string }) => {
      if (opts?.count === "exact") countMode = true;
      return builder;
    }),
    insert: vi.fn((row: Partial<LedgerRow>) => insertOp(row)),
    eq: vi.fn((col: string, val: unknown) => {
      filters[col] = val;
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
  const builder = {
    select: vi.fn(() => builder),
    update: vi.fn((u: Record<string, unknown>) => {
      updates = u;
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
      // If updates were stacked, return updated row; otherwise current.
      if (updates) {
        const balanceCheck = filters["credit_balance_cents"];
        if (typeof balanceCheck === "number" && pro.credit_balance_cents !== balanceCheck) {
          updates = null;
          return Promise.resolve({ data: null, error: { code: "P0001", message: "stale" } });
        }
        Object.assign(pro, updates);
        updates = null;
      }
      return Promise.resolve({ data: pro, error: null });
    },
    then: (cb: (v: { data: null; error: { code?: string; message: string } | null }) => unknown) => {
      // For update without .single() — apply
      if (updates) {
        const id = filters["id"] as number | undefined;
        const pro = pros.find((p) => p.id === id);
        const balanceCheck = filters["credit_balance_cents"];
        if (
          pro &&
          (typeof balanceCheck !== "number" || pro.credit_balance_cents === balanceCheck)
        ) {
          Object.assign(pro, updates);
          updates = null;
          return Promise.resolve({ data: null, error: null }).then(cb);
        }
        updates = null;
        return Promise.resolve({
          data: null,
          error: { code: "P0001", message: "stale" },
        }).then(cb);
      }
      return Promise.resolve({ data: null, error: null }).then(cb);
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
