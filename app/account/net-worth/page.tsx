import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentPricesBatch } from "@/lib/holdings/value";
import ManualBalancesPanel, { type ManualBalance } from "./ManualBalancesPanel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Net worth — My Account",
  robots: { index: false, follow: false },
};

// FIN_NOTEBOOK item 20 — unified net-worth view. Reads holdings,
// investor_goals, manual_balances, and bookmarks to give a top-level
// number + the allocation breakdown. Glues the per-product surfaces
// (holdings, watchlist, FIRE goal) into one repeat-visit dashboard.
//
// As OAuth super/cash data sources land, this page reads them automatically —
// the switch from "holdings + manual goals" to "holdings + super + savings"
// is additive in the data fetch below, not a redesign.

interface HoldingRow {
  ticker: string | null;
  exchange: string | null;
  shares: number | null;
  cost_basis_per_share_cents: number | null;
}

interface GoalRow {
  id: number;
  label: string;
  goal_type: string;
  target_cents: number;
  current_balance_cents: number;
  target_date: string;
}

interface ManualBalanceRow {
  id: string;
  label: string;
  amount_cents: number;
  category: "savings" | "super" | "property" | "other";
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  savings: "Savings",
  super: "Super",
  property: "Property",
  other: "Other",
};

export default async function NetWorthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/account/net-worth");

  const [holdingsRes, goalsRes, manualBalancesRes] = await Promise.all([
    supabase
      .from("investor_holdings")
      .select("ticker, exchange, shares, cost_basis_per_share_cents")
      .eq("auth_user_id", user.id),
    supabase
      .from("investor_goals")
      .select("id, label, goal_type, target_cents, current_balance_cents, target_date")
      .eq("auth_user_id", user.id)
      .order("target_date", { ascending: true }),
    supabase
      .from("manual_balances")
      .select("id, label, amount_cents, category, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const holdings = (holdingsRes.data ?? []) as HoldingRow[];
  const goals = (goalsRes.data ?? []) as GoalRow[];
  const manualBalances = (manualBalancesRes.data ?? []) as ManualBalanceRow[];

  // Fetch current prices for every (ticker, exchange) pair in one batch.
  const pricePairs = holdings
    .filter((h): h is HoldingRow & { ticker: string; exchange: string } =>
      typeof h.ticker === "string" && typeof h.exchange === "string",
    )
    .map((h) => ({ ticker: h.ticker, exchange: h.exchange }));

  const priceMap = await getCurrentPricesBatch(pricePairs);

  let portfolioValueCents = 0;
  let portfolioCostBasisCents = 0;
  let pricedHoldings = 0;
  for (const h of holdings) {
    if (!h.ticker || !h.exchange || !h.shares) continue;
    const price = priceMap.get(`${h.ticker}|${h.exchange}`);
    if (price?.priceCents != null) {
      portfolioValueCents += Math.round(h.shares * price.priceCents);
      pricedHoldings++;
    }
    if (h.cost_basis_per_share_cents != null) {
      portfolioCostBasisCents += Math.round(h.shares * h.cost_basis_per_share_cents);
    }
  }

  // Manual / calculator-state balances from goals — stand-in for super/savings
  // until OAuth flows land. These remain in the total for backward-compat with
  // existing users.
  const goalBalanceCents = goals.reduce(
    (acc, g) => acc + (g.current_balance_cents ?? 0),
    0,
  );

  // Purpose-built manual balances from manual_balances table.
  const manualTotalCents = manualBalances.reduce(
    (acc, b) => acc + (b.amount_cents ?? 0),
    0,
  );

  // Group manual balances by category for breakdown.
  const manualByCategory = manualBalances.reduce<Record<string, number>>((acc, b) => {
    const cat = b.category ?? "other";
    acc[cat] = (acc[cat] ?? 0) + b.amount_cents;
    return acc;
  }, {});

  const netWorthCents = portfolioValueCents + goalBalanceCents + manualTotalCents;

  function fmt(cents: number): string {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  function fmtPct(numerator: number, denominator: number): string {
    if (denominator === 0) return "—";
    return `${((numerator / denominator) * 100).toFixed(0)}%`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-3">
        <Link href="/account" className="hover:text-slate-900">
          ← My account
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Net worth</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pulled from your holdings, goals, and manual balances.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Estimated net worth
        </p>
        <p className="mt-2 text-4xl font-extrabold text-slate-900">{fmt(netWorthCents)}</p>
        {netWorthCents === 0 && (
          <p className="mt-2 text-sm text-slate-500">
            Add holdings, save a goal, or add manual balances and your net worth will populate here.
          </p>
        )}
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Investment portfolio
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{fmt(portfolioValueCents)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {pricedHoldings} of {holdings.length} holdings priced
            {portfolioCostBasisCents > 0 && (
              <>
                {" "}· Cost basis {fmt(portfolioCostBasisCents)} (
                {fmtPct(portfolioValueCents - portfolioCostBasisCents, portfolioCostBasisCents)} change)
              </>
            )}
          </p>
          <Link
            href="/account/holdings"
            className="mt-3 inline-flex items-center text-xs font-semibold text-violet-700 hover:text-violet-900"
          >
            Manage holdings &rarr;
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Goal balances
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{fmt(goalBalanceCents)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {goals.length} goal{goals.length === 1 ? "" : "s"} saved
          </p>
          <Link
            href="/account/goals"
            className="mt-3 inline-flex items-center text-xs font-semibold text-violet-700 hover:text-violet-900"
          >
            View goals &rarr;
          </Link>
        </div>

        {manualTotalCents > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Manual balances
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{fmt(manualTotalCents)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(manualByCategory).map(([cat, cents]) => (
                <span key={cat} className="text-xs text-slate-500">
                  {CATEGORY_LABELS[cat] ?? cat}: {fmt(cents)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {goals.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">Goal progress</h2>
          <ul className="mt-3 space-y-2">
            {goals.map((g) => {
              const pct = g.target_cents > 0 ? Math.min(100, (g.current_balance_cents / g.target_cents) * 100) : 0;
              return (
                <li key={g.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{g.label}</p>
                    <p className="text-xs text-slate-500">
                      {fmt(g.current_balance_cents)} of {fmt(g.target_cents)}
                    </p>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-violet-500"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400" aria-label={`${pct.toFixed(0)}% of target`}>{pct.toFixed(0)}%{pct === 0 ? " — add funds to start tracking progress" : " complete"}</p>
                  {g.target_date && (
                    <p className="mt-2 text-xs text-slate-400">
                      Target: {new Date(g.target_date).toLocaleDateString("en-AU")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Manual balances panel — client component for inline CRUD */}
      <ManualBalancesPanel
        initialBalances={manualBalances as ManualBalance[]}
      />

      <p className="mt-10 text-xs text-slate-400">
        General information only — net worth here reflects what you&apos;ve told us about. Always
        cross-check with your actual statements + tax records before making financial decisions.
      </p>
    </div>
  );
}
