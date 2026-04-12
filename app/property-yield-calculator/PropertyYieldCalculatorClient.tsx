"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import SocialProofCounter from "@/components/SocialProofCounter";
import { trackEvent, trackPageDuration } from "@/lib/tracking";
import { getStoredUtm } from "@/components/UtmCapture";

/* ─── helpers ─── */

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function formatPercent(n: number): string {
  return n.toFixed(2) + "%";
}

function yieldColor(grossYield: number): { bg: string; text: string; border: string; label: string } {
  if (grossYield >= 5) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Strong yield" };
  if (grossYield >= 3) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Moderate yield" };
  return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Low yield" };
}

/* ─── qualification data helper ─── */

function storeQualificationData(data: Record<string, unknown>) {
  try {
    const existing = JSON.parse(localStorage.getItem("qualification_data") || "{}");
    localStorage.setItem("qualification_data", JSON.stringify({ ...existing, ...data, updated_at: new Date().toISOString() }));
  } catch { /* ignore */ }
}

/* ─── AdvisorMatchCTA ─── */

function AdvisorMatchCTA({ needKey, headline, description }: { needKey: string; headline: string; description: string }) {
  return (
    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl p-5 md:p-8 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shrink-0">
          <Icon name="user-check" size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-base md:text-lg font-bold text-violet-900 mb-1">{headline}</h3>
          <p className="text-sm text-violet-700 mb-3">{description}</p>
          <Link
            href={`/find-advisor?need=${needKey}`}
            className="inline-block px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors"
          >
            Find a Property Advisor &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── main component ─── */

export default function PropertyYieldCalculatorClient() {
  const [purchasePrice, setPurchasePrice] = useState(750000);
  const [weeklyRent, setWeeklyRent] = useState(550);

  /* expense fields */
  const [councilRates, setCouncilRates] = useState(2000);
  const [insurance, setInsurance] = useState(1500);
  const [maintenance, setMaintenance] = useState(2000);
  const [managementPct, setManagementPct] = useState(7);
  const [strata, setStrata] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState(0);

  /* mortgage overlay (optional) */
  const [showMortgage, setShowMortgage] = useState(false);
  const [loanAmount, setLoanAmount] = useState(600000);
  const [interestRate, setInterestRate] = useState(6.2);

  const [showResults, setShowResults] = useState(false);
  const [emailGated, setEmailGated] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => { trackPageDuration("/property-yield-calculator"); }, []);

  /* ─── calculations ─── */
  const annualRent = weeklyRent * 52;
  const propertyManagement = annualRent * (managementPct / 100);
  const totalExpenses = councilRates + insurance + maintenance + propertyManagement + strata + otherExpenses;
  const grossYield = purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : 0;
  const netYield = purchasePrice > 0 ? ((annualRent - totalExpenses) / purchasePrice) * 100 : 0;
  const netIncome = annualRent - totalExpenses;

  /* mortgage calcs (interest-only for simplicity) */
  const annualMortgageCost = loanAmount * (interestRate / 100);
  const monthlyMortgage = annualMortgageCost / 12;
  const monthlyRent = annualRent / 12;
  const monthlyExpenses = totalExpenses / 12;
  const monthlyCashFlow = monthlyRent - monthlyExpenses - (showMortgage ? monthlyMortgage : 0);

  const yieldStyle = yieldColor(grossYield);

  const handleCalculate = () => {
    setShowResults(true);
    setEmailGated(false);
    setEmailSubmitted(false);

    trackEvent("property_yield_calc_result", {
      purchase_price: purchasePrice,
      weekly_rent: weeklyRent,
      gross_yield: grossYield.toFixed(2),
      net_yield: netYield.toFixed(2),
    }, "/property-yield-calculator");

    storeQualificationData({
      source: "property-yield-calculator",
      purchase_price: purchasePrice,
      weekly_rent: weeklyRent,
      gross_yield: grossYield.toFixed(2),
      net_yield: netYield.toFixed(2),
      ...getStoredUtm(),
    });
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    await fetch("/api/email-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source: "property-yield-calculator", name: "", ...getStoredUtm() }),
    }).catch(() => {});
    setEmailSubmitted(true);
    setEmailGated(false);
    trackEvent("property_yield_calc_email", { email: email.trim() }, "/property-yield-calculator");
  };

  return (
    <div className="py-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 text-white py-8 md:py-14 px-4">
        <div className="container-custom max-w-3xl text-center">
          <h1 className="text-xl md:text-3xl font-extrabold mb-2">Property Yield Calculator</h1>
          <p className="text-sm md:text-base text-emerald-100">Enter your purchase price, rent, and expenses — we&rsquo;ll calculate your gross and net rental yield instantly.</p>
          <div className="mt-3"><SocialProofCounter variant="badge" /></div>
        </div>
      </div>

      <div className="container-custom max-w-3xl py-6 md:py-10">
        {/* Input form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 shadow-sm mb-6">
          {/* Purchase price */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Purchase price</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
              <input
                type="number"
                value={purchasePrice}
                onChange={e => setPurchasePrice(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full pl-8 pr-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none"
              />
            </div>
            <div className="flex gap-1.5 mt-2">
              {[
                { label: "$400k", value: 400000 },
                { label: "$600k", value: 600000 },
                { label: "$750k", value: 750000 },
                { label: "$1M", value: 1000000 },
                { label: "$1.5M", value: 1500000 },
              ].map(v => (
                <button key={v.value} onClick={() => setPurchasePrice(v.value)} className={`text-[0.56rem] px-2 py-1 rounded-full font-semibold transition-all ${purchasePrice === v.value ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly rent */}
          <div className="mb-5">
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Weekly rent</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
              <input
                type="number"
                value={weeklyRent}
                onChange={e => setWeeklyRent(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full pl-8 pr-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none"
              />
            </div>
            <div className="flex gap-1.5 mt-2">
              {[350, 450, 550, 700, 900].map(v => (
                <button key={v} onClick={() => setWeeklyRent(v)} className={`text-[0.56rem] px-2 py-1 rounded-full font-semibold transition-all ${weeklyRent === v ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  ${v}/wk
                </button>
              ))}
            </div>
          </div>

          {/* Annual expenses */}
          <div className="mb-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Annual expenses</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[0.62rem] md:text-xs font-semibold text-slate-600 mb-1">Council rates</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input type="number" value={councilRates} onChange={e => setCouncilRates(Math.max(0, parseInt(e.target.value) || 0))} className="w-full pl-6 pr-2 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[0.62rem] md:text-xs font-semibold text-slate-600 mb-1">Insurance</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input type="number" value={insurance} onChange={e => setInsurance(Math.max(0, parseInt(e.target.value) || 0))} className="w-full pl-6 pr-2 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[0.62rem] md:text-xs font-semibold text-slate-600 mb-1">Maintenance</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input type="number" value={maintenance} onChange={e => setMaintenance(Math.max(0, parseInt(e.target.value) || 0))} className="w-full pl-6 pr-2 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[0.62rem] md:text-xs font-semibold text-slate-600 mb-1">Property mgmt (%)</label>
                <div className="relative">
                  <input type="number" step="0.5" value={managementPct} onChange={e => setManagementPct(Math.max(0, Math.min(15, parseFloat(e.target.value) || 0)))} className="w-full pl-3 pr-7 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none" />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[0.62rem] md:text-xs font-semibold text-slate-600 mb-1">Strata / body corp</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input type="number" value={strata} onChange={e => setStrata(Math.max(0, parseInt(e.target.value) || 0))} className="w-full pl-6 pr-2 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[0.62rem] md:text-xs font-semibold text-slate-600 mb-1">Other expenses</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <input type="number" value={otherExpenses} onChange={e => setOtherExpenses(Math.max(0, parseInt(e.target.value) || 0))} className="w-full pl-6 pr-2 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Mortgage overlay toggle */}
          <div className="mb-5 pt-4 border-t border-slate-100">
            <button onClick={() => setShowMortgage(!showMortgage)} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-emerald-700 transition-colors">
              <Icon name={showMortgage ? "chevron-down" : "chevron-right"} size={16} />
              Optional: Add mortgage for cash flow analysis
            </button>
            {showMortgage && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-[0.62rem] md:text-xs font-semibold text-slate-600 mb-1">Loan amount</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input type="number" value={loanAmount} onChange={e => setLoanAmount(Math.max(0, parseInt(e.target.value) || 0))} className="w-full pl-6 pr-2 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[0.62rem] md:text-xs font-semibold text-slate-600 mb-1">Interest rate</label>
                  <div className="relative">
                    <input type="number" step="0.1" value={interestRate} onChange={e => setInterestRate(Math.max(0, Math.min(15, parseFloat(e.target.value) || 0)))} className="w-full pl-3 pr-7 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none" />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleCalculate}
            className="w-full mt-2 px-6 py-3.5 bg-emerald-600 text-white text-base font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl"
          >
            Calculate Rental Yield &rarr;
          </button>
        </div>

        {/* Results */}
        {showResults && (
          <>
            {/* Headline yield */}
            <div className={`rounded-2xl p-5 md:p-8 mb-6 text-center border ${yieldStyle.bg} ${yieldStyle.border}`}>
              <p className={`text-sm font-semibold mb-1 ${yieldStyle.text}`}>{yieldStyle.label}</p>
              <p className={`text-3xl md:text-5xl font-black ${yieldStyle.text}`}>{formatPercent(grossYield)} <span className="text-lg md:text-2xl">gross yield</span></p>
              <p className="text-sm text-slate-600 mt-2">Net yield: <strong>{formatPercent(netYield)}</strong> after {formatCurrency(totalExpenses)} in annual expenses</p>
            </div>

            {/* Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Income &amp; Expense Breakdown</h2>
              </div>

              {/* Income */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Icon name="trending-up" size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">Annual rental income</div>
                    <div className="text-[0.62rem] text-slate-500">{formatCurrency(weeklyRent)}/wk &times; 52 weeks</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-emerald-700">{formatCurrency(annualRent)}</div>
              </div>

              {/* Expenses */}
              {[
                { label: "Council rates", value: councilRates },
                { label: "Insurance", value: insurance },
                { label: "Maintenance", value: maintenance },
                { label: `Property management (${managementPct}%)`, value: propertyManagement },
                ...(strata > 0 ? [{ label: "Strata / body corp", value: strata }] : []),
                ...(otherExpenses > 0 ? [{ label: "Other expenses", value: otherExpenses }] : []),
              ].map((item) => (
                <div key={item.label} className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className="text-sm font-semibold text-red-600">-{formatCurrency(item.value)}</span>
                </div>
              ))}

              {/* Total expenses */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Total annual expenses</span>
                <span className="text-sm font-bold text-red-700">-{formatCurrency(totalExpenses)}</span>
              </div>

              {/* Net income */}
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Net annual income</span>
                <span className={`text-sm font-bold ${netIncome >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatCurrency(netIncome)}</span>
              </div>
            </div>

            {/* Cash flow (with optional mortgage) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 mb-6">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Monthly Cash Flow</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Monthly rent</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(monthlyRent)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Monthly expenses</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(monthlyExpenses)}</span>
                </div>
                {showMortgage && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Mortgage (interest only)</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(monthlyMortgage)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
                  <span className="font-bold text-slate-900">{monthlyCashFlow >= 0 ? "Monthly surplus" : "Monthly deficit"}</span>
                  <span className={`font-bold ${monthlyCashFlow >= 0 ? "text-emerald-700" : "text-red-700"}`}>{formatCurrency(monthlyCashFlow)}</span>
                </div>
              </div>
              {!showMortgage && (
                <button onClick={() => setShowMortgage(true)} className="mt-3 text-xs text-emerald-600 hover:text-emerald-800 font-semibold">
                  + Add mortgage to see true cash flow
                </button>
              )}
            </div>

            {/* Email capture gate */}
            {!emailGated && !emailSubmitted && (
              <div className="text-center mb-6">
                <button onClick={() => setEmailGated(true)} className="text-xs text-slate-400 hover:text-slate-600">
                  Want to save this analysis? Get it emailed to you &rarr;
                </button>
              </div>
            )}

            {emailGated && !emailSubmitted && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center mb-6">
                <p className="text-sm font-bold text-slate-900 mb-1">Save your yield analysis</p>
                <p className="text-xs text-slate-500 mb-3">Enter your email and we&rsquo;ll send you a copy of this breakdown</p>
                <div className="flex gap-2 max-w-xs mx-auto">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" aria-label="Email address" className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                  <button onClick={handleEmailSubmit} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700">Email Me My Results</button>
                </div>
              </div>
            )}

            {emailSubmitted && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center mb-6">
                <p className="text-sm font-semibold text-emerald-800">Done! Check your inbox for the yield analysis.</p>
              </div>
            )}

            {/* Advisor match CTA */}
            <AdvisorMatchCTA
              needKey="property"
              headline="Want expert help building a property portfolio?"
              description="A property investment advisor can help you find high-yield areas, structure ownership, and build a portfolio strategy."
            />

            {/* SEO content */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Understanding Rental Yields in Australia</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Rental yield is the most common metric for evaluating the income potential of an investment property. <strong>Gross yield</strong> is calculated by dividing annual rental income by the property&rsquo;s purchase price — it gives you a quick snapshot but doesn&rsquo;t account for costs. <strong>Net yield</strong> subtracts expenses like council rates, insurance, maintenance, and property management fees, providing a more realistic picture of your return.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                In Australia, gross rental yields typically range from 2&ndash;6% depending on location, property type, and market conditions. Capital city apartments and regional houses often sit at opposite ends of the spectrum. A gross yield above 5% is generally considered strong, while anything below 3% may indicate you&rsquo;re relying heavily on capital growth to generate returns.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Keep in mind that yield alone doesn&rsquo;t determine whether a property is a good investment. Factors like vacancy rates, capital growth potential, depreciation benefits, and your marginal tax rate all play a role. Negative gearing — where expenses exceed rental income — can still be a viable strategy if the property appreciates over time and you benefit from tax deductions.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Link href="/calculators" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">All Calculators &rarr;</Link>
                <Link href="/best/property-investment" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Best Property Platforms &rarr;</Link>
                <Link href="/savings-calculator" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Savings Calculator &rarr;</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
