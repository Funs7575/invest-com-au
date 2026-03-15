"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import SocialProofCounter from "@/components/SocialProofCounter";
import AdvisorMatchCTA from "@/components/AdvisorMatchCTA";
import { trackEvent, trackPageDuration } from "@/lib/tracking";
import { getStoredUtm } from "@/components/UtmCapture";
import { storeQualificationData } from "@/lib/qualification";

type DebtType = "credit_card" | "personal_loan" | "car_loan" | "hecs" | "other";

interface Debt {
  id: number;
  type: DebtType;
  balance: number;
  rate: number;
  minPayment: number;
}

const DEBT_TYPE_LABELS: Record<DebtType, string> = {
  credit_card: "Credit Card",
  personal_loan: "Personal Loan",
  car_loan: "Car Loan",
  hecs: "HECS-HELP",
  other: "Other",
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function formatMonths(months: number): string {
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  if (years === 0) return `${remaining} months`;
  if (remaining === 0) return `${years} year${years > 1 ? "s" : ""}`;
  return `${years}y ${remaining}m`;
}

function addMonthsToDate(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

/** Calculate months to payoff and total interest for a debt at minimum payment */
function calcDebtPayoff(balance: number, annualRate: number, monthlyPayment: number): { months: number; totalInterest: number } {
  if (balance <= 0 || monthlyPayment <= 0) return { months: 0, totalInterest: 0 };
  const monthlyRate = annualRate / 100 / 12;
  // If rate is 0, simple division
  if (monthlyRate === 0) {
    const months = Math.ceil(balance / monthlyPayment);
    return { months, totalInterest: 0 };
  }
  // If minimum payment doesn't cover interest, debt never pays off
  const monthlyInterest = balance * monthlyRate;
  if (monthlyPayment <= monthlyInterest) {
    return { months: 999, totalInterest: 999999 };
  }
  let remaining = balance;
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600; // 50 years cap
  while (remaining > 0.01 && months < maxMonths) {
    const interest = remaining * monthlyRate;
    totalInterest += interest;
    remaining = remaining + interest - monthlyPayment;
    months++;
    if (remaining < 0) remaining = 0;
  }
  return { months, totalInterest };
}

/** Calculate consolidation loan monthly payment */
function calcLoanPayment(principal: number, annualRate: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
}

interface Results {
  // Current situation
  totalDebt: number;
  weightedAvgRate: number;
  totalMonthlyPayments: number;
  totalInterestCurrent: number;
  maxMonthsToPayoff: number;
  // Consolidated
  consolidatedPayment: number;
  consolidatedTotalInterest: number;
  consolidatedMonths: number;
  // Savings
  interestSaved: number;
  timeSaved: number;
  paymentDifference: number;
}

let nextDebtId = 2;

export default function DebtCalculatorClient() {
  const [debts, setDebts] = useState<Debt[]>([
    { id: 1, type: "credit_card", balance: 8000, rate: 20, minPayment: 200 },
  ]);
  const [consolidationRate, setConsolidationRate] = useState(8);
  const [consolidationTerm, setConsolidationTerm] = useState(5);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<Results | null>(null);
  const [emailGated, setEmailGated] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => { trackPageDuration("/debt-calculator"); }, []);

  const addDebt = () => {
    setDebts(prev => [...prev, { id: nextDebtId++, type: "credit_card", balance: 0, rate: 18, minPayment: 0 }]);
  };

  const removeDebt = (id: number) => {
    if (debts.length <= 1) return;
    setDebts(prev => prev.filter(d => d.id !== id));
  };

  const updateDebt = (id: number, field: keyof Debt, value: number | DebtType) => {
    setDebts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleCalculate = () => {
    const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
    if (totalDebt <= 0) return;

    const weightedAvgRate = debts.reduce((sum, d) => sum + d.rate * (d.balance / totalDebt), 0);
    const totalMonthlyPayments = debts.reduce((sum, d) => sum + d.minPayment, 0);

    // Current situation: calculate each debt separately
    let totalInterestCurrent = 0;
    let maxMonthsToPayoff = 0;
    for (const debt of debts) {
      const result = calcDebtPayoff(debt.balance, debt.rate, debt.minPayment);
      totalInterestCurrent += result.totalInterest;
      maxMonthsToPayoff = Math.max(maxMonthsToPayoff, result.months);
    }

    // Consolidated loan
    const consolidatedMonths = consolidationTerm * 12;
    const consolidatedPayment = calcLoanPayment(totalDebt, consolidationRate, consolidatedMonths);
    const consolidatedTotalInterest = (consolidatedPayment * consolidatedMonths) - totalDebt;

    const interestSaved = totalInterestCurrent - consolidatedTotalInterest;
    const timeSaved = maxMonthsToPayoff - consolidatedMonths;
    const paymentDifference = totalMonthlyPayments - consolidatedPayment;

    const r: Results = {
      totalDebt,
      weightedAvgRate,
      totalMonthlyPayments,
      totalInterestCurrent,
      maxMonthsToPayoff,
      consolidatedPayment,
      consolidatedTotalInterest,
      consolidatedMonths,
      interestSaved,
      timeSaved,
      paymentDifference,
    };

    setResults(r);
    setShowResults(true);

    trackEvent("debt_calc_result", {
      total_debt: totalDebt,
      num_debts: debts.length,
      weighted_rate: weightedAvgRate.toFixed(1),
      consolidation_rate: consolidationRate,
      consolidation_term: consolidationTerm,
      interest_saved: Math.round(interestSaved),
    }, "/debt-calculator");

    storeQualificationData("debt", {
      totalDebt,
      numDebts: debts.length,
      weightedAvgRate: Math.round(weightedAvgRate * 10) / 10,
      consolidationRate,
      consolidationTerm,
      interestSaved: Math.round(interestSaved),
      debtTypes: debts.map(d => d.type),
    });
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    await fetch("/api/email-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source: "debt-calculator", name: "", ...getStoredUtm() }),
    }).catch(() => {});
    setEmailSubmitted(true);
    setEmailGated(false);
    trackEvent("debt_calc_email", { email: email.trim() }, "/debt-calculator");
  };

  // Determine color coding
  const getSavingsColor = () => {
    if (!results) return "slate";
    if (results.interestSaved > 500) return "green";
    if (results.interestSaved > 0) return "amber";
    return "red";
  };

  const color = getSavingsColor();

  return (
    <div className="py-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white py-8 md:py-14 px-4">
        <div className="container-custom max-w-3xl text-center">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Icon name="calculator" size={24} className="text-white" />
          </div>
          <h1 className="text-xl md:text-3xl font-extrabold mb-2">Could debt consolidation save you money?</h1>
          <p className="text-sm md:text-base text-amber-100">Add your debts below and we&apos;ll calculate whether consolidating into a single loan could reduce your interest, payments, and time to debt-free.</p>
          <div className="mt-3"><SocialProofCounter variant="badge" /></div>
        </div>
      </div>

      <div className="container-custom max-w-3xl py-6 md:py-10">
        {/* Debt inputs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Your Current Debts</h2>

          <div className="space-y-4">
            {debts.map((debt, index) => (
              <div key={debt.id} className="border border-slate-200 rounded-xl p-4 relative">
                {debts.length > 1 && (
                  <button
                    onClick={() => removeDebt(debt.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-100 hover:bg-red-100 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                    aria-label="Remove debt"
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
                <div className="text-xs font-bold text-slate-500 mb-3">Debt {index + 1}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                    <select
                      value={debt.type}
                      onChange={e => updateDebt(debt.id, "type", e.target.value as DebtType)}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                    >
                      {Object.entries(DEBT_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Balance</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
                      <input
                        type="number"
                        value={debt.balance || ""}
                        onChange={e => updateDebt(debt.id, "balance", Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full pl-7 pr-3 py-2.5 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                        placeholder="8,000"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Interest Rate</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={debt.rate || ""}
                        onChange={e => updateDebt(debt.id, "rate", Math.max(0, Math.min(50, parseFloat(e.target.value) || 0)))}
                        className="w-full pr-7 pl-3 py-2.5 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                        placeholder="20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Min Payment</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
                      <input
                        type="number"
                        value={debt.minPayment || ""}
                        onChange={e => updateDebt(debt.id, "minPayment", Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full pl-7 pr-3 py-2.5 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                        placeholder="200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addDebt}
            className="mt-4 w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 hover:border-amber-300 hover:text-amber-600 transition-all flex items-center justify-center gap-1.5"
          >
            <Icon name="plus" size={16} /> Add another debt
          </button>

          {/* Consolidation loan settings */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Consolidation Loan Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Consolidation loan rate</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={consolidationRate}
                    onChange={e => setConsolidationRate(Math.max(0, Math.min(30, parseFloat(e.target.value) || 0)))}
                    className="w-full pr-8 pl-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[6, 8, 10, 12, 14].map(v => (
                    <button key={v} onClick={() => setConsolidationRate(v)} className={`text-[0.56rem] px-2 py-1 rounded-full font-semibold transition-all ${consolidationRate === v ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {v}%
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loan term</label>
                <div className="flex gap-2">
                  {[3, 5, 7].map(years => (
                    <button
                      key={years}
                      onClick={() => setConsolidationTerm(years)}
                      className={`flex-1 py-3 text-lg font-bold rounded-lg border-2 transition-all ${
                        consolidationTerm === years
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {years} yrs
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="w-full mt-6 px-6 py-3.5 bg-amber-600 text-white text-base font-bold rounded-xl hover:bg-amber-700 transition-all shadow-lg hover:shadow-xl"
          >
            Calculate Consolidation Savings →
          </button>
        </div>

        {/* Results */}
        {showResults && results && (
          <>
            {/* Headline result */}
            <div className={`rounded-2xl p-5 md:p-8 mb-6 text-center ${
              color === "green" ? "bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200" :
              color === "amber" ? "bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200" :
              "bg-gradient-to-br from-red-50 to-rose-50 border border-red-200"
            }`}>
              {color === "green" ? (
                <>
                  <p className={`text-sm font-semibold mb-1 text-emerald-600`}>Consolidation could save you</p>
                  <p className="text-3xl md:text-5xl font-black text-emerald-700">{formatCurrency(results.interestSaved)}</p>
                  <p className="text-sm text-slate-600 mt-1">in total interest</p>
                  {results.timeSaved > 0 && (
                    <p className="text-sm font-semibold text-emerald-600 mt-2">and get you debt-free {formatMonths(results.timeSaved)} sooner</p>
                  )}
                </>
              ) : color === "amber" ? (
                <>
                  <p className="text-sm font-semibold mb-1 text-amber-600">Marginal savings with consolidation</p>
                  <p className="text-3xl md:text-5xl font-black text-amber-700">{formatCurrency(results.interestSaved)}</p>
                  <p className="text-sm text-slate-600 mt-1">in interest savings — consider other factors like simplicity</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold mb-1 text-red-600">Consolidation may cost you more</p>
                  <p className="text-3xl md:text-5xl font-black text-red-700">{formatCurrency(Math.abs(results.interestSaved))}</p>
                  <p className="text-sm text-slate-600 mt-1">more in total interest — you may be better off keeping current debts</p>
                </>
              )}
            </div>

            {/* Comparison cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Current situation */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Current Situation</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Total debt</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(results.totalDebt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Weighted avg rate</span>
                    <span className="text-sm font-bold text-slate-900">{results.weightedAvgRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Total monthly payments</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(results.totalMonthlyPayments)}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Total interest</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(results.totalInterestCurrent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Months to payoff</span>
                    <span className="text-sm font-bold text-slate-900">{results.maxMonthsToPayoff >= 999 ? "Never (underpaying)" : formatMonths(results.maxMonthsToPayoff)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <span className="text-sm text-slate-600">Debt-free date</span>
                    <span className="text-sm font-bold text-slate-900">{results.maxMonthsToPayoff >= 999 ? "Never" : addMonthsToDate(results.maxMonthsToPayoff)}</span>
                  </div>
                </div>
              </div>

              {/* Consolidated */}
              <div className={`border rounded-2xl p-5 ${
                color === "green" ? "bg-emerald-50/50 border-emerald-200" :
                color === "amber" ? "bg-amber-50/50 border-amber-200" :
                "bg-red-50/50 border-red-200"
              }`}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Consolidated</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Total debt</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(results.totalDebt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Consolidation rate</span>
                    <span className="text-sm font-bold text-slate-900">{consolidationRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Single monthly payment</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(results.consolidatedPayment)}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Total interest</span>
                    <span className={`text-sm font-bold ${color === "green" ? "text-emerald-600" : color === "amber" ? "text-amber-600" : "text-red-600"}`}>{formatCurrency(results.consolidatedTotalInterest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Months to payoff</span>
                    <span className="text-sm font-bold text-slate-900">{formatMonths(results.consolidatedMonths)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100">
                    <span className="text-sm text-slate-600">Debt-free date</span>
                    <span className={`text-sm font-bold ${color === "green" ? "text-emerald-700" : "text-slate-900"}`}>{addMonthsToDate(results.consolidatedMonths)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings summary */}
            <div className={`rounded-2xl p-5 md:p-6 mb-6 border ${
              color === "green" ? "bg-emerald-50 border-emerald-200" :
              color === "amber" ? "bg-amber-50 border-amber-200" :
              "bg-red-50 border-red-200"
            }`}>
              <h3 className="text-sm font-bold text-slate-900 mb-3">Summary of Savings</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className={`text-lg md:text-2xl font-black ${
                    results.interestSaved > 0 ? "text-emerald-700" : "text-red-700"
                  }`}>{results.interestSaved > 0 ? "" : "-"}{formatCurrency(Math.abs(results.interestSaved))}</div>
                  <div className="text-xs text-slate-600 mt-0.5">Interest {results.interestSaved >= 0 ? "saved" : "extra"}</div>
                </div>
                <div>
                  <div className={`text-lg md:text-2xl font-black ${
                    results.timeSaved > 0 ? "text-emerald-700" : results.timeSaved < 0 ? "text-red-700" : "text-slate-700"
                  }`}>{results.timeSaved > 0 ? "" : results.timeSaved < 0 ? "+" : ""}{formatMonths(Math.abs(results.timeSaved))}</div>
                  <div className="text-xs text-slate-600 mt-0.5">Time {results.timeSaved >= 0 ? "saved" : "longer"}</div>
                </div>
                <div>
                  <div className={`text-lg md:text-2xl font-black ${
                    results.paymentDifference > 0 ? "text-emerald-700" : results.paymentDifference < 0 ? "text-red-700" : "text-slate-700"
                  }`}>{results.paymentDifference > 0 ? "-" : "+"}{formatCurrency(Math.abs(results.paymentDifference))}</div>
                  <div className="text-xs text-slate-600 mt-0.5">Monthly {results.paymentDifference >= 0 ? "less" : "more"}</div>
                </div>
              </div>
            </div>

            {/* Debt-free date comparison */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Debt-Free Date Comparison</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-xs text-slate-500 mb-1">Current path</div>
                  <div className="h-3 bg-red-200 rounded-full relative overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-1">{results.maxMonthsToPayoff >= 999 ? "Never" : addMonthsToDate(results.maxMonthsToPayoff)}</div>
                </div>
                <div className="text-lg font-black text-slate-300">vs</div>
                <div className="flex-1">
                  <div className="text-xs text-slate-500 mb-1">Consolidated</div>
                  <div className="h-3 bg-emerald-200 rounded-full relative overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: results.maxMonthsToPayoff >= 999 ? "30%" : `${Math.min(100, (results.consolidatedMonths / results.maxMonthsToPayoff) * 100)}%` }} />
                  </div>
                  <div className="text-xs font-bold text-emerald-700 mt-1">{addMonthsToDate(results.consolidatedMonths)}</div>
                </div>
              </div>
            </div>

            {/* Email capture gate */}
            {!emailGated && !emailSubmitted && (
              <div className="text-center mb-6">
                <button onClick={() => setEmailGated(true)} className="text-xs text-slate-400 hover:text-slate-600">
                  Want a detailed repayment schedule? Get it emailed to you →
                </button>
              </div>
            )}
            {emailGated && !emailSubmitted && (
              <div className="bg-slate-900 rounded-2xl p-4 md:p-5 text-white mb-6">
                <div className="flex items-start gap-3">
                  <Icon name="mail" size={20} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">Get your detailed debt repayment plan</p>
                    <p className="text-xs text-slate-300 mb-3">Enter your email to receive a personalised breakdown with month-by-month repayment schedule.</p>
                    <div className="flex gap-2">
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="flex-1 px-3 py-2 text-sm rounded-lg text-slate-900 border-0" />
                      <button onClick={handleEmailSubmit} className="px-4 py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 shrink-0">Send Plan</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advisor CTA */}
            <div className="mb-6">
              <AdvisorMatchCTA
                needKey="debt"
                headline="Need help getting debt under control?"
                description="A debt advisor can negotiate with creditors, restructure repayments, and create a plan to get you debt-free faster."
              />
            </div>

            {/* SEO content */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Debt Consolidation in Australia: What You Need to Know</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Debt consolidation combines multiple debts — credit cards, personal loans, car loans — into a single loan with one monthly repayment. The goal is to secure a lower interest rate than the weighted average of your existing debts, reducing your total interest costs and simplifying your finances.
              </p>
              <h3 className="text-base font-bold text-slate-900 mb-2">When does consolidation make sense?</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Consolidation typically works best when you have high-interest debts (like credit cards at 18-22%) and can access a personal loan at a significantly lower rate (6-12%). The key metric is <strong>total interest paid</strong> — not just the monthly payment. A longer loan term might lower your monthly payment but increase total interest.
              </p>
              <h3 className="text-base font-bold text-slate-900 mb-2">Watch out for these traps</h3>
              <ul className="text-sm text-slate-600 leading-relaxed mb-4 list-disc list-inside space-y-1">
                <li>Running up new debt on cleared credit cards after consolidating</li>
                <li>Extending the loan term so long that you pay more total interest</li>
                <li>Fees and charges on the consolidation loan (establishment, early repayment)</li>
                <li>Secured vs unsecured — using your home as security means risking it</li>
              </ul>
              <h3 className="text-base font-bold text-slate-900 mb-2">Free help available</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                If you&apos;re struggling with debt, the <strong>National Debt Helpline (1800 007 007)</strong> provides free, confidential financial counselling. You can also apply for hardship provisions directly with your lenders — they&apos;re legally required to consider your request under the National Credit Code.
              </p>
              <div className="flex gap-2 mt-4">
                <Link href="/savings-calculator" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Savings Calculator →</Link>
                <Link href="/calculators" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">All Calculators →</Link>
                <Link href="/find-advisor" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Find an Advisor →</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
