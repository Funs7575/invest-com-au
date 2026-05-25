/**
 * Unit tests for lib/rate-ingest.ts — pure validation, staleness helpers,
 * and batch-validate functions.
 *
 * No DB or network access. All functions under test are pure.
 */

import { describe, it, expect, vi } from "vitest";
import {
  validateSavingsRateRow,
  validateLoanRateRow,
  validateSavingsRateRows,
  validateLoanRateRows,
  daysSinceUpdate,
  isStale,
  formatAge,
  buildFreshnessReport,
  LOAN_RATE_STALE_DAYS,
  SAVINGS_RATE_STALE_DAYS,
  type SavingsRateRow,
  type LoanRateRow,
} from "@/lib/rate-ingest";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validSavings(overrides: Partial<SavingsRateRow> = {}): Partial<SavingsRateRow> {
  return {
    broker_id: 1,
    product_kind: "savings_account",
    rate_bps: 525,
    source: "manual",
    ...overrides,
  };
}

function validLoan(overrides: Partial<LoanRateRow> = {}): Partial<LoanRateRow> {
  return {
    lender_slug: "commonwealth-bank",
    lender_name: "Commonwealth Bank",
    rate_pct: 6.49,
    comparison_rate_pct: 6.55,
    max_lvr: 80,
    interest_only: true,
    offset_available: true,
    min_loan_cents: 10_000_000,
    apply_url: "/find-advisor?type=mortgage-brokers",
    ...overrides,
  };
}

// ─── validateSavingsRateRow ───────────────────────────────────────────────────

describe("validateSavingsRateRow", () => {
  it("accepts a minimal valid row", () => {
    const result = validateSavingsRateRow(validSavings());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    expect(result.row.rate_bps).toBe(525);
    expect(result.row.source).toBe("manual");
    expect(result.row.notes).toBe("");
    expect(result.row.min_balance_cents).toBe(0);
  });

  it("accepts all product_kind values", () => {
    expect(validateSavingsRateRow(validSavings({ product_kind: "savings_account" })).ok).toBe(true);
    expect(validateSavingsRateRow(validSavings({ product_kind: "term_deposit" })).ok).toBe(true);
  });

  it("rejects missing broker_id", () => {
    const result = validateSavingsRateRow({ ...validSavings(), broker_id: undefined });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fail");
    expect(result.reason).toMatch(/broker_id/);
  });

  it("rejects non-integer broker_id", () => {
    const result = validateSavingsRateRow(validSavings({ broker_id: 1.5 }));
    expect(result.ok).toBe(false);
  });

  it("rejects zero broker_id", () => {
    const result = validateSavingsRateRow(validSavings({ broker_id: 0 }));
    expect(result.ok).toBe(false);
  });

  it("rejects unknown product_kind", () => {
    const result = validateSavingsRateRow({ ...validSavings(), product_kind: "unknown" as never });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fail");
    expect(result.reason).toMatch(/product_kind/);
  });

  it("rejects rate_bps over 5000", () => {
    const result = validateSavingsRateRow(validSavings({ rate_bps: 5001 }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fail");
    expect(result.reason).toMatch(/rate_bps/);
  });

  it("accepts rate_bps at boundary (0 and 5000)", () => {
    expect(validateSavingsRateRow(validSavings({ rate_bps: 0 })).ok).toBe(true);
    expect(validateSavingsRateRow(validSavings({ rate_bps: 5000 })).ok).toBe(true);
  });

  it("rejects intro_rate_bps without intro_term_months", () => {
    const result = validateSavingsRateRow(validSavings({ intro_rate_bps: 600 }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fail");
    expect(result.reason).toMatch(/intro/);
  });

  it("rejects intro_term_months without intro_rate_bps", () => {
    const result = validateSavingsRateRow(validSavings({ intro_term_months: 3 }));
    expect(result.ok).toBe(false);
  });

  it("accepts intro pair when both are set", () => {
    const result = validateSavingsRateRow(
      validSavings({ intro_rate_bps: 600, intro_term_months: 3 }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects intro_rate_bps above 5000", () => {
    const result = validateSavingsRateRow(
      validSavings({ intro_rate_bps: 5001, intro_term_months: 3 }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects intro_term_months > 60", () => {
    const result = validateSavingsRateRow(
      validSavings({ intro_rate_bps: 600, intro_term_months: 61 }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects max_balance_cents <= min_balance_cents", () => {
    const result = validateSavingsRateRow(
      validSavings({ min_balance_cents: 1000, max_balance_cents: 1000 }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fail");
    expect(result.reason).toMatch(/max_balance/);
  });

  it("accepts max_balance_cents > min_balance_cents", () => {
    const result = validateSavingsRateRow(
      validSavings({ min_balance_cents: 0, max_balance_cents: 100000 }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects term_months > 120", () => {
    const result = validateSavingsRateRow(validSavings({ term_months: 121 }));
    expect(result.ok).toBe(false);
  });

  it("accepts term_months at boundary (1 and 120)", () => {
    expect(validateSavingsRateRow(validSavings({ term_months: 1 })).ok).toBe(true);
    expect(validateSavingsRateRow(validSavings({ term_months: 120 })).ok).toBe(true);
  });

  it("defaults missing optional fields to safe values", () => {
    const result = validateSavingsRateRow(validSavings());
    if (!result.ok) throw new Error("Expected ok");
    expect(result.row.intro_rate_bps).toBeNull();
    expect(result.row.intro_term_months).toBeNull();
    expect(result.row.min_balance_cents).toBe(0);
    expect(result.row.max_balance_cents).toBeNull();
    expect(result.row.term_months).toBeNull();
    expect(result.row.notes).toBe("");
  });
});

// ─── validateLoanRateRow ──────────────────────────────────────────────────────

describe("validateLoanRateRow", () => {
  it("accepts a complete valid row", () => {
    const result = validateLoanRateRow(validLoan());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    expect(result.row.lender_slug).toBe("commonwealth-bank");
    expect(result.row.rate_pct).toBe(6.49);
  });

  it("rejects missing lender_slug", () => {
    const result = validateLoanRateRow({ ...validLoan(), lender_slug: undefined });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fail");
    expect(result.reason).toMatch(/lender_slug/);
  });

  it("rejects lender_slug with uppercase letters", () => {
    const result = validateLoanRateRow(validLoan({ lender_slug: "Commonwealth-Bank" }));
    expect(result.ok).toBe(false);
  });

  it("rejects lender_slug with special chars", () => {
    const result = validateLoanRateRow(validLoan({ lender_slug: "bank_abc" }));
    expect(result.ok).toBe(false);
  });

  it("accepts lender_slug with hyphens and numbers", () => {
    const result = validateLoanRateRow(validLoan({ lender_slug: "ing-direct-2" }));
    expect(result.ok).toBe(true);
  });

  it("rejects rate_pct above 99", () => {
    const result = validateLoanRateRow(validLoan({ rate_pct: 100 }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fail");
    expect(result.reason).toMatch(/rate_pct/);
  });

  it("rejects rate_pct below 0", () => {
    const result = validateLoanRateRow(validLoan({ rate_pct: -0.01 }));
    expect(result.ok).toBe(false);
  });

  it("rejects non-finite rate_pct", () => {
    const result = validateLoanRateRow(validLoan({ rate_pct: Infinity }));
    expect(result.ok).toBe(false);
  });

  it("rejects comparison_rate_pct above 99", () => {
    const result = validateLoanRateRow(validLoan({ comparison_rate_pct: 99.01 }));
    expect(result.ok).toBe(false);
  });

  it("rejects max_lvr 0", () => {
    const result = validateLoanRateRow(validLoan({ max_lvr: 0 }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fail");
    expect(result.reason).toMatch(/max_lvr/);
  });

  it("rejects max_lvr > 100", () => {
    const result = validateLoanRateRow(validLoan({ max_lvr: 101 }));
    expect(result.ok).toBe(false);
  });

  it("accepts max_lvr at boundaries (1 and 100)", () => {
    expect(validateLoanRateRow(validLoan({ max_lvr: 1 })).ok).toBe(true);
    expect(validateLoanRateRow(validLoan({ max_lvr: 100 })).ok).toBe(true);
  });

  it("rejects non-boolean interest_only", () => {
    const result = validateLoanRateRow({ ...validLoan(), interest_only: undefined });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fail");
    expect(result.reason).toMatch(/interest_only/);
  });

  it("rejects non-boolean offset_available", () => {
    const result = validateLoanRateRow({ ...validLoan(), offset_available: undefined });
    expect(result.ok).toBe(false);
  });

  it("rejects negative min_loan_cents", () => {
    const result = validateLoanRateRow(validLoan({ min_loan_cents: -1 }));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fail");
    expect(result.reason).toMatch(/min_loan_cents/);
  });

  it("rejects missing apply_url", () => {
    const result = validateLoanRateRow({ ...validLoan(), apply_url: undefined });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected fail");
    expect(result.reason).toMatch(/apply_url/);
  });
});

// ─── daysSinceUpdate ──────────────────────────────────────────────────────────

describe("daysSinceUpdate", () => {
  it("returns 0 for a date just now", () => {
    const now = new Date("2026-05-25T10:00:00Z");
    const updated = new Date("2026-05-25T09:59:00Z");
    expect(daysSinceUpdate(updated, now)).toBe(0);
  });

  it("returns 1 after 24+ hours", () => {
    const now = new Date("2026-05-26T10:00:00Z");
    const updated = new Date("2026-05-25T09:59:00Z");
    expect(daysSinceUpdate(updated, now)).toBe(1);
  });

  it("returns 7 after exactly 7 days", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const updated = new Date("2026-05-25T00:00:00Z");
    expect(daysSinceUpdate(updated, now)).toBe(7);
  });

  it("accepts an ISO string as updatedAt", () => {
    const now = new Date("2026-05-26T00:00:00Z");
    expect(daysSinceUpdate("2026-05-25T00:00:00Z", now)).toBe(1);
  });

  it("returns 0 when updatedAt is in the future (clock skew)", () => {
    const now = new Date("2026-05-25T00:00:00Z");
    const future = new Date("2026-05-26T00:00:00Z");
    expect(daysSinceUpdate(future, now)).toBe(0);
  });

  it("returns 0 for an invalid date string", () => {
    const now = new Date("2026-05-25T00:00:00Z");
    expect(daysSinceUpdate("not-a-date", now)).toBe(0);
  });
});

// ─── isStale ─────────────────────────────────────────────────────────────────

describe("isStale", () => {
  const now = new Date("2026-05-25T12:00:00Z");

  it("returns true when lastCapturedAt is null (never ingested)", () => {
    expect(isStale(null, 7, now)).toBe(true);
  });

  it("returns true when lastCapturedAt is undefined", () => {
    expect(isStale(undefined, 7, now)).toBe(true);
  });

  it("returns false when data is fresh (< staleDays)", () => {
    const recent = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    expect(isStale(recent, 7, now)).toBe(false);
  });

  it("returns true when data has reached staleDays", () => {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(isStale(sevenDaysAgo, 7, now)).toBe(true);
  });

  it("returns true when data is older than staleDays", () => {
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    expect(isStale(tenDaysAgo, 7, now)).toBe(true);
  });

  it("LOAN_RATE_STALE_DAYS is 7", () => {
    expect(LOAN_RATE_STALE_DAYS).toBe(7);
  });

  it("SAVINGS_RATE_STALE_DAYS is 3", () => {
    expect(SAVINGS_RATE_STALE_DAYS).toBe(3);
  });
});

// ─── formatAge ───────────────────────────────────────────────────────────────

describe("formatAge", () => {
  const now = new Date("2026-05-25T12:00:00Z");

  it("returns 'never' when lastCapturedAt is null", () => {
    expect(formatAge(null, now)).toBe("never");
  });

  it("returns 'today' when data is less than 1 day old", () => {
    const recent = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hrs ago
    expect(formatAge(recent, now)).toBe("today");
  });

  it("returns '1 day ago' for exactly 1 day", () => {
    const oneDayAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    expect(formatAge(oneDayAgo, now)).toBe("1 day ago");
  });

  it("returns 'N days ago' for multiple days", () => {
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    expect(formatAge(fiveDaysAgo, now)).toBe("5 days ago");
  });

  it("accepts ISO string input", () => {
    expect(formatAge("2026-05-24T10:00:00Z", new Date("2026-05-25T11:00:00Z"))).toBe("1 day ago");
  });
});

// ─── buildFreshnessReport ─────────────────────────────────────────────────────

describe("buildFreshnessReport", () => {
  it("marks null lastCapturedAt as stale source=admin_db", () => {
    const now = new Date("2026-05-25T12:00:00Z");
    const report = buildFreshnessReport(null, 7, "admin_db", now);
    expect(report.isStale).toBe(true);
    expect(report.lastCapturedAt).toBeNull();
    expect(report.daysSince).toBe(0);
    expect(report.source).toBe("admin_db");
  });

  it("reports fresh data correctly", () => {
    const now = new Date("2026-05-25T12:00:00Z");
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const report = buildFreshnessReport(yesterday, 7, "partner_feed", now);
    expect(report.isStale).toBe(false);
    expect(report.daysSince).toBe(1);
    expect(report.source).toBe("partner_feed");
  });
});

// ─── Batch validation ─────────────────────────────────────────────────────────

describe("validateSavingsRateRows", () => {
  it("separates valid and invalid rows", () => {
    const rows: Partial<SavingsRateRow>[] = [
      validSavings(),
      { broker_id: -1, product_kind: "savings_account", rate_bps: 300 }, // invalid broker_id
      validSavings({ rate_bps: 400 }),
    ];

    const { valid, invalid } = validateSavingsRateRows(rows);
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(1);
    expect(invalid[0]?.index).toBe(1);
    expect(invalid[0]?.reason).toMatch(/broker_id/);
  });

  it("returns all valid for a clean batch", () => {
    const rows = [validSavings(), validSavings({ rate_bps: 400 })];
    const { valid, invalid } = validateSavingsRateRows(rows);
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(0);
  });

  it("returns empty valid for an all-invalid batch", () => {
    const rows: Partial<SavingsRateRow>[] = [
      { broker_id: 0, product_kind: "savings_account", rate_bps: 300 },
    ];
    const { valid, invalid } = validateSavingsRateRows(rows);
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(1);
  });
});

describe("validateLoanRateRows", () => {
  it("separates valid and invalid rows", () => {
    const rows: Partial<LoanRateRow>[] = [
      validLoan(),
      { ...validLoan(), rate_pct: 150 }, // invalid — above 99
      validLoan({ lender_slug: "macquarie" }),
    ];

    const { valid, invalid } = validateLoanRateRows(rows);
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(1);
    expect(invalid[0]?.index).toBe(1);
    expect(invalid[0]?.reason).toMatch(/rate_pct/);
  });

  it("preserves the correct index for failures in a longer batch", () => {
    const rows: Partial<LoanRateRow>[] = [
      validLoan(),
      validLoan({ lender_slug: "anz" }),
      { ...validLoan(), max_lvr: 0 }, // index 2 invalid
      validLoan({ lender_slug: "nab" }),
    ];
    const { valid, invalid } = validateLoanRateRows(rows);
    expect(valid).toHaveLength(3);
    expect(invalid[0]?.index).toBe(2);
  });
});

// ─── No-credential fallback contract ─────────────────────────────────────────

describe("no-credential fallback contract", () => {
  it("validates DB-sourced savings rows the same as any other rows", () => {
    // Simulates what the DB adapter returns: well-formed rows from admin imports
    const dbRows: Partial<SavingsRateRow>[] = [
      {
        broker_id: 1,
        product_kind: "savings_account",
        rate_bps: 525,
        source: "manual",
        notes: "Imported via admin panel 2026-05-20",
      },
      {
        broker_id: 2,
        product_kind: "term_deposit",
        rate_bps: 480,
        term_months: 12,
        source: "manual",
      },
    ];
    const { valid, invalid } = validateSavingsRateRows(dbRows);
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(0);
  });

  it("validates DB-sourced loan rows the same as any other rows", () => {
    const dbRows: Partial<LoanRateRow>[] = [
      {
        lender_slug: "commonwealth-bank",
        lender_name: "Commonwealth Bank",
        rate_pct: 6.49,
        comparison_rate_pct: 6.55,
        max_lvr: 80,
        interest_only: true,
        offset_available: true,
        min_loan_cents: 10_000_000,
        apply_url: "/find-advisor?type=mortgage-brokers",
      },
    ];
    const { valid, invalid } = validateLoanRateRows(dbRows);
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
  });
});
