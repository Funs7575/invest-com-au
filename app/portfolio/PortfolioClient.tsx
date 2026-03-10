"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import BrokerLogo from "@/components/BrokerLogo";
import type { Broker } from "@/lib/types";
import { getAffiliateLink, AFFILIATE_REL, trackClick } from "@/lib/tracking";

interface Holding {
  broker_slug: string;
  broker_name?: string;
  balance: number;
  trades_per_year: number;
  us_allocation: number;
  annual_fee?: number;
}

interface Alert {
  id: number;
  alert_type: string;
  broker_slug?: string;
  title: string;
  detail?: string;
  read: boolean;
  created_at: string;
}

type Step = "email" | "holdings" | "results";

export default function PortfolioClient() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [holdings, setHoldings] = useState<Holding[]>([{ broker_slug: "", balance: 50000, trades_per_year: 24, us_allocation: 30 }]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [results, setResults] = useState<{ annual_fees: number; optimal_fees: number; savings: number; optimal_broker: string; holdings: Holding[] } | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingPortfolio, setExistingPortfolio] = useState(false);

  // Fetch broker list
  useEffect(() => {
    fetch("/api/portfolio?brokers=1").catch((err) => console.error("Portfolio prefetch failed:", err));
    // Get brokers from compare page data
    const fetchBrokers = async () => {
      const res = await fetch("/api/shortlist?list=all");
      if (res.ok) {
        const data = await res.json();
        setBrokers(data.brokers || []);
      }
    };
    fetchBrokers().catch(() => {});
  }, []);

  // Check for existing portfolio
  const checkExisting = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setLoading(true);
    const res = await fetch(`/api/portfolio?email=${encodeURIComponent(email.trim())}`);
    if (res.ok) {
      const data = await res.json();
      if (data.portfolio) {
        setExistingPortfolio(true);
        setHoldings(data.portfolio.holdings || [{ broker_slug: "", balance: 50000, trades_per_year: 24, us_allocation: 30 }]);
        setName(data.portfolio.name || "");
        setAlerts(data.alerts || []);
        setResults({
          annual_fees: (data.portfolio.annual_fees_cents || 0) / 100,
          optimal_fees: (data.portfolio.optimal_fees_cents || 0) / 100,
          savings: (data.portfolio.savings_cents || 0) / 100,
          optimal_broker: data.portfolio.optimal_broker_slug || "",
          holdings: data.portfolio.holdings || [],
        });
        setStep("results");
      } else {
        setStep("holdings");
      }
    } else {
      setStep("holdings");
    }
    setLoading(false);
  };

  const addHolding = () => {
    setHoldings([...holdings, { broker_slug: "", balance: 25000, trades_per_year: 12, us_allocation: 20 }]);
  };

  const removeHolding = (idx: number) => {
    if (holdings.length <= 1) return;
    setHoldings(holdings.filter((_, i) => i !== idx));
  };

  const updateHolding = (idx: number, field: keyof Holding, value: string | number) => {
    setHoldings(holdings.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };

  const savePortfolio = async () => {
    if (holdings.some(h => !h.broker_slug)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), holdings }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setStep("results");
      }
    } catch {}
    setLoading(false);
  };

  const totalBalance = holdings.reduce((s, h) => s + (h.balance || 0), 0);
  const optimalBroker = brokers.find(b => b.slug === results?.optimal_broker);
  const unreadAlerts = alerts.filter(a => !a.read).length;

  const shareBrokers = useMemo(() =>
    brokers.filter(b => b.platform_type === "share_broker").sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [brokers]
  );

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-12 md:pt-10 md:pb-16">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <nav className="text-xs text-slate-400 mb-2 flex items-center gap-1">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span>/</span>
          <span className="text-slate-700">Portfolio Monitor</span>
        </nav>
        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">Portfolio Fee Monitor</h1>
        <p className="text-sm md:text-base text-slate-500">Track your investing fees. Get alerts when they change. Never overpay.</p>
      </div>

      {/* Step 1: Email */}
      {step === "email" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Icon name="shield-check" size={28} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Monitor Your Portfolio Fees</h2>
            <p className="text-sm text-slate-500">Tell us which brokers you use and we&apos;ll track your fees — alerting you when they change or a better deal appears.</p>
          </div>
          <div className="space-y-3 max-w-sm mx-auto">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && checkExisting()}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              autoFocus
            />
            <button
              onClick={checkExisting}
              disabled={loading || !email.trim()}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 text-sm"
            >
              {loading ? "Checking..." : "Get Started — Free"}
            </button>
            <p className="text-[0.55rem] text-slate-400 text-center">No credit card required. We&apos;ll email you when fees change.</p>
          </div>
        </div>
      )}

      {/* Step 2: Add holdings */}
      {step === "holdings" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6">
            <h2 className="text-base font-bold text-slate-900 mb-1">Your Platforms</h2>
            <p className="text-xs text-slate-500 mb-4">Add each broker/platform you currently use.</p>

            <div className="space-y-4">
              {holdings.map((h, idx) => (
                <div key={idx} className="bg-slate-50 rounded-xl p-4 relative">
                  {holdings.length > 1 && (
                    <button onClick={() => removeHolding(idx)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500">
                      <Icon name="x-circle" size={16} />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Platform</label>
                      <select
                        value={h.broker_slug}
                        onChange={e => updateHolding(idx, "broker_slug", e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="">Select a platform...</option>
                        {shareBrokers.map(b => (
                          <option key={b.slug} value={b.slug}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Portfolio Value ($)</label>
                      <input
                        type="number"
                        value={h.balance}
                        onChange={e => updateHolding(idx, "balance", Number(e.target.value))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Trades/Year</label>
                      <input
                        type="number"
                        value={h.trades_per_year}
                        onChange={e => updateHolding(idx, "trades_per_year", Number(e.target.value))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">US Share Allocation ({h.us_allocation}%)</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={h.us_allocation}
                        onChange={e => updateHolding(idx, "us_allocation", Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addHolding} className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800">
              + Add another platform
            </button>
          </div>

          <button
            onClick={savePortfolio}
            disabled={loading || holdings.some(h => !h.broker_slug)}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50 text-sm"
          >
            {loading ? "Calculating..." : "Calculate My Fees & Start Monitoring"}
          </button>
        </div>
      )}

      {/* Step 3: Results */}
      {step === "results" && results && (
        <div className="space-y-4">
          {/* Alerts */}
          {unreadAlerts > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-red-700 mb-2">
                <Icon name="bell" size={14} className="inline mr-1" />
                {unreadAlerts} New Alert{unreadAlerts !== 1 ? "s" : ""}
              </h3>
              {alerts.filter(a => !a.read).map(a => (
                <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-red-100 last:border-0">
                  <span className="text-xs text-red-500 mt-0.5">•</span>
                  <div>
                    <p className="text-sm text-red-800 font-medium">{a.title}</p>
                    {a.detail && <p className="text-xs text-red-600">{a.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fee summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Your Annual Fees</p>
              <p className="text-xl md:text-2xl font-extrabold text-slate-900">${results.annual_fees.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-[0.6rem] font-bold text-slate-400 uppercase">Best Available</p>
              <p className="text-xl md:text-2xl font-extrabold text-emerald-600">${results.optimal_fees.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl p-4 text-center ${results.savings > 0 ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white" : "bg-white border border-slate-200"}`}>
              <p className={`text-[0.6rem] font-bold uppercase ${results.savings > 0 ? "opacity-80" : "text-slate-400"}`}>Potential Savings</p>
              <p className={`text-xl md:text-2xl font-extrabold ${results.savings > 0 ? "" : "text-slate-900"}`}>${results.savings.toLocaleString()}/yr</p>
            </div>
          </div>

          {/* Optimal broker recommendation */}
          {optimalBroker && results.savings > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <BrokerLogo broker={optimalBroker} size="md" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-900">Switch to {optimalBroker.name} and save ${results.savings.toLocaleString()}/year</p>
                  <p className="text-xs text-emerald-700">Based on your trading pattern and portfolio size</p>
                </div>
                <a
                  href={getAffiliateLink(optimalBroker)}
                  target="_blank"
                  rel={AFFILIATE_REL}
                  onClick={() => trackClick(optimalBroker.slug, optimalBroker.name, "portfolio-monitor", "/portfolio", "recommendation")}
                  className="shrink-0 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
                >
                  Open Account →
                </a>
              </div>
            </div>
          )}

          {/* Holdings breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Your Fee Breakdown</h3>
            <div className="space-y-2">
              {(results.holdings || []).map((h: Holding, i: number) => {
                const broker = brokers.find(b => b.slug === h.broker_slug);
                return (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    {broker && <BrokerLogo broker={broker} size="sm" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{h.broker_name || h.broker_slug}</p>
                      <p className="text-[0.6rem] text-slate-400">${(h.balance || 0).toLocaleString()} · {h.trades_per_year} trades/yr · {h.us_allocation}% US</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">${(h.annual_fee || 0).toLocaleString()}/yr</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => setStep("holdings")} className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 text-sm">
              Edit Portfolio
            </button>
            <Link href="/switching-calculator" className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm text-center hover:bg-slate-800">
              Switching Calculator →
            </Link>
          </div>

          {/* Monitoring status */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <Icon name="bell" size={20} className="text-blue-500 mx-auto mb-1" />
            <p className="text-sm font-bold text-blue-900 mb-0.5">Monitoring Active</p>
            <p className="text-xs text-blue-700">We&apos;ll email <strong>{email}</strong> whenever your broker fees change or a cheaper option appears.</p>
          </div>

          {existingPortfolio && (
            <p className="text-[0.55rem] text-slate-400 text-center">
              Portfolio loaded from your previous visit. Last checked: {new Date().toLocaleDateString("en-AU")}.
            </p>
          )}
        </div>
      )}

      {/* SEO content */}
      <div className="mt-8 md:mt-12 prose prose-sm prose-slate max-w-none">
        <h2 className="text-lg font-bold">Why Monitor Your Broker Fees?</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Australian brokers change their fees more often than most investors realise. A broker that was cheapest 12 months ago might not be anymore.
          Our portfolio monitor tracks fee changes across all 73 platforms and alerts you instantly when something changes — so you never overpay for trades.
        </p>
        <h2 className="text-lg font-bold mt-6">How It Works</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Add the platforms you use and your approximate trading pattern. We calculate your annual fees, compare them against every other Australian broker,
          and show you exactly how much you could save. Then we monitor daily — if any broker changes their fees or a new deal launches, you get an instant email alert.
        </p>
      </div>
    </div>
  );
}
