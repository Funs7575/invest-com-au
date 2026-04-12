"use client";

import { useState, useMemo } from "react";
import Icon from "@/components/Icon";
import BrokerLogo from "@/components/BrokerLogo";
import { getAffiliateLink, trackClick, trackEvent, AFFILIATE_REL } from "@/lib/tracking";
import type { Broker } from "@/lib/types";

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

interface QuickAuditToolProps {
  brokers: Broker[];
}

export default function QuickAuditTool({ brokers }: QuickAuditToolProps) {
  const [currentBroker, setCurrentBroker] = useState("");
  const [tradesPerYear, setTradesPerYear] = useState<string>("24");
  const [avgTradeSize, setAvgTradeSize] = useState<string>("2000");
  const [showResult, setShowResult] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const trades = parseInt(tradesPerYear) || 0;
  const size = parseInt(avgTradeSize) || 0;

  // Calculate costs for all brokers (default 20% US allocation)
  const results = useMemo(() => {
    return brokers
      .map((b) => ({ broker: b, cost: calcAnnualCost(b, trades, size, 20) }))
      .sort((a, b) => a.cost - b.cost);
  }, [brokers, trades, size]);

  const currentBrokerObj = brokers.find((b) => b.slug === currentBroker);
  const currentCost = currentBroker
    ? results.find((r) => r.broker.slug === currentBroker)?.cost || 0
    : 0;
  const cheapest = results[0];
  const savings = currentBroker ? currentCost - (cheapest?.cost || 0) : 0;

  const handleCalculate = () => {
    if (!currentBroker || trades <= 0 || size <= 0) return;
    setShowResult(true);
    trackEvent("quick_audit_calculate", {
      current_broker: currentBroker,
      trades_per_year: trades,
      avg_trade_size: size,
      savings: Math.round(savings),
    });
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(true);
      return;
    }
    setEmailError(false);

    try {
      await fetch("/api/quick-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          current_broker: currentBroker,
          trades_per_year: trades,
          avg_trade_size: size,
        }),
      });
    } catch {
      // Silent fail
    }

    setEmailSubmitted(true);
    setShowBreakdown(true);
    sessionStorage.setItem("email_captured", "1");

    trackEvent("quick_audit_email_capture", {
      current_broker: currentBroker,
      trades_per_year: trades,
      avg_trade_size: size,
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Icon name="calculator" size={18} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">How Much Am I Paying?</h3>
            <p className="text-xs text-slate-400">Quick fee audit in 10 seconds</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Your current broker</label>
          <select
            value={currentBroker}
            onChange={(e) => {
              setCurrentBroker(e.target.value);
              setShowResult(false);
            }}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          >
            <option value="">Select broker...</option>
            {brokers.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Trades/year</label>
            <input
              type="number"
              value={tradesPerYear}
              onChange={(e) => {
                setTradesPerYear(e.target.value);
                setShowResult(false);
              }}
              placeholder="24"
              min={1}
              max={500}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Avg trade size ($)</label>
            <input
              type="number"
              value={avgTradeSize}
              onChange={(e) => {
                setAvgTradeSize(e.target.value);
                setShowResult(false);
              }}
              placeholder="2000"
              min={100}
              max={100000}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
            />
          </div>
        </div>

        {!showResult && (
          <button
            onClick={handleCalculate}
            disabled={!currentBroker || trades <= 0 || size <= 0}
            className="w-full py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Calculate
            <Icon name="arrow-right" size={14} className="inline ml-1 -mt-0.5" />
          </button>
        )}
      </div>

      {/* Result */}
      {showResult && (
        <div className="border-t border-slate-200">
          {/* Headline */}
          <div className="p-4 bg-slate-50">
            <p className="text-xs text-slate-500 mb-1">
              With {currentBrokerObj?.name}, you&apos;re paying
            </p>
            <p className="text-2xl font-extrabold text-slate-900">
              ${Math.round(currentCost).toLocaleString()}
              <span className="text-sm font-normal text-slate-500">/year</span>
            </p>
          </div>

          {/* Savings */}
          {savings > 0 && cheapest && (
            <div className="p-4 bg-emerald-50 border-t border-emerald-100">
              <div className="flex items-center gap-3">
                <BrokerLogo broker={cheapest.broker} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-emerald-700">
                    The cheapest alternative is{" "}
                    <span className="font-bold">{cheapest.broker.name}</span> at{" "}
                    <span className="font-bold">
                      ${Math.round(cheapest.cost).toLocaleString()}/year
                    </span>
                  </p>
                  <p className="text-lg font-extrabold text-emerald-700 mt-0.5">
                    Save ${Math.round(savings).toLocaleString()}/year
                  </p>
                </div>
              </div>

              <a
                href={getAffiliateLink(cheapest.broker)}
                target="_blank"
                rel={AFFILIATE_REL}
                onClick={() =>
                  trackClick(
                    cheapest.broker.slug,
                    cheapest.broker.name,
                    "quick-audit",
                    typeof window !== "undefined" ? window.location.pathname : "/",
                    undefined,
                    undefined,
                    "quick_audit"
                  )
                }
                className="mt-3 block w-full py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all text-center"
              >
                Try {cheapest.broker.name} Free
                <Icon name="arrow-right" size={14} className="inline ml-1 -mt-0.5" />
              </a>
            </div>
          )}

          {savings <= 0 && (
            <div className="p-4 bg-blue-50 border-t border-blue-100">
              <p className="text-sm text-blue-700 font-semibold">
                <Icon name="check-circle" size={14} className="inline mr-1 -mt-0.5" />
                Good news — you&apos;re already on one of the cheapest brokers!
              </p>
            </div>
          )}

          {/* Email gate for full breakdown */}
          {!emailSubmitted && !showBreakdown && (
            <div className="p-4 border-t border-slate-200">
              <p className="text-xs font-bold text-slate-700 mb-2">
                <Icon name="mail" size={12} className="inline mr-1 -mt-0.5 text-slate-400" />
                Enter email for full breakdown across all {brokers.length} brokers
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                  placeholder="your@email.com"
                  aria-label="Email address"
                  className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    emailError ? "border-red-300" : "border-slate-200"
                  }`}
                />
                <button
                  onClick={handleEmailSubmit}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 shrink-0"
                >
                  Unlock
                </button>
              </div>
              {emailError && (
                <p className="text-xs text-red-500 mt-1">Please enter a valid email</p>
              )}
            </div>
          )}

          {/* Full breakdown (revealed after email) */}
          {showBreakdown && (
            <div className="p-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 mb-2">
                Full Cost Ranking (for {trades} trades/year at ${size.toLocaleString()})
              </h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {results.slice(0, 10).map((r, i) => {
                  const isCurrent = r.broker.slug === currentBroker;
                  const savingsVsCurrent = currentCost - r.cost;
                  return (
                    <div
                      key={r.broker.slug}
                      className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs ${
                        isCurrent
                          ? "bg-red-50 border border-red-200"
                          : i === 0
                          ? "bg-emerald-50 border border-emerald-200"
                          : "bg-slate-50"
                      }`}
                    >
                      <span className="w-4 text-center font-bold text-slate-400">{i + 1}</span>
                      <BrokerLogo broker={r.broker} size="xs" />
                      <span className="flex-1 font-semibold text-slate-700 truncate">
                        {r.broker.name}
                        {isCurrent && (
                          <span className="ml-1 text-[0.5rem] bg-red-100 text-red-600 px-1 py-0.5 rounded-full font-bold">
                            YOU
                          </span>
                        )}
                      </span>
                      <span className={`font-bold ${isCurrent ? "text-red-600" : "text-slate-900"}`}>
                        ${Math.round(r.cost).toLocaleString()}
                      </span>
                      {!isCurrent && savingsVsCurrent > 0 && (
                        <span className="text-[0.6rem] font-bold text-emerald-600 whitespace-nowrap">
                          -{Math.round(savingsVsCurrent).toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[0.6rem] text-slate-400 mt-2 text-center">
                Based on 80% ASX / 20% US allocation. Includes brokerage, FX, and inactivity fees.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
