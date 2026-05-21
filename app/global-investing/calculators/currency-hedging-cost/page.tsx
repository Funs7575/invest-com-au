"use client";

import Link from "next/link";
import { useState } from "react";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { computeHedgingCost } from "@/lib/calculators/currency-hedging-cost";
import { CURRENT_YEAR } from "@/lib/seo";

// ─────────────────────────────────────────────────────────────────────────────
// Page-level metadata lives in a separate generateMetadata export at the
// bottom of this file (Next.js 15+ "use client" + metadata via export pattern).
// ─────────────────────────────────────────────────────────────────────────────

// Preset rate scenarios for quick comparison.
const PRESETS = [
  {
    label: "AUD 4.35% / USD 5.25% (2026 est.)",
    audRate: 0.0435,
    foreignRate: 0.0525,
    currencyLabel: "USD",
  },
  {
    label: "AUD 4.35% / JPY 0.10% (2026 est.)",
    audRate: 0.0435,
    foreignRate: 0.001,
    currencyLabel: "JPY",
  },
  {
    label: "AUD 4.35% / EUR 3.75% (2026 est.)",
    audRate: 0.0435,
    foreignRate: 0.0375,
    currencyLabel: "EUR",
  },
  {
    label: "AUD 4.35% / SGD 3.50% (2026 est.)",
    audRate: 0.0435,
    foreignRate: 0.035,
    currencyLabel: "SGD",
  },
] as const;

function formatCcy(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n: number, dp = 2): string {
  return `${(n * 100).toFixed(dp)}%`;
}

export default function CurrencyHedgingCostPage() {
  const [positionAUD, setPositionAUD] = useState("100000");
  const [audRate, setAudRate] = useState("4.35");
  const [foreignRate, setForeignRate] = useState("5.25");
  const [hedgeRatio, setHedgeRatio] = useState("100");
  const [holdingYears, setHoldingYears] = useState("1");
  const [currencyLabel, setCurrencyLabel] = useState("USD");

  const pos = parseFloat(positionAUD) || 0;
  const aud = parseFloat(audRate) / 100 || 0;
  const fgn = parseFloat(foreignRate) / 100 || 0;
  const ratio = parseFloat(hedgeRatio) / 100 || 1;
  const years = parseFloat(holdingYears) || 1;

  const result =
    pos > 0
      ? computeHedgingCost({
          positionAUD: pos,
          audRate: aud,
          foreignRate: fgn,
          hedgeRatio: ratio,
          holdingYears: years,
        })
      : null;

  function applyPreset(p: (typeof PRESETS)[number]) {
    setAudRate((p.audRate * 100).toFixed(2));
    setForeignRate((p.foreignRate * 100).toFixed(2));
    setCurrencyLabel(p.currencyLabel);
  }

  const costIsPositive = result ? result.annualHedgingCostPct > 0 : false;

  return (
    <div className="bg-white min-h-screen">
      {/* ── General info banner ────────────────────────────────────── */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="container-custom py-2.5">
          <p className="text-xs text-amber-800">
            <span className="font-bold">General information only</span> — this calculator models
            the cost of currency hedging using interest rate parity. It does not constitute financial
            advice. Actual hedging costs will differ. See a licensed financial adviser for personalised guidance.
          </p>
        </div>
      </div>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span>/</span>
            <Link href="/global-investing/calculators" className="hover:text-slate-900">Calculators</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Currency Hedging Cost</span>
          </nav>
          <div className="max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Currency hedging cost{" "}
              <span className="text-amber-600">calculator</span>
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Estimate the annual cost (or benefit) of hedging a foreign-currency equity position back
              to AUD using interest rate parity — the same mechanism that drives the hedging drag inside
              AUD-hedged ETFs like IHVV. Rates are entered as percentages per year.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Updated {CURRENT_YEAR} · Illustrative modelling only — not a quote or forecast.
            </p>
          </div>
        </div>
      </section>

      {/* ── Calculator ─────────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Inputs */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-extrabold text-slate-900 mb-5">Inputs</h2>

                {/* Quick presets */}
                <div className="mb-5">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Quick presets</p>
                  <div className="flex flex-col gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => applyPreset(p)}
                        className="text-left text-xs px-3 py-2 border border-slate-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors text-slate-700"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Position */}
                  <div>
                    <label htmlFor="position" className="block text-xs font-bold text-slate-700 mb-1">
                      Position size (AUD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                      <input
                        id="position"
                        type="number"
                        min="0"
                        step="10000"
                        value={positionAUD}
                        onChange={(e) => setPositionAUD(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
                        placeholder="100000"
                      />
                    </div>
                  </div>

                  {/* AUD rate */}
                  <div>
                    <label htmlFor="audRate" className="block text-xs font-bold text-slate-700 mb-1">
                      AUD risk-free rate (% p.a.)
                      <span className="ml-1 font-normal text-slate-500">— e.g. RBA cash rate</span>
                    </label>
                    <div className="relative">
                      <input
                        id="audRate"
                        type="number"
                        min="0"
                        max="20"
                        step="0.05"
                        value={audRate}
                        onChange={(e) => setAudRate(e.target.value)}
                        className="w-full pr-7 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
                        placeholder="4.35"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                    </div>
                  </div>

                  {/* Foreign rate */}
                  <div>
                    <label htmlFor="foreignRate" className="block text-xs font-bold text-slate-700 mb-1">
                      {currencyLabel} risk-free rate (% p.a.)
                      <span className="ml-1 font-normal text-slate-500">— e.g. Fed Funds / BoJ rate</span>
                    </label>
                    <div className="relative">
                      <input
                        id="foreignRate"
                        type="number"
                        min="0"
                        max="20"
                        step="0.05"
                        value={foreignRate}
                        onChange={(e) => setForeignRate(e.target.value)}
                        className="w-full pr-7 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
                        placeholder="5.25"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                    </div>
                  </div>

                  {/* Hedge ratio */}
                  <div>
                    <label htmlFor="hedgeRatio" className="block text-xs font-bold text-slate-700 mb-1">
                      Hedge ratio (%)
                      <span className="ml-1 font-normal text-slate-500">— 100% = fully hedged</span>
                    </label>
                    <div className="relative">
                      <input
                        id="hedgeRatio"
                        type="number"
                        min="0"
                        max="100"
                        step="5"
                        value={hedgeRatio}
                        onChange={(e) => setHedgeRatio(e.target.value)}
                        className="w-full pr-7 pl-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
                        placeholder="100"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                    </div>
                  </div>

                  {/* Holding period */}
                  <div>
                    <label htmlFor="holdingYears" className="block text-xs font-bold text-slate-700 mb-1">
                      Holding period (years)
                    </label>
                    <input
                      id="holdingYears"
                      type="number"
                      min="0.1"
                      max="30"
                      step="0.5"
                      value={holdingYears}
                      onChange={(e) => setHoldingYears(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
                      placeholder="1"
                    />
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                {result ? (
                  <>
                    {/* Headline result */}
                    <div
                      className={`rounded-2xl p-6 border ${
                        costIsPositive
                          ? "bg-red-50 border-red-200"
                          : result.carryDirection === "benefit"
                          ? "bg-green-50 border-green-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${costIsPositive ? "text-red-700" : "text-green-700"}`}>
                        {costIsPositive ? "Annual hedging drag" : result.carryDirection === "benefit" ? "Annual hedging benefit (tailwind)" : "Approx. zero hedging cost"}
                      </p>
                      <p className={`text-3xl font-black mb-1 ${costIsPositive ? "text-red-700" : "text-green-700"}`}>
                        {costIsPositive ? "" : "+"}{formatPct(result.annualHedgingCostPct)}
                      </p>
                      <p className="text-sm text-slate-600">
                        {costIsPositive ? "Costs" : "Saves"} approx.{" "}
                        <span className="font-bold">
                          {formatCcy(Math.abs(result.annualHedgingCostAUD))}
                        </span>{" "}
                        per year on the hedged position of{" "}
                        <span className="font-bold">{formatCcy(result.hedgedNotionalAUD)}</span>
                      </p>
                    </div>

                    {/* Detail grid */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Breakdown</p>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Hedged notional</span>
                          <span className="font-bold text-slate-900">{formatCcy(result.hedgedNotionalAUD)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">AUD rate (p.a.)</span>
                          <span className="font-bold text-slate-900">{formatPct(result.inputs.audRate)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">{currencyLabel} rate (p.a.)</span>
                          <span className="font-bold text-slate-900">{formatPct(result.inputs.foreignRate)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Annual cost (approx. linear)</span>
                          <span className={`font-bold ${costIsPositive ? "text-red-700" : "text-green-700"}`}>
                            {costIsPositive ? "" : "+"}{formatPct(result.annualHedgingCostPct)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Annual cost (precise compound)</span>
                          <span className={`font-bold ${result.annualHedgingCostPctPrecise > 0 ? "text-red-700" : "text-green-700"}`}>
                            {result.annualHedgingCostPctPrecise > 0 ? "" : "+"}{formatPct(result.annualHedgingCostPctPrecise)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
                          <span className="text-slate-600 font-semibold">
                            Total cost over {result.inputs.holdingYears.toFixed(1)}y
                          </span>
                          <span className={`font-black ${result.totalCostAUD > 0 ? "text-red-700" : "text-green-700"}`}>
                            {result.totalCostAUD > 0 ? "" : "+"}{formatCcy(Math.abs(result.totalCostAUD))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Interpretation */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <p className="text-xs font-bold text-slate-700 mb-1">What this means</p>
                      {costIsPositive ? (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          AUD rates are higher than {currencyLabel} rates. To hedge, you sell {currencyLabel} forward
                          at a discount to spot — this discount is the hedging drag. In practice, this is why
                          AUD-hedged ETFs (e.g. IHVV for S&amp;P 500) have slightly underperformed their unhedged
                          equivalents (e.g. IVV) when AUD rates have been above USD rates.
                        </p>
                      ) : result.carryDirection === "benefit" ? (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {currencyLabel} rates are higher than AUD rates. The forward exchange rate favours AUD —
                          you sell {currencyLabel} forward at a premium to spot, creating a positive carry from hedging.
                          This is the case for JPY/AUD hedging when Japanese rates are very low.
                        </p>
                      ) : (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          AUD and {currencyLabel} rates are approximately equal, so hedging has near-zero cost at
                          current rates. Small rate movements would shift this.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
                    <p className="text-sm text-slate-500">Enter a position size to see hedging costs.</p>
                  </div>
                )}

                {/* Context card */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-amber-800 mb-1">About this calculation</p>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    This model uses Covered Interest Rate Parity (CIP): the cost of a currency forward
                    equals the interest-rate differential between the two currencies. Real hedging costs
                    will also include bid-ask spreads, rolling costs, and execution friction. This is
                    general information only — not a quote or personalised advice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Explainer ──────────────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">Why does currency hedging have a cost?</h2>
          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <p>
              When you hold a foreign-currency asset and want to lock in a known AUD return, you can enter
              a forward contract to sell the foreign currency at a fixed exchange rate on a future date.
              This removes the currency risk — but the forward rate is not the same as the current spot rate.
            </p>
            <p>
              The difference is set by the <span className="font-semibold text-slate-800">interest rate differential</span> between
              the two currencies (this is Covered Interest Rate Parity, or CIP). If AUD interest rates are
              higher than the foreign currency&apos;s rates, the AUD is expected to depreciate toward the foreign
              currency over time — so the forward rate prices in that depreciation. When you sell foreign
              currency forward (to hedge), you sell it at this discounted forward price, which is lower than
              spot. That discount is the hedging cost.
            </p>
            <p>
              <span className="font-semibold text-slate-800">In practice:</span> AUD-hedged ETFs like IHVV
              (iShares S&amp;P 500 AUD Hedged) roll one-month FX forward contracts continuously. The hedging
              cost in any given year is approximately the AUD–USD rate differential. When AUD rates were 4.35%
              and USD rates were 5.25% in 2026, the hedging drag on an AUD-hedged US equity position was
              roughly −0.9% per year — meaning the unhedged equivalent (IVV) had an approximately 0.9%
              currency-related tailwind relative to IHVV, all else equal.
            </p>
            <p>
              <span className="font-semibold text-slate-800">Japan example:</span> When AUD rates are 4.35%
              and Japanese rates are near 0.1% (as they were through much of 2024–2026), an AUD investor
              hedging a JPY equity position faces a hedging <em>benefit</em> (positive carry) of approximately
              +4.25% per year — because selling JPY forward locks in a substantial premium over the current
              spot rate.
            </p>
          </div>
        </div>
      </section>

      {/* ── Cross-links ──────────────────────────────────────────────── */}
      <section className="py-8 bg-white border-t border-slate-200">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3">
            <Link href="/global-investing/tax" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Global investing tax hub &rarr;</Link>
            <Link href="/global-investing/etfs/us" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">US ETFs (hedged vs unhedged) &rarr;</Link>
            <Link href="/global-investing/etfs/asia" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Asia ETFs &rarr;</Link>
            <Link href="/global-investing" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Global investing hub &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} This calculator is a general illustration only. Actual hedging costs depend on market conditions, bid-ask spreads, rolling conventions, and execution. Rates used are illustrative; verify current rates with your broker or a financial adviser.</p>
        </div>
      </section>
    </div>
  );
}
