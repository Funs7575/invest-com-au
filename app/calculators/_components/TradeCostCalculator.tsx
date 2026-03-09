"use client";

import { useState, useMemo } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, AFFILIATE_REL } from "@/lib/tracking";
import { getParam, useUrlSync, AnimatedNumber, ShareResultsButton } from "./CalcShared";

interface Props {
  brokers: Broker[];
  searchParams: URLSearchParams;
}

export default function TradeCostCalculator({ brokers, searchParams }: Props) {
  const [tradeAmount, setTradeAmount] = useState(() => getParam(searchParams, "tc_amt") || "5000");
  const [market, setMarket] = useState<"asx" | "us">(() => (getParam(searchParams, "tc_mkt") === "us" ? "us" : "asx"));

  useUrlSync({ calc: "trade-cost", tc_amt: tradeAmount, tc_mkt: market });

  const amount = parseFloat(tradeAmount) || 0;

  const results = useMemo(() => {
    return brokers
      .map((b) => {
        if (market === "asx") {
          const brokerage = b.asx_fee_value ?? null;
          if (brokerage === null || brokerage >= 999) return null;
          return { broker: b, brokerage, fxCost: 0, totalCost: brokerage, pctOfTrade: amount > 0 ? (brokerage / amount) * 100 : 0 };
        } else {
          const brokerage = b.us_fee_value ?? null;
          if (brokerage === null || brokerage >= 999) return null;
          const fxCost = amount * ((b.fx_rate ?? 0) / 100);
          const total = brokerage + fxCost;
          return { broker: b, brokerage, fxCost, totalCost: total, pctOfTrade: amount > 0 ? (total / amount) * 100 : 0 };
        }
      })
      .filter(Boolean)
      .sort((a, b) => a!.totalCost - b!.totalCost) as { broker: Broker; brokerage: number; fxCost: number; totalCost: number; pctOfTrade: number }[];
  }, [brokers, market, amount]);

  const cheapest = results[0]?.totalCost ?? 0;
  const mostExpensive = results[results.length - 1]?.totalCost ?? 1;

  return (
    <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 p-3.5 md:p-8">
      <h2 className="text-base md:text-2xl font-bold mb-0.5 md:mb-1">Trade Cost Calculator</h2>
      <p className="text-[0.69rem] md:text-sm text-slate-500 mb-3 md:mb-6">
        What each platform charges — including hidden FX fees on US trades.
      </p>

      {/* Inputs */}
      <div className="flex gap-2.5 md:gap-4 mb-3 md:mb-6">
        <div className="flex-1">
          <label className="block text-[0.69rem] md:text-xs font-semibold text-slate-600 mb-1">Amount (AUD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
            <input
              type="number"
              value={tradeAmount}
              onChange={(e) => setTradeAmount(e.target.value)}
              className="w-full pl-7 pr-3 py-2 md:py-3 border border-slate-200 rounded-lg text-sm md:text-lg font-semibold focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
              min={0}
              step={500}
              aria-label="Trade amount in AUD"
            />
          </div>
        </div>
        <div>
          <label className="block text-[0.69rem] md:text-xs font-semibold text-slate-600 mb-1">Market</label>
          <div className="flex gap-1">
            <button
              onClick={() => setMarket("asx")}
              className={`px-3 py-2 md:px-5 md:py-3 rounded-lg text-xs md:text-sm font-semibold transition-colors ${
                market === "asx" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              ASX
            </button>
            <button
              onClick={() => setMarket("us")}
              className={`px-3 py-2 md:px-5 md:py-3 rounded-lg text-xs md:text-sm font-semibold transition-colors ${
                market === "us" ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              US
            </button>
          </div>
        </div>
      </div>

      {/* Quick amount buttons */}
      <div className="flex gap-1 md:gap-2 overflow-x-auto scrollbar-hide -mx-3.5 px-3.5 md:-mx-0 md:px-0 md:flex-wrap mb-3 md:mb-6 pb-1 md:pb-0">
        {["500", "1000", "2000", "5000", "10000", "25000"].map((v) => (
          <button
            key={v}
            onClick={() => setTradeAmount(v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shrink-0 ${
              tradeAmount === v ? "bg-slate-100 text-slate-700 border border-slate-300" : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            ${parseInt(v).toLocaleString()}
          </button>
        ))}
      </div>

      {/* Results — mobile cards / desktop table */}
      {results.length > 0 ? (
        <>
          {/* Mobile: compact card layout */}
          <div className="md:hidden space-y-1.5">
            {results.map((r) => {
              const barWidth = mostExpensive > 0 ? Math.max((r.totalCost / mostExpensive) * 100, 2) : 0;
              const isCheapest = r.totalCost === cheapest;
              return (
                <div key={r.broker.slug} className={`rounded-lg border p-2.5 ${isCheapest ? "bg-emerald-50/60 border-emerald-200" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-slate-900">{r.broker.name}</span>
                      {isCheapest && <span className="text-[0.56rem] font-bold text-emerald-600 uppercase">Cheapest</span>}
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      <AnimatedNumber value={r.totalCost} />
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
                      <span>${r.brokerage.toFixed(2)}</span>
                      {market === "us" && <span>FX ${r.fxCost.toFixed(2)}</span>}
                      <span>{r.pctOfTrade.toFixed(2)}%</span>
                    </div>
                    <a
                      href={getAffiliateLink(r.broker)}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      onClick={() => trackClick(r.broker.slug, r.broker.name, "calculator-trade-cost", "/calculators", "cta")}
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

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 pb-2 pr-4">Broker</th>
                  <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2">Brokerage</th>
                  {market === "us" && <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2">FX Cost</th>}
                  <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2">Total Cost</th>
                  <th className="text-right text-xs font-semibold text-slate-500 pb-2 px-2">% of Trade</th>
                  <th className="text-left text-xs font-semibold text-slate-500 pb-2 pl-4">Cost Bar</th>
                  <th className="text-right text-xs font-semibold text-slate-500 pb-2 pl-2"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r) => {
                  const barWidth = mostExpensive > 0 ? Math.max((r.totalCost / mostExpensive) * 100, 2) : 0;
                  const isCheapest = r.totalCost === cheapest;
                  return (
                    <tr key={r.broker.slug} className={isCheapest ? "bg-emerald-50/60" : ""}>
                      <td className="py-3 pr-4">
                        <span className="font-semibold text-sm">{r.broker.name}</span>
                        {isCheapest && <span className="ml-2 text-[0.69rem] font-bold text-emerald-600 uppercase">Cheapest</span>}
                      </td>
                      <td className="py-3 px-2 text-right text-sm font-mono">
                        <AnimatedNumber value={r.brokerage} />
                      </td>
                      {market === "us" && (
                        <td className="py-3 px-2 text-right text-sm font-mono text-slate-500">
                          <AnimatedNumber value={r.fxCost} />
                        </td>
                      )}
                      <td className="py-3 px-2 text-right text-sm font-mono font-bold">
                        <AnimatedNumber value={r.totalCost} />
                      </td>
                      <td className="py-3 px-2 text-right text-xs text-slate-500">
                        <AnimatedNumber value={r.pctOfTrade} prefix="" />%
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
                          onClick={() => trackClick(r.broker.slug, r.broker.name, "calculator-trade-cost", "/calculators", "cta")}
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
        <p className="text-center py-6 md:py-8 text-slate-500 text-sm">No platforms support {market === "asx" ? "ASX" : "US"} trading.</p>
      )}

      {/* Savings callout */}
      {results.length >= 2 && (
        <div className="mt-4 md:mt-6 bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 text-center motion-safe:animate-[fadeIn_0.4s_ease-out]">
          <p className="text-xs md:text-sm text-slate-800">
            <strong>Savings:</strong> Cheapest platform saves{" "}
            <strong className="text-slate-700">
              <AnimatedNumber value={results[results.length - 1].totalCost - results[0].totalCost} />
            </strong>{" "}
            per {market === "asx" ? "ASX" : "US"} trade vs. the most expensive.
          </p>
        </div>
      )}

      <ShareResultsButton />
    </div>
  );
}
