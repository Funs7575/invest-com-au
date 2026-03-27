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

export default function FireCalculator({ searchParams }: Props) {
  const [currentAge, setCurrentAge] = useState(() => getParam(searchParams, "fi_ca") || "30");
  const [currentSavings, setCurrentSavings] = useState(() => getParam(searchParams, "fi_cs") || "50000");
  const [annualSavings, setAnnualSavings] = useState(() => getParam(searchParams, "fi_as") || "24000");
  const [annualExpenses, setAnnualExpenses] = useState(() => getParam(searchParams, "fi_ae") || "60000");
  const [returnRate, setReturnRate] = useState(() => getParam(searchParams, "fi_rr") || "7");
  const [withdrawalRate, setWithdrawalRate] = useState(() => getParam(searchParams, "fi_wr") || "4");

  useUrlSync({
    calc: "fire",
    fi_ca: currentAge,
    fi_cs: currentSavings,
    fi_as: annualSavings,
    fi_ae: annualExpenses,
    fi_rr: returnRate,
    fi_wr: withdrawalRate,
  });

  const result = useMemo(() => {
    const age = parseFloat(currentAge) || 0;
    const S = parseFloat(currentSavings) || 0;
    const save = parseFloat(annualSavings) || 0;
    const expenses = parseFloat(annualExpenses) || 0;
    const r = (parseFloat(returnRate) || 0) / 100;
    const wr = (parseFloat(withdrawalRate) || 0) / 100;

    const fireNumber = wr > 0 ? expenses / wr : 0;
    const remaining = Math.max(0, fireNumber - S);

    // Years to reach FIRE number using compound growth + annual savings
    let years = 0;
    let portfolio = S;
    const MAX_YEARS = 80;
    if (fireNumber > 0) {
      while (portfolio < fireNumber && years < MAX_YEARS) {
        portfolio = portfolio * (1 + r) + save;
        years++;
      }
    }

    const fireAge = age + years;
    const achieved = portfolio >= fireNumber;

    // Snapshots every 5 years up to fire date
    const snapshots: { year: number; amount: number }[] = [];
    let snap = S;
    const snapEnd = Math.min(years + 5, MAX_YEARS);
    for (let y = 0; y <= snapEnd; y++) {
      snapshots.push({ year: y, amount: snap });
      snap = snap * (1 + r) + save;
    }

    const safeWithdrawal = portfolio * wr;

    return { fireNumber, years, fireAge, achieved, snapshots, remaining, safeWithdrawal, finalPortfolio: portfolio };
  }, [currentAge, currentSavings, annualSavings, annualExpenses, returnRate, withdrawalRate]);

  const showResults = (parseFloat(annualExpenses) || 0) > 0;
  const maxAmount = result.fireNumber || result.snapshots[result.snapshots.length - 1]?.amount || 1;

  return (
    <CalcSection
      id="fire"
      iconName="flame"
      title="FIRE Calculator"
      desc="Financial Independence, Retire Early — calculate your FIRE number and how long to get there."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Inputs */}
        <div className="lg:col-span-4 space-y-4">
          <InputField label="Current Age" value={currentAge} onChange={setCurrentAge} placeholder="30" />
          <InputField label="Current Savings / Investments" value={currentSavings} onChange={setCurrentSavings} prefix="$" placeholder="50000" />
          <InputField label="Annual Savings" value={annualSavings} onChange={setAnnualSavings} prefix="$" placeholder="24000" />
          <InputField label="Annual Expenses in Retirement" value={annualExpenses} onChange={setAnnualExpenses} prefix="$" placeholder="60000" />
          <InputField label="Expected Annual Return" value={returnRate} onChange={setReturnRate} suffix="%" placeholder="7" />
          <InputField label="Safe Withdrawal Rate" value={withdrawalRate} onChange={setWithdrawalRate} suffix="%" placeholder="4" />
        </div>

        {/* Results */}
        <div className="lg:col-span-8">
          {showResults ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm h-full">
              {/* FIRE number hero */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-slate-100 gap-3">
                <div>
                  <span className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-400">Your FIRE Number</span>
                  <div className="text-3xl md:text-4xl font-extrabold text-brand tracking-tight mt-0.5">
                    <AnimatedNumber value={result.fireNumber} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="block text-[0.69rem] font-bold uppercase text-slate-400">Years Away</span>
                    <span className={`text-2xl font-extrabold ${result.achieved ? "text-emerald-600" : "text-slate-700"}`}>
                      {result.years >= 80 ? "80+" : result.years}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[0.69rem] font-bold uppercase text-slate-400">FIRE Age</span>
                    <span className={`text-2xl font-extrabold ${result.achieved ? "text-emerald-600" : "text-slate-700"}`}>
                      {result.fireAge >= 110 ? "110+" : Math.round(result.fireAge)}
                    </span>
                  </div>
                </div>
              </div>

              {result.achieved && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-700 font-medium">
                  FIRE reached! Your portfolio of {fmt(result.finalPortfolio)} supports a safe withdrawal of {fmt(result.safeWithdrawal)}/yr.
                </div>
              )}

              {/* Savings chart */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[0.69rem] font-bold uppercase tracking-wider text-slate-400">Portfolio Growth</p>
                  <p className="text-[0.69rem] text-slate-400">FIRE target: {fmt(result.fireNumber)}</p>
                </div>
                {result.snapshots.filter((_, i) => i % Math.max(1, Math.floor(result.snapshots.length / 8)) === 0 || i === result.snapshots.length - 1).map((s) => (
                  <div key={s.year}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-slate-500">Year {s.year} (age {Math.round(parseFloat(currentAge) || 0) + s.year})</span>
                      <span className="font-semibold text-slate-700">{fmt(s.amount)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${s.amount >= result.fireNumber ? "bg-emerald-500" : "bg-brand"}`}
                        style={{ width: `${Math.min(100, (s.amount / maxAmount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <p className="font-semibold text-slate-700">25x rule ({fmt(parseFloat(annualExpenses) || 0)} × 25)</p>
                  <p>FIRE Number: {fmt(result.fireNumber)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2.5">
                  <p className="font-semibold text-amber-700">Safe withdrawal</p>
                  <p className="text-amber-600 font-bold">{fmt(result.safeWithdrawal)}/yr</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 md:p-12 text-center h-full flex flex-col items-center justify-center">
              <p className="text-slate-400 text-sm">Enter your annual expenses to calculate your FIRE number.</p>
            </div>
          )}
        </div>
      </div>
      <ShareResultsButton />
    </CalcSection>
  );
}
