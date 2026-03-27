"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

const MORTGAGE_RATE = 0.065; // 6.5% assumption

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export default function PropertyVsSharesClient() {
  const [deposit, setDeposit] = useState(150_000);
  const [propertyValue, setPropertyValue] = useState(750_000);
  const [propertyGrowth, setPropertyGrowth] = useState(5);
  const [rentalYield, setRentalYield] = useState(3.5);
  const [holdingCosts, setHoldingCosts] = useState(1.5);
  const [sharesReturn, setSharesReturn] = useState(9);
  const [years, setYears] = useState(10);

  const result = useMemo(() => {
    const dep = deposit;
    const propVal = propertyValue;
    const pg = propertyGrowth / 100;
    const ry = rentalYield / 100;
    const hc = holdingCosts / 100;
    const sr = sharesReturn / 100;
    const T = Math.round(years);

    const loanAmount = Math.max(0, propVal - dep);
    const monthlyRate = MORTGAGE_RATE / 12;
    const numPayments = 360; // 30-year loan
    const monthlyMortgage = loanAmount > 0 && monthlyRate > 0
      ? (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -numPayments))
      : 0;
    const annualMortgage = monthlyMortgage * 12;

    let propCurrentValue = propVal;
    let totalNetRentalIncome = 0;
    let totalMortgagePaid = 0;
    let outstandingLoan = loanAmount;
    const propSnapshots: { year: number; equity: number; propValue: number }[] = [];
    propSnapshots.push({ year: 0, equity: dep, propValue: propVal });

    for (let y = 1; y <= T; y++) {
      propCurrentValue *= (1 + pg);
      const grossRental = propCurrentValue * ry;
      const annualHoldingCost = propCurrentValue * hc;
      const interestPortion = outstandingLoan * MORTGAGE_RATE;
      const principalPortion = Math.max(0, annualMortgage - interestPortion);
      outstandingLoan = Math.max(0, outstandingLoan - principalPortion);
      const netRental = grossRental - annualHoldingCost - interestPortion;
      totalNetRentalIncome += netRental;
      totalMortgagePaid += annualMortgage;
      const equity = propCurrentValue - outstandingLoan;
      propSnapshots.push({ year: y, equity, propValue: propCurrentValue });
    }

    const finalEquity = propCurrentValue - outstandingLoan;
    const propertyTotalReturn = finalEquity + totalNetRentalIncome - dep;
    const propertyROI = dep > 0 ? (propertyTotalReturn / dep) * 100 : 0;
    const lvr = propVal > 0 ? ((propVal - dep) / propVal) * 100 : 0;

    // Shares (unleveraged, invest deposit)
    let sharesPortfolio = dep;
    const sharesSnapshots: { year: number; value: number }[] = [{ year: 0, value: dep }];
    for (let y = 1; y <= T; y++) {
      sharesPortfolio *= (1 + sr);
      sharesSnapshots.push({ year: y, value: sharesPortfolio });
    }
    const sharesTotalReturn = sharesPortfolio - dep;
    const sharesROI = dep > 0 ? (sharesTotalReturn / dep) * 100 : 0;

    const winner = propertyTotalReturn > sharesTotalReturn ? "property" : "shares";
    const margin = Math.abs(propertyTotalReturn - sharesTotalReturn);

    return {
      finalEquity,
      propertyFinalValue: propCurrentValue,
      propertyTotalReturn,
      propertyROI,
      totalNetRentalIncome,
      totalMortgagePaid,
      finalSharesValue: sharesPortfolio,
      sharesTotalReturn,
      sharesROI,
      winner,
      margin,
      lvr,
      propSnapshots,
      sharesSnapshots,
    };
  }, [deposit, propertyValue, propertyGrowth, rentalYield, holdingCosts, sharesReturn, years]);

  const maxValue = Math.max(result.finalEquity, result.finalSharesValue, 1);

  return (
    <div className="py-10 md:py-16">
      <div className="container-custom max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Free Calculator</p>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">
            Property vs Shares Calculator
          </h1>
          <p className="text-slate-500 text-sm md:text-base leading-relaxed">
            Compare leveraged property returns (capital growth + rental income) against an equivalent
            unleveraged shares portfolio over your chosen time frame. Assumes a {(MORTGAGE_RATE * 100).toFixed(1)}% mortgage rate.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          {/* Inputs */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <h2 className="font-bold text-slate-900">Your Scenario</h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Deposit / cash to invest
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={1000}
                    step={5000}
                    value={deposit}
                    onChange={(e) => setDeposit(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <p className="text-[0.69rem] font-bold uppercase tracking-wider text-blue-600 pt-1">🏠 Property</p>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Purchase price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={0}
                    step={25000}
                    value={propertyValue}
                    onChange={(e) => setPropertyValue(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <p className="text-[0.68rem] text-slate-400 mt-1">
                  LVR: {result.lvr.toFixed(0)}% · loan: {fmt(propertyValue - deposit)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Annual capital growth</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={0.5}
                    value={propertyGrowth}
                    onChange={(e) => setPropertyGrowth(Number(e.target.value))}
                    className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Gross rental yield</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={15}
                    step={0.25}
                    value={rentalYield}
                    onChange={(e) => setRentalYield(Number(e.target.value))}
                    className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Holding costs (rates, maintenance, insurance)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.25}
                    value={holdingCosts}
                    onChange={(e) => setHoldingCosts(Number(e.target.value))}
                    className="w-full pr-16 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">% of value/yr</span>
                </div>
              </div>

              <p className="text-[0.69rem] font-bold uppercase tracking-wider text-emerald-600 pt-1">📈 Shares</p>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Expected annual return
                  <span className="text-slate-400 font-normal ml-1">dividends + growth</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    value={sharesReturn}
                    onChange={(e) => setSharesReturn(Number(e.target.value))}
                    className="w-full pr-8 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Time period</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={40}
                    step={1}
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                    className="w-full pr-12 pl-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">yrs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-4">
            {/* Winner banner */}
            <div className={`rounded-2xl p-4 flex items-center gap-3 border ${
              result.winner === "property"
                ? "bg-blue-50 border-blue-200"
                : "bg-emerald-50 border-emerald-200"
            }`}>
              <span className="text-2xl">{result.winner === "property" ? "🏠" : "📈"}</span>
              <div>
                <p className={`text-sm font-bold ${result.winner === "property" ? "text-blue-800" : "text-emerald-800"}`}>
                  {result.winner === "property" ? "Property" : "Shares"} wins after {years} years
                </p>
                <p className={`text-xs ${result.winner === "property" ? "text-blue-600" : "text-emerald-600"}`}>
                  By {fmt(result.margin)} on total return
                  {result.winner === "property" ? " (includes leverage)" : ""}
                </p>
              </div>
            </div>

            {/* Side-by-side */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`bg-white rounded-2xl p-5 border ${result.winner === "property" ? "border-blue-300 shadow-md" : "border-slate-200"}`}>
                <p className="text-xs font-bold text-blue-700 mb-3">🏠 Property</p>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Property value</span>
                    <span className="font-semibold">{fmt(result.propertyFinalValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outstanding loan</span>
                    <span className="font-semibold text-red-500">−{fmt(result.propertyFinalValue - result.finalEquity)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5">
                    <span className="font-bold">Net equity</span>
                    <span className="font-extrabold text-slate-900">{fmt(result.finalEquity)}</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span>Net rental income</span>
                    <span className={`font-semibold ${result.totalNetRentalIncome < 0 ? "text-red-500" : ""}`}>
                      {fmt(result.totalNetRentalIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5">
                    <span className="font-bold">Total return</span>
                    <span className="font-extrabold text-blue-700">{fmt(result.propertyTotalReturn)}</span>
                  </div>
                  <div className="text-center mt-2">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[0.65rem] ${result.propertyROI >= 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                      {fmtPct(result.propertyROI)} ROI on deposit
                    </span>
                  </div>
                </div>
              </div>

              <div className={`bg-white rounded-2xl p-5 border ${result.winner === "shares" ? "border-emerald-300 shadow-md" : "border-slate-200"}`}>
                <p className="text-xs font-bold text-emerald-700 mb-3">📈 Shares</p>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Portfolio value</span>
                    <span className="font-extrabold text-slate-900">{fmt(result.finalSharesValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Initial investment</span>
                    <span className="font-semibold">{fmt(deposit)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1.5">
                    <span className="font-bold">Total return</span>
                    <span className="font-extrabold text-emerald-700">{fmt(result.sharesTotalReturn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>No leverage</span>
                    <span className="text-slate-400">unleveraged</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Liquidity</span>
                    <span className="text-emerald-600 font-semibold">High</span>
                  </div>
                  <div className="text-center mt-2">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[0.65rem] ${result.sharesROI >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {fmtPct(result.sharesROI)} ROI
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Equity chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">Equity / Portfolio Over Time</p>
              <div className="space-y-2.5">
                {result.propSnapshots.filter((_, i) => i % Math.max(1, Math.floor(result.propSnapshots.length / 7)) === 0 || i === result.propSnapshots.length - 1).map((s) => {
                  const sharesSnap = result.sharesSnapshots.find(ss => ss.year === s.year);
                  return (
                    <div key={s.year}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Year {s.year}</span>
                        <div className="flex gap-3">
                          <span className="text-blue-600">{fmt(s.equity)}</span>
                          <span className="text-emerald-600">{sharesSnap ? fmt(sharesSnap.value) : ""}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div className="flex-1 bg-slate-100 rounded-l-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(s.equity / maxValue) * 100}%` }} />
                        </div>
                        <div className="flex-1 bg-slate-100 rounded-r-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${sharesSnap ? (sharesSnap.value / maxValue) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Property equity</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Shares portfolio</span>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-slate-900 mb-1">Not sure which path is right for you?</p>
              <p className="text-xs text-slate-600 mb-3">
                A financial adviser can model the tax impact of negative gearing, franking credits and CGT discount
                for your specific situation and risk profile.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Link
                  href="/advisors/financial-planners"
                  className="inline-block px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 transition-colors"
                >
                  Find an Adviser →
                </Link>
                <Link
                  href="/compare"
                  className="inline-block px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Compare Platforms →
                </Link>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[0.65rem] text-slate-400 mt-8 leading-relaxed">
          This calculator provides general information only and does not constitute financial or property investment advice. Assumes a {(MORTGAGE_RATE * 100).toFixed(1)}% interest rate on a 30-year principal and interest loan. Property figures do not include stamp duty, conveyancing, property management fees or depreciation. Returns are not guaranteed. Always obtain independent advice before making investment decisions.
        </p>
      </div>
    </div>
  );
}
