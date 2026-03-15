"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import SocialProofCounter from "@/components/SocialProofCounter";
import { trackEvent, trackPageDuration } from "@/lib/tracking";
import { getStoredUtm } from "@/components/UtmCapture";

/* ── helpers ── */

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function smsfFixedCosts(): number {
  // Base SMSF running costs: audit ($1,500) + admin/accounting ($1,000)
  return 2_500;
}

function smsfInvestmentMgmtRate(): number {
  return 0.003; // 0.3% investment management
}

/* ── qualification data helper ── */

function storeQualificationData(data: Record<string, unknown>) {
  try {
    const existing = JSON.parse(localStorage.getItem("qualification_data") || "{}");
    const merged = { ...existing, ...data, updated_at: new Date().toISOString() };
    localStorage.setItem("qualification_data", JSON.stringify(merged));
  } catch { /* silently fail */ }
}

/* ── AdvisorMatchCTA ── */

function AdvisorMatchCTA({ needKey, headline, description }: { needKey: string; headline: string; description: string }) {
  return (
    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 md:p-6">
      <p className="text-sm font-bold text-violet-900 mb-1">{headline}</p>
      <p className="text-xs text-violet-700 mb-3">{description}</p>
      <Link
        href={`/find-advisor?need=${needKey}`}
        className="inline-block px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors"
      >
        Find an SMSF Specialist →
      </Link>
    </div>
  );
}

/* ── main component ── */

export default function SMSFCalculatorClient() {
  const [balance, setBalance] = useState(300_000);
  const [annualContribution, setAnnualContribution] = useState(27_500);
  const [currentFeePercent, setCurrentFeePercent] = useState(1.2);
  const [expectedReturn, setExpectedReturn] = useState(7);
  const [yearsToRetirement, setYearsToRetirement] = useState(20);
  const [showResults, setShowResults] = useState(false);
  const [emailGated, setEmailGated] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => { trackPageDuration("/smsf-calculator"); }, []);

  /* ── projection engine ── */

  function projectBalance(startBalance: number, contribution: number, returnRate: number, feeRate: number, fixedCost: number, years: number) {
    let bal = startBalance;
    let totalFees = 0;
    for (let y = 0; y < years; y++) {
      const growth = bal * (returnRate / 100);
      const fee = bal * feeRate + fixedCost;
      totalFees += fee;
      bal = bal + growth - fee + contribution;
    }
    return { projectedBalance: bal, totalFees };
  }

  // Current fund projection
  const currentFund = projectBalance(balance, annualContribution, expectedReturn, currentFeePercent / 100, 0, yearsToRetirement);

  // SMSF projection — fixed costs scale with balance over time, recalculate year by year
  function projectSMSF(startBalance: number, contribution: number, returnRate: number, years: number) {
    let bal = startBalance;
    let totalCosts = 0;
    for (let y = 0; y < years; y++) {
      const growth = bal * (returnRate / 100);
      const investMgmt = bal * smsfInvestmentMgmtRate();
      const fixed = smsfFixedCosts();
      const totalAnnualCost = fixed + investMgmt;
      totalCosts += totalAnnualCost;
      bal = bal + growth - totalAnnualCost + contribution;
    }
    return { projectedBalance: bal, totalCosts };
  }

  const smsfResult = projectSMSF(balance, annualContribution, expectedReturn, yearsToRetirement);

  const netBenefit = smsfResult.projectedBalance - currentFund.projectedBalance;
  const smsfWorthIt = balance >= 200_000 && netBenefit > 0;

  const smsfAnnualCostEstimate = smsfFixedCosts() + balance * smsfInvestmentMgmtRate();

  const handleCalculate = () => {
    setShowResults(true);
    setEmailGated(true);

    trackEvent("smsf_calc_result", {
      balance,
      annual_contribution: annualContribution,
      current_fee_pct: currentFeePercent,
      expected_return: expectedReturn,
      years: yearsToRetirement,
      net_benefit: Math.round(netBenefit),
      smsf_worth_it: smsfWorthIt,
    }, "/smsf-calculator");

    storeQualificationData({
      source: "smsf-calculator",
      super_balance: balance,
      annual_contribution: annualContribution,
      current_fee_pct: currentFeePercent,
      years_to_retirement: yearsToRetirement,
      smsf_worth_it: smsfWorthIt,
      net_benefit: Math.round(netBenefit),
      ...getStoredUtm(),
    });
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    await fetch("/api/email-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source: "smsf-calculator", name: "", ...getStoredUtm() }),
    }).catch(() => {});
    setEmailSubmitted(true);
    setEmailGated(false);
    trackEvent("smsf_calc_email", { email: email.trim() }, "/smsf-calculator");
  };

  const handleShare = () => {
    const text = netBenefit > 0
      ? `Switching to an SMSF could grow my super by an extra ${formatCurrency(netBenefit)} over ${yearsToRetirement} years. Check yours: invest.com.au/smsf-calculator`
      : `I just checked whether an SMSF makes sense for my super. Check yours: invest.com.au/smsf-calculator`;
    if (navigator.share) {
      navigator.share({ title: "SMSF Calculator", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <div className="py-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white py-8 md:py-14 px-4">
        <div className="container-custom max-w-3xl text-center">
          <h1 className="text-xl md:text-3xl font-extrabold mb-2">Is a Self-Managed Super Fund right for you?</h1>
          <p className="text-sm md:text-base text-blue-100">Enter your super details below — we&apos;ll compare your current fund against running an SMSF.</p>
          <div className="mt-3"><SocialProofCounter variant="badge" /></div>
        </div>
      </div>

      <div className="container-custom max-w-3xl py-6 md:py-10">
        {/* Input form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Super balance */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Current super balance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  value={balance}
                  onChange={e => setBalance(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-8 pr-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                />
              </div>
              <div className="flex gap-1.5 mt-2">
                {[100_000, 200_000, 300_000, 500_000, 1_000_000].map(v => (
                  <button key={v} onClick={() => setBalance(v)} className={`text-[0.56rem] px-2 py-1 rounded-full font-semibold transition-all ${balance === v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {v >= 1_000_000 ? `$${v / 1_000_000}M` : `$${v / 1000}k`}
                  </button>
                ))}
              </div>
            </div>

            {/* Annual contribution */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Annual contribution</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input
                  type="number"
                  value={annualContribution}
                  onChange={e => setAnnualContribution(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-8 pr-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                />
              </div>
              <p className="text-[0.6rem] text-slate-400 mt-1">Concessional cap $30,000/yr (2024-25)</p>
            </div>

            {/* Current fund fee */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Current fund annual fee</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={currentFeePercent}
                  onChange={e => setCurrentFeePercent(Math.max(0, Math.min(5, parseFloat(e.target.value) || 0)))}
                  className="w-full pr-8 pl-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[0.5, 0.8, 1.0, 1.2, 1.5, 2.0].map(v => (
                  <button key={v} onClick={() => setCurrentFeePercent(v)} className={`text-[0.56rem] px-2 py-1 rounded-full font-semibold transition-all ${currentFeePercent === v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {v}%
                  </button>
                ))}
              </div>
            </div>

            {/* Expected return */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Expected annual return</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={expectedReturn}
                  onChange={e => setExpectedReturn(Math.max(0, Math.min(15, parseFloat(e.target.value) || 0)))}
                  className="w-full pr-8 pl-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[5, 6, 7, 8, 9, 10].map(v => (
                  <button key={v} onClick={() => setExpectedReturn(v)} className={`text-[0.56rem] px-2 py-1 rounded-full font-semibold transition-all ${expectedReturn === v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {v}%
                  </button>
                ))}
              </div>
            </div>

            {/* Years to retirement */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Years to retirement</label>
              <div className="relative">
                <input
                  type="number"
                  value={yearsToRetirement}
                  onChange={e => setYearsToRetirement(Math.max(1, Math.min(50, parseInt(e.target.value) || 0)))}
                  className="w-full pl-4 pr-12 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">years</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[5, 10, 15, 20, 25, 30].map(v => (
                  <button key={v} onClick={() => setYearsToRetirement(v)} className={`text-[0.56rem] px-2 py-1 rounded-full font-semibold transition-all ${yearsToRetirement === v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {v}yr
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleCalculate}
            className="w-full mt-5 px-6 py-3.5 bg-blue-600 text-white text-base font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            Compare SMSF vs Current Fund →
          </button>
        </div>

        {/* Results */}
        {showResults && (
          <>
            {/* Verdict */}
            <div className={`rounded-2xl p-5 md:p-8 mb-6 text-center ${smsfWorthIt ? "bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200" : "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200"}`}>
              {smsfWorthIt ? (
                <>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full mb-3">
                    <Icon name="check-circle" size={14} /> SMSF is likely worth considering
                  </div>
                  <p className="text-3xl md:text-5xl font-black text-emerald-700">{formatCurrency(netBenefit)}</p>
                  <p className="text-sm text-emerald-600 mt-1">potential extra super at retirement with an SMSF</p>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mb-3">
                    <Icon name="alert-triangle" size={14} /> Your current fund may be better
                  </div>
                  <p className="text-3xl md:text-5xl font-black text-amber-700">{formatCurrency(Math.abs(netBenefit))}</p>
                  <p className="text-sm text-amber-600 mt-1">
                    {netBenefit < 0 ? "less at retirement with an SMSF — the higher fixed costs outweigh fee savings" : "potential difference — an SMSF may not justify the added complexity"}
                  </p>
                </>
              )}
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={handleShare} className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 font-semibold text-slate-600">
                  <Icon name="share-2" size={12} className="inline mr-1" />Share Result
                </button>
              </div>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Current fund card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                    <Icon name="landmark" size={16} className="text-slate-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Current Fund</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">Projected balance</span>
                    <span className="text-lg font-extrabold text-slate-900">{formatCurrency(currentFund.projectedBalance)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">Total fees paid</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(currentFund.totalFees)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">Annual fee rate</span>
                    <span className="text-sm font-bold text-slate-700">{currentFeePercent}%</span>
                  </div>
                </div>
              </div>

              {/* SMSF card */}
              <div className={`border rounded-2xl p-5 ${smsfWorthIt ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-slate-200"}`}>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${smsfWorthIt ? "bg-emerald-200" : "bg-slate-200"}`}>
                    <Icon name="shield" size={16} className={smsfWorthIt ? "text-emerald-700" : "text-slate-600"} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">SMSF</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">Projected balance</span>
                    <span className="text-lg font-extrabold text-slate-900">{formatCurrency(smsfResult.projectedBalance)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">Total costs paid</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(smsfResult.totalCosts)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-500">Est. annual running cost</span>
                    <span className="text-sm font-bold text-slate-700">{formatCurrency(smsfAnnualCostEstimate)}</span>
                  </div>
                  <div className="text-[0.6rem] text-slate-400">
                    Includes ${smsfFixedCosts().toLocaleString()} base (audit + admin) + 0.3% investment mgmt
                  </div>
                </div>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 mb-6">
              <h3 className="text-sm font-bold text-slate-900 mb-3">SMSF Cost Breakdown (Annual Estimate)</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Accounting &amp; admin</span>
                  <span className="font-bold text-slate-900">$1,000 - $2,500</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Annual audit</span>
                  <span className="font-bold text-slate-900">$500 - $1,500</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Investment management (0.3%)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(balance * 0.003)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">ASIC annual levy</span>
                  <span className="font-bold text-slate-900">$259</span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between text-sm">
                  <span className="font-bold text-slate-700">Estimated total</span>
                  <span className="font-extrabold text-slate-900">{formatCurrency(2_500 + balance * 0.003 + 259)} - {formatCurrency(5_000 + balance * 0.003 + 259)}</span>
                </div>
              </div>
            </div>

            {/* Email capture gate */}
            {emailGated && !emailSubmitted && (
              <div className="bg-slate-900 rounded-xl p-4 md:p-5 text-white mb-6">
                <div className="flex items-start gap-3">
                  <Icon name="mail" size={20} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">Get your personalised SMSF comparison emailed to you</p>
                    <p className="text-xs text-slate-300 mb-3">Includes a detailed breakdown, checklist, and next steps for your situation.</p>
                    <div className="flex gap-2">
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="flex-1 px-3 py-2 text-sm rounded-lg text-slate-900 border-0" />
                      <button onClick={handleEmailSubmit} className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 shrink-0">Send Report</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Show gate trigger */}
            {!emailGated && !emailSubmitted && (
              <div className="text-center mb-6">
                <button onClick={() => setEmailGated(true)} className="text-xs text-slate-400 hover:text-slate-600">
                  Want to save this comparison? Get it emailed to you →
                </button>
              </div>
            )}

            {/* Advisor Match CTA */}
            <div className="mb-6">
              <AdvisorMatchCTA
                needKey="smsf"
                headline="Need help setting up an SMSF?"
                description="An SMSF specialist handles setup, compliance, audit, and investment strategy — so you can focus on growing your wealth."
              />
            </div>

            {/* SEO content */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 space-y-4">
              <h2 className="text-lg font-bold text-slate-900">What Is an SMSF?</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                A Self-Managed Super Fund (SMSF) is a private superannuation fund regulated by the ATO that you manage yourself. Unlike industry or retail super funds, an SMSF gives you full control over investment decisions — including direct property, shares, term deposits, and alternative assets. As of 2024, there are over 600,000 SMSFs in Australia managing more than $900 billion in assets.
              </p>

              <h2 className="text-lg font-bold text-slate-900">When Does an SMSF Make Sense?</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                The ATO and most financial advisors suggest an SMSF generally becomes cost-effective when your super balance exceeds <strong>$200,000</strong>. Below this threshold, the fixed costs of running an SMSF (audit, accounting, ASIC levy) eat into your returns more than a retail or industry fund&apos;s percentage-based fees. The sweet spot is typically <strong>$500,000+</strong>, where the fixed costs become a much smaller percentage of your total balance.
              </p>

              <h2 className="text-lg font-bold text-slate-900">SMSF Trustee Requirements (ATO)</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                To run an SMSF, you must be a trustee (or director of the corporate trustee). Key ATO requirements include:
              </p>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li>Maximum of 6 members (increased from 4 in 2021)</li>
                <li>All members must be trustees (or directors of the corporate trustee)</li>
                <li>Annual audit by an approved SMSF auditor</li>
                <li>An investment strategy that is regularly reviewed</li>
                <li>Annual return lodged with the ATO</li>
                <li>Sole purpose test — the fund must be maintained for retirement benefits only</li>
                <li>Trustees cannot be disqualified persons (e.g., undischarged bankrupt)</li>
              </ul>

              <h2 className="text-lg font-bold text-slate-900">SMSF Costs vs Industry/Retail Funds</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Retail and industry super funds typically charge 0.5% to 1.5% of your balance per year in total fees (admin + investment + insurance). For a $500,000 balance, that&apos;s $2,500 to $7,500 per year. An SMSF has fixed costs of roughly $2,000 to $5,000 per year regardless of balance size, plus any investment management fees. This means the larger your balance, the more cost-effective an SMSF becomes as a percentage of total assets.
              </p>

              <h2 className="text-lg font-bold text-slate-900">Risks and Responsibilities</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Running an SMSF is not set-and-forget. You&apos;re legally responsible for compliance with super and tax law, maintaining records, lodging annual returns, and ensuring the fund meets the sole purpose test. Penalties for non-compliance can be severe — including fines of up to $18,780 per contravention. If you&apos;re not confident managing investments and paperwork, an industry fund with low fees may be the better choice.
              </p>

              <div className="flex gap-2 mt-4 flex-wrap">
                <Link href="/super" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Compare Super Funds →</Link>
                <Link href="/find-advisor?need=smsf" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Find an SMSF Specialist →</Link>
                <Link href="/savings-calculator" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Savings Calculator →</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
