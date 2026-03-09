"use client";

import { useState, useEffect, useMemo } from "react";
import type { Broker } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { trackClick, trackEvent, getAffiliateLink, getBenefitCta, AFFILIATE_REL } from "@/lib/tracking";
import { getParam, useUrlSync, AnimatedNumber, ShareResultsButton, CalcSection } from "./CalcShared";

interface Props {
  brokers: Broker[];
  searchParams: URLSearchParams;
}

export default function FxFeeCalculator({ brokers, searchParams }: Props) {
  const [amount, setAmount] = useState(() => {
    const v = parseInt(getParam(searchParams, "fx_amt") || "", 10);
    return isNaN(v) ? 10000 : v;
  });
  const tradeAmount = amount;

  useUrlSync({ calc: "fx", fx_amt: String(amount) });

  // Track calculator usage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount !== 10000) {
        trackEvent('calculator_use', { calc_type: 'fx', trade_amount: amount }, '/calculators');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [amount]);

  const fxBrokers = useMemo(() => {
    return brokers
      .filter((b) => b.fx_rate != null && b.fx_rate > 0)
      .map((b) => ({ broker: b, rate: b.fx_rate!, fee: tradeAmount * (b.fx_rate! / 100) }))
      .sort((a, b) => a.rate - b.rate);
  }, [brokers, tradeAmount]);

  const cheapest = fxBrokers[0]?.broker.slug;
  const mostExpensive = fxBrokers[fxBrokers.length - 1]?.broker.slug;
  const maxFee = fxBrokers[fxBrokers.length - 1]?.fee || 1;
  const savings = fxBrokers.length > 1 ? fxBrokers[fxBrokers.length - 1].fee - fxBrokers[0].fee : 0;

  return (
    <CalcSection
      id="fx"
      iconName="globe"
      title="FX Fee Calculator"
      desc="See what every platform charges you in currency conversion fees on international trades."
    >
      {/* Slider + amount */}
      <div className="mb-5 md:mb-8">
        <div className="flex justify-between items-baseline mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Trade Amount</label>
          <span className="text-xl md:text-2xl font-extrabold text-brand tracking-tight">${amount.toLocaleString("en-AU")}</span>
        </div>
        <input
          type="range"
          min={1000}
          max={50000}
          step={500}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500"
          style={{
            background: `linear-gradient(to right, #10b981 ${((amount - 1000) / 49000) * 100}%, #e2e8f0 ${((amount - 1000) / 49000) * 100}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>$1,000</span>
          <span>$25,000</span>
          <span>$50,000</span>
        </div>
      </div>

      {/* Savings hero */}
      {fxBrokers.length > 1 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 text-center mb-5 md:mb-8">
          <span className="text-[0.69rem] md:text-xs font-bold uppercase tracking-wider text-slate-700">You could save</span>
          <div className="text-2xl md:text-4xl font-extrabold text-slate-800 tracking-tight mt-0.5">
            <AnimatedNumber value={savings} />
          </div>
          <p className="text-xs md:text-sm text-slate-700 mt-1">
            on a {formatCurrency(tradeAmount)} trade with <strong>{fxBrokers[0].broker.name}</strong>
          </p>
        </div>
      )}

      {/* Bar chart */}
      <div className="space-y-2 md:space-y-2.5">
        {fxBrokers.map(({ broker, rate, fee }) => {
          const isCheapest = broker.slug === cheapest;
          const isMostExpensive = broker.slug === mostExpensive;
          const barWidth = maxFee > 0 ? (fee / maxFee) * 100 : 0;

          return (
            <div key={broker.slug} className="flex items-center gap-2 md:gap-3">
              <div className="w-20 md:w-36 text-[0.69rem] md:text-xs font-semibold text-slate-600 text-right shrink-0 truncate">
                {broker.name}
              </div>
              <div className="flex-1 relative">
                <div
                  className={`h-7 md:h-9 rounded-lg transition-all duration-500 flex items-center pr-2 md:pr-3 ${
                    isCheapest ? "bg-emerald-500" : isMostExpensive ? "bg-red-400" : "bg-amber"
                  }`}
                  style={{ width: `${Math.max(barWidth, 4)}%` }}
                >
                  {barWidth > 25 && (
                    <span className="text-[0.69rem] md:text-xs font-bold text-white ml-auto">{formatCurrency(fee)}</span>
                  )}
                </div>
                {barWidth <= 25 && (
                  <span className="absolute left-[calc(4%+4px)] md:left-[calc(4%+8px)] top-1/2 -translate-y-1/2 text-[0.69rem] md:text-xs font-bold text-slate-700">
                    {formatCurrency(fee)}
                  </span>
                )}
              </div>
              <div className="w-10 md:w-14 text-right shrink-0">
                <span className={`text-[0.69rem] md:text-xs font-bold ${isCheapest ? "text-slate-800" : isMostExpensive ? "text-red-600" : "text-slate-500"}`}>
                  {rate}%
                </span>
              </div>
              <div className="hidden md:block w-20 shrink-0 text-right">
                <a
                  href={getAffiliateLink(broker)}
                  target="_blank"
                  rel={AFFILIATE_REL}
                  onClick={() => trackClick(broker.slug, broker.name, "calculator-fx", "/calculators", "cta")}
                  className={`inline-block px-2.5 py-1 text-[0.69rem] font-bold rounded-md transition-all duration-200 whitespace-nowrap active:scale-[0.97] ${
                    isCheapest
                      ? "bg-amber-600 text-white hover:bg-amber-700"
                      : "bg-slate-100 text-slate-600 hover:bg-amber-600 hover:text-white"
                  }`}
                >
                  {isCheapest ? "Try Free →" : "Try →"}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {fxBrokers.length > 0 && (
        <div className="mt-4 md:mt-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4">
          <div className="flex-1">
            <p className="text-xs md:text-sm font-semibold text-slate-900">{fxBrokers[0].broker.name} has the lowest FX fee at {fxBrokers[0].rate}%.</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Save {formatCurrency(savings)} vs most expensive on a {formatCurrency(tradeAmount)} trade.
            </p>
          </div>
          <a
            href={getAffiliateLink(fxBrokers[0].broker)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick(fxBrokers[0].broker.slug, fxBrokers[0].broker.name, "calculator-fx", "/calculators", "cta")}
            className="w-full md:w-auto text-center px-5 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors text-sm whitespace-nowrap"
          >
            {getBenefitCta(fxBrokers[0].broker, "calculator")}
          </a>
        </div>
      )}

      <ShareResultsButton />
    </CalcSection>
  );
}
