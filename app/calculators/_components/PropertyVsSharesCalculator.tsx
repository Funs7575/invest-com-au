"use client";

import { useState, useMemo } from "react";
import {
  getParam, useUrlSync, ShareResultsButton,
  CalcSection, InputField,
} from "./CalcShared";

interface Props {
  searchParams: URLSearchParams;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}
function fmtPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export default function PropertyVsSharesCalculator({ searchParams }: Props) {
  const [deposit, setDeposit] = useState(() => getParam(searchParams, "pvs_d") || "100000");
  const [propertyValue, setPropertyValue] = useState(() => getParam(searchParams, "pvs_pv") || "700000");
  const [propertyGrowth, setPropertyGrowth] = useState(() => getParam(searchParams, "pvs_pg") || "5");
  const [rentalYield, setRentalYield] = useState(() => getParam(searchParams, "pvs_ry") || "3.5");
  const [holdingCosts, setHoldingCosts] = useState(() => getParam(searchParams, "pvs_hc") || "2");
  const [sharesReturn, setSharesReturn] = useState(() => getParam(searchParams, "pvs_sr") || "9");
  const [years, setYears] = useState(() => getParam(searchParams, "pvs_t") || "10");

  useUrlSync({
    calc: "property-vs-shares",
    pvs_d: deposit,
    pvs_pv: propertyValue,
    pvs_pg: propertyGrowth,
    pvs_ry: rentalYield,
    pvs_hc: holdingCosts,
    pvs_sr: sharesReturn,
    pvs_t: years,
  });

  const result = useMemo(() => {
    const dep = parseFloat(deposit) || 0;
    const propVal = parseFloat(propertyValue) || 0;
    const pg = (parseFloat(propertyGrowth) || 0) / 100;
    const ry = (parseFloat(rentalYield) || 0) / 100;
    const hc = (parseFloat(holdingCosts) || 0) / 100;
    const sr = (parseFloat(sharesReturn) || 0) / 100;
    const T = Math.round(parseFloat(years) || 0);

    // Property (leveraged on deposit)
    const lvr = propVal > 0 ? (propVal - dep) / propVal : 0;
    const loanAmount = propVal - dep;
    const mortgageRate = 0.065; // assume ~6.5% mortgage
    const monthlyMortgage = loanAmount > 0 ? (loanAmount * (mortgageRate / 12)) / (1 - Math.pow(1 + mortgageRate / 12, -360)) : 0;
    const annualMortgage = monthlyMortgage * 12;

    let propCurrentValue = propVal;
    let totalNetRental = 0;
    const propSnapshots: { year: number; equity: number; propValue: number }[] = [];
    propSnapshots.push({ year: 0, equity: dep, propValue: propVal });

    let outstandingLoan = loanAmount;
    for (let y = 1; y <= T; y++) {
      propCurrentValue *= (1 + pg);
      const grossRental = propCurrentValue * ry;
      const interestPortion = outstandingLoan * mortgageRate;
      const principalPortion = Math.max(0, annualMortgage - interestPortion);
      outstandingLoan = Math.max(0, outstandingLoan - principalPortion);
      const netRental = grossRental - (propCurrentValue * hc) - interestPortion;
      totalNetRental += netRental;
      const equity = propCurrentValue - outstandingLoan;
      propSnapshots.push({ year: y, equity, propValue: propCurrentValue });
    }

    const finalEquity = propCurrentValue - outstandingLoan;
    const propertyTotalReturn = finalEquity + totalNetRental - dep;
    const propertyROI = dep > 0 ? (propertyTotalReturn / dep) * 100 : 0;

    // Shares (no leverage, invest deposit)
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
      totalNetRental,
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

  const showResults = (parseFloat(deposit) || 0) > 0 && (parseFloat(propertyValue) || 0) > 0;
  const maxValue = Math.max(result.finalEquity, result.finalSharesValue, 1);

  return (
    <CalcSection
      id="property-vs-shares"
      iconName="scale"
      title="Property vs Shares Calculator"
      desc="Compare leveraged property returns against a shares portfolio over your chosen time frame."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-4 space-y-4">
          <p className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-500">Property</p>
          <InputField label="Deposit / Cash to Invest" value={deposit} onChange={setDeposit} prefix="$" placeholder="100000" />
          <InputField label="Property Purchase Price" value={propertyValue} onChange={setPropertyValue} prefix="$" placeholder="700000" />
          <InputField label="Annual Capital Growth" value={propertyGrowth} onChange={setPropertyGrowth} suffix="%" placeholder="5" />
          <InputField label="Gross Rental Yield" value={rentalYield} onChange={setRentalYield} suffix="%" placeholder="3.5" />
          <InputField label="Holding Costs (rates, maintenance)" value={holdingCosts} onChange={setHoldingCosts} suffix="% of value/yr" placeholder="2" />
          <p className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-500 pt-2">Shares</p>
          <InputField label="Expected Annual Return (div + growth)" value={sharesReturn} onChange={setSharesReturn} suffix="%" placeholder="9" />
          <InputField label="Investment Period (years)" value={years} onChange={setYears} placeholder="10" />
        </div>

        {/* Results */}
        <div className="lg:col-span-8">
          {showResults ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm h-full">
              {/* Winner banner */}
              <div className={`mb-4 rounded-lg p-3 text-xs font-semibold flex items-center gap-2 ${
                result.winner === "property" ? "bg-blue-50 border border-blue-200 text-blue-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"
              }`}>
                <span className="text-base">{result.winner === "property" ? "🏠" : "📈"}</span>
                <span>
                  {result.winner === "property" ? "Property" : "Shares"} wins by {fmt(result.margin)} over {years} years
                  {result.winner === "property" && " (includes leverage)"}
                </span>
              </div>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`rounded-xl p-4 border ${result.winner === "property" ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
                  <p className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-500 mb-1">🏠 Property</p>
                  <p className="text-xl font-extrabold text-slate-900">{fmt(result.finalEquity)}</p>
                  <p className="text-xs text-slate-500">Equity after {years} yrs</p>
                  <p className="text-xs font-semibold text-blue-600 mt-1">{fmtPct(result.propertyROI)} ROI on deposit</p>
                  <p className="text-xs text-slate-400">Net rent: {fmt(result.totalNetRental)}</p>
                  <p className="text-xs text-slate-400">LVR: {(result.lvr * 100).toFixed(0)}%</p>
                </div>
                <div className={`rounded-xl p-4 border ${result.winner === "shares" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                  <p className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-500 mb-1">📈 Shares</p>
                  <p className="text-xl font-extrabold text-slate-900">{fmt(result.finalSharesValue)}</p>
                  <p className="text-xs text-slate-500">Portfolio after {years} yrs</p>
                  <p className="text-xs font-semibold text-emerald-600 mt-1">{fmtPct(result.sharesROI)} ROI</p>
                  <p className="text-xs text-slate-400">Total gain: {fmt(result.sharesTotalReturn)}</p>
                  <p className="text-xs text-slate-400">No leverage</p>
                </div>
              </div>

              {/* Equity chart */}
              <div className="space-y-1.5">
                <p className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-400 mb-2">Equity / Portfolio Over Time</p>
                {result.propSnapshots.filter((_, i) => i % Math.max(1, Math.floor(result.propSnapshots.length / 6)) === 0 || i === result.propSnapshots.length - 1).map((s) => {
                  const sharesSnap = result.sharesSnapshots.find(ss => ss.year === s.year);
                  return (
                    <div key={s.year} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Year {s.year}</span>
                        <span className="text-blue-600 font-medium">{fmt(s.equity)}</span>
                        <span className="text-emerald-600 font-medium">{sharesSnap ? fmt(sharesSnap.value) : ""}</span>
                      </div>
                      <div className="flex gap-1 h-1.5">
                        <div className="flex-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(s.equity / maxValue) * 100}%` }} />
                        </div>
                        <div className="flex-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${sharesSnap ? (sharesSnap.value / maxValue) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Property equity</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Shares portfolio</span>
                </div>
              </div>

              <p className="text-[0.65rem] text-slate-400 mt-4">
                Assumes 6.5% mortgage rate on a 30-year P&amp;I loan. Property figures use deposit as equity with leverage. Past performance is not indicative of future returns.
              </p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 md:p-12 text-center h-full flex flex-col items-center justify-center">
              <p className="text-slate-400 text-sm">Enter your deposit and property price to compare investment options.</p>
            </div>
          )}
        </div>
      </div>
      <ShareResultsButton />
    </CalcSection>
  );
}
