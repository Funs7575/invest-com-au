"use client";

import { useState, useMemo } from "react";
import {
  getParam, useUrlSync, AnimatedNumber, ShareResultsButton,
  CalcSection, InputField,
} from "./CalcShared";

interface Props {
  searchParams: URLSearchParams;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}
function fmtShares(n: number) {
  return n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DividendReinvestmentCalculator({ searchParams }: Props) {
  const [price, setPrice] = useState(() => getParam(searchParams, "drp_p") || "50");
  const [shares, setShares] = useState(() => getParam(searchParams, "drp_s") || "1000");
  const [divYield, setDivYield] = useState(() => getParam(searchParams, "drp_y") || "4");
  const [growth, setGrowth] = useState(() => getParam(searchParams, "drp_g") || "6");
  const [years, setYears] = useState(() => getParam(searchParams, "drp_t") || "20");
  const [reinvest, setReinvest] = useState(true);

  useUrlSync({ calc: "dividend-reinvestment", drp_p: price, drp_s: shares, drp_y: divYield, drp_g: growth, drp_t: years });

  const result = useMemo(() => {
    const P = parseFloat(price) || 0;
    const S = parseFloat(shares) || 0;
    const dy = (parseFloat(divYield) || 0) / 100;
    const gr = (parseFloat(growth) || 0) / 100;
    const T = Math.round(parseFloat(years) || 0);

    let currentShares = S;
    let currentPrice = P;
    let totalDividendsReceived = 0;
    let totalDividendsReinvested = 0;

    const snapshots: { year: number; shares: number; price: number; value: number; cumDiv: number }[] = [];
    snapshots.push({ year: 0, shares: currentShares, price: currentPrice, value: currentShares * currentPrice, cumDiv: 0 });

    for (let y = 1; y <= T; y++) {
      currentPrice = currentPrice * (1 + gr);
      const annualDividend = currentShares * currentPrice * dy;
      totalDividendsReceived += annualDividend;

      if (reinvest) {
        const newShares = annualDividend / currentPrice;
        currentShares += newShares;
        totalDividendsReinvested += annualDividend;
      }

      snapshots.push({
        year: y,
        shares: currentShares,
        price: currentPrice,
        value: currentShares * currentPrice,
        cumDiv: totalDividendsReceived,
      });
    }

    const finalValue = currentShares * currentPrice;
    const initialValue = S * P;
    const totalReturn = finalValue + (reinvest ? 0 : totalDividendsReceived) - initialValue;

    return {
      finalShares: currentShares,
      finalPrice: currentPrice,
      finalValue,
      initialValue,
      totalDividendsReceived,
      totalDividendsReinvested,
      totalReturn,
      snapshots,
    };
  }, [price, shares, divYield, growth, years, reinvest]);

  const showResults = (parseFloat(shares) || 0) > 0 && (parseFloat(price) || 0) > 0;
  const maxValue = result.snapshots[result.snapshots.length - 1]?.value || 1;

  return (
    <CalcSection
      id="dividend-reinvestment"
      iconName="rotate-ccw"
      title="Dividend Reinvestment Calculator"
      desc="See how reinvesting dividends (DRP) accelerates portfolio growth through compounding."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-4 space-y-4">
          <InputField label="Share Price" value={price} onChange={setPrice} prefix="$" placeholder="50" />
          <InputField label="Number of Shares" value={shares} onChange={setShares} placeholder="1000" />
          <InputField label="Dividend Yield (p.a.)" value={divYield} onChange={setDivYield} suffix="%" placeholder="4" />
          <InputField label="Share Price Growth (p.a.)" value={growth} onChange={setGrowth} suffix="%" placeholder="6" />
          <InputField label="Investment Period (years)" value={years} onChange={setYears} placeholder="20" />
          <div>
            <label className="block text-[0.69rem] md:text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Reinvest Dividends?</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[{ label: "Yes (DRP)", val: true }, { label: "No (Cash)", val: false }].map((o) => (
                <button
                  key={String(o.val)}
                  onClick={() => setReinvest(o.val)}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                    reinvest === o.val ? "bg-brand text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-8">
          {showResults ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm h-full">
              {/* Hero */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-slate-100 gap-3">
                <div>
                  <span className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-400">Final Portfolio Value</span>
                  <div className="text-3xl md:text-4xl font-extrabold text-brand tracking-tight mt-0.5">
                    <AnimatedNumber value={result.finalValue} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="block text-[0.69rem] font-bold uppercase text-slate-400">Shares</span>
                    <span className="text-lg font-bold text-slate-700">{fmtShares(result.finalShares)}</span>
                  </div>
                  <div>
                    <span className="block text-[0.69rem] font-bold uppercase text-slate-400">Dividends</span>
                    <span className="text-lg font-bold text-emerald-600">{fmt(result.totalDividendsReceived)}</span>
                  </div>
                </div>
              </div>

              {/* Growth chart */}
              <div className="space-y-1.5">
                <p className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-400 mb-2">Portfolio Growth</p>
                {result.snapshots.filter((_, i) => i % Math.max(1, Math.floor(result.snapshots.length / 8)) === 0 || i === result.snapshots.length - 1).map((s) => (
                  <div key={s.year}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-500">Year {s.year}</span>
                      <span className="font-semibold text-slate-700">{fmt(s.value)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-all duration-500"
                        style={{ width: `${(s.value / maxValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="font-semibold text-slate-700">Initial investment</p>
                  <p>{fmt(result.initialValue)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-2.5">
                  <p className="font-semibold text-emerald-700">Total return</p>
                  <p className="text-emerald-600 font-bold">{fmt(result.totalReturn + (reinvest ? 0 : result.totalDividendsReceived))}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 md:p-12 text-center h-full flex flex-col items-center justify-center">
              <p className="text-slate-400 text-sm">Enter your share details to see dividend reinvestment projections.</p>
            </div>
          )}
        </div>
      </div>
      <ShareResultsButton />
    </CalcSection>
  );
}
