"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { computeHealthScore } from "@/lib/holdings/health-score";
import {
  buildSwitchingCoach,
  type BrokerForCoach,
} from "@/lib/holdings/switching-coach";
import SharesightConnectButton from "./SharesightConnectButton";
import TaxSummaryButton from "./TaxSummaryButton";

export interface HoldingRow {
  id: number;
  ticker: string;
  exchange: string;
  shares: number;
  costBasisPerShareCents: number;
  acquiredAt: string;
  brokerSlug: string | null;
  notes: string | null;
  /** Current market price in cents. Null when upstream is down + no
   *  stale fallback exists. UI renders "—" in that case. */
  currentPriceCents: number | null;
  /** ISO 4217 currency code of the current price, e.g. "AUD" / "USD".
   *  May differ from cost basis (which is always AUD by convention). */
  currentPriceCurrency: string | null;
  currentPriceSource: "yahoo" | "coingecko" | "stale" | null;
  /** ISO timestamp of the price's `fetched_at` for the "as of N ago" label. */
  currentPriceFetchedAt: string | null;
}

interface SharesightStatus {
  configured: boolean;
  connected: boolean;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}

interface Props {
  initialItems: HoldingRow[];
  brokers: BrokerForCoach[];
  sharesightStatus: SharesightStatus;
}

const TRADE_FREQ_OPTIONS = [
  { key: "rare", label: "I rarely trade", trades: 4 },
  { key: "few",  label: "Few times a year", trades: 12 },
  { key: "monthly", label: "Monthly", trades: 24 },
  { key: "weekly",  label: "Weekly+", trades: 60 },
] as const;

const EXCHANGES = ["ASX","NASDAQ","NYSE","LSE","HKEX","SGX","TYO","KRX","CRYPTO","OTHER"] as const;

const fmtCents = (cents: number) =>
  (cents / 100).toLocaleString("en-AU", { style: "currency", currency: "AUD" });

const fmtCurrency = (cents: number, currency: string) =>
  (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: currency || "AUD",
    currencyDisplay: "narrowSymbol",
  });

const fmtPct = (deltaCents: number, baseCents: number) => {
  if (baseCents === 0) return "—";
  const pct = (deltaCents / baseCents) * 100;
  const sign = pct >= 0 ? "+" : "−";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
};

const fmtShares = (n: number) =>
  n.toLocaleString("en-AU", { maximumFractionDigits: 4 });

export default function HoldingsClient({
  initialItems,
  brokers,
  sharesightStatus,
}: Props) {
  const [items, setItems] = useState<HoldingRow[]>(initialItems);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tradeFreqKey, setTradeFreqKey] = useState<string>("few");

  const totals = useMemo(() => {
    const totalCostCents = items.reduce(
      (sum, h) => sum + h.shares * h.costBasisPerShareCents,
      0,
    );
    const positionCount = items.length;
    // Current value totals — only counts positions with a price. Mixed-currency
    // portfolios are an MVP gap: we sum AUD + USD prices into one number on
    // the assumption most retail AU users hold AUD-only or AUD-dominant
    // portfolios. The UI surfaces a footnote when any non-AUD position exists.
    let totalValueCents = 0;
    let pricedPositionCount = 0;
    let hasNonAud = false;
    for (const h of items) {
      if (h.currentPriceCents == null) continue;
      totalValueCents += Math.round(h.shares * h.currentPriceCents);
      pricedPositionCount += 1;
      if (h.currentPriceCurrency && h.currentPriceCurrency !== "AUD") hasNonAud = true;
    }
    const totalGainCents = pricedPositionCount === positionCount
      ? totalValueCents - totalCostCents
      : null;
    return { totalCostCents, totalValueCents, totalGainCents, positionCount, pricedPositionCount, hasNonAud };
  }, [items]);

  const score = useMemo(
    () =>
      computeHealthScore(
        items.map((i) => ({
          ticker: i.ticker,
          exchange: i.exchange,
          shares: i.shares,
          costBasisPerShareCents: i.costBasisPerShareCents,
          acquiredAt: i.acquiredAt,
        })),
      ),
    [items],
  );

  const coach = useMemo(() => {
    const tradesPerYear =
      TRADE_FREQ_OPTIONS.find((o) => o.key === tradeFreqKey)?.trades ?? 12;
    const tagged = Array.from(
      new Set(
        items
          .map((i) => i.brokerSlug?.trim().toLowerCase())
          .filter((s): s is string => Boolean(s)),
      ),
    );
    return buildSwitchingCoach({
      currentBrokerSlugs: tagged,
      tradesPerYear,
      brokers,
    });
  }, [items, brokers, tradeFreqKey]);

  const handleAdd = async (form: FormData) => {
    setError(null);
    setAdding(true);
    const rawTicker = String(form.get("ticker") ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9]{1,10}(\.[A-Z]{1,5})?$/.test(rawTicker)) {
      setError("Enter a valid ticker (e.g. BHP.AX or AAPL).");
      setAdding(false);
      return;
    }
    const body = {
      ticker: rawTicker,
      exchange: String(form.get("exchange") ?? ""),
      shares: Number(form.get("shares") ?? 0),
      cost_basis_per_share_cents: Math.round(Number(form.get("costPerShare") ?? 0) * 100),
      acquired_at: String(form.get("acquired") ?? ""),
      broker_slug: (String(form.get("broker") ?? "").trim() || null),
      notes: (String(form.get("notes") ?? "").trim() || null),
    };
    try {
      const res = await fetch("/api/account/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "add_failed");
      }
      const j = (await res.json()) as { item: { id: number; ticker: string; exchange: string; shares: string; cost_basis_per_share_cents: string; acquired_at: string; broker_slug: string | null; notes: string | null } };
      const newRow: HoldingRow = {
        id: j.item.id,
        ticker: j.item.ticker,
        exchange: j.item.exchange,
        shares: Number(j.item.shares),
        costBasisPerShareCents: Number(j.item.cost_basis_per_share_cents),
        acquiredAt: j.item.acquired_at,
        brokerSlug: j.item.broker_slug,
        notes: j.item.notes,
        // Newly-added rows don't have a price yet; the user sees a "—" until
        // the next page render fetches it from the cache. (We could fire off
        // the lookup client-side here but it'd duplicate the server path.)
        currentPriceCents: null,
        currentPriceCurrency: null,
        currentPriceSource: null,
        currentPriceFetchedAt: null,
      };
      setItems((prev) => [newRow, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add holding.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setError(null);
    const snapshot = items;
    setDeletingId(id);
    setItems((prev) => prev.filter((h) => h.id !== id));
    try {
      const res = await fetch("/api/account/holdings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("delete_failed");
    } catch {
      setItems(snapshot);
      setError("Could not delete holding. Try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Health score block — comparison-driven, not advice. */}
      {items.length > 0 && (
        <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
            <h2 className="text-base font-semibold text-emerald-900">
              Portfolio health: {score.overallScore}/100
            </h2>
            <p className="text-xs text-emerald-800/80">
              Comparison-only. General information — not financial advice.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <ScorePill label="Diversification" score={score.diversificationScore} />
            <ScorePill label="Exchange spread" score={score.exchangeSpreadScore} />
            <ScorePill label="Age diversity" score={score.ageDiversityScore} />
          </div>
          {score.callouts.length > 0 && (
            <ul className="space-y-1.5 text-sm text-emerald-900/90">
              {score.callouts.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>•</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Switching coach — comparison vs cheapest eligible broker. */}
      {items.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
            <h2 className="text-base font-semibold text-amber-900">Brokerage coach</h2>
            <label className="text-xs text-amber-900">
              Trade frequency:{" "}
              <select
                value={tradeFreqKey}
                onChange={(e) => setTradeFreqKey(e.target.value)}
                className="border border-amber-300 rounded px-2 py-1 text-xs bg-white"
              >
                {TRADE_FREQ_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-sm text-amber-900/90">{coach.summary}</p>
          {coach.estSavingCents > 0 && (
            <Link
              href="/best/share-trading"
              className="inline-block mt-3 text-sm font-semibold text-amber-900 underline underline-offset-2"
            >
              Compare brokers →
            </Link>
          )}
        </section>
      )}

      {/* Totals strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Positions</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totals.positionCount}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Cost basis</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{fmtCents(totals.totalCostCents)}</p>
          <p className="text-xs text-emerald-700 mt-1">Sum of shares × cost/share.</p>
        </div>
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Current value</p>
          {totals.pricedPositionCount === 0 ? (
            <p className="text-2xl font-bold text-sky-900 mt-1">—</p>
          ) : (
            <p className="text-2xl font-bold text-sky-900 mt-1">{fmtCents(totals.totalValueCents)}</p>
          )}
          {totals.totalGainCents !== null ? (
            <p className={`text-xs mt-1 ${totals.totalGainCents >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {totals.totalGainCents >= 0 ? "+" : "−"}
              {fmtCents(Math.abs(totals.totalGainCents))} ({fmtPct(totals.totalGainCents, totals.totalCostCents)})
            </p>
          ) : (
            <p className="text-xs text-sky-700 mt-1">
              {totals.pricedPositionCount}/{totals.positionCount} priced
              {totals.hasNonAud ? " · mixed currency" : ""}
            </p>
          )}
        </div>
      </section>

      {/* CSV import + Sharesight OAuth — bulk-load holdings without typing. */}
      <section className="space-y-3">
        <Link
          href="/account/holdings/import"
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
        >
          Import CSV from broker
        </Link>
        <SharesightConnectButton initialStatus={sharesightStatus} />
      </section>

      {/* Add form */}
      <section className="bg-white border border-slate-200 rounded-xl p-4">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Add holding</h2>
        <form
          className="grid grid-cols-1 sm:grid-cols-6 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void handleAdd(fd);
            e.currentTarget.reset();
          }}
        >
          <label className="sm:col-span-2">
            <span className="block text-xs font-medium text-slate-700 mb-1">Ticker</span>
            <input
              type="text"
              name="ticker"
              required
              maxLength={30}
              placeholder="BHP.AX"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="block text-xs font-medium text-slate-700 mb-1">Exchange</span>
            <select name="exchange" defaultValue="ASX" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
              {EXCHANGES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <label>
            <span className="block text-xs font-medium text-slate-700 mb-1">Shares</span>
            <input
              type="number" inputMode="decimal"
              name="shares"
              required
              min="0"
              step="any"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="block text-xs font-medium text-slate-700 mb-1">Cost / share (AUD)</span>
            <input
              type="number" inputMode="decimal"
              name="costPerShare"
              required
              min="0"
              step="0.01"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label>
            <span className="block text-xs font-medium text-slate-700 mb-1">Acquired</span>
            <input
              type="date"
              name="acquired"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="sm:col-span-3">
            <span className="block text-xs font-medium text-slate-700 mb-1">Broker (optional)</span>
            <input
              type="text"
              name="broker"
              maxLength={100}
              placeholder="e.g. CommSec"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="sm:col-span-3">
            <span className="block text-xs font-medium text-slate-700 mb-1">Notes (optional)</span>
            <input
              type="text"
              name="notes"
              maxLength={500}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <div className="sm:col-span-6 flex justify-end">
            <button
              type="submit"
              disabled={adding}
              aria-busy={adding}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding ? "Adding…" : "Add holding"}
            </button>
          </div>
        </form>
        {error && (
          <p className="text-sm text-red-700 mt-2" role="alert">
            {error}
          </p>
        )}
      </section>

      {/* List */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Your holdings</h2>
        {items.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
            <p className="text-3xl mb-3" aria-hidden="true">📊</p>
            <p className="font-semibold text-slate-700 text-sm">No holdings tracked yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Add your first holding above to track performance and see fee comparisons across brokers.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
            {items.map((h) => (
              <li key={h.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{h.ticker}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{h.exchange}</span>
                    {h.brokerSlug && (
                      <span className="text-xs text-slate-500">via {h.brokerSlug}</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    {fmtShares(h.shares)} shares · {fmtCents(h.costBasisPerShareCents)}/share · acquired {h.acquiredAt}
                  </div>
                  {h.notes && (
                    <p className="text-xs text-slate-500 italic mt-1 truncate">{h.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {h.currentPriceCents != null ? (
                    <>
                      <div className="text-sm font-semibold text-slate-900">
                        {fmtCurrency(h.shares * h.currentPriceCents, h.currentPriceCurrency ?? "AUD")}
                      </div>
                      <RowGainLabel
                        valueCents={h.shares * h.currentPriceCents}
                        costCents={h.shares * h.costBasisPerShareCents}
                        currency={h.currentPriceCurrency}
                      />
                    </>
                  ) : (
                    <div
                      className="text-sm text-slate-500"
                      title="Price unavailable — may be invalid ticker, unsupported exchange, or temporary data issue."
                    >
                      —
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    cost {fmtCents(h.shares * h.costBasisPerShareCents)}
                  </div>
                  {h.currentPriceSource === "stale" && (
                    <div
                      className="inline-flex items-center gap-1 text-[10px] text-amber-700 mt-0.5"
                      title="Latest live fetch failed; showing the most recent cached price."
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M5 1L9 9H1L5 1Z" fill="#d97706" />
                        <path d="M5 4v2M5 7.5v.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" />
                      </svg>
                      stale price
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDelete(h.id)}
                    disabled={deletingId === h.id}
                    className="text-xs text-red-700 hover:text-red-900 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === h.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tax-year summary export + advisor handoff. Sits below the list
          so users see what they have before deciding to export. */}
      <TaxSummaryButton />
    </div>
  );
}

/**
 * Per-row gain/loss label. Skipped when the price currency differs from
 * AUD (cost basis is AUD-only) — comparing AUD cost vs USD value would
 * mislead. We surface the value in its native currency without an
 * apples-to-oranges delta.
 */
function RowGainLabel({
  valueCents,
  costCents,
  currency,
}: {
  valueCents: number;
  costCents: number;
  currency: string | null;
}) {
  if (currency && currency !== "AUD") {
    return (
      <div className="text-xs text-slate-500" title={`Value in ${currency}; cost basis stored in AUD`}>
        {currency} price · cost in AUD
      </div>
    );
  }
  const delta = valueCents - costCents;
  const cls = delta >= 0 ? "text-emerald-700" : "text-red-700";
  return (
    <div className={`text-xs ${cls}`}>
      {delta >= 0 ? "+" : "−"}
      {fmtCents(Math.abs(delta))} ({fmtPct(delta, costCents)})
    </div>
  );
}

function ScorePill({ label, score }: { label: string; score: number }) {
  const tone =
    score >= 70 ? "bg-emerald-100 text-emerald-900 border-emerald-300"
    : score >= 40 ? "bg-amber-100 text-amber-900 border-amber-300"
    : "bg-red-100 text-red-900 border-red-300";
  return (
    <div className={`border rounded-lg px-2 py-2 ${tone}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-xl font-bold">{score}</p>
    </div>
  );
}
