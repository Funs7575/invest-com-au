"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { trackClick, trackEvent, getAffiliateLink, AFFILIATE_REL } from "@/lib/tracking";
import { getStoredUtm } from "@/components/UtmCapture";
import type { Broker } from "@/lib/types";
import LeadMagnet from "@/components/LeadMagnet";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import { storeQualificationData } from "@/lib/qualification-store";
import AdvisorMatchCTA from "@/components/AdvisorMatchCTA";

type Holding = {
  id: string;
  market: "asx" | "us" | "crypto";
  trades_per_year: number;
  avg_trade_size: number;
};

export default function PortfolioCalculatorClient({ brokers, inline }: { brokers: Broker[]; inline?: boolean }) {
  const [holdings, setHoldings] = useState<Holding[]>([
    { id: "1", market: "asx", trades_per_year: 12, avg_trade_size: 2000 },
  ]);
  const [currentBroker, setCurrentBroker] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [email, setEmail] = useState("");
  const [emailCaptured, setEmailCaptured] = useState(false);

  const addHolding = () => {
    setHoldings([...holdings, {
      id: Date.now().toString(),
      market: "asx",
      trades_per_year: 6,
      avg_trade_size: 2000,
    }]);
  };

  const updateHolding = (id: string, field: keyof Holding, value: string | number) => {
    setHoldings(holdings.map(h => h.id === id ? { ...h, [field]: value } : h));
  };

  const removeHolding = (id: string) => {
    if (holdings.length === 1) return;
    setHoldings(holdings.filter(h => h.id !== id));
  };

  const handleEmailCapture = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    await fetch("/api/email-capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        source: "portfolio-calculator",
        name: "",
        context: {
          holdings: holdings.map(h => ({ market: h.market, trades_per_year: h.trades_per_year, avg_trade_size: h.avg_trade_size })),
          current_broker: currentBroker || null,
          cheapest_broker: results[0]?.broker.name || null,
          annual_fees_cheapest: results[0]?.totalFees || null,
          potential_savings: savings > 0 ? Math.round(savings) : 0,
        },
        ...getStoredUtm(),
      }),
    }).catch(() => {});
    setEmailCaptured(true);
    trackEvent("portfolio_calc_email", { email: email.trim() }, "/portfolio-calculator");
  };

  // Calculate fees for each broker
  const results = useMemo(() => {
    const activeBrokers = brokers.filter(b => {
      if (b.status !== "active") return false;
      // Include share brokers, CFDs, and crypto
      const hasASX = holdings.some(h => h.market === "asx" || h.market === "us");
      const hasCrypto = holdings.some(h => h.market === "crypto");
      if (b.platform_type === "share_broker" || b.platform_type === "cfd_forex") return hasASX;
      if (b.platform_type === "crypto_exchange") return hasCrypto;
      return false;
    });

    return activeBrokers.map(broker => {
      let totalFees = 0;

      for (const h of holdings) {
        const trades = h.trades_per_year;
        const size = h.avg_trade_size;

        if (h.market === "asx") {
          const feePerTrade = broker.asx_fee_value != null ? broker.asx_fee_value : 999;
          // Some brokers charge % based
          if (feePerTrade < 1 && feePerTrade > 0) {
            totalFees += trades * (size * feePerTrade / 100);
          } else {
            totalFees += trades * feePerTrade;
          }
        } else if (h.market === "crypto") {
          // Crypto exchanges charge % per trade
          if (broker.platform_type === "crypto_exchange") {
            const cryptoFeePercent = broker.asx_fee_value != null && broker.asx_fee_value < 5 ? broker.asx_fee_value : 0.6;
            totalFees += trades * (size * cryptoFeePercent / 100);
          }
          // Non-crypto brokers can't do crypto — skip
        } else {
          // US trades — fee + FX conversion cost
          const usFeePerTrade = broker.us_fee_value != null ? broker.us_fee_value : 999;
          if (usFeePerTrade < 1 && usFeePerTrade > 0) {
            totalFees += trades * (size * usFeePerTrade / 100);
          } else {
            totalFees += trades * usFeePerTrade;
          }
          // FX cost (buy and sell)
          const fxRate = broker.fx_rate != null ? broker.fx_rate : 0.7;
          totalFees += trades * size * (fxRate / 100) * 2; // round trip
        }
      }

      // Add inactivity fee if applicable
      if (broker.inactivity_fee && broker.inactivity_fee !== "None" && broker.inactivity_fee !== "$0") {
        const match = broker.inactivity_fee.match(/\$(\d+)/);
        if (match) totalFees += parseInt(match[1]) * 12; // assume monthly
      }

      return {
        broker,
        totalFees: Math.round(totalFees * 100) / 100,
      };
    }).sort((a, b) => a.totalFees - b.totalFees);
  }, [holdings, brokers]);

  const currentBrokerFees = currentBroker ? results.find(r => r.broker.slug === currentBroker)?.totalFees || 0 : 0;
  const cheapestFees = results[0]?.totalFees || 0;
  const savings = currentBrokerFees - cheapestFees;

  return (
    <div className={inline ? "" : "py-5 md:py-12"}>
      <div className={inline ? "" : "container-custom max-w-4xl"}>
        {!inline && <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/calculators" className="hover:text-slate-900">Calculators</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Portfolio Fee Calculator</span>
        </nav>}

        {/* Hero */}
        {!inline && <div className="bg-gradient-to-br from-blue-50 to-violet-50 border border-blue-100 rounded-2xl p-4 md:p-8 mb-6">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Icon name="calculator" size={20} className="text-white md:hidden" />
              <Icon name="calculator" size={28} className="text-white hidden md:block" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 mb-1 md:mb-2">
                Portfolio Fee Calculator
              </h1>
              <p className="text-xs md:text-base text-slate-500 leading-relaxed">
                Enter your trading activity and see exactly what you&apos;d pay at every Australian broker. Find out if you&apos;re overpaying.
              </p>
            </div>
          </div>
        </div>}

        {/* Input section */}
        <div className={inline ? "bg-white border border-slate-200 rounded-xl p-4 md:p-6 mb-4" : "bg-white border border-slate-200 rounded-xl p-4 md:p-6 mb-6"}>
          <h2 className="text-base md:text-lg font-bold text-slate-900 mb-4">Your Trading Activity</h2>

          {holdings.map((h) => (
            <div key={h.id} className="flex flex-wrap items-end gap-2 md:gap-3 mb-3 pb-3 border-b border-slate-100 last:border-b-0 last:mb-0 last:pb-0">
              <div>
                <label className="block text-[0.62rem] md:text-xs font-semibold text-slate-600 mb-1">Market</label>
                <select
                  value={h.market}
                  onChange={(e) => updateHolding(h.id, "market", e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs md:text-sm"
                >
                  <option value="asx">ASX</option>
                  <option value="us">US Shares</option>
                  <option value="crypto">Crypto</option>
                </select>
              </div>
              <div>
                <label className="block text-[0.62rem] md:text-xs font-semibold text-slate-600 mb-1">Trades / Year</label>
                <input
                  type="number"
                  value={h.trades_per_year}
                  onChange={(e) => updateHolding(h.id, "trades_per_year", parseInt(e.target.value) || 0)}
                  className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-xs md:text-sm"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-[0.62rem] md:text-xs font-semibold text-slate-600 mb-1">Avg Trade ($)</label>
                <input
                  type="number"
                  value={h.avg_trade_size}
                  onChange={(e) => updateHolding(h.id, "avg_trade_size", parseInt(e.target.value) || 0)}
                  className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-xs md:text-sm"
                  min={0}
                  step={500}
                />
              </div>
              {holdings.length > 1 && (
                <button onClick={() => removeHolding(h.id)} className="text-xs text-red-500 hover:text-red-700 pb-1">✕</button>
              )}
            </div>
          ))}

          <div className="flex items-center gap-3 mt-3">
            <button onClick={addHolding} className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <Icon name="plus" size={14} /> Add market
            </button>
            <button
              onClick={() => { setHoldings([{ id: "1", market: "asx", trades_per_year: 12, avg_trade_size: 2000 }]); setCurrentBroker(""); }}
              className="text-xs font-medium text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <Icon name="rotate-ccw" size={12} /> Reset
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className="block text-[0.62rem] md:text-xs font-semibold text-slate-600 mb-1">Your Current Broker (optional)</label>
            <select
              value={currentBroker}
              onChange={(e) => setCurrentBroker(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">Select your broker...</option>
              {brokers.filter(b => b.status === "active" && (b.platform_type === "share_broker" || b.platform_type === "cfd_forex" || b.platform_type === "crypto_exchange")).sort((a, b) => a.name.localeCompare(b.name)).map(b => (
                <option key={b.slug} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setShowResults(true);
              storeQualificationData("portfolio_calculator", {
                holdings: holdings.map(h => ({ market: h.market, trades_per_year: h.trades_per_year, avg_trade_size: h.avg_trade_size })),
                current_broker: currentBroker || null,
                cheapest_broker: results[0]?.broker.name || null,
                annual_fees: results[0]?.totalFees || null,
                potential_savings: savings > 0 ? savings : null,
              });
            }}
            className="mt-4 w-full md:w-auto px-6 py-3 bg-slate-900 text-white font-bold rounded-lg text-sm hover:bg-slate-800 transition-colors"
          >
            Calculate My Fees →
          </button>
        </div>

        {/* Results */}
        {showResults && (
          <>
            {/* Savings banner */}
            {currentBroker && savings > 0 && (
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-2xl p-5 md:p-8 mb-6 text-center text-white shadow-xl shadow-emerald-500/25">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "16px 16px" }} />
                <div className="relative">
                  <div className="text-xs md:text-sm font-bold uppercase tracking-widest opacity-80 mb-2">You could save</div>
                  <div className="text-5xl md:text-7xl font-extrabold tracking-tight">${savings.toFixed(0)}<span className="text-xl md:text-2xl opacity-60 ml-1">/year</span></div>
                  <p className="text-sm md:text-base opacity-90 mt-3">by switching from <strong>{results.find(r => r.broker.slug === currentBroker)?.broker.name}</strong> to <strong>{results[0]?.broker.name}</strong></p>
                </div>
              </div>
            )}

            {/* Email capture gate */}
            {!emailCaptured && results.length > 5 && (
              <div className="bg-slate-900 rounded-xl p-4 md:p-5 text-white mb-6">
                <div className="flex items-start gap-3">
                  <Icon name="mail" size={20} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">See all {results.length} brokers ranked for your portfolio</p>
                    <p className="text-xs text-slate-300 mb-3">Enter your email to unlock the full comparison + get a free personalised fee report.</p>
                    <div className="flex gap-2">
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" aria-label="Email address" className="flex-1 px-3 py-2 text-sm rounded-lg text-slate-900 border-0" />
                      <button onClick={handleEmailCapture} className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 shrink-0">Unlock Results</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
              <div className="grid grid-cols-12 bg-slate-50 text-xs font-semibold text-slate-600 px-3 md:px-4 py-2.5 border-b border-slate-200">
                <span className="col-span-1">#</span>
                <span className="col-span-4 md:col-span-3">Platform</span>
                <span className="col-span-3 md:col-span-2 text-right">Annual Cost</span>
                <span className="col-span-4 md:col-span-3 text-right hidden md:block">vs Current</span>
                <span className="col-span-4 md:col-span-3 text-right" />
              </div>
              {(emailCaptured ? results.slice(0, 15) : results.slice(0, 5)).map((r, i) => {
                const isCurrent = r.broker.slug === currentBroker;
                const diff = currentBroker ? currentBrokerFees - r.totalFees : 0;
                return (
                  <div key={r.broker.slug} className={`grid grid-cols-12 items-center px-3 md:px-4 py-2.5 border-b border-slate-100 last:border-b-0 ${isCurrent ? "bg-amber-50" : i === 0 ? "bg-emerald-50/30" : ""}`}>
                    <span className="col-span-1 text-xs text-slate-400 font-bold">{i + 1}</span>
                    <div className="col-span-4 md:col-span-3">
                      <Link href={`/broker/${r.broker.slug}`} className="text-xs md:text-sm font-semibold text-slate-900 hover:text-blue-700">
                        {r.broker.name}
                      </Link>
                      {isCurrent && <span className="text-[0.5rem] bg-amber-200 text-amber-800 font-bold px-1 py-0.5 rounded ml-1">YOU</span>}
                      {i === 0 && <span className="text-[0.5rem] bg-emerald-200 text-emerald-800 font-bold px-1 py-0.5 rounded ml-1">CHEAPEST</span>}
                    </div>
                    <div className="col-span-3 md:col-span-2 text-right">
                      <span className="text-xs md:text-sm font-bold text-slate-900">${r.totalFees.toFixed(0)}</span>
                      <span className="text-[0.56rem] text-slate-400">/yr</span>
                    </div>
                    <div className="col-span-4 md:col-span-3 text-right hidden md:block">
                      {currentBroker && diff !== 0 && (
                        <span className={`text-xs font-bold ${diff > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {diff > 0 ? `Save $${diff.toFixed(0)}` : `+$${Math.abs(diff).toFixed(0)}`}
                        </span>
                      )}
                    </div>
                    <div className="col-span-4 md:col-span-3 text-right">
                      <a
                        href={getAffiliateLink(r.broker)}
                        target="_blank"
                        rel={AFFILIATE_REL}
                        onClick={() => trackClick(r.broker.slug, r.broker.name, "portfolio-calc", "/portfolio-calculator", "calculator")}
                        className="text-[0.62rem] md:text-xs font-bold text-amber-700 hover:text-amber-900 px-2 py-1 border border-amber-200 rounded-lg hover:bg-amber-50"
                      >
                        Visit →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Methodology note */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-700">How we calculate:</strong> Annual cost = (trades × fee per trade) + (US trades × FX conversion cost round-trip). FX cost is calculated as trade amount × FX rate × 2 (buy + sell). Inactivity fees are added where applicable. This is an estimate — verify exact fees in each platform&apos;s PDS.
            </div>

            {/* Advisor prompt for high-fee users */}
            {currentBroker && currentBrokerFees > 500 && (
              <div className="mb-6">
                <AdvisorPrompt context="tax" heading="Paying over $500/year in trading fees?" description="A tax agent can help you claim investment-related expenses as deductions, potentially saving more than the fees themselves." />
              </div>
            )}

            <div className="mb-6">
              <AdvisorMatchCTA
                needKey="tax"
                headline="Could you be claiming more on your investment fees?"
                description="A tax agent can help you maximise deductions on brokerage, platform fees, and investment-related expenses."
              />
            </div>

            <LeadMagnet />
          </>
        )}
      </div>
    </div>
  );
}
