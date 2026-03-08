"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import SocialProofCounter from "@/components/SocialProofCounter";
import { trackEvent, trackClick, getAffiliateLink, AFFILIATE_REL, trackPageDuration } from "@/lib/tracking";
import { getStoredUtm } from "@/components/UtmCapture";

type Account = {
  id: number; slug: string; name: string; platform_type: string;
  asx_fee: string; rating: number; affiliate_url: string; color: string; min_deposit: string;
};

function parseRate(fee: string): number {
  const match = fee.match(/([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

export default function SavingsCalculatorClient({ accounts }: { accounts: Account[] }) {
  const [balance, setBalance] = useState(25000);
  const [currentRate, setCurrentRate] = useState(0.5);
  const [showResults, setShowResults] = useState(false);
  const [emailGated, setEmailGated] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => { trackPageDuration("/savings-calculator"); }, []);

  const ranked = accounts
    .map(a => {
      const rate = parseRate(a.asx_fee);
      const annualInterest = balance * (rate / 100);
      const currentInterest = balance * (currentRate / 100);
      const extraEarnings = annualInterest - currentInterest;
      return { ...a, rate, annualInterest, extraEarnings };
    })
    .filter(a => a.rate > 0)
    .sort((a, b) => b.rate - a.rate);

  const topAccount = ranked[0];
  const maxExtra = topAccount ? topAccount.extraEarnings : 0;
  const currentInterest = balance * (currentRate / 100);

  const handleCalculate = () => {
    setShowResults(true);
    trackEvent("savings_calc_result", {
      balance,
      current_rate: currentRate,
      max_extra: maxExtra.toFixed(0),
      top_account: topAccount?.name,
    }, "/savings-calculator");
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    await fetch("/api/email-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source: "savings-calculator", name: "", ...getStoredUtm() }),
    }).catch(() => {});
    setEmailSubmitted(true);
    setEmailGated(false);
    trackEvent("savings_calc_email", { email: email.trim() }, "/savings-calculator");
  };

  const handleShare = () => {
    const text = `I could earn ${formatCurrency(maxExtra)} more per year just by switching savings accounts. Check yours: invest.com.au/savings-calculator`;
    if (navigator.share) {
      navigator.share({ title: "Savings Calculator", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  const visibleAccounts = emailGated ? ranked.slice(0, 3) : ranked;

  return (
    <div className="py-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-8 md:py-14 px-4">
        <div className="container-custom max-w-3xl text-center">
          <h1 className="text-xl md:text-3xl font-extrabold mb-2">Are you earning enough on your savings?</h1>
          <p className="text-sm md:text-base text-blue-100">Enter your balance and current rate — we'll show you exactly how much more you could earn.</p>
          <div className="mt-3"><SocialProofCounter variant="badge" /></div>
        </div>
      </div>

      <div className="container-custom max-w-3xl py-6 md:py-10">
        {/* Input form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Your savings balance</label>
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
                {[5000, 10000, 25000, 50000, 100000].map(v => (
                  <button key={v} onClick={() => setBalance(v)} className={`text-[0.56rem] px-2 py-1 rounded-full font-semibold transition-all ${balance === v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {v >= 1000 ? `$${v / 1000}k` : `$${v}`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Your current interest rate</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={currentRate}
                  onChange={e => setCurrentRate(Math.max(0, Math.min(10, parseFloat(e.target.value) || 0)))}
                  className="w-full pr-8 pl-4 py-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">%</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[0, 0.5, 1.0, 2.0, 3.0, 4.0].map(v => (
                  <button key={v} onClick={() => setCurrentRate(v)} className={`text-[0.56rem] px-2 py-1 rounded-full font-semibold transition-all ${currentRate === v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={handleCalculate}
            className="w-full mt-5 px-6 py-3.5 bg-blue-600 text-white text-base font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            Calculate My Savings →
          </button>
        </div>

        {/* Results */}
        {showResults && topAccount && (
          <>
            {/* Headline savings */}
            <div className={`rounded-2xl p-5 md:p-8 mb-6 text-center ${maxExtra > 0 ? "bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200" : "bg-slate-50 border border-slate-200"}`}>
              {maxExtra > 0 ? (
                <>
                  <p className="text-sm text-emerald-600 font-semibold mb-1">You could earn an extra</p>
                  <p className="text-3xl md:text-5xl font-black text-emerald-700">{formatCurrency(maxExtra)}<span className="text-lg md:text-2xl">/year</span></p>
                  <p className="text-sm text-slate-600 mt-2">by switching from {currentRate}% to {topAccount.name} at {topAccount.rate}%</p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <button onClick={handleShare} className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full hover:bg-slate-50 font-semibold text-slate-600">Share Result</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-slate-700">You're already earning a competitive rate!</p>
                  <p className="text-sm text-slate-500 mt-1">At {currentRate}%, you're close to the best available rates in Australia.</p>
                </>
              )}
            </div>

            {/* Comparison table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">All Savings Accounts Ranked</h2>
                <span className="text-[0.56rem] text-slate-400">{ranked.length} accounts · sorted by rate</span>
              </div>

              {/* Your current rate row */}
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-200 flex items-center justify-center text-amber-700 text-xs font-bold">You</div>
                  <div>
                    <div className="text-sm font-bold text-amber-800">Your Current Account</div>
                    <div className="text-[0.62rem] text-amber-600">{currentRate}% p.a.</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-amber-800">{formatCurrency(currentInterest)}/yr</div>
                </div>
              </div>

              {visibleAccounts.map((account, i) => (
                <div key={account.id} className={`px-4 py-3 flex items-center justify-between border-b border-slate-100 last:border-b-0 ${i === 0 ? "bg-emerald-50/50" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[0.5rem] font-bold shrink-0" style={{ backgroundColor: account.color || "#666" }}>
                      {account.name.charAt(0)}
                    </div>
                    <div>
                      <Link href={`/broker/${account.slug}`} className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors">{account.name}</Link>
                      <div className="text-[0.62rem] text-slate-500">{account.rate}% p.a. · Min {account.min_deposit || "$0"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(account.annualInterest)}/yr</div>
                      {account.extraEarnings > 0 && (
                        <div className="text-[0.56rem] font-bold text-emerald-600">+{formatCurrency(account.extraEarnings)} more</div>
                      )}
                      {account.extraEarnings < 0 && (
                        <div className="text-[0.56rem] font-bold text-red-500">{formatCurrency(account.extraEarnings)} less</div>
                      )}
                    </div>
                    <a
                      href={getAffiliateLink(account)}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      onClick={() => trackClick(account.slug, account.name, "savings-calc", "/savings-calculator", "savings")}
                      className="hidden md:inline-block px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all"
                    >
                      Visit →
                    </a>
                  </div>
                </div>
              ))}

              {/* Email gate */}
              {emailGated && !emailSubmitted && ranked.length > 3 && (
                <div className="px-4 py-6 bg-gradient-to-b from-white to-slate-50 text-center border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-900 mb-1">See all {ranked.length} accounts</p>
                  <p className="text-xs text-slate-500 mb-3">Enter your email to unlock the full comparison</p>
                  <div className="flex gap-2 max-w-xs mx-auto">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" />
                    <button onClick={handleEmailSubmit} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700">Unlock</button>
                  </div>
                </div>
              )}
            </div>

            {/* Show gate trigger */}
            {!emailGated && !emailSubmitted && ranked.length > 3 && (
              <div className="text-center mb-6">
                <button onClick={() => setEmailGated(true)} className="text-xs text-slate-400 hover:text-slate-600">
                  Want to save this comparison? Get it emailed to you →
                </button>
              </div>
            )}

            {/* SEO content */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Why Your Savings Rate Matters</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Most Australians leave their savings in a Big 4 bank transaction account earning 0.01-0.5%. Meanwhile, online banks like ING, Ubank, and Macquarie offer 5%+ with simple conditions. On a $50,000 balance, the difference between 0.5% and 5.5% is <strong>$2,500 per year</strong> — that's real money lost to inertia.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                All savings accounts listed here are with ADI-regulated Australian banks, meaning your deposits are government-guaranteed up to $250,000 per person per institution under the Financial Claims Scheme.
              </p>
              <div className="flex gap-2 mt-4">
                <Link href="/compare?filter=savings" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Compare All Savings →</Link>
                <Link href="/best/savings-accounts" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Best Savings Accounts →</Link>
                <Link href="/switching-calculator" className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200">Broker Switching Calc →</Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
