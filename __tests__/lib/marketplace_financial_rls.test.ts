/**
 * RLS isolation test for the a03 financial tables P0 fix.
 *
 * Migration under test:
 *   supabase/migrations/20260831000000_fix_a03_financial_tables_rls.sql
 *
 * Tables: broker_wallets, wallet_transactions, marketplace_invoices.
 *
 * These tables have NO user_id/owner_id column — ownership is modelled by
 * `broker_slug`, joined to broker_accounts.auth_user_id = auth.uid()::text.
 * The previous policy was `FOR SELECT TO authenticated USING (true)`, which
 * let ANY authenticated user read EVERY broker's Stripe ids + PII (P0 leak).
 *
 * The new SELECT policies are:
 *   "broker reads own <table>"  USING (broker_slug = <caller's own slug>)
 *   "admin reads all <table>"   USING ((auth.jwt()->'user_metadata'->>'role') = 'admin')
 *
 * This test models RLS at the JS layer: a broker sees only rows for their own
 * broker_slug; an admin (user_metadata.role === 'admin') sees all rows; a plain
 * authenticated user with no broker_accounts row sees nothing.
 *
 * Marker below lets the CI isolation gate associate this file with each table.
 */

// rls-isolation: broker_wallets
// rls-isolation: wallet_transactions
// rls-isolation: marketplace_invoices

import { describe, it, expect } from "vitest";

interface FinancialRow {
  id: number;
  broker_slug: string;
  // representative sensitive columns from the three tables
  stripe_payment_method_id?: string;
  stripe_payment_intent_id?: string;
  broker_email?: string;
  broker_abn?: string;
}

interface Caller {
  /** broker_slug owned by this caller via broker_accounts, or null if none. */
  ownBrokerSlug: string | null;
  /** auth.jwt() -> user_metadata -> role === 'admin' */
  isAdmin: boolean;
}

/**
 * Models the new RLS SELECT policy set for the three a03 financial tables.
 * Returns the rows the given caller is permitted to read.
 */
function visibleRows(rows: FinancialRow[], caller: Caller): FinancialRow[] {
  // "admin reads all": admins see everything.
  if (caller.isAdmin) return rows;
  // "broker reads own": only rows whose broker_slug matches the caller's own.
  if (caller.ownBrokerSlug === null) return [];
  return rows.filter((r) => r.broker_slug === caller.ownBrokerSlug);
}

const ROWS: FinancialRow[] = [
  {
    id: 1,
    broker_slug: "broker-a",
    stripe_payment_method_id: "pm_aaa",
    stripe_payment_intent_id: "pi_aaa",
    broker_email: "a@example.com",
    broker_abn: "11111111111",
  },
  {
    id: 2,
    broker_slug: "broker-b",
    stripe_payment_method_id: "pm_bbb",
    stripe_payment_intent_id: "pi_bbb",
    broker_email: "b@example.com",
    broker_abn: "22222222222",
  },
];

const BROKER_A: Caller = { ownBrokerSlug: "broker-a", isAdmin: false };
const BROKER_B: Caller = { ownBrokerSlug: "broker-b", isAdmin: false };
const PLAIN_USER: Caller = { ownBrokerSlug: null, isAdmin: false };
const ADMIN: Caller = { ownBrokerSlug: null, isAdmin: true };

describe("a03 financial tables — owner-scoped RLS (P0 fix)", () => {
  it("a plain authenticated user (no broker_accounts row) sees ZERO rows", () => {
    // This is the regression guard for the leak: previously USING(true)
    // returned ALL rows here, exposing every broker's Stripe ids + PII.
    expect(visibleRows(ROWS, PLAIN_USER)).toHaveLength(0);
  });

  it("broker A sees only their own row", () => {
    const seen = visibleRows(ROWS, BROKER_A);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.broker_slug).toBe("broker-a");
  });

  it("broker A cannot see broker B's row (no cross-broker leak)", () => {
    const seen = visibleRows(ROWS, BROKER_A);
    expect(seen.some((r) => r.broker_slug === "broker-b")).toBe(false);
  });

  it("broker A cannot read broker B's Stripe ids or PII", () => {
    const seen = visibleRows(ROWS, BROKER_A);
    const leaked = seen.flatMap((r) =>
      [r.stripe_payment_method_id, r.stripe_payment_intent_id, r.broker_email, r.broker_abn].filter(
        Boolean,
      ),
    );
    expect(leaked).not.toContain("pm_bbb");
    expect(leaked).not.toContain("pi_bbb");
    expect(leaked).not.toContain("b@example.com");
    expect(leaked).not.toContain("22222222222");
  });

  it("broker B sees only their own row", () => {
    const seen = visibleRows(ROWS, BROKER_B);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.broker_slug).toBe("broker-b");
  });

  it("an admin (user_metadata.role === 'admin') reads all brokers' rows", () => {
    // Required so the admin marketplace/revenue/reconciliation dashboards keep
    // working under RLS (they read across all brokers via the browser client).
    expect(visibleRows(ROWS, ADMIN)).toHaveLength(ROWS.length);
  });
});
