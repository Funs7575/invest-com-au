"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import SocialProofCounter from "@/components/SocialProofCounter";
import { trackEvent, trackPageDuration } from "@/lib/tracking";
import { getStoredUtm } from "@/components/UtmCapture";
import { storeQualificationData } from "@/lib/qualification-store";

/* ── helpers ─────────────────────────────────────────── */

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function formatCurrencyExact(n: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

/** P&I monthly = P * [r(1+r)^n] / [(1+r)^n - 1] */
function calcPIMonthly(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/** Interest Only monthly = P * r */
function calcIOMonthly(principal: number, annualRate: number): number {
  return principal * (annualRate / 100 / 12);
}

type RepaymentType = "pi" | "io";

/* ── component ───────────────────────────────────────── */

export default function MortgageCalculatorClient() {
  const [loanAmount, setLoanAmount] = useState(600000);
  const [interestRate, setInterestRate] = useState(6.0);
  const [loanTerm, setLoanTerm] = useState<25 | 30>(30);
  const [repaymentType, setRepaymentType] = useState<RepaymentType>("pi");
  const [showResults, setShowResults] = useState(false);
  const [emailGated, setEmailGated] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => { trackPageDuration("/mortgage-calculator"); }, []);

  /* ── derived calculations ─────────────────────────── */

  const monthly = useMemo(() => {
    if (repaymentType === "pi") return calcPIMonthly(loanAmount, interestRate, loanTerm);
    return calcIOMonthly(loanAmount, interestRate);
  }, [loanAmount, interestRate, loanTerm, repaymentType]);

  const totalMonths = loanTerm * 12;
  const totalPaid = monthly * totalMonths;
  const totalInterest = repaymentType === "pi" ? totalPaid - loanAmount : totalPaid;
  const totalCost = repaymentType === "pi" ? totalPaid : totalPaid + loanAmount; // IO still owes principal

  /* ── rate comparison scenarios ─────────────────────── */

  const rateOffsets = [-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5];
  const rateScenarios = useMemo(() => {
    return rateOffsets
      .map(offset => {
        const rate = Math.max(0.1, interestRate + offset);
        const mo = repaymentType === "pi" ? calcPIMonthly(loanAmount, rate, loanTerm) : calcIOMonthly(loanAmount, rate);
        const total = mo * totalMonths;
        const interest = repaymentType === "pi" ? total - loanAmount : total;
        return { offset, rate: parseFloat(rate.toFixed(2)), monthly: mo, totalInterest: interest, diff: mo - monthly };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanAmount, interestRate, loanTerm, repaymentType, monthly]);

  /* ── amortization schedule (gated) ────────────────── */

  const amortizationSchedule = useMemo(() => {
    if (repaymentType !== "pi") return [];
    const r = interestRate / 100 / 12;
    let balance = loanAmount;
    const schedule: { year: number; principalPaid: number; interestPaid: number; balance: number }[] = [];
    for (let year = 1; year <= loanTerm; year++) {
      let yearPrincipal = 0;
      let yearInterest = 0;
      for (let m = 0; m < 12; m++) {
        const interestPayment = balance * r;
        const principalPayment = monthly - interestPayment;
        yearInterest += interestPayment;
        yearPrincipal += principalPayment;
        balance -= principalPayment;
      }
      schedule.push({ year, principalPaid: yearPrincipal, interestPaid: yearInterest, balance: Math.max(0, balance) });
    }
    return schedule;
  }, [loanAmount, interestRate, loanTerm, repaymentType, monthly]);

  /* ── handlers ─────────────────────────────────────── */

  const handleCalculate = () => {
    setShowResults(true);
    storeQualificationData("mortgage_calculator", {
      loan_amount: loanAmount,
      interest_rate: interestRate,
      loan_term: loanTerm,
      repayment_type: repaymentType,
      monthly_repayment: monthly,
    });
    trackEvent("mortgage_calc_result", {
      loan_amount: loanAmount,
      interest_rate: interestRate,
      loan_term: loanTerm,
      repayment_type: repaymentType,
      monthly_repayment: monthly.toFixed(0),
      total_interest: totalInterest.toFixed(0),
    }, "/mortgage-calculator");
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    await fetch("/api/email-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source: "mortgage-calculator", name: "", ...getStoredUtm() }),
    }).catch(() => {});
    setEmailSubmitted(true);
    setEmailGated(false);
    trackEvent("mortgage_calc_email", { email: email.trim() }, "/mortgage-calculator");
  };

  const handleShare = () => {
    const text = `My ${loanTerm}-year mortgage at ${interestRate}% on ${formatCurrency(loanAmount)} = ${formatCurrencyExact(monthly)}/month. Total interest: ${formatCurrency(totalInterest)}. Check yours: invest.com.au/mortgage-calculator`;
    if (navigator.share) {
      navigator.share({ title: "Mortgage Repayment Calculator", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  /* ── render ────────────────────────────────────────── */

  return (
    <div className="py-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-rose-800 text-white py-8 md:py-14 px-4">
        <div className="container-custom max-w-3xl text-center">
          <h1 className="text-xl md:text-3xl font-extrabold mb-2">How much will your mortgage really cost?</h1>
          <p className="text-sm md:text-base text-rose-100">Enter your loan details — we'll show you monthly repayments, total interest, and how rate changes affect the cost.</p>
          <div className="mt-3"><SocialProofCounter variant="badge" /></div>
        </div>
      </div>

      <div className="container-custom max-w-3xl py-6 md:py-10">
        {/* Input form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Loan amount */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Loan amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={e => setLoanAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-8 pr-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none"
                />
              </div>
              <div className="flex gap-1.5 mt-2">
                {[300000, 500000, 600000, 800000, 1000000].map(v => (
                  <button key={v} onClick={() => setLoanAmount(v)} className={`text-[0.56rem] px-2 py-1 rounded-full font-semibold transition-all ${loanAmount === v ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {v >= 1000000 ? `$${v / 1000000}M` : `$${v / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Interest rate */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Interest rate</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={interestRate}
                  onChange={e => setInterestRate(Math.max(0, Math.min(20, parseFloat(e.target.value) || 0)))}
                  className="w-full pr-8 pl-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[5.5, 6.0, 6.5, 7.0, 7.5].map(v => (
                  <button key={v} onClick={() => setInterestRate(v)} className={`text-[0.56rem] px-2 py-1 rounded-full font-semibold transition-all ${interestRate === v ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Loan term & repayment type toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Loan term</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                {([25, 30] as const).map(y => (
                  <button
                    key={y}
                    onClick={() => setLoanTerm(y)}
                    className={`flex-1 py-2.5 text-sm font-bold transition-all ${loanTerm === y ? "bg-rose-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    {y} years
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Repayment type</label>
              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setRepaymentType("pi")}
                  className={`flex-1 py-2.5 text-sm font-bold transition-all ${repaymentType === "pi" ? "bg-rose-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  P&I
                </button>
                <button
                  onClick={() => setRepaymentType("io")}
                  className={`flex-1 py-2.5 text-sm font-bold transition-all ${repaymentType === "io" ? "bg-rose-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  Interest Only
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="w-full mt-5 px-6 py-3.5 bg-rose-600 text-white text-base font-bold rounded-xl hover:bg-rose-700 transition-all shadow-lg hover:shadow-xl"
          >
            Calculate My Repayments <Icon name="arrow-right" className="inline w-4 h-4 ml-1" />
          </button>
        </div>

        {/* Results */}
        {showResults && (
          <>
            {/* Headline result */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-5 md:p-8 mb-6 text-center">
              <p className="text-sm text-rose-600 font-semibold mb-1">Your monthly repayment</p>
              <p className="text-3xl md:text-5xl font-black text-rose-700">{formatCurrencyExact(monthly)}<span className="text-lg md:text-2xl">/mo</span></p>
              <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-[0.62rem] text-slate-500 uppercase tracking-wide font-semibold">Total Interest</p>
                  <p className="text-sm md:text-base font-extrabold text-slate-900 mt-0.5">{formatCurrency(totalInterest)}</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-[0.62rem] text-slate-500 uppercase tracking-wide font-semibold">Total Cost</p>
                  <p className="text-sm md:text-base font-extrabold text-slate-900 mt-0.5">{formatCurrency(totalCost)}</p>
                </div>
                <div className="bg-white/70 rounded-xl p-3">
                  <p className="text-[0.62rem] text-slate-500 uppercase tracking-wide font-semibold">Loan Term</p>
                  <p className="text-sm md:text-base font-extrabold text-slate-900 mt-0.5">{loanTerm} yrs · {repaymentType === "pi" ? "P&I" : "IO"}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={handleShare} className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 font-semibold text-slate-600">
                  <Icon name="share" className="inline w-3 h-3 mr-1" />Share Result
                </button>
              </div>
            </div>

            {/* Interest vs principal visual */}
            {repaymentType === "pi" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 mb-6">
                <h2 className="text-sm font-bold text-slate-900 mb-3">Where your money goes</h2>
                <div className="flex rounded-full overflow-hidden h-5">
                  <div
                    className="bg-rose-500 flex items-center justify-center text-[0.5rem] text-white font-bold"
                    style={{ width: `${(totalInterest / totalCost) * 100}%` }}
                  >
                    Interest
                  </div>
                  <div
                    className="bg-emerald-500 flex items-center justify-center text-[0.5rem] text-white font-bold"
                    style={{ width: `${(loanAmount / totalCost) * 100}%` }}
                  >
                    Principal
                  </div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs text-rose-600 font-semibold">{formatCurrency(totalInterest)} interest ({((totalInterest / totalCost) * 100).toFixed(0)}%)</span>
                  <span className="text-xs text-emerald-600 font-semibold">{formatCurrency(loanAmount)} principal ({((loanAmount / totalCost) * 100).toFixed(0)}%)</span>
                </div>
              </div>
            )}

            {/* Rate comparison table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Rate Comparison</h2>
                <span className="text-[0.56rem] text-slate-400">See how rate changes affect your repayments</span>
              </div>
              <div className="divide-y divide-slate-100">
                {rateScenarios.map(s => (
                  <div key={s.offset} className={`px-4 py-3 flex items-center justify-between ${s.offset === 0 ? "bg-rose-50/50" : ""}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${s.offset === 0 ? "bg-rose-600 text-white" : s.offset < 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {s.offset === 0 ? "You" : `${s.offset > 0 ? "+" : ""}${s.offset}%`}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{s.rate}% p.a.</div>
                        <div className="text-[0.62rem] text-slate-500">{formatCurrencyExact(s.monthly)}/mo</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(s.totalInterest)}</div>
                      <div className="text-[0.56rem] text-slate-500">total interest</div>
                      {s.offset !== 0 && (
                        <div className={`text-[0.56rem] font-bold ${s.diff < 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {s.diff < 0 ? "" : "+"}{formatCurrencyExact(s.diff)}/mo
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amortization schedule (email gated) */}
            {repaymentType === "pi" && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Amortization Schedule</h2>
                  <span className="text-[0.56rem] text-slate-400">Year-by-year breakdown</span>
                </div>

                {/* Show first 5 years always */}
                <div className="divide-y divide-slate-100">
                  <div className="px-4 py-2 grid grid-cols-4 text-[0.62rem] text-slate-500 font-semibold uppercase tracking-wide bg-slate-50/50">
                    <span>Year</span>
                    <span className="text-right">Principal</span>
                    <span className="text-right">Interest</span>
                    <span className="text-right">Balance</span>
                  </div>
                  {amortizationSchedule.slice(0, emailSubmitted ? amortizationSchedule.length : 5).map(row => (
                    <div key={row.year} className="px-4 py-2 grid grid-cols-4 text-sm">
                      <span className="font-semibold text-slate-700">{row.year}</span>
                      <span className="text-right text-slate-600">{formatCurrency(row.principalPaid)}</span>
                      <span className="text-right text-slate-600">{formatCurrency(row.interestPaid)}</span>
                      <span className="text-right font-semibold text-slate-900">{formatCurrency(row.balance)}</span>
                    </div>
                  ))}
                </div>

                {/* Email gate for full schedule */}
                {!emailSubmitted && amortizationSchedule.length > 5 && !emailGated && (
                  <div className="px-4 py-4 text-center border-t border-slate-100">
                    <button onClick={() => setEmailGated(true)} className="text-xs text-rose-600 hover:text-rose-700 font-semibold">
                      <Icon name="lock" className="inline w-3 h-3 mr-1" />Unlock full {loanTerm}-year amortization schedule
                    </button>
                  </div>
                )}

                {emailGated && !emailSubmitted && (
                  <div className="px-4 py-6 bg-gradient-to-b from-white to-slate-50 text-center border-t border-slate-100">
                    <p className="text-sm font-bold text-slate-900 mb-1">See the full {loanTerm}-year schedule</p>
                    <p className="text-xs text-slate-500 mb-3">Enter your email to unlock the complete amortization breakdown</p>
                    <div className="flex gap-2 max-w-xs mx-auto">
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        onKeyDown={e => e.key === "Enter" && handleEmailSubmit()}
                      />
                      <button onClick={handleEmailSubmit} className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700">Unlock</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Advisor Match CTA */}
            <AdvisorMatchCTA
              needKey="mortgage"
              headline="Could a broker get you a better rate?"
              description="Mortgage brokers compare 30+ lenders to find you the lowest rate — their service is free, paid by lenders."
            />

            {/* SEO content */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Understanding Mortgage Rates in Australia</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Australian mortgage rates are influenced by the RBA cash rate, bank funding costs, and competitive pressures between lenders. As of 2026, variable rates for owner-occupiers typically range from 5.5% to 7.0%, while fixed rates vary depending on the term. Even a 0.5% difference on a $600,000 loan can save you <strong>over $60,000</strong> in interest over 30 years.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                <strong>Principal & Interest (P&I)</strong> repayments reduce your loan balance each month, meaning you pay less interest overall. <strong>Interest Only (IO)</strong> repayments are lower month-to-month but cost significantly more over the life of the loan because the balance never decreases. IO periods are typically limited to 5 years for owner-occupiers.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                When comparing home loans, look beyond the advertised rate. The <strong>comparison rate</strong> includes fees and charges, giving a more accurate picture of the true cost. Offset accounts, redraw facilities, and the ability to make extra repayments without penalty can also save you thousands.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Link href="/compare?filter=mortgage" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Compare Home Loans →</Link>
                <Link href="/savings-calculator" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Savings Calculator →</Link>
                <Link href="/switching-calculator" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Broker Switching Calc →</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── AdvisorMatchCTA sub-component ───────────────────── */

function AdvisorMatchCTA({ needKey, headline, description }: { needKey: string; headline: string; description: string }) {
  return (
    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <Icon name="message-circle" className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-violet-900 mb-1">{headline}</p>
          <p className="text-xs text-violet-700 mb-3">{description}</p>
          <Link
            href={`/find-advisor?need=${needKey}`}
            className="inline-block px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors"
          >
            Match Me With a Broker →
          </Link>
        </div>
      </div>
    </div>
  );
}
