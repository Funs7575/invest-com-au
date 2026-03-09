"use client";

import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/tracking";
import Icon from "@/components/Icon";
import {
  getParam, useUrlSync, AnimatedNumber, ShareResultsButton,
  CalcSection, InputField, WaterfallBar, CORPORATE_TAX_RATE, TAX_BRACKETS,
} from "./CalcShared";

interface Props {
  searchParams: URLSearchParams;
}

export default function FrankingCalculator({ searchParams }: Props) {
  const [dividendYield, setDividendYield] = useState(() => getParam(searchParams, "fr_dy") || "4.5");
  const [frankingPct, setFrankingPct] = useState(() => getParam(searchParams, "fr_fp") || "100");
  const [marginalRate, setMarginalRate] = useState(() => {
    const v = parseFloat(getParam(searchParams, "fr_mr") || "");
    return isNaN(v) ? 32.5 : v;
  });

  useUrlSync({ calc: "franking", fr_dy: dividendYield, fr_fp: frankingPct, fr_mr: String(marginalRate) });

  // Track calculator usage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (dividendYield !== "4.5" || frankingPct !== "100" || marginalRate !== 32.5) {
        trackEvent('calculator_use', { calc_type: 'franking', dividend_yield: dividendYield, franking_pct: frankingPct, marginal_rate: marginalRate }, '/calculators');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [dividendYield, frankingPct, marginalRate]);

  const dy = parseFloat(dividendYield) || 0;
  const fp = (parseFloat(frankingPct) || 0) / 100;
  const mr = marginalRate / 100;

  const frankingCredit = (dy * fp * CORPORATE_TAX_RATE) / (1 - CORPORATE_TAX_RATE);
  const grossedUpYield = dy + frankingCredit;
  const taxPayable = grossedUpYield * mr;
  const netYield = grossedUpYield - taxPayable;
  const excessCredits = frankingCredit - taxPayable;
  const hasRefund = excessCredits > 0;

  const showResults = dy > 0;
  const maxBar = grossedUpYield || 1;

  return (
    <CalcSection
      id="franking"
      iconName="coins"
      title="Franking Credits Calculator"
      desc="Calculate the true after-tax value of franked dividends. Uses corporate tax rate of 30%."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-4">
          <div className="space-y-5">
            <InputField label="Dividend Yield" value={dividendYield} onChange={setDividendYield} placeholder="4.5" suffix="%" />
            <InputField label="Franking" value={frankingPct} onChange={setFrankingPct} placeholder="100" suffix="%" />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Marginal Tax Rate</label>
              <div className="grid grid-cols-5 gap-1.5">
                {TAX_BRACKETS.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setMarginalRate(rate)}
                    className={`py-2 text-sm font-semibold rounded-lg transition-all ${
                      marginalRate === rate
                        ? "bg-brand text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results visualisation */}
        <div className="lg:col-span-8">
          {showResults ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm h-full">
              {/* Hero number */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 pb-4 md:pb-5 border-b border-slate-100">
                <div>
                  <span className="text-[0.69rem] md:text-xs font-bold uppercase tracking-wider text-slate-400">Net Yield After Tax</span>
                  <div className="text-3xl md:text-4xl font-extrabold text-brand tracking-tight mt-0.5">
                    <AnimatedNumber value={netYield} prefix="" decimals={2} />%
                  </div>
                </div>
                <div className="mt-2 sm:mt-0 flex gap-4 md:gap-6">
                  <div className="text-left sm:text-right">
                    <span className="block text-[0.69rem] md:text-xs font-bold uppercase text-slate-400">Effective</span>
                    <span className="text-lg md:text-xl font-bold text-slate-700">{netYield.toFixed(2)}%</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="block text-[0.69rem] md:text-xs font-bold uppercase text-slate-400">Grossed-Up</span>
                    <span className="text-lg md:text-xl font-bold text-slate-700">{grossedUpYield.toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {/* Waterfall chart */}
              <div className="space-y-5">
                <WaterfallBar label="Cash Dividend" value={`${dy.toFixed(2)}%`} width={(dy / maxBar) * 100} color="bg-blue-500" />
                <WaterfallBar label="+ Franking Credits" value={`+${frankingCredit.toFixed(2)}%`} width={(frankingCredit / maxBar) * 100} color="bg-emerald-600" valueColor="text-emerald-600" />
                <WaterfallBar label="- Tax Payable" value={`-${taxPayable.toFixed(2)}%`} width={(taxPayable / maxBar) * 100} color="bg-red-400" valueColor="text-red-500" />
              </div>

              {/* Insight box */}
              {hasRefund && (
                <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4 flex gap-3 items-start">
                  <span className="text-emerald-600 mt-0.5 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  <p className="text-sm text-slate-900 leading-relaxed">
                    <strong>Tax Refund:</strong> Your franking credits exceed your tax liability by <strong>{excessCredits.toFixed(2)}%</strong>. You may be eligible for a tax refund on the excess.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 md:p-12 text-center h-full flex flex-col items-center justify-center">
              <Icon name="bar-chart" size={32} className="text-slate-300 mx-auto mb-3 md:mb-4 md:!w-12 md:!h-12" />
              <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1">Enter a Dividend Yield</h3>
              <p className="text-xs md:text-sm text-slate-500 max-w-xs">Type a value to see your franking credit waterfall chart.</p>
            </div>
          )}
        </div>
      </div>
      <ShareResultsButton />
    </CalcSection>
  );
}
