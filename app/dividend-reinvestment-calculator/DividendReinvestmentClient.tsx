"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useCalculatorState } from "@/hooks/use-calculator-state";
import CalculatorLeadCapture from "@/components/CalculatorLeadCapture";

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}
function fmtShares(n: number) {
  return n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DividendReinvestmentClient() {
  const [price, setPrice] = useState(50);
  const [shares, setShares] = useState(1000);
  const [divYield, setDivYield] = useState(4);
  const [growth, setGrowth] = useState(6);
  const [years, setYears] = useState(20);

  const {
    value: persistedInputs,
    setValue: setPersistedInputs,
    isHydrated: persistHydrated,
  } = useCalculatorState<{
    price: number;
    shares: number;
    div_yield: number;
    growth: number;
    years: number;
  }>("dividend_reinvestment_calculator", {
    price: 50,
    shares: 1000,
    div_yield: 4,
    growth: 6,
    years: 20,
  });

  useEffect(() => {
    if (!persistHydrated) return;
    if (typeof persistedInputs.price === "number") setPrice(persistedInputs.price);
    if (typeof persistedInputs.shares === "number") setShares(persistedInputs.shares);
    if (typeof persistedInputs.div_yield === "number") setDivYield(persistedInputs.div_yield);
    if (typeof persistedInputs.growth === "number") setGrowth(persistedInputs.growth);
    if (typeof persistedInputs.years === "number") setYears(persistedInputs.years);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once
  }, [persistHydrated]);

  useEffect(() => {
    setPersistedInputs({ price, shares, div_yield: divYield, growth, years });
  }, [price, shares, divYield, growth, years, setPersistedInputs]);

  const result = useMemo(() => {
    const dy = divYield / 100;
    const gr = growth / 100;

    let currentSharesDrp = shares;
    const currentSharesCash = shares;
    let currentPrice = price;
    let totalDividendsReceived = 0;
    let totalDividendsCash = 0;

    const snapshots: { year: number; drpValue: number; cashValue: number; cashTotalWealth: number; drpShares: number; cumDiv: number }[] = [];
    snapshots.push({ year: 0, drpValue: shares * price, cashValue: shares * price, cashTotalWealth: shares * price, drpShares: shares, cumDiv: 0 });

    let cumulativeCashDiv = 0;
    for (let y = 1; y <= years; y++) {
      currentPrice = currentPrice * (1 + gr);
      const drpDividend = currentSharesDrp * currentPrice * dy;
      const cashDividend = currentSharesCash * currentPrice * dy;

      totalDividendsReceived += drpDividend;
      totalDividendsCash += cashDividend;
      cumulativeCashDiv += cashDividend;

      // DRP: reinvest dividends → more shares
      currentSharesDrp += drpDividend / currentPrice;

      snapshots.push({
        year: y,
        drpValue: currentSharesDrp * currentPrice,
        cashValue: currentSharesCash * currentPrice,
        cashTotalWealth: currentSharesCash * currentPrice + cumulativeCashDiv,
        drpShares: currentSharesDrp,
        cumDiv: totalDividendsReceived,
      });
    }

    const finalDrpValue = currentSharesDrp * currentPrice;
    const finalCashValue = currentSharesCash * currentPrice + totalDividendsCash;
    const initialValue = shares * price;
    const drpAdvantage = finalDrpValue - finalCashValue;

    return {
      finalDrpValue,
      finalCashValue,
      finalDrpShares: currentSharesDrp,
      initialValue,
      totalDividendsReceived,
      totalDividendsCash,
      drpAdvantage,
      snapshots,
    };
  }, [price, shares, divYield, growth, years]);

  const maxValue = result.snapshots[result.snapshots.length - 1]?.drpValue || 1;

  return (
    <div className="py-10 md:py-16">
      <div className="container-custom max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-1">Free Calculator</p>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">
            Dividend Reinvestment Calculator
          </h1>
          <p className="text-slate-500 text-sm md:text-base leading-relaxed">
            See how reinvesting dividends (DRP) accelerates your portfolio growth through compounding — compared
            to taking dividends as cash.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          {/* Inputs */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
              <h2 className="font-bold text-slate-900">Your Portfolio</h2>

              <div>
                <label htmlFor="drp-price" className="block text-xs font-semibold text-slate-600 mb-1">Share price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    id="drp-price"
                    type="number"
                    min={0.01}
                    step={0.5}
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="drp-shares" className="block text-xs font-semibold text-slate-600 mb-1">Number of shares</label>
                <input
                  id="drp-shares"
                  type="number"
                  min={1}
                  step={100}
                  value={shares}
                  onChange={(e) => setShares(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <div>
                <label htmlFor="drp-yield" className="block text-xs font-semibold text-slate-600 mb-1">
                  Dividend yield (p.a.)
                  <span className="text-slate-400 font-normal ml-1">e.g. VAS ≈ 4%</span>
                </label>
                <div className="relative">
                  <input
                    id="drp-yield"
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={divYield}
                    onChange={(e) => setDivYield(Number(e.target.value))}
                    className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>

              <div>
                <label htmlFor="drp-growth" className="block text-xs font-semibold text-slate-600 mb-1">Share price growth (p.a.)</label>
                <div className="relative">
                  <input
                    id="drp-growth"
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={growth}
                    onChange={(e) => setGrowth(Number(e.target.value))}
                    className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>

              <div>
                <label htmlFor="drp-years" className="block text-xs font-semibold text-slate-600 mb-1">Investment period</label>
                <div className="relative">
                  <input
                    id="drp-years"
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                    className="w-full pr-12 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">yrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div
            className="lg:col-span-3 space-y-4"
            role="region"
            aria-live="polite"
            aria-atomic="true"
            aria-label="Calculated results"
          >
            {/* DRP vs Cash comparison */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">DRP vs Cash After {years} Years</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-violet-700 mb-1">Reinvested (DRP)</p>
                  <p className="text-2xl font-extrabold text-violet-900">{fmt(result.finalDrpValue)}</p>
                  <p className="text-xs text-violet-600 mt-1">{fmtShares(result.finalDrpShares)} shares</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-slate-600 mb-1">Cash dividends</p>
                  <p className="text-2xl font-extrabold text-slate-700">{fmt(result.finalCashValue)}</p>
                  <p className="text-xs text-slate-500 mt-1">{fmtShares(shares)} shares + cash</p>
                </div>
              </div>
              {result.drpAdvantage > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700 font-medium">
                  DRP puts you <strong>{fmt(result.drpAdvantage)}</strong> ahead after {years} years
                </div>
              )}
            </div>

            {/* ADV-139: Crossover line chart — DRP vs Cash total wealth over time */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">DRP vs Cash — Total Wealth Over Time</p>
              <div className="flex gap-4 mb-3">
                <span className="flex items-center gap-1.5 text-xs text-violet-700 font-semibold">
                  <span className="inline-block w-6 h-0.5 bg-violet-500 rounded" />DRP (reinvested)
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <span className="inline-block w-6 h-0.5 bg-slate-400 rounded" />Cash (portfolio + dividends)
                </span>
              </div>
              {(() => {
                const CW = 400, CH = 180;
                const PL = 52, PR = 12, PT = 8, PB = 24;
                const W = CW - PL - PR, H = CH - PT - PB;
                const maxV = Math.max(
                  result.snapshots[result.snapshots.length - 1]?.drpValue ?? 1,
                  result.snapshots[result.snapshots.length - 1]?.cashTotalWealth ?? 1,
                );
                const tx = (y: number) => PL + (y / years) * W;
                const ty = (v: number) => PT + H - (v / maxV) * H;
                const drpPts = result.snapshots.map(s => `${tx(s.year)},${ty(s.drpValue)}`).join(" ");
                const cashPts = result.snapshots.map(s => `${tx(s.year)},${ty(s.cashTotalWealth)}`).join(" ");
                const areaPath =
                  result.snapshots.map((s, i) => `${i === 0 ? "M" : "L"}${tx(s.year)} ${ty(s.drpValue)}`).join(" ") + " " +
                  result.snapshots.slice().reverse().map(s => `L${tx(s.year)} ${ty(s.cashTotalWealth)}`).join(" ") + " Z";
                const yStep = maxV / 4;
                const xStep = Math.max(1, Math.ceil(years / 5));
                return (
                  <svg
                    viewBox={`0 0 ${CW} ${CH}`}
                    className="w-full h-auto"
                    role="img"
                    aria-label="Line chart showing DRP versus cash portfolio value over time"
                  >
                    {/* Shaded advantage area */}
                    <path d={areaPath} fill="rgb(139,92,246)" fillOpacity="0.08" />
                    {/* Y-axis grid lines + labels */}
                    {[0, 1, 2, 3, 4].map(i => {
                      const v = yStep * i;
                      const y = ty(v);
                      return (
                        <g key={i}>
                          <line x1={PL} y1={y} x2={CW - PR} y2={y} stroke="#e2e8f0" strokeWidth={0.5} />
                          <text x={PL - 4} y={y + 3.5} fontSize={8} textAnchor="end" fill="#94a3b8">
                            {v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}m`
                              : v >= 1000 ? `$${(v / 1000).toFixed(0)}k`
                              : `$${v.toFixed(0)}`}
                          </text>
                        </g>
                      );
                    })}
                    {/* X-axis ticks */}
                    {Array.from({ length: Math.floor(years / xStep) + 1 }, (_, i) => {
                      const yr = i * xStep;
                      if (yr > years) return null;
                      return (
                        <text key={yr} x={tx(yr)} y={CH - 4} fontSize={8} textAnchor="middle" fill="#94a3b8">
                          {yr === 0 ? "Now" : `Yr ${yr}`}
                        </text>
                      );
                    })}
                    {/* Cash line */}
                    <polyline points={cashPts} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeLinejoin="round" />
                    {/* DRP line */}
                    <polyline points={drpPts} fill="none" stroke="#7c3aed" strokeWidth={2} strokeLinejoin="round" />
                    {/* End-point labels */}
                    {result.snapshots.length > 0 && (() => {
                      const last = result.snapshots[result.snapshots.length - 1]!;
                      return (
                        <>
                          <text x={tx(last.year) - 4} y={ty(last.drpValue) - 5} fontSize={8} textAnchor="end" fill="#7c3aed" fontWeight="700">{fmt(last.drpValue)}</text>
                          <text x={tx(last.year) - 4} y={ty(last.cashTotalWealth) + 12} fontSize={8} textAnchor="end" fill="#64748b">{fmt(last.cashTotalWealth)}</text>
                        </>
                      );
                    })()}
                  </svg>
                );
              })()}
            </div>

            {/* Year-by-year breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Portfolio Value Over Time</p>
              <div className="space-y-2.5">
                {result.snapshots.filter((_, i) => i % Math.max(1, Math.floor(result.snapshots.length / 8)) === 0 || i === result.snapshots.length - 1).map((s) => (
                  <div key={s.year}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Year {s.year}</span>
                      <div className="flex gap-3">
                        <span className="text-violet-600 font-medium">{fmt(s.drpValue)}</span>
                        <span className="text-slate-500">{fmt(s.cashValue)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-100">
                      <div className="h-full bg-violet-500 rounded-l-full transition-all duration-500" style={{ width: `${(s.drpValue / maxValue) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Summary</p>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Initial portfolio value</span>
                  <span className="font-semibold text-slate-800">{fmt(result.initialValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total dividends generated (DRP)</span>
                  <span className="font-semibold text-slate-800">{fmt(result.totalDividendsReceived)}</span>
                </div>
                <div className="flex justify-between text-violet-600">
                  <span>Final DRP portfolio value</span>
                  <span className="font-bold">{fmt(result.finalDrpValue)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Cash dividend scenario (shares + cash)</span>
                  <span className="font-semibold">{fmt(result.finalCashValue)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 text-emerald-600">
                  <span className="font-bold">DRP advantage</span>
                  <span className="font-extrabold">+{fmt(result.drpAdvantage)}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-slate-900 mb-1">Find a platform that supports DRP</p>
              <p className="text-xs text-slate-600 mb-3">
                Not all Australian brokers offer dividend reinvestment plans. Compare platforms to find the best fit for your DRP strategy.
              </p>
              <Link
                href="/compare"
                className="inline-block px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors"
              >
                Compare Platforms →
              </Link>
            </div>
          </div>
        </div>

        <CalculatorLeadCapture
          calcSlug="dividend-reinvestment-calculator"
          calcTitle="DRP projection"
          need="wealth"
          contextKeys={["dividend-reinvestment", "drp"]}
        />

        <p className="text-[0.65rem] text-slate-400 mt-8 leading-relaxed">
          This calculator provides general information only and does not constitute financial advice. Projections assume constant dividend yield and share price growth, which will vary in practice. Dividends received via DRP are still assessable income in Australia. Always verify your tax position with a registered tax agent.
        </p>
      </div>
    </div>
  );
}
