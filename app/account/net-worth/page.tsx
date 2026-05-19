import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentPricesBatch } from "@/lib/holdings/value";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Net worth — My Account",
  robots: { index: false, follow: false },
};

// FIN_NOTEBOOK item 20 — unified net-worth view. Reads holdings,
// investor_goals, and bookmarks to give a top-level number + the
// allocation breakdown. Glues the per-product surfaces (holdings,
// watchlist, FIRE goal) into one repeat-visit dashboard.
//
// Why not a separate table: a net-worth tracker that maintains its own
// state requires the user to dual-entry every time they buy a share /
// open a savings account / change their super balance. Reading what
// already exists keeps the data correct without manual maintenance.
//
// What this page DOESN'T do (deliberately):
//   - Pull manual savings balances (no input surface yet — the saved
//     calculator-state in investor_goals.current_balance_cents is the
//     stand-in for users without Sharesight import).
//   - Pull super balances (Sharesight OAuth read for ASX holdings is
//     shipped via /account/holdings; super accounts are a separate
//     Sharesight account type not yet handled).
//
// As those data sources land, this page reads them automatically — the
// switch from "holdings + manual goals" to "holdings + super + savings"
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

export default async function NetWorthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?redirect=/account/net-worth");

  const [holdingsRes, goalsRes] = await Promise.all([
    supabase
      .from("investor_holdings")
      .select("ticker, exchange, shares, cost_basis_per_share_cents")
      .eq("auth_user_id", user.id),
    supabase
      .from("investor_goals")
      .select("id, label, goal_type, target_cents, current_balance_cents, target_date")
      .eq("auth_user_id", user.id)
      .order("target_date", { ascending: true }),
  ]);

  const holdings = (holdingsRes.data ?? []) as HoldingRow[];
  const goals = (goalsRes.data ?? []) as GoalRow[];

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

  // Manual / calculator-state balances from goals — these stand in for
  // savings + super until OAuth flows land.
  const manualBalanceCents = goals.reduce(
    (acc, g) => acc + (g.current_balance_cents ?? 0),
    0,
  );

  const netWorthCents = portfolioValueCents + manualBalanceCents;

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
      <nav className="text-xs text-slate-500 mb-3">
        <Link href="/account" className="hover:text-slate-900">
          ← My account
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Net worth</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pulled from your holdings + saved goals. Connect Sharesight on your
          holdings page to pull share portfolios automatically.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Estimated net worth
        </p>
        <p className="mt-2 text-4xl font-extrabold text-slate-900">{fmt(netWorthCents)}</p>
        {netWorthCents === 0 && (
          <p className="mt-2 text-sm text-slate-500">
            Add holdings or save a goal and your net worth will populate here.
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
          <p className="mt-1 text-2xl font-bold text-slate-900">{fmt(manualBalanceCents)}</p>
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
                      aria-label={`${pct.toFixed(0)}% of target`}
                    />
                  </div>
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

      <p className="mt-10 text-xs text-slate-400">
        General information only — net worth here reflects what you&apos;ve told us about. Always
        cross-check with your actual statements + tax records before making financial decisions.
      </p>
    </div>
  );
}
