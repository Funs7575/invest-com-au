"use client";

import { useMemo, useState } from "react";
import {
  afterTaxReturn,
  defaultReturnSplit,
  STRUCTURE_OPTIONS,
  INVESTMENT_STRUCTURES,
  type InvestmentStructure,
} from "@/lib/invest-decision-tools";
import { deriveListingKind } from "@/lib/listing-kind";
import type { DecisionToolListing } from "@/lib/invest-decision-tools";
import Icon from "@/components/Icon";

/**
 * Structure-aware after-tax return estimator. The defensible white-space
 * tool from the gap audit — no AU marketplace shows how a listing's
 * headline return survives tax across investment structures.
 *
 * Reads a sensible default gross return from the listing's key_metrics
 * (target IRR / yield / return) and lets the user adjust the return,
 * structure, hold period, and income/growth split. All maths is in the
 * unit-tested lib/invest-decision-tools — this component is presentation.
 */
export default function AfterTaxReturnPanel({ listing }: { listing: DecisionToolListing }) {
  const kind = deriveListingKind(listing);
  const km = useMemo(
    () => (listing.key_metrics ?? {}) as Record<string, unknown>,
    [listing.key_metrics],
  );

  // Seed the gross return from the listing where possible.
  const seededReturn = useMemo(() => {
    const candidates = [
      km["target_irr_pct"], km["target_irr"], km["target_yield_pct"],
      km["target_yield_pa"], km["distribution_yield"], km["net_yield_pct"],
      km["gross_yield_pct"], km["dividend_yield"], km["historical_return_pa"],
      km["target_return_pa"], km["return_5yr_pa"], km["lease_yield_pct_pa"],
    ];
    for (const c of candidates) {
      const n = typeof c === "number" ? c : typeof c === "string" ? Number(c.replace(/[^\d.]/g, "")) : NaN;
      if (Number.isFinite(n) && n > 0 && n < 60) return Math.round(n * 10) / 10;
    }
    return 8; // neutral default
  }, [km]);

  const seededFranking = useMemo(() => {
    // Only listed securities / dividend-bearing listings get a franking default.
    if (kind === "listed_security") return 100;
    return 0;
  }, [kind]);

  const split = defaultReturnSplit(kind);

  const [grossReturn, setGrossReturn] = useState<number>(seededReturn);
  const [structure, setStructure] = useState<InvestmentStructure>("individual_top");
  const [incomeShare, setIncomeShare] = useState<number>(Math.round(split.income * 100));
  const [heldOver12, setHeldOver12] = useState(true);
  const [franking, setFranking] = useState<number>(seededFranking);

  const result = useMemo(
    () => afterTaxReturn({
      grossReturnPct: grossReturn,
      structure,
      incomeShare: incomeShare / 100,
      heldOver12Months: heldOver12,
      frankingPct: franking,
    }),
    [grossReturn, structure, incomeShare, heldOver12, franking],
  );

  // Compare across all structures for the mini-table.
  const acrossStructures = useMemo(
    () => STRUCTURE_OPTIONS.map((s) => ({
      meta: s,
      r: afterTaxReturn({
        grossReturnPct: grossReturn,
        structure: s.key,
        incomeShare: incomeShare / 100,
        heldOver12Months: heldOver12,
        frankingPct: franking,
      }),
    })),
    [grossReturn, incomeShare, heldOver12, franking],
  );

  const bestStructure = acrossStructures.reduce((a, b) => (b.r.afterTaxReturnPct > a.r.afterTaxReturnPct ? b : a));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-start gap-2 mb-1">
        <span className="shrink-0 mt-0.5 text-emerald-600"><Icon name="calculator" size={16} /></span>
        <div>
          <h2 className="text-base font-bold text-slate-900">After-tax return estimator</h2>
          <p className="text-xs text-slate-500">See how this listing&apos;s return survives tax across investment structures.</p>
        </div>
      </div>

      {/* Headline */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
          <p className="text-[0.6rem] uppercase tracking-wide text-slate-500 font-semibold">Gross return</p>
          <p className="text-2xl font-extrabold text-slate-900">{result.grossReturnPct}%</p>
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
          <p className="text-[0.6rem] uppercase tracking-wide text-emerald-600 font-semibold">After-tax</p>
          <p className="text-2xl font-extrabold text-emerald-700">{result.afterTaxReturnPct}%</p>
        </div>
      </div>
      <p className="mt-1.5 text-[0.65rem] text-slate-500 text-center">
        {INVESTMENT_STRUCTURES[structure].label} · {result.effectiveTaxRate > 0 ? `${Math.round(result.effectiveTaxRate * 100)}% effective tax drag` : "tax-exempt"}
      </p>

      {/* Controls */}
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">Gross return: {grossReturn}% p.a.</span>
          <input
            type="range" min={1} max={30} step={0.5} value={grossReturn}
            onChange={(e) => setGrossReturn(Number(e.target.value))}
            className="w-full mt-1 accent-emerald-600"
            aria-label="Gross return percent"
          />
        </label>

        <label className="block">
          <span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">Investment structure</span>
          <select
            value={structure}
            onChange={(e) => setStructure(e.target.value as InvestmentStructure)}
            className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {STRUCTURE_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">
            Income / growth split: {incomeShare}% income · {100 - incomeShare}% growth
          </span>
          <input
            type="range" min={0} max={100} step={5} value={incomeShare}
            onChange={(e) => setIncomeShare(Number(e.target.value))}
            className="w-full mt-1 accent-emerald-600"
            aria-label="Income share percent"
          />
        </label>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
            <input type="checkbox" checked={heldOver12} onChange={(e) => setHeldOver12(e.target.checked)} className="accent-emerald-600" />
            Held &gt; 12 months (CGT discount)
          </label>
          {(kind === "listed_security" || incomeShare > 0) && (
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
              Franking
              <select
                value={franking}
                onChange={(e) => setFranking(Number(e.target.value))}
                className="rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                aria-label="Franking percent"
              >
                <option value={0}>0%</option>
                <option value={50}>50%</option>
                <option value={100}>100%</option>
              </select>
            </label>
          )}
        </div>
      </div>

      {/* Across-structures mini table */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="text-[0.6rem] uppercase tracking-wide text-slate-500 font-semibold mb-2">After-tax return by structure</p>
        <div className="space-y-1">
          {acrossStructures.map(({ meta, r }) => {
            const isBest = meta.key === bestStructure.meta.key;
            const pctOfBest = bestStructure.r.afterTaxReturnPct > 0 ? (r.afterTaxReturnPct / bestStructure.r.afterTaxReturnPct) * 100 : 0;
            return (
              <div key={meta.key} className="flex items-center gap-2">
                <span className={`text-[0.65rem] w-40 shrink-0 truncate ${meta.key === structure ? "font-bold text-slate-900" : "text-slate-500"}`}>
                  {meta.label}
                </span>
                <div className="flex-1 h-3.5 rounded bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded ${isBest ? "bg-emerald-500" : "bg-slate-300"}`}
                    style={{ width: `${Math.max(2, pctOfBest)}%` }}
                  />
                </div>
                <span className={`text-[0.7rem] tabular-nums w-12 text-right ${isBest ? "font-bold text-emerald-700" : "text-slate-600"}`}>
                  {r.afterTaxReturnPct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-[0.6rem] text-slate-500 leading-snug">
        {INVESTMENT_STRUCTURES[structure].note} Estimate only — single-year annualised tax drag, not a multi-year IRR with deferred CGT.
        Not personal advice. Confirm with a registered tax agent.
      </p>
    </div>
  );
}
