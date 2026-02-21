"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Broker } from "@/lib/types";

interface TradingGatewayProps {
  brokers: Broker[];
}

export default function TradingGateway({ brokers }: TradingGatewayProps) {
  const [market, setMarket] = useState<string>("asx");
  const [feeType, setFeeType] = useState<string>("any");
  const [budget, setBudget] = useState<string>("any");
  const [filteredBrokers, setFilteredBrokers] = useState<Broker[]>([]);

  useEffect(() => {
    let filtered = [...brokers];

    // Filter by market
    if (market === "crypto") {
      filtered = filtered.filter((b) => b.is_crypto);
    } else {
      filtered = filtered.filter((b) => !b.is_crypto);
      if (market === "us") {
        filtered = filtered.filter((b) => b.us_fee_value !== undefined && b.us_fee_value < 999);
      }
    }

    // Filter by fee type
    if (feeType === "free") {
      if (market === "asx") {
        filtered = filtered.filter((b) => b.asx_fee_value === 0);
      } else if (market === "us") {
        filtered = filtered.filter((b) => b.us_fee_value === 0);
      }
    } else if (feeType === "low") {
      if (market === "asx") {
        filtered = filtered.filter((b) => b.asx_fee_value !== undefined && b.asx_fee_value > 0 && b.asx_fee_value <= 5);
      } else if (market === "us") {
        filtered = filtered.filter((b) => b.us_fee_value !== undefined && b.us_fee_value > 0 && b.us_fee_value <= 5);
      }
    }

    // Filter by budget (based on min_deposit)
    if (budget === "beginner") {
      // Beginner: $0 - $500
      filtered = filtered.filter((b) => !b.min_deposit || b.min_deposit === "$0" || parseInt(b.min_deposit.replace(/\D/g, "")) <= 500);
    } else if (budget === "intermediate") {
      // Intermediate: $500 - $5000
      filtered = filtered.filter((b) => {
        if (!b.min_deposit || b.min_deposit === "$0") return true;
        const amount = parseInt(b.min_deposit.replace(/\D/g, ""));
        return amount > 500 && amount <= 5000;
      });
    }

    // Sort by rating
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Limit to top 3 results
    setFilteredBrokers(filtered.slice(0, 3));
  }, [market, feeType, budget, brokers]);

  return (
    <section className="py-16 bg-gradient-to-b from-white to-slate-50">
      <div className="container-custom">
        {/* Trading Gateway */}
        <div
          className="rounded-2xl p-6 md:p-10 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          }}
        >
          {/* Green glow effect */}
          <div
            className="absolute top-[-40%] right-[-10%] w-96 h-96 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(21,128,61,0.08) 0%, transparent 70%)",
            }}
          ></div>

          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">
              Filter Brokers in 3 Clicks
            </h2>
            <p className="text-slate-300 text-center mb-8 max-w-2xl mx-auto">
              Tell us what you're looking for and we'll show brokers that fit your criteria
            </p>

            {/* Gateway Sentence */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8">
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm md:text-base text-white">
                <span>I want to trade</span>
                <select
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className="bg-green-700 text-white font-bold px-4 py-2 rounded-lg border-2 border-green-800 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="asx">ASX shares</option>
                  <option value="us">US shares</option>
                  <option value="crypto">Crypto</option>
                </select>
                <span>with</span>
                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value)}
                  className="bg-green-700 text-white font-bold px-4 py-2 rounded-lg border-2 border-green-800 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="any">any fees</option>
                  <option value="free">$0 fees</option>
                  <option value="low">low fees (&lt;$5)</option>
                </select>
                <span>and I have a</span>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="bg-green-700 text-white font-bold px-4 py-2 rounded-lg border-2 border-green-800 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="any">any budget</option>
                  <option value="beginner">beginner budget ($0-$500)</option>
                  <option value="intermediate">intermediate budget ($500+)</option>
                </select>
                <span>to start.</span>
              </div>
            </div>

            {/* Results */}
            {filteredBrokers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {filteredBrokers.map((broker) => (
                  <Link
                    key={broker.id}
                    href={`/broker/${broker.slug}`}
                    className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-5 hover:bg-white/20 transition-all hover:scale-105"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{ background: `${broker.color}20`, color: broker.color }}
                      >
                        {broker.icon || broker.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-bold">{broker.name}</div>
                        {broker.deal && (
                          <div className="text-xs text-green-400 font-semibold uppercase tracking-wide">
                            Deal Active
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {market === "asx" && (
                        <div className="bg-white/5 rounded px-2 py-1 text-xs text-slate-300">
                          ASX: <strong className="text-white">{broker.asx_fee}</strong>
                        </div>
                      )}
                      {market === "us" && (
                        <div className="bg-white/5 rounded px-2 py-1 text-xs text-slate-300">
                          US: <strong className="text-white">{broker.us_fee}</strong>
                        </div>
                      )}
                      {broker.rating && (
                        <div className="bg-white/5 rounded px-2 py-1 text-xs text-slate-300">
                          <strong className="text-amber">{broker.rating}★</strong>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-green-400">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      Available now
                    </div>

                    <div className="mt-4">
                      <span className="text-xs text-green-400 hover:underline">
                        View Details →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8">
                No brokers match your criteria. Try adjusting your filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
