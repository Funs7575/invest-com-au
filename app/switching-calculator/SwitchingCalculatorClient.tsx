"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import BrokerLogo from "@/components/BrokerLogo";
import SocialProofCounter from "@/components/SocialProofCounter";
import { getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL, trackClick, trackPageDuration } from "@/lib/tracking";
import { getStoredUtm } from "@/components/UtmCapture";
import type { Broker } from "@/lib/types";
import { storeQualificationData } from "@/lib/qualification-store";
import AdvisorMatchCTA from "@/components/AdvisorMatchCTA";

function parseFee(feeStr: string | null | undefined): { flat: number; pct: number } {
  if (!feeStr) return { flat: 0, pct: 0 };
  const s = feeStr.replace(/,/g, "");
  const pctMatch = s.match(/([\d.]+)%/);
  if (pctMatch) return { flat: 0, pct: parseFloat(pctMatch[1]) / 100 };
  const flatMatch = s.match(/\$([\d.]+)/);
  if (flatMatch) return { flat: parseFloat(flatMatch[1]), pct: 0 };
  if (s === "$0" || s.toLowerCase().includes("free") || s.startsWith("$0")) return { flat: 0, pct: 0 };
  return { flat: 0, pct: 0 };
}

function calcAnnualCost(broker: Broker, trades: number, avgSize: number, usAlloc: number): number {
  const { flat: asxFlat, pct: asxPct } = parseFee(broker.asx_fee);
  const { flat: usFlat, pct: usPct } = parseFee(broker.us_fee);
  const fxRate = broker.fx_rate ? broker.fx_rate / 100 : 0.007;
  const inactivity = broker.inactivity_fee ? parseFloat(broker.inactivity_fee.replace(/[^0-9.]/g, "")) || 0 : 0;

  const asxTrades = Math.round(trades * (1 - usAlloc / 100));
  const usTrades = Math.round(trades * (usAlloc / 100));

  const asxCost = asxTrades * Math.max(asxFlat, asxPct * avgSize);
  const usCost = usTrades * Math.max(usFlat, usPct * avgSize);
  const fxCost = usTrades * avgSize * fxRate;

  return asxCost + usCost + fxCost + inactivity;
}

export default function SwitchingCalculatorClient({ brokers, inline }: { brokers: Broker[]; inline?: boolean }) {
  const [currentBroker, setCurrentBroker] = useState("");
  const [tradesPerYear, setTradesPerYear] = useState(24);
  const [avgTradeSize, setAvgTradeSize] = useState(2000);
  const [usAllocation, setUsAllocation] = useState(30);
  const [showResults, setShowResults] = useState(false);
  const [email, setEmail] = useState("");
  const [emailCaptured, setEmailCaptured] = useState(false);

  useEffect(() => { trackPageDuration("/switching-calculator"); }, []);

  const results = useMemo(() => {
    return brokers
      .map(b => ({ broker: b, cost: calcAnnualCost(b, tradesPerYear, avgTradeSize, usAllocation) }))
      .sort((a, b) => a.cost - b.cost);
  }, [brokers, tradesPerYear, avgTradeSize, usAllocation]);

  const currentCost = currentBroker ? results.find(r => r.broker.slug === currentBroker)?.cost || 0 : 0;
  const cheapest = results[0];
  const savings = currentBroker ? currentCost - (cheapest?.cost || 0) : 0;

  const handleCalculate = () => {
    setShowResults(true);
    storeQualificationData("switching_calculator", {
      current_broker: currentBroker || null,
      trades_per_year: tradesPerYear,
      avg_trade_size: avgTradeSize,
      us_allocation_pct: usAllocation,
      potential_savings: savings > 0 ? Math.round(savings) : null,
      cheapest_broker: cheapest?.broker.name || null,
    });
    // Track
    fetch("/api/track-event", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: "switching_calc_result", page: "/switching-calculator", metadata: { current: currentBroker, trades: tradesPerYear, avg_size: avgTradeSize, us_pct: usAllocation, savings: Math.round(savings) } })
    }).catch(() => {});
  };

  const handleEmailCapture = async () => {
    if (!email.trim()) return;
    await fetch("/api/email-capture", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source: "switching_calculator", name: "", context: { current_broker: currentBroker || null, trades_per_year: tradesPerYear, avg_trade_size: avgTradeSize, us_allocation_pct: usAllocation, potential_savings: savings > 0 ? Math.round(savings) : 0 }, ...getStoredUtm() })
    }).catch(() => {});
    // Send personalized report email
    await fetch("/api/send-switching-report", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), currentBroker: brokers.find(b => b.slug === currentBroker)?.name || "Unknown", currentBrokerSlug: currentBroker, cheapestBroker: cheapest?.broker.name || "", cheapestBrokerSlug: cheapest?.broker.slug || "", currentCost: Math.round(currentCost), cheapestCost: Math.round(cheapest?.cost || 0), savings: Math.round(savings), tradesPerYear, avgTradeSize, usAllocation })
    }).catch(() => {});
    setEmailCaptured(true);
  };

  // Cost breakdown for current vs cheapest broker
  const currentBrokerObj = brokers.find(b => b.slug === currentBroker);
  const costBreakdown = useMemo(() => {
    if (!currentBrokerObj || !cheapest) return null;
    const calc = (broker: Broker) => {
      const { flat: asxFlat, pct: asxPct } = parseFee(broker.asx_fee);
      const { flat: usFlat, pct: usPct } = parseFee(broker.us_fee);
      const fxRate = broker.fx_rate ? broker.fx_rate / 100 : 0.007;
      const inactivity = broker.inactivity_fee ? parseFloat(broker.inactivity_fee.replace(/[^0-9.]/g, "")) || 0 : 0;
      const asxTrades = Math.round(tradesPerYear * (1 - usAllocation / 100));
      const usTrades = Math.round(tradesPerYear * (usAllocation / 100));
      return {
        asx: asxTrades * Math.max(asxFlat, asxPct * avgTradeSize),
        us: usTrades * Math.max(usFlat, usPct * avgTradeSize),
        fx: usTrades * avgTradeSize * fxRate,
        inactivity,
      };
    };
    return { current: calc(currentBrokerObj), cheapest: calc(cheapest.broker) };
  }, [currentBrokerObj, cheapest, tradesPerYear, avgTradeSize, usAllocation]);

  return (
    <div className={inline ? "" : "py-5 md:py-12"}>
      <div className={inline ? "" : "container-custom max-w-3xl"}>
        {!inline && <nav className="text-xs md:text-sm text-slate-500 mb-3">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/calculators" className="hover:text-slate-900">Calculators</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Switching Calculator</span>
        </nav>}

        {/* Hero */}
        {!inline && <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 md:p-8 text-white mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <Icon name="arrow-right-left" size={24} className="text-white" />
            </div>
            <h1 className="text-xl md:text-3xl font-extrabold mb-2">How much are you overpaying?</h1>
            <p className="text-sm md:text-base text-emerald-100">Enter your trading details below and we&apos;ll calculate your exact annual cost at every Australian broker — and how much you&apos;d save by switching.</p>
            <div className="mt-3"><SocialProofCounter variant="badge" /></div>
          </div>
        </div>}

        {/* Calculator Inputs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 mb-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Your Trading Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Your current broker</label>
              <select value={currentBroker} onChange={e => setCurrentBroker(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
                <option value="">Select your current broker...</option>
                {brokers.map(b => <option key={b.slug} value={b.slug}>{b.name}</option>)}
                <option value="_other">Other / Not listed</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trades per year</label>
                <input type="number" value={tradesPerYear} onChange={e => setTradesPerYear(parseInt(e.target.value) || 0)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Avg trade size ($)</label>
                <input type="number" value={avgTradeSize} onChange={e => setAvgTradeSize(parseInt(e.target.value) || 0)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">US shares (%)</label>
                <input type="number" value={usAllocation} onChange={e => setUsAllocation(Math.min(100, parseInt(e.target.value) || 0))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" min={0} max={100} />
              </div>
            </div>

            <button onClick={handleCalculate} className="w-full py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 active:scale-[0.99] transition-all">
              Calculate My Savings →
            </button>
          </div>
        </div>

        {/* Results */}
        {showResults && (
          <div className="space-y-4">
            {/* Savings headline */}
            {currentBroker && currentBroker !== "_other" && savings > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-5 md:p-6 text-center">
                <p className="text-xs text-emerald-600 font-semibold mb-1">You could save up to</p>
                <p className="text-4xl md:text-5xl font-extrabold text-emerald-700 mb-1">${Math.round(savings).toLocaleString()}<span className="text-lg">/year</span></p>
                <p className="text-sm text-emerald-600">by switching from {brokers.find(b => b.slug === currentBroker)?.name} to {cheapest?.broker.name}</p>
                <p className="text-xs text-slate-400 mt-2">Based on {tradesPerYear} trades/year at ${avgTradeSize.toLocaleString()} avg with {usAllocation}% US allocation</p>
              </div>
            )}

            {/* Cost Breakdown Report */}
            {currentBroker && currentBroker !== "_other" && costBreakdown && savings > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 print:border-0 print:p-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-900">Your Switching Report</h2>
                  <button onClick={() => window.print()} className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 print:hidden">
                    <Icon name="printer" size={14} /> Print Report
                  </button>
                </div>

                {/* Side-by-side breakdown */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-[0.6rem] font-bold text-red-500 uppercase tracking-wider mb-1">Current: {currentBrokerObj?.name}</p>
                    <p className="text-lg font-extrabold text-red-700">${Math.round(currentCost).toLocaleString()}<span className="text-xs font-normal">/yr</span></p>
                    <div className="mt-2 space-y-1 text-[0.65rem] text-red-600">
                      <div className="flex justify-between"><span>ASX trades</span><span>${Math.round(costBreakdown.current.asx).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>US trades</span><span>${Math.round(costBreakdown.current.us).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>FX conversion</span><span>${Math.round(costBreakdown.current.fx).toLocaleString()}</span></div>
                      {costBreakdown.current.inactivity > 0 && <div className="flex justify-between"><span>Inactivity fee</span><span>${Math.round(costBreakdown.current.inactivity)}</span></div>}
                    </div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-[0.6rem] font-bold text-emerald-500 uppercase tracking-wider mb-1">Switch to: {cheapest?.broker.name}</p>
                    <p className="text-lg font-extrabold text-emerald-700">${Math.round(cheapest?.cost || 0).toLocaleString()}<span className="text-xs font-normal">/yr</span></p>
                    <div className="mt-2 space-y-1 text-[0.65rem] text-emerald-600">
                      <div className="flex justify-between"><span>ASX trades</span><span>${Math.round(costBreakdown.cheapest.asx).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>US trades</span><span>${Math.round(costBreakdown.cheapest.us).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>FX conversion</span><span>${Math.round(costBreakdown.cheapest.fx).toLocaleString()}</span></div>
                      {costBreakdown.cheapest.inactivity > 0 && <div className="flex justify-between"><span>Inactivity fee</span><span>${Math.round(costBreakdown.cheapest.inactivity)}</span></div>}
                    </div>
                  </div>
                </div>

                {/* 5-Year Projection */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
                  <p className="text-xs font-bold text-slate-700 mb-2">Projected Savings Over Time</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[1, 2, 3, 5].map(y => (
                      <div key={y}>
                        <p className="text-[0.6rem] text-slate-500">{y} Year{y > 1 ? "s" : ""}</p>
                        <p className="text-sm font-extrabold text-emerald-700">${(Math.round(savings) * y).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transfer info */}
                <div className="text-[0.65rem] text-slate-500 space-y-1">
                  <p><strong className="text-slate-700">How to switch:</strong> {cheapest?.broker.chess_sponsored ? "Both brokers use CHESS sponsorship — your HIN transfers directly. Shares stay in your name. Takes 3-5 business days." : "Check if your new broker supports CHESS transfer or if you'll need to sell and rebuy."}</p>
                  <p>Read our <a href="/switch" className="text-violet-600 hover:underline">complete switching guide</a> for step-by-step instructions.</p>
                </div>
              </div>
            )}

            {/* Email capture — gated for full results */}
            {!emailCaptured && (
              <div className="bg-slate-900 rounded-xl p-4 md:p-5 text-white">
                <div className="flex items-start gap-3">
                  <Icon name="mail" size={20} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-1">Get the full comparison + a free PDF fee report</p>
                    <p className="text-xs text-slate-300 mb-3">Enter your email to see all {brokers.length} brokers ranked by cost for your exact portfolio.</p>
                    <div className="flex gap-2">
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" aria-label="Email address" className="flex-1 px-3 py-2 text-sm rounded-lg text-slate-900 border-0" />
                      <button onClick={handleEmailCapture} className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 shrink-0">Unlock Results</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Broker ranking table */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-3">
                {emailCaptured ? `All ${results.length} Brokers Ranked by Annual Cost` : "Top 5 Cheapest for Your Portfolio"}
              </h2>
              <div className="space-y-2">
                {(emailCaptured ? results : results.slice(0, 5)).map((r, i) => {
                  const isCurrent = r.broker.slug === currentBroker;
                  const savingsVsCurrent = currentBroker ? currentCost - r.cost : 0;
                  return (
                    <div key={r.broker.slug} className={`flex items-center gap-3 p-3 rounded-lg border ${isCurrent ? "border-red-200 bg-red-50" : i === 0 ? "border-emerald-200 bg-emerald-50" : "border-slate-100"}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>{i + 1}</span>
                      <BrokerLogo broker={r.broker} size="xs" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/broker/${r.broker.slug}`} className="text-sm font-bold text-slate-900 truncate hover:text-blue-600 transition-colors">{r.broker.name}</Link>
                          {isCurrent && <span className="text-[0.5rem] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">YOUR BROKER</span>}
                          {i === 0 && !isCurrent && <span className="text-[0.5rem] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">CHEAPEST</span>}
                        </div>
                        <div className="text-xs text-slate-500">{renderStars(r.broker.rating || 0)} {r.broker.rating}/5</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-sm font-extrabold ${isCurrent ? "text-red-600" : "text-slate-900"}`}>${Math.round(r.cost).toLocaleString()}<span className="text-[0.6rem] font-normal text-slate-400">/yr</span></div>
                        {currentBroker && savingsVsCurrent > 0 && !isCurrent && (
                          <div className="text-[0.6rem] font-bold text-emerald-600">Save ${Math.round(savingsVsCurrent).toLocaleString()}</div>
                        )}
                      </div>
                      <a
                        href={getAffiliateLink(r.broker)}
                        target="_blank"
                        rel={AFFILIATE_REL}
                        onClick={() => trackClick(r.broker.slug, r.broker.name, "switching-calc", "/switching-calculator", "calculator")}
                        className="shrink-0 px-3 py-1.5 text-[0.65rem] font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                      >
                        {getBenefitCta(r.broker, "calculator")}
                      </a>
                    </div>
                  );
                })}
              </div>

              {!emailCaptured && results.length > 5 && (
                <p className="text-center text-xs text-slate-400 mt-3">Enter your email above to see all {results.length} brokers</p>
              )}
            </div>

            {/* Share results */}
            {currentBroker && savings > 0 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    const text = `I just found out I could save $${Math.round(savings)}/year by switching brokers. Check yours at invest.com.au/switching-calculator`;
                    if (navigator.share) { navigator.share({ text, url: "https://invest.com.au/switching-calculator" }); }
                    else { navigator.clipboard.writeText(text); alert("Copied to clipboard!"); }
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <Icon name="share-2" size={14} /> Share your savings
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I could save $${Math.round(savings)}/year by switching brokers 🤯`)}&url=${encodeURIComponent("https://invest.com.au/switching-calculator")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  𝕏 Post
                </a>
              </div>
            )}
          </div>
        )}

        {/* Advisor match CTA */}
        {showResults && (
          <div className="mt-6">
            <AdvisorMatchCTA
              needKey="planning"
              headline="Need help optimising your investment setup?"
              description="A financial planner can review your broker, portfolio structure, and tax position to make sure you're not leaving money on the table."
            />
          </div>
        )}

        {/* SEO content */}
        <div className="mt-8 md:mt-12 space-y-6 text-sm text-slate-600 leading-relaxed">
          {/* Contextual advisor prompt for large portfolios */}
          {showResults && avgTradeSize * tradesPerYear > 50000 && (
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4 md:p-5 mb-4">
              <p className="text-sm font-bold text-violet-900 mb-1">Switching a large portfolio? Consider professional advice</p>
              <p className="text-xs text-violet-700 mb-3">With ${(avgTradeSize * tradesPerYear).toLocaleString()} in annual trades, a financial advisor can help optimise your structure, tax position, and broker setup.</p>
              <Link href="/find-advisor" className="inline-block px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors">
                Find a Financial Advisor →
              </Link>
            </div>
          )}
          <h2 className="text-lg font-bold text-slate-900">Why Switching Brokers Could Save You Thousands</h2>
          <p>Most Australians stick with their first broker out of inertia — even when cheaper options exist. The difference in annual fees between the most and least expensive ASX brokers can exceed $2,000 per year for active traders.</p>
          <p>Our switching calculator uses real fee data from {brokers.length} Australian platforms, updated daily. It accounts for ASX brokerage, US share fees, FX conversion rates, and inactivity charges to show your true annual cost.</p>
          <h3 className="text-base font-bold text-slate-900">How to switch brokers</h3>
          <p>Switching is easier than most people think. For CHESS-sponsored brokers, your HIN (Holder Identification Number) transfers directly — your shares stay in your name throughout. The process typically takes 3-5 business days. Read our <Link href="/switch" className="text-violet-600 hover:underline">complete switching guide</Link> for step-by-step instructions.</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
            <p className="text-sm font-bold text-amber-800 mb-1">Also check your savings rate</p>
            <p className="text-xs text-amber-600">Most Australians earn 0.01% on their cash while top accounts offer 5%+. On $50k, that's $2,750/year difference.</p>
            <Link href="/savings-calculator" className="inline-block mt-2 text-xs font-bold text-amber-700 hover:underline">Try the Savings Calculator →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
