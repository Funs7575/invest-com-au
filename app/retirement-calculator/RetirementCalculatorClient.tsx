"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import SocialProofCounter from "@/components/SocialProofCounter";
import { trackEvent, trackPageDuration } from "@/lib/tracking";
import { getStoredUtm } from "@/components/UtmCapture";
import { storeQualificationData } from "@/lib/qualification-store";
import AdvisorMatchCTA from "@/components/AdvisorMatchCTA";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export default function RetirementCalculatorClient() {
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(67);
  const [currentSuper, setCurrentSuper] = useState(150000);
  const [annualSalary, setAnnualSalary] = useState(100000);
  const [employerRate, setEmployerRate] = useState(12);
  const [additionalContributions, setAdditionalContributions] = useState(0);
  const [expectedReturn, setExpectedReturn] = useState(7);
  const [inflationRate, setInflationRate] = useState(3);
  const [desiredIncome, setDesiredIncome] = useState(60000);
  const [showResults, setShowResults] = useState(false);
  const [emailGated, setEmailGated] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => { trackPageDuration("/retirement-calculator"); }, []);

  // ── Calculation logic ──
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const realReturn = ((1 + expectedReturn / 100) / (1 + inflationRate / 100)) - 1;
  const annualEmployerContrib = annualSalary * (employerRate / 100);
  const totalAnnualContrib = annualEmployerContrib + additionalContributions;

  // Project super balance at retirement (compound growth + annual contributions)
  let projectedSuper = currentSuper;
  const milestones: { age: number; balance: number }[] = [];
  for (let y = 1; y <= yearsToRetirement; y++) {
    projectedSuper = projectedSuper * (1 + expectedReturn / 100) + totalAnnualContrib;
    const age = currentAge + y;
    if (y === yearsToRetirement || age % 5 === 0) {
      milestones.push({ age, balance: projectedSuper });
    }
  }

  // How many years the balance lasts (drawdown at desired income, adjusted for inflation)
  let drawdownBalance = projectedSuper;
  let drawdownYears = 0;
  let annualDraw = desiredIncome;
  while (drawdownBalance > 0 && drawdownYears < 60) {
    drawdownBalance = drawdownBalance * (1 + realReturn) - annualDraw;
    annualDraw *= (1 + inflationRate / 100);
    drawdownYears++;
    if (drawdownBalance < 0) break;
  }

  // 4% rule target
  const neededForRetirement = desiredIncome / 0.04;
  const gap = neededForRetirement - projectedSuper;
  const isOnTrack = gap <= 0;

  // Extra contribution scenarios
  const extraScenarios = [100, 250, 500].map(monthly => {
    const extra = monthly * 12;
    let bal = currentSuper;
    for (let y = 1; y <= yearsToRetirement; y++) {
      bal = bal * (1 + expectedReturn / 100) + totalAnnualContrib + extra;
    }
    return { monthly, projected: bal };
  });

  const handleCalculate = () => {
    setShowResults(true);
    trackEvent("retirement_calc_result", {
      current_age: currentAge,
      retirement_age: retirementAge,
      current_super: currentSuper,
      annual_salary: annualSalary,
      employer_rate: employerRate,
      projected_super: projectedSuper.toFixed(0),
      gap: gap.toFixed(0),
      on_track: isOnTrack,
    }, "/retirement-calculator");

    storeQualificationData("retirement_calculator", {
      current_age: currentAge,
      retirement_age: retirementAge,
      current_super: currentSuper,
      annual_salary: annualSalary,
      projected_super: Math.round(projectedSuper),
      gap: Math.round(gap),
      is_on_track: isOnTrack,
    });
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    await fetch("/api/email-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source: "retirement-calculator", name: "", ...getStoredUtm() }),
    }).catch(() => {});
    setEmailSubmitted(true);
    setEmailGated(false);
    trackEvent("retirement_calc_email", { email: email.trim() }, "/retirement-calculator");
  };

  return (
    <div className="py-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-violet-600 via-violet-700 to-violet-800 text-white py-8 md:py-14 px-4">
        <div className="container-custom max-w-3xl text-center">
          <h1 className="text-xl md:text-3xl font-extrabold mb-2">How much do you need to retire?</h1>
          <p className="text-sm md:text-base text-violet-100">Project your super balance, see how long it lasts, and find out if you&apos;re on track for the retirement you want.</p>
          <div className="mt-3"><SocialProofCounter variant="badge" /></div>
        </div>
      </div>

      <div className="container-custom max-w-3xl py-6 md:py-10">
        {/* Input form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Current Age */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Current age</label>
              <input
                type="number"
                value={currentAge}
                onChange={e => setCurrentAge(Math.max(18, Math.min(75, parseInt(e.target.value) || 18)))}
                className="w-full px-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
              />
            </div>

            {/* Retirement Age */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Retirement age</label>
              <input
                type="number"
                value={retirementAge}
                onChange={e => setRetirementAge(Math.max(currentAge + 1, Math.min(80, parseInt(e.target.value) || 67)))}
                className="w-full px-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
              />
            </div>

            {/* Current Super Balance */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Current super balance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  value={currentSuper}
                  onChange={e => setCurrentSuper(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-8 pr-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                />
              </div>
            </div>

            {/* Annual Salary */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Annual salary (pre-tax)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  value={annualSalary}
                  onChange={e => setAnnualSalary(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-8 pr-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                />
              </div>
              <div className="flex gap-1.5 mt-2">
                {[60000, 80000, 100000, 150000, 200000].map(v => (
                  <button key={v} onClick={() => setAnnualSalary(v)} className={`text-[0.56rem] px-2 py-1 rounded-full font-semibold transition-all ${annualSalary === v ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    ${v / 1000}k
                  </button>
                ))}
              </div>
            </div>

            {/* Employer Super Rate */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Employer super rate</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={employerRate}
                  onChange={e => setEmployerRate(Math.max(0, Math.min(25, parseFloat(e.target.value) || 0)))}
                  className="w-full pr-8 pl-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
              </div>
            </div>

            {/* Additional Contributions */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Additional contributions (yearly)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  value={additionalContributions}
                  onChange={e => setAdditionalContributions(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-8 pr-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                />
              </div>
            </div>

            {/* Expected Return */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Expected return (p.a.)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={expectedReturn}
                  onChange={e => setExpectedReturn(Math.max(0, Math.min(15, parseFloat(e.target.value) || 0)))}
                  className="w-full pr-8 pl-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
              </div>
            </div>

            {/* Inflation Rate */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Inflation rate (p.a.)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={inflationRate}
                  onChange={e => setInflationRate(Math.max(0, Math.min(10, parseFloat(e.target.value) || 0)))}
                  className="w-full pr-8 pl-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
              </div>
            </div>

            {/* Desired Retirement Income */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Desired retirement income (per year)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  value={desiredIncome}
                  onChange={e => setDesiredIncome(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-8 pr-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="w-full mt-5 px-6 py-3.5 bg-violet-600 text-white text-base font-bold rounded-xl hover:bg-violet-700 transition-all shadow-lg hover:shadow-xl"
          >
            Calculate My Retirement →
          </button>
        </div>

        {/* Results */}
        {showResults && (
          <>
            {/* Projected super at retirement */}
            <div className={`rounded-2xl p-5 md:p-8 mb-6 text-center ${isOnTrack ? "bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200" : "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200"}`}>
              <p className="text-sm font-semibold mb-1" style={{ color: isOnTrack ? "#059669" : "#d97706" }}>
                Projected super at age {retirementAge}
              </p>
              <p className="text-3xl md:text-5xl font-black" style={{ color: isOnTrack ? "#047857" : "#b45309" }}>
                {formatCurrency(projectedSuper)}
              </p>
              <p className="text-sm text-slate-600 mt-2">
                Lasts approximately <strong>{drawdownYears} years</strong> at {formatCurrency(desiredIncome)}/year (inflation-adjusted)
              </p>

              <div className="mt-4 pt-4 border-t" style={{ borderColor: isOnTrack ? "#a7f3d0" : "#fde68a" }}>
                {isOnTrack ? (
                  <div className="flex items-center justify-center gap-2">
                    <Icon name="check-circle" size={20} className="text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700">You&apos;re on track for retirement</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Icon name="alert-triangle" size={20} className="text-amber-600" />
                      <span className="text-sm font-bold text-amber-700">You have a gap of {formatCurrency(gap)}</span>
                    </div>
                    <p className="text-xs text-slate-500">Based on the 4% rule, you need {formatCurrency(neededForRetirement)} to sustain {formatCurrency(desiredIncome)}/year</p>
                  </div>
                )}
              </div>
            </div>

            {/* Gap analysis detail */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 mb-6">
              <h2 className="text-base font-bold text-slate-900 mb-4">Gap Analysis</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-[0.62rem] text-slate-500 font-semibold uppercase tracking-wide mb-1">Your projected super</p>
                  <p className="text-lg md:text-xl font-extrabold text-slate-900">{formatCurrency(projectedSuper)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-[0.62rem] text-slate-500 font-semibold uppercase tracking-wide mb-1">Target (4% rule)</p>
                  <p className="text-lg md:text-xl font-extrabold text-slate-900">{formatCurrency(neededForRetirement)}</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
                <div
                  className={`h-3 rounded-full transition-all ${isOnTrack ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(100, (projectedSuper / neededForRetirement) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 text-right">{Math.round((projectedSuper / neededForRetirement) * 100)}% funded</p>
            </div>

            {/* Year-by-year milestones */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Projected Balance at Key Milestones</h2>
              </div>
              {milestones.map((m, i) => {
                const pct = Math.min(100, (m.balance / (projectedSuper * 1.1)) * 100);
                return (
                  <div key={m.age} className={`px-4 py-3 border-b border-slate-100 last:border-b-0 ${i === milestones.length - 1 ? "bg-violet-50/50" : ""}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-slate-700">Age {m.age}</span>
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(m.balance)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Extra contributions impact */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 mb-6">
              <h2 className="text-base font-bold text-slate-900 mb-1">Impact of Extra Contributions</h2>
              <p className="text-xs text-slate-500 mb-4">See how a little extra each month could change your outcome</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {extraScenarios.map(s => {
                  const boost = s.projected - projectedSuper;
                  return (
                    <div key={s.monthly} className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-500 font-semibold mb-1">+${s.monthly}/month</p>
                      <p className="text-lg font-extrabold text-slate-900">{formatCurrency(s.projected)}</p>
                      <p className="text-[0.62rem] font-bold text-emerald-600 mt-1">+{formatCurrency(boost)} more</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Email capture gate */}
            {!emailGated && !emailSubmitted && (
              <div className="text-center mb-6">
                <button onClick={() => setEmailGated(true)} className="text-xs text-slate-400 hover:text-slate-600">
                  Want to save this projection? Get it emailed to you →
                </button>
              </div>
            )}

            {emailGated && !emailSubmitted && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 mb-6 text-center">
                <p className="text-sm font-bold text-slate-900 mb-1">Save your retirement projection</p>
                <p className="text-xs text-slate-500 mb-3">Enter your email and we&apos;ll send you a detailed breakdown</p>
                <div className="flex gap-2 max-w-xs mx-auto">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" aria-label="Email address" className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                  <button onClick={handleEmailSubmit} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700">Send</button>
                </div>
              </div>
            )}

            {emailSubmitted && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 text-center">
                <p className="text-sm font-bold text-emerald-700">Sent! Check your inbox for your retirement projection.</p>
              </div>
            )}

            {/* Advisor Match CTA */}
            <div className="mb-6">
              <AdvisorMatchCTA
                needKey="planning"
                headline="Want a personalised retirement plan?"
                description="A financial planner builds a strategy around your goals, super, investments, and tax — so you can retire with confidence."
              />
            </div>

            {/* SEO content */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Retirement Planning in Australia</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Australia&apos;s superannuation system is designed to help you build a retirement nest egg over your working life. Your employer contributes a percentage of your salary (the <strong>Super Guarantee</strong>, currently 12% as of 2024-25) into your super fund, where it grows through investment returns over decades.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                The <strong>4% rule</strong> is a widely used guideline suggesting you can withdraw 4% of your retirement savings each year without running out of money over a 30-year retirement. For example, if you want {formatCurrency(desiredIncome)} per year in retirement, you&apos;d need {formatCurrency(desiredIncome / 0.04)} in total savings.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                The <strong>Age Pension</strong> provides a safety net for Australians who reach pension age (currently 67). The full single rate is approximately $28,514 per year, but the amount you receive depends on an assets test and income test. For most Australians, super alone won&apos;t fund a comfortable retirement — which is why additional contributions and smart investment choices matter.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                <strong>Salary sacrificing</strong> into super can be a tax-effective way to boost your retirement savings. Contributions up to the concessional cap ($30,000/year) are taxed at just 15%, rather than your marginal tax rate — saving high earners up to 32 cents on every dollar contributed.
              </p>
              <div className="flex gap-2 mt-4">
                <Link href="/super" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Compare Super Funds →</Link>
                <Link href="/find-advisor" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Find a Financial Advisor →</Link>
                <Link href="/calculators" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">More Calculators →</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
