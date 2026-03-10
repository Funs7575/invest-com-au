"use client";

import { useState, useEffect } from "react";
import type { Broker } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { trackClick, trackEvent, getAffiliateLink, getBenefitCta } from "@/lib/tracking";
import Icon from "@/components/Icon";
import {
  getParam, useUrlSync, AnimatedNumber, ShareResultsButton,
  CalcSection, InputField, SelectField, ResultBox, TRANSFER_FEE,
} from "./CalcShared";

interface Props {
  brokers: Broker[];
  searchParams: URLSearchParams;
}

export default function SwitchingCostCalculator({ brokers, searchParams }: Props) {
  const [currentSlug, setCurrentSlug] = useState(() => getParam(searchParams, "sw_cur") || "");
  const [newSlug, setNewSlug] = useState(() => getParam(searchParams, "sw_new") || "");
  const [tradesPerMonth, setTradesPerMonth] = useState(() => getParam(searchParams, "sw_tpm") || "4");
  const [portfolioValue, setPortfolioValue] = useState(() => getParam(searchParams, "sw_pv") || "");

  useUrlSync({ calc: "switching", sw_cur: currentSlug, sw_new: newSlug, sw_tpm: tradesPerMonth, sw_pv: portfolioValue });

  // Track calculator usage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentSlug || newSlug || tradesPerMonth !== "4" || portfolioValue) {
        trackEvent('calculator_use', { calc_type: 'switching', current_broker: currentSlug, new_broker: newSlug, trades_per_month: tradesPerMonth }, '/calculators');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [currentSlug, newSlug, tradesPerMonth, portfolioValue]);

  const currentBroker = brokers.find((b) => b.slug === currentSlug);
  const newBroker = brokers.find((b) => b.slug === newSlug);
  const tpm = parseFloat(tradesPerMonth) || 0;

  const currentMonthly = (currentBroker?.asx_fee_value ?? 0) * tpm;
  const newMonthly = (newBroker?.asx_fee_value ?? 0) * tpm;
  const monthlySavings = currentMonthly - newMonthly;
  const annualSavings = monthlySavings * 12;
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(TRANSFER_FEE / monthlySavings) : null;
  const fiveYearNet = annualSavings * 5 - TRANSFER_FEE;

  const cheaperBroker = monthlySavings > 0 ? newBroker : monthlySavings < 0 ? currentBroker : null;
  const showResults = currentBroker && newBroker && currentSlug !== newSlug && tpm > 0;

  return (
    <CalcSection
      id="switching"
      iconName="arrow-right-left"
      title="Switching Cost Simulator"
      desc="See if switching platforms is worth it after factoring in the $54 CHESS transfer fee."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField label="Current Platform" value={currentSlug} onChange={setCurrentSlug} placeholder="Select platform...">
              {brokers.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name} ({b.asx_fee || "N/A"}/trade)</option>
              ))}
            </SelectField>
            <SelectField label="New Platform" value={newSlug} onChange={setNewSlug} placeholder="Select platform...">
              {brokers.map((b) => (
                <option key={b.slug} value={b.slug}>{b.name} ({b.asx_fee || "N/A"}/trade)</option>
              ))}
            </SelectField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Trades per Month" value={tradesPerMonth} onChange={setTradesPerMonth} placeholder="4" />
            <InputField label="Portfolio Value" value={portfolioValue} onChange={setPortfolioValue} placeholder="50000" prefix="$" />
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-7">
          {showResults ? (
            <div className="h-full space-y-4">
              {/* Hero savings */}
              <div className={`rounded-xl p-6 text-center border ${
                annualSavings > 0 ? "bg-emerald-50 border-emerald-200" : annualSavings < 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
              }`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${annualSavings > 0 ? "text-emerald-700" : annualSavings < 0 ? "text-red-600" : "text-slate-500"}`}>
                  {annualSavings > 0 ? "Projected Annual Savings" : annualSavings < 0 ? "You\u2019d Pay More" : "No Difference"}
                </span>
                <div className={`text-3xl md:text-5xl font-extrabold tracking-tight mt-1 ${
                  annualSavings > 0 ? "text-emerald-800" : annualSavings < 0 ? "text-red-600" : "text-slate-700"
                }`}>
                  <AnimatedNumber value={Math.abs(annualSavings)} /><span className="text-xl md:text-2xl font-bold text-slate-400">/yr</span>
                </div>
                {breakEvenMonths != null && (
                  <p className="text-sm text-slate-600 mt-2">
                    Break even on the ${TRANSFER_FEE} transfer fee in <strong>{breakEvenMonths} month{breakEvenMonths !== 1 ? "s" : ""}</strong>
                  </p>
                )}
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ResultBox label="Monthly" value={formatCurrency(monthlySavings)} positive={monthlySavings > 0} negative={monthlySavings < 0} />
                <ResultBox label="Switch Cost" value={formatCurrency(TRANSFER_FEE)} />
                <ResultBox label="Break-Even" value={breakEvenMonths != null ? `${breakEvenMonths} mo` : "N/A"} />
                <ResultBox label="5-Year Net" value={formatCurrency(fiveYearNet)} positive={fiveYearNet > 0} negative={fiveYearNet < 0} />
              </div>

              {/* CTA */}
              {cheaperBroker && (
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4">
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-semibold text-slate-900">{cheaperBroker.name} is the cheaper option.</p>
                    <p className="text-xs text-slate-600 mt-0.5">Save {formatCurrency(Math.abs(annualSavings))}/year on brokerage fees.</p>
                  </div>
                  <a
                    href={getAffiliateLink(cheaperBroker)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackClick(cheaperBroker.slug, cheaperBroker.name, "calculator-switching", "/calculators", "cta")}
                    className="w-full md:w-auto text-center px-5 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors text-sm whitespace-nowrap"
                  >
                    {getBenefitCta(cheaperBroker, "calculator")}
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 md:p-12 text-center h-full flex flex-col items-center justify-center">
              <Icon name="scale" size={32} className="text-slate-300 mx-auto mb-3 md:mb-4 md:!w-12 md:!h-12" />
              <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1">Compare Two Platforms</h3>
              <p className="text-xs md:text-sm text-slate-500 max-w-xs">Select your current and target platform to see the cost analysis.</p>
            </div>
          )}
        </div>
      </div>
      <ShareResultsButton />
    </CalcSection>
  );
}
