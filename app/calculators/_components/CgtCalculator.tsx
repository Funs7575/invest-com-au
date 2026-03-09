"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { trackEvent } from "@/lib/tracking";
import Icon from "@/components/Icon";
import {
  getParam, useUrlSync, AnimatedNumber, ShareResultsButton,
  CalcSection, InputField, TAX_BRACKETS,
} from "./CalcShared";

interface Props {
  searchParams: URLSearchParams;
}

export default function CgtCalculator({ searchParams }: Props) {
  const [gainAmount, setGainAmount] = useState(() => getParam(searchParams, "cg_amt") || "");
  const [marginalRate, setMarginalRate] = useState(() => {
    const v = parseFloat(getParam(searchParams, "cg_mr") || "");
    return isNaN(v) ? 32.5 : v;
  });
  const [held12Months, setHeld12Months] = useState(() => getParam(searchParams, "cg_12m") !== "0");

  useUrlSync({ calc: "cgt", cg_amt: gainAmount, cg_mr: String(marginalRate), cg_12m: held12Months ? "1" : "0" });

  // Track calculator usage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (gainAmount || marginalRate !== 32.5 || !held12Months) {
        trackEvent('calculator_use', { calc_type: 'cgt', gain_amount: gainAmount, marginal_rate: marginalRate, held_12_months: held12Months }, '/calculators');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [gainAmount, marginalRate, held12Months]);

  const gain = parseFloat(gainAmount) || 0;
  const mr = marginalRate / 100;

  const taxWithout = gain * mr;
  const effectiveWithout = gain > 0 ? (taxWithout / gain) * 100 : 0;
  const discountedGain = held12Months ? gain * 0.5 : gain;
  const taxWith = discountedGain * mr;
  const effectiveWith = gain > 0 ? (taxWith / gain) * 100 : 0;
  const taxSaved = taxWithout - taxWith;

  const showResults = gain > 0;

  return (
    <CalcSection
      id="cgt"
      iconName="calendar"
      title="CGT Estimator"
      desc="Estimate capital gains tax and see how the 50% CGT discount affects your tax bill. Not financial advice."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-4 space-y-5">
          <InputField label="Capital Gain" value={gainAmount} onChange={setGainAmount} placeholder="10000" prefix="$" />

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

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={held12Months}
              onChange={(e) => setHeld12Months(e.target.checked)}
              className="w-5 h-5 rounded border-slate-300 text-slate-700 accent-slate-700"
            />
            <span className="text-sm font-medium text-slate-700">Held &gt; 12 months (50% discount)</span>
          </label>
        </div>

        {/* Results */}
        <div className="lg:col-span-8">
          {showResults ? (
            <div className="space-y-4">
              {/* Hero savings */}
              {held12Months && taxSaved > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">CGT Discount Saves You</span>
                  <div className="text-3xl md:text-4xl font-extrabold text-emerald-800 tracking-tight mt-0.5">
                    <AnimatedNumber value={taxSaved} />
                  </div>
                  <p className="text-sm text-emerald-700 mt-1">
                    Effective rate drops from {effectiveWithout.toFixed(1)}% to <strong>{effectiveWith.toFixed(1)}%</strong>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Without discount */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Without CGT Discount</h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Taxable Gain</span>
                      <span className="font-semibold">{formatCurrency(gain)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tax Payable</span>
                      <span className="font-bold text-red-600">{formatCurrency(taxWithout)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Effective Rate</span>
                      <span className="font-semibold">{effectiveWithout.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* With discount */}
                <div className={`border rounded-xl p-5 ${held12Months ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${held12Months ? "text-emerald-700" : "text-slate-500"}`}>
                    {held12Months ? "With 50% CGT Discount" : "No Discount (< 12 months)"}
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Taxable Gain</span>
                      <span className="font-semibold">{formatCurrency(discountedGain)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tax Payable</span>
                      <span className={`font-bold ${held12Months ? "text-emerald-700" : "text-red-600"}`}>{formatCurrency(taxWith)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Effective Rate</span>
                      <span className="font-semibold">{effectiveWith.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 md:p-12 text-center h-full flex flex-col items-center justify-center">
              <Icon name="calendar" size={32} className="text-slate-300 mx-auto mb-3 md:mb-4 md:!w-12 md:!h-12" />
              <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1">Enter a Capital Gain</h3>
              <p className="text-xs md:text-sm text-slate-500 max-w-xs">Type your gain amount to see the tax comparison.</p>
            </div>
          )}
        </div>
      </div>
      <ShareResultsButton />
    </CalcSection>
  );
}
