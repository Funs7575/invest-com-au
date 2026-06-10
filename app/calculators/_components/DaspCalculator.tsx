"use client";

import { useState, useEffect } from "react";
import { trackEvent } from "@/lib/tracking";
import Icon from "@/components/Icon";
import { computeDasp } from "@/lib/calculators/dasp";
import {
  getParam, useUrlSync, AnimatedNumber, ShareResultsButton,
  CalcSection, InputField, WaterfallBar,
} from "./CalcShared";

interface Props {
  searchParams: URLSearchParams;
}

/**
 * DASP (Departing Australia Superannuation Payment) tax estimator.
 * Most temporary residents' accumulation super is a taxed-element
 * taxable component, so the simple UX treats the whole balance that way;
 * the WHM toggle switches to the 65% Working Holiday Maker rate. The
 * underlying `computeDasp` supports untaxed / tax-free splits for the
 * advanced cases, surfaced via deep-link params.
 */
export default function DaspCalculator({ searchParams }: Props) {
  const [balance, setBalance] = useState(() => getParam(searchParams, "dasp_bal") || "30000");
  const [isWhm, setIsWhm] = useState(() => getParam(searchParams, "dasp_whm") === "1");

  useUrlSync({ calc: "dasp", dasp_bal: balance, dasp_whm: isWhm ? "1" : "0" });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (balance !== "30000" || isWhm) {
        trackEvent("calculator_use", { calc_type: "dasp", balance, whm: isWhm }, "/dasp-calculator");
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [balance, isWhm]);

  const bal = Math.max(0, parseFloat(balance) || 0);
  const r = computeDasp({ taxedElement: bal, isWorkingHolidayMaker: isWhm });

  const showResults = bal > 0;
  const maxBar = r.grossBalance || 1;

  return (
    <CalcSection
      id="dasp"
      iconName="log-out"
      title="DASP Tax Calculator"
      desc="Estimate the tax withheld when a departing temporary resident claims their Australian super. Government rates — they cannot be reduced."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-4">
          <div className="space-y-5">
            <InputField label="Super Balance" value={balance} onChange={setBalance} placeholder="30000" prefix="$" />

            <div>
              <p className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Visa Type</p>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  onClick={() => setIsWhm(false)}
                  className={`py-2 px-3 text-sm font-semibold rounded-lg transition-all text-left ${
                    !isWhm ? "bg-brand text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Temporary resident (35%)
                </button>
                <button
                  onClick={() => setIsWhm(true)}
                  className={`py-2 px-3 text-sm font-semibold rounded-lg transition-all text-left ${
                    isWhm ? "bg-brand text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Working Holiday Maker — 417/462 (65%)
                </button>
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
                  <span className="text-[0.69rem] md:text-xs font-bold uppercase tracking-wider text-slate-500">You Receive (After Tax)</span>
                  <div className="text-3xl md:text-4xl font-extrabold text-brand tracking-tight mt-0.5">
                    <AnimatedNumber value={r.netPayment} prefix="$" decimals={0} />
                  </div>
                </div>
                <div className="mt-2 sm:mt-0 flex gap-4 md:gap-6">
                  <div className="text-left sm:text-right">
                    <span className="block text-[0.69rem] md:text-xs font-bold uppercase text-slate-500">DASP Tax</span>
                    <span className="text-lg md:text-xl font-bold text-red-500">${Math.round(r.totalTax).toLocaleString()}</span>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="block text-[0.69rem] md:text-xs font-bold uppercase text-slate-500">Effective Rate</span>
                    <span className="text-lg md:text-xl font-bold text-slate-700">{(r.effectiveRate * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              {/* Waterfall chart */}
              <div className="space-y-5">
                <WaterfallBar label="Super Balance" value={`$${Math.round(r.grossBalance).toLocaleString()}`} width={(r.grossBalance / maxBar) * 100} color="bg-blue-500" />
                <WaterfallBar label="- DASP Tax Withheld" value={`-$${Math.round(r.totalTax).toLocaleString()}`} width={(r.totalTax / maxBar) * 100} color="bg-red-400" valueColor="text-red-500" />
                <WaterfallBar label="= You Receive" value={`$${Math.round(r.netPayment).toLocaleString()}`} width={(r.netPayment / maxBar) * 100} color="bg-emerald-600" valueColor="text-emerald-600" />
              </div>

              <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4 flex gap-3 items-start">
                <span className="text-amber-600 mt-0.5 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z" /></svg>
                </span>
                <p className="text-sm text-slate-900 leading-relaxed">
                  {isWhm
                    ? "As a Working Holiday Maker (subclass 417/462) the entire taxable component is taxed at 65%. This rate applies if you held a WHM visa at any time."
                    : "Most temporary residents pay 35% on the taxed element. A small untaxed-element portion (some public-sector funds) is taxed at 45% — use a tax agent for the exact split."}
                </p>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 md:p-12 text-center h-full flex flex-col items-center justify-center">
              <Icon name="bar-chart" size={32} className="text-slate-300 mx-auto mb-3 md:mb-4 md:!w-12 md:!h-12" />
              <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1">Enter your super balance</h3>
              <p className="text-xs md:text-sm text-slate-500 max-w-xs">See how much DASP tax is withheld and what you&apos;ll actually receive.</p>
            </div>
          )}
        </div>
      </div>
      <ShareResultsButton />
    </CalcSection>
  );
}
