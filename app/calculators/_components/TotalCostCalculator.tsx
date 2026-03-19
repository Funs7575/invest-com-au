"use client";

import { useState, useMemo } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, AFFILIATE_REL } from "@/lib/tracking";
import { getParam, useUrlSync, AnimatedNumber, ShareResultsButton } from "./CalcShared";

interface Props {
  brokers: Broker[];
  searchParams: URLSearchParams;
}

export default function TotalCostCalculator({ brokers, searchParams }: Props) {
  const [asxTradesMonth, setAsxTradesMonth] = useState(() => getParam(searchParams, "tco_asx") || "4");
  const [usTradesMonth, setUsTradesMonth] = useState(() => getParam(searchParams, "tco_us") || "2");
  const [tradeAmount, setTradeAmount] = useState(() => getParam(searchParams, "tco_amt") || "2000");

  useUrlSync({ calc: "tco", tco_asx: asxTradesMonth, tco_us: usTradesMonth, tco_amt: tradeAmount });

  const asxTrades = Math.max(0, parseInt(asxTradesMonth) || 0);
  const usTrades = Math.max(0, parseInt(usTradesMonth) || 0);
  const amount = parseFloat(tradeAmount) || 0;

  const results = useMemo(() => {
    return brokers
      .map((b) => {
        const hasAsx = b.asx_fee_value != null && b.asx_fee_value < 999;
        const hasUs = b.us_fee_value != null && b.us_fee_value < 999;

        // Skip brokers that can't execute any of the requested trades
        if (asxTrades > 0 && !hasAsx) return null;
        if (usTrades > 0 && !hasUs) return null;
        if (asxTrades === 0 && usTrades === 0) return null;

        const yearlyAsxBrokerage = hasAsx ? (b.asx_fee_value ?? 0) * asxTrades * 12 : 0;
        const yearlyUsBrokerage = hasUs ? (b.us_fee_value ?? 0) * usTrades * 12 : 0;
        const yearlyFx = hasUs ? amount * ((b.fx_rate ?? 0) / 100) * usTrades * 12 : 0;
        const total = yearlyAsxBrokerage + yearlyUsBrokerage + yearlyFx;

        return {
          broker: b,
          yearlyAsxBrokerage,
          yearlyUsBrokerage,
          yearlyFx,
          total,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a!.total - b!.total) as {
        broker: Broker;
        yearlyAsxBrokerage: number;
        yearlyUsBrokerage: number;
        yearlyFx: number;
        total: number;
      }[];
  }, [brokers, asxTrades, usTrades, amount]);

  const cheapest = results[0]?.total ?? 0;
  const mostExpensive = results[results.length - 1]?.total ?? 1;
  const annualSaving = results.length >= 2 ? results[results.length - 1].total - cheapest : 0;

  return (
    <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3.5 md:p-8">
      <h2 className="text-base md:text-2xl font-bold mb-0.5 md:mb-1">Total Cost of Ownership</h2>
      <p className="text-[0.69rem] md:text-sm text-slate-500 mb-3 md:mb-6">
        Enter your trading habits and see the exact yearly cost at every platform — brokerage + FX fees combined.
      </p>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-6">
        <div>
          <label className="block text-[0.69rem] md:text-xs font-semibold text-slate-600 mb-1">
            ASX Trades / Month
          </label>
          <input
            type="number"
            value={asxTradesMonth}
            onChange={(e) => setAsxTradesMonth(e.target.value)}
            className="w-full px-3 py-2 md:py-3 border border-slate-200 rounded-lg text-sm md:text-lg font-semibold focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
            min={0}
            step={1}
            aria-label="ASX trades per month"
          />
        </div>
        <div>
          <label className="block text-[0.69rem] md:text-xs font-semibold text-slate-600 mb-1">
            US Trades / Month
          </label>
          <input
            type="number"
            value={usTradesMonth}
            onChange={(e) => setUsTradesMonth(e.target.value)}
            className="w-full px-3 py-2 md:py-3 border border-slate-200 rounded-lg text-sm md:text-lg font-semibold focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
            min={0}
            step={1}
            aria-label="US trades per month"
          />
        </div>
        <div>
          <label className="block text-[0.69rem] md:text-xs font-semibold text-slate-600 mb-1">
            Avg Trade Size (AUD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
            <input
              type="number"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(e.target.value)}
              className="w-full pl-7 pr-3 py-2 md:py-3 border border-slate-200 rounded-lg text-sm md:text-lg font-semibold focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
              min={0}
              step={500}
              aria-label="Average trade size in AUD"
            />
          </div>
        </div>
      </div>

      {/* Quick preset buttons */}
      <div className="flex gap-1.5 flex-wrap mb-3 md:mb-6">
        {[
          { label: "Casual", asx: "2", us: "1", amt: "1000" },
          { label: "Regular", asx: "4", us: "2", amt: "2000" },
          { label: "Active", asx: "8", us: "4", amt: "5000" },
          { label: "Trader", asx: "20", us: "10", amt: "10000" },
        ].map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setAsxTradesMonth(p.asx);
              setUsTradesMonth(p.us);
              setTradeAmount(p.amt);
            }}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {results.length > 0 ? (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-1.5">
            {results.map((r) => {
              const barWidth = mostExpensive > 0 ? Math.max((r.total / mostExpensive) * 100, 2) : 0;
              const isCheapest = r.total === cheapest;
              return (
                <div
                  key={r.broker.slug}
                  className={`rounded-lg border p-2.5 ${isCheapest ? "bg-emerald-50/60 border-emerald-200" : "border-slate-200"}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-slate-900">{r.broker.name}</span>
                      {isCheapest && (
                        <span className="text-[0.56rem] font-bold text-emerald-600 uppercase">Cheapest</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      <AnimatedNumber value={r.total} /> / yr
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isCheapest ? "bg-emerald-500" : "bg-amber-400"}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2 text-[0.62rem] text-slate-500">
                      {r.yearlyAsxBrokerage > 0 && <span>ASX ${r.yearlyAsxBrokerage.toFixed(0)}</span>}
                      {r.yearlyUsBrokerage > 0 && <span>US ${r.yearlyUsBrokerage.toFixed(0)}</span>}
                      {r.yearlyFx > 0 && <span>FX ${r.yearlyFx.toFixed(0)}</span>}
                    </div>
                    <a
                      href={getAffiliateLink(r.broker)}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      onClick={() => trackClick(r.broker.slug, r.broker.name, "calculator-tco", "/calculators", "cta")}
                      className={`px-2.5 py-1 text-[0.69rem] font-bold rounded-md transition-all whitespace-nowrap active:scale-[0.97] ${
                        isCheapest ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {isCheapest ? "Visit" : "Try →"}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-4">Broker</th>
                  <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2">ASX Brokerage</th>
                  <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2">US Brokerage</th>
                  <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2">FX Cost</th>
                  <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2 font-bold">Yearly Total</th>
                  <th className="text-left text-xs font-semibold text-slate-500 pb-2 pl-4">Cost Bar</th>
                  <th className="text-right text-xs font-semibold text-slate-500 pb-2 pl-2">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r) => {
                  const barWidth = mostExpensive > 0 ? Math.max((r.total / mostExpensive) * 100, 2) : 0;
                  const isCheapest = r.total === cheapest;
                  return (
                    <tr key={r.broker.slug} className={isCheapest ? "bg-emerald-50/60" : ""}>
                      <td className="py-3 pr-4">
                        <span className="font-semibold text-sm">{r.broker.name}</span>
                        {isCheapest && (
                          <span className="ml-2 text-[0.69rem] font-bold text-emerald-600 uppercase">Cheapest</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-mono text-slate-500">
                        {r.yearlyAsxBrokerage > 0 ? <AnimatedNumber value={r.yearlyAsxBrokerage} /> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-mono text-slate-500">
                        {r.yearlyUsBrokerage > 0 ? <AnimatedNumber value={r.yearlyUsBrokerage} /> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-mono text-slate-500">
                        {r.yearlyFx > 0 ? <AnimatedNumber value={r.yearlyFx} /> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-mono font-bold">
                        <AnimatedNumber value={r.total} />
                        <span className="text-[0.69rem] font-normal text-slate-400 ml-0.5">/yr</span>
                      </td>
                      <td className="py-3 pl-4 w-40">
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isCheapest ? "bg-emerald-500" : "bg-amber-400"}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <a
                          href={getAffiliateLink(r.broker)}
                          target="_blank"
                          rel={AFFILIATE_REL}
                          onClick={() => trackClick(r.broker.slug, r.broker.name, "calculator-tco", "/calculators", "cta")}
                          className={`inline-block px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 whitespace-nowrap active:scale-[0.97] ${
                            isCheapest
                              ? "bg-amber-600 text-white hover:bg-amber-700"
                              : "bg-slate-100 text-slate-700 hover:bg-amber-600 hover:text-white"
                          }`}
                        >
                          {isCheapest ? getBenefitCta(r.broker, "calculator") : "Try →"}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-center py-6 md:py-8 text-slate-500 text-sm">
          Set at least one trade per month to see results.
        </p>
      )}

      {/* Savings callout */}
      {annualSaving > 0 && (
        <div className="mt-4 md:mt-6 bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 text-center">
          <p className="text-xs md:text-sm text-slate-800">
            <strong>Potential saving:</strong> Switching to the cheapest platform could save you{" "}
            <strong className="text-emerald-700">
              <AnimatedNumber value={annualSaving} />
            </strong>{" "}
            per year. That compounds significantly over time.
          </p>
        </div>
      )}

      <ShareResultsButton />
    </div>
  );
}
