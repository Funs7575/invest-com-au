"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

/* ── constants (FY2026) ── */

const CONCESSIONAL_CAP = 30_000;
const NON_CONCESSIONAL_CAP = 120_000;
const BRING_FORWARD_CAP = 360_000;
const DIV293_THRESHOLD = 250_000;
const DIV293_EXTRA_RATE = 0.15; // extra 15% for high earners
const SUPER_TAX_RATE = 0.15;
const CARRY_FORWARD_BALANCE_THRESHOLD = 500_000;

/* ── helpers ── */

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

/** Australian marginal income tax rate (FY2026, incl. 2% Medicare Levy) */
function marginalRate(income: number): number {
  if (income <= 18_200) return 0;
  if (income <= 45_000) return 0.19 + 0.02;
  if (income <= 120_000) return 0.325 + 0.02;
  if (income <= 180_000) return 0.37 + 0.02;
  return 0.45 + 0.02;
}

/* ── main component ── */

export default function SuperContributionsClient() {
  const [income, setIncome] = useState(90_000);
  const [currentConcessional, setCurrentConcessional] = useState(12_000); // employer SG
  const [extraConcessional, setExtraConcessional] = useState(5_000);
  const [nonConcessional, setNonConcessional] = useState(0);
  const [superBalance, setSuperBalance] = useState(150_000);
  const [unusedCarryForward, setUnusedCarryForward] = useState(0);

  const result = useMemo(() => {
    const totalConcessional = currentConcessional + extraConcessional;
    const isHighEarner = income >= DIV293_THRESHOLD;

    // Concessional cap including carry-forward
    const effectiveCap =
      superBalance < CARRY_FORWARD_BALANCE_THRESHOLD
        ? Math.min(CONCESSIONAL_CAP + unusedCarryForward, CONCESSIONAL_CAP * 6) // max 6 years
        : CONCESSIONAL_CAP;

    const concessionalExcess = Math.max(0, totalConcessional - effectiveCap);
    const concessionalWithinCap = Math.min(totalConcessional, effectiveCap);

    // Tax inside super on concessional contributions
    const superTaxOnConcessional = concessionalWithinCap * SUPER_TAX_RATE;
    const div293Tax = isHighEarner ? concessionalWithinCap * DIV293_EXTRA_RATE : 0;
    const totalSuperTax = superTaxOnConcessional + div293Tax;
    const effectiveSuperTaxRate = isHighEarner ? 0.3 : 0.15;

    // Tax saving vs taking income at marginal rate
    const marginal = marginalRate(income);
    const taxSavingPerDollar = Math.max(0, marginal - effectiveSuperTaxRate);
    const taxSavingOnExtra = extraConcessional * taxSavingPerDollar;

    // Non-concessional: check cap
    const ncCap = superBalance < CARRY_FORWARD_BALANCE_THRESHOLD ? BRING_FORWARD_CAP : NON_CONCESSIONAL_CAP;
    const nonConcessionalExcess = Math.max(0, nonConcessional - ncCap);

    // Net contribution landing in super (after 15% tax on concessional)
    const netConcessionalInSuper = concessionalWithinCap - totalSuperTax;
    const totalGoingIntoSuper = netConcessionalInSuper + nonConcessional;

    return {
      totalConcessional,
      effectiveCap,
      concessionalExcess,
      concessionalWithinCap,
      superTaxOnConcessional,
      div293Tax,
      totalSuperTax,
      effectiveSuperTaxRate,
      marginal,
      taxSavingOnExtra,
      taxSavingPerDollar,
      nonConcessionalExcess,
      ncCap,
      netConcessionalInSuper,
      totalGoingIntoSuper,
      isHighEarner,
    };
  }, [
    income,
    currentConcessional,
    extraConcessional,
    nonConcessional,
    superBalance,
    unusedCarryForward,
  ]);

  const concessionalPct = Math.min(
    100,
    Math.round((result.totalConcessional / result.effectiveCap) * 100)
  );

  return (
    <div className="py-10 md:py-16">
      <div className="container-custom max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
            Free Calculator
          </p>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">
            Super Contributions Calculator
          </h1>
          <p className="text-slate-500 text-sm md:text-base leading-relaxed">
            See how much you can contribute to super, estimate the tax savings from salary sacrifice,
            and check whether you&apos;re within your concessional and non-concessional caps for FY2026.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
          {/* ── Inputs ── */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
              <h2 className="font-bold text-slate-900">Your Details</h2>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Annual income (before tax)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={income}
                    onChange={(e) => setIncome(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                {income >= DIV293_THRESHOLD && (
                  <p className="text-[0.68rem] text-orange-600 mt-1 font-medium">
                    Division 293 applies — super contributions taxed at 30%
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Employer SG contributions (annual)
                  <span className="text-slate-400 font-normal ml-1">11.5% of salary</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={currentConcessional}
                    onChange={(e) => setCurrentConcessional(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Extra concessional contributions
                  <span className="text-slate-400 font-normal ml-1">salary sacrifice / personal deductible</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={extraConcessional}
                    onChange={(e) => setExtraConcessional(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Non-concessional contributions
                  <span className="text-slate-400 font-normal ml-1">after-tax money into super</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={nonConcessional}
                    onChange={(e) => setNonConcessional(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Current super balance
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={superBalance}
                    onChange={(e) => setSuperBalance(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                {superBalance < CARRY_FORWARD_BALANCE_THRESHOLD && (
                  <p className="text-[0.68rem] text-emerald-600 mt-1 font-medium">
                    Balance under $500k — carry-forward rules may apply
                  </p>
                )}
              </div>

              {superBalance < CARRY_FORWARD_BALANCE_THRESHOLD && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Unused concessional cap (last 5 yrs)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={unusedCarryForward}
                      onChange={(e) => setUnusedCarryForward(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <p className="text-[0.68rem] text-slate-400 mt-1">
                    Find this on your ATO myGov account
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Results ── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Concessional cap usage */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Concessional Cap Usage
                  </p>
                  <p className="text-2xl font-extrabold text-slate-900">
                    {formatCurrency(result.totalConcessional)}
                    <span className="text-sm font-normal text-slate-400 ml-1">
                      / {formatCurrency(result.effectiveCap)}
                    </span>
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    result.concessionalExcess > 0
                      ? "bg-red-100 text-red-700"
                      : concessionalPct >= 90
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {concessionalPct}% used
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    result.concessionalExcess > 0
                      ? "bg-red-500"
                      : concessionalPct >= 90
                      ? "bg-amber-400"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, concessionalPct)}%` }}
                />
              </div>

              {result.concessionalExcess > 0 ? (
                <p className="text-xs text-red-600 font-medium">
                  {formatCurrency(result.concessionalExcess)} over the cap — excess will be included in your assessable income plus a 15% offset and interest charge.
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  {formatCurrency(result.effectiveCap - result.totalConcessional)} remaining cap available this FY
                </p>
              )}

              {unusedCarryForward > 0 && superBalance < CARRY_FORWARD_BALANCE_THRESHOLD && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  Includes {formatCurrency(unusedCarryForward)} carry-forward cap
                </p>
              )}
            </div>

            {/* Tax saving */}
            {extraConcessional > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">
                  Tax Saving from Extra Contributions
                </p>
                <p className="text-2xl font-extrabold text-emerald-800">
                  {formatCurrency(result.taxSavingOnExtra)}
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  By contributing {formatCurrency(extraConcessional)} to super instead of taking it as income, you pay{" "}
                  {formatPercent(result.effectiveSuperTaxRate * 100)} super tax instead of your{" "}
                  {formatPercent(result.marginal * 100)} marginal rate —{" "}
                  saving {formatPercent(result.taxSavingPerDollar * 100)} per dollar.
                </p>
              </div>
            )}

            {/* Contribution breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                Contribution Breakdown
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Employer SG</span>
                  <span className="font-semibold">{formatCurrency(currentConcessional)}</span>
                </div>
                {extraConcessional > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Extra concessional (salary sacrifice / deductible)</span>
                    <span className="font-semibold">{formatCurrency(extraConcessional)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-100 pt-2">
                  <span className="text-slate-700 font-medium">Total concessional</span>
                  <span className="font-bold">{formatCurrency(result.totalConcessional)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Super tax (15%{result.isHighEarner ? " + 15% Div 293" : ""})</span>
                  <span className="font-semibold">−{formatCurrency(result.totalSuperTax)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2">
                  <span className="text-slate-700 font-medium">Net concessional in super</span>
                  <span className="font-bold">{formatCurrency(result.netConcessionalInSuper)}</span>
                </div>
                {nonConcessional > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Non-concessional</span>
                      <span className="font-semibold">{formatCurrency(nonConcessional)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
                      <span className="font-bold text-slate-900">Total going into super</span>
                      <span className="font-extrabold text-slate-900">{formatCurrency(result.totalGoingIntoSuper)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Non-concessional warning */}
            {result.nonConcessionalExcess > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-red-700 mb-1">Non-Concessional Cap Exceeded</p>
                <p className="text-xs text-red-600">
                  {formatCurrency(result.nonConcessionalExcess)} over the {formatCurrency(result.ncCap)} cap. Excess non-concessional contributions face a 47% tax rate. Consider withdrawing the excess before 30 June.
                </p>
              </div>
            )}

            {/* Rates table */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                FY2026 Contribution Limits
              </p>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Concessional (CC) cap</span>
                  <span className="font-semibold text-slate-800">$30,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Non-concessional (NCC) cap</span>
                  <span className="font-semibold text-slate-800">$120,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Bring-forward NCC (3-year rule)</span>
                  <span className="font-semibold text-slate-800">$360,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Super guarantee rate (SG)</span>
                  <span className="font-semibold text-slate-800">11.5%</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax on concessional contributions</span>
                  <span className="font-semibold text-slate-800">15%</span>
                </div>
                <div className="flex justify-between">
                  <span>Division 293 threshold</span>
                  <span className="font-semibold text-slate-800">$250,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Carry-forward balance limit</span>
                  <span className="font-semibold text-slate-800">$500,000</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
              <p className="text-sm font-bold text-slate-900 mb-1">
                Want a personalised super strategy?
              </p>
              <p className="text-xs text-slate-600 mb-3">
                A financial planner can model the tax impact of salary sacrifice, catch-up contributions and
                transition to retirement strategies for your specific situation.
              </p>
              <Link
                href="/advisors/financial-planners"
                className="inline-block px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors"
              >
                Find a Financial Planner →
              </Link>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[0.65rem] text-slate-400 mt-8 leading-relaxed">
          This calculator provides general information only and does not constitute financial advice. Contribution caps and tax rates are for FY2026 and are subject to change. Speak with a qualified financial adviser before making contribution decisions. Always verify figures with the ATO or your fund.
        </p>
      </div>
    </div>
  );
}
