"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import BrokerLogo from "@/components/BrokerLogo";
import {
  getAffiliateLink,
  getBenefitCta,
  trackClick,
  trackEvent,
  trackPageDuration,
  AFFILIATE_REL,
} from "@/lib/tracking";
import type { Broker } from "@/lib/types";

/* ─── Fee calculation (same logic as switching calculator) ─── */

function parseFee(feeStr: string | null | undefined): { flat: number; pct: number } {
  if (!feeStr) return { flat: 0, pct: 0 };
  const s = feeStr.replace(/,/g, "");
  const pctMatch = s.match(/([\d.]+)%/);
  if (pctMatch) return { flat: 0, pct: parseFloat(pctMatch[1]) / 100 };
  const flatMatch = s.match(/\$([\d.]+)/);
  if (flatMatch) return { flat: parseFloat(flatMatch[1]), pct: 0 };
  if (s === "$0" || s.toLowerCase().includes("free") || s.startsWith("$0"))
    return { flat: 0, pct: 0 };
  return { flat: 0, pct: 0 };
}

function calcAnnualCost(
  broker: Broker,
  trades: number,
  avgSize: number,
  usAlloc: number
): number {
  const { flat: asxFlat, pct: asxPct } = parseFee(broker.asx_fee);
  const { flat: usFlat, pct: usPct } = parseFee(broker.us_fee);
  const fxRate = broker.fx_rate ? broker.fx_rate / 100 : 0.007;
  const inactivity = broker.inactivity_fee
    ? parseFloat(broker.inactivity_fee.replace(/[^0-9.]/g, "")) || 0
    : 0;

  const asxTrades = Math.round(trades * (1 - usAlloc / 100));
  const usTrades = Math.round(trades * (usAlloc / 100));

  const asxCost = asxTrades * Math.max(asxFlat, asxPct * avgSize);
  const usCost = usTrades * Math.max(usFlat, usPct * avgSize);
  const fxCost = usTrades * avgSize * fxRate;

  return asxCost + usCost + fxCost + inactivity;
}

/* ─── Bar colors by rank ─── */

const BAR_COLORS = [
  "bg-emerald-500",
  "bg-emerald-400",
  "bg-teal-400",
  "bg-cyan-400",
  "bg-sky-400",
  "bg-blue-400",
  "bg-indigo-400",
  "bg-violet-400",
  "bg-purple-400",
  "bg-fuchsia-400",
  "bg-pink-400",
  "bg-rose-400",
  "bg-red-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-yellow-400",
];

export default function FeeSimulatorClient({ brokers }: { brokers: Broker[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Pre-fill from URL params
  const [tradesPerYear, setTradesPerYear] = useState(() => {
    const p = searchParams.get("trades");
    return p ? Math.min(200, Math.max(1, parseInt(p) || 24)) : 24;
  });
  const [avgTradeSize, setAvgTradeSize] = useState(() => {
    const p = searchParams.get("size");
    return p ? Math.min(50000, Math.max(100, parseInt(p) || 2000)) : 2000;
  });
  const [usAllocation, setUsAllocation] = useState(() => {
    const p = searchParams.get("us");
    return p ? Math.min(100, Math.max(0, parseInt(p) || 30)) : 30;
  });

  useEffect(() => {
    trackPageDuration("/fee-simulator");
  }, []);

  // Real-time results — update on every slider change
  const results = useMemo(() => {
    return brokers
      .map((b) => ({
        broker: b,
        cost: calcAnnualCost(b, tradesPerYear, avgTradeSize, usAllocation),
      }))
      .sort((a, b) => a.cost - b.cost);
  }, [brokers, tradesPerYear, avgTradeSize, usAllocation]);

  const maxCost = results.length > 0 ? results[results.length - 1].cost : 1;

  // Share button — generate URL with params
  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/fee-simulator?trades=${tradesPerYear}&size=${avgTradeSize}&us=${usAllocation}`;
    if (navigator.share) {
      navigator.share({
        title: "Fee Simulator — Compare Broker Costs",
        text: `Compare broker fees for ${tradesPerYear} trades/year at $${avgTradeSize.toLocaleString()} avg with ${usAllocation}% US`,
        url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
    trackEvent("fee_simulator_share", {
      trades: tradesPerYear,
      size: avgTradeSize,
      us: usAllocation,
    });
  }, [tradesPerYear, avgTradeSize, usAllocation]);

  // Update URL params when sliders change (debounced via replace)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      params.set("trades", String(tradesPerYear));
      params.set("size", String(avgTradeSize));
      params.set("us", String(usAllocation));
      router.replace(`/fee-simulator?${params.toString()}`, { scroll: false });
    }, 500);
    return () => clearTimeout(timeout);
  }, [tradesPerYear, avgTradeSize, usAllocation, router]);

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-5xl">
        {/* Breadcrumb */}
        <nav className="text-xs md:text-sm text-slate-500 mb-3">
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <Link href="/calculators" className="hover:text-slate-900">
            Calculators
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Fee Simulator</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 md:p-8 text-white mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
          <div className="relative">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <Icon name="trending-up" size={24} className="text-white" />
            </div>
            <h1 className="text-xl md:text-3xl font-extrabold mb-2">
              Interactive Fee Simulator
            </h1>
            <p className="text-sm md:text-base text-emerald-100">
              Drag the sliders to instantly compare annual broker costs for your
              exact trading profile. Every Australian platform, updated in real
              time.
            </p>
          </div>
        </div>

        {/* Layout: sliders + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sliders Panel */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 sticky top-4">
              <h2 className="text-sm font-bold text-slate-900 mb-4">
                Your Trading Profile
              </h2>

              {/* Trades per year */}
              <div className="mb-5">
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Trades per year
                  </label>
                  <span className="text-sm font-extrabold text-emerald-700">
                    {tradesPerYear}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={tradesPerYear}
                  onChange={(e) => setTradesPerYear(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[0.6rem] text-slate-400 mt-0.5">
                  <span>1</span>
                  <span>50</span>
                  <span>100</span>
                  <span>200</span>
                </div>
              </div>

              {/* Average trade size */}
              <div className="mb-5">
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Average trade size
                  </label>
                  <span className="text-sm font-extrabold text-emerald-700">
                    ${avgTradeSize.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={50000}
                  step={100}
                  value={avgTradeSize}
                  onChange={(e) => setAvgTradeSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[0.6rem] text-slate-400 mt-0.5">
                  <span>$100</span>
                  <span>$10k</span>
                  <span>$25k</span>
                  <span>$50k</span>
                </div>
              </div>

              {/* US allocation */}
              <div className="mb-5">
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    US share allocation
                  </label>
                  <span className="text-sm font-extrabold text-emerald-700">
                    {usAllocation}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={usAllocation}
                  onChange={(e) => setUsAllocation(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[0.6rem] text-slate-400 mt-0.5">
                  <span>0% (ASX only)</span>
                  <span>50%</span>
                  <span>100% (US only)</span>
                </div>
              </div>

              {/* Profile summary */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <p className="text-xs text-slate-500">Your profile</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {tradesPerYear} trades/year at ${avgTradeSize.toLocaleString()}{" "}
                  avg with {usAllocation}% US
                </p>
              </div>

              {/* Share button */}
              <button
                onClick={handleShare}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Icon name="share-2" size={14} />
                Share this simulation
              </button>
            </div>
          </div>

          {/* Chart Panel */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-900">
                  Annual Cost by Broker
                </h2>
                <span className="text-xs text-slate-400">
                  {results.length} brokers compared
                </span>
              </div>

              {/* Horizontal bar chart */}
              <div className="space-y-2">
                {results.map((r, i) => {
                  const barWidth =
                    maxCost > 0
                      ? Math.max(2, (r.cost / maxCost) * 100)
                      : 2;
                  const isTop3 = i < 3;
                  const colorClass =
                    BAR_COLORS[i % BAR_COLORS.length];

                  return (
                    <div key={r.broker.slug}>
                      <div
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          isTop3
                            ? "bg-emerald-50 border border-emerald-100"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {/* Rank */}
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            i === 0
                              ? "bg-emerald-600 text-white"
                              : i < 3
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {i + 1}
                        </span>

                        {/* Logo + name */}
                        <BrokerLogo broker={r.broker} size="xs" />
                        <div className="w-24 md:w-32 shrink-0">
                          <Link
                            href={`/broker/${r.broker.slug}`}
                            className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors truncate block"
                          >
                            {r.broker.name}
                          </Link>
                        </div>

                        {/* Bar */}
                        <div className="flex-1 min-w-0">
                          <div className="h-5 bg-slate-100 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full rounded-full ${colorClass} transition-all duration-500 ease-out`}
                              style={{ width: `${barWidth}%` }}
                            />
                            <span className="absolute inset-y-0 right-2 flex items-center text-[0.6rem] font-bold text-slate-600">
                              ${Math.round(r.cost).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* CTA for top 3 */}
                        {isTop3 && r.broker.affiliate_url && (
                          <a
                            href={getAffiliateLink(r.broker)}
                            target="_blank"
                            rel={AFFILIATE_REL}
                            onClick={() =>
                              trackClick(
                                r.broker.slug,
                                r.broker.name,
                                "fee-simulator",
                                "/fee-simulator",
                                undefined,
                                undefined,
                                "simulator_top3"
                              )
                            }
                            className="shrink-0 hidden md:block px-3 py-1.5 text-[0.6rem] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors whitespace-nowrap"
                          >
                            {getBenefitCta(r.broker, "calculator")}
                          </a>
                        )}
                      </div>

                      {/* Mobile CTA for top 3 */}
                      {isTop3 && r.broker.affiliate_url && (
                        <a
                          href={getAffiliateLink(r.broker)}
                          target="_blank"
                          rel={AFFILIATE_REL}
                          onClick={() =>
                            trackClick(
                              r.broker.slug,
                              r.broker.name,
                              "fee-simulator",
                              "/fee-simulator",
                              undefined,
                              undefined,
                              "simulator_top3"
                            )
                          }
                          className="md:hidden block ml-8 mt-1 mb-1 px-3 py-1.5 text-[0.6rem] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-center"
                        >
                          {getBenefitCta(r.broker, "calculator")}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footnote */}
              <p className="text-[0.6rem] text-slate-400 mt-4 text-center">
                Costs include ASX brokerage, US brokerage, FX conversion fees,
                and inactivity charges. Data sourced from official PDS documents.
              </p>
            </div>

            {/* Insights cards */}
            {results.length >= 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="bg-white border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-[0.6rem] text-emerald-600 font-bold uppercase tracking-wider mb-1">
                    Cheapest
                  </p>
                  <BrokerLogo
                    broker={results[0].broker}
                    size="sm"
                    className="mx-auto mb-1"
                  />
                  <p className="text-sm font-bold text-slate-900">
                    {results[0].broker.name}
                  </p>
                  <p className="text-lg font-extrabold text-emerald-700">
                    ${Math.round(results[0].cost).toLocaleString()}
                    <span className="text-xs font-normal text-slate-400">
                      /yr
                    </span>
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-[0.6rem] text-slate-500 font-bold uppercase tracking-wider mb-1">
                    Most Expensive
                  </p>
                  <BrokerLogo
                    broker={results[results.length - 1].broker}
                    size="sm"
                    className="mx-auto mb-1"
                  />
                  <p className="text-sm font-bold text-slate-900">
                    {results[results.length - 1].broker.name}
                  </p>
                  <p className="text-lg font-extrabold text-red-600">
                    $
                    {Math.round(
                      results[results.length - 1].cost
                    ).toLocaleString()}
                    <span className="text-xs font-normal text-slate-400">
                      /yr
                    </span>
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-[0.6rem] text-slate-500 font-bold uppercase tracking-wider mb-1">
                    Max Savings
                  </p>
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-1">
                    <Icon
                      name="trending-up"
                      size={16}
                      className="text-amber-600"
                    />
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    Potential saving
                  </p>
                  <p className="text-lg font-extrabold text-amber-600">
                    $
                    {Math.round(
                      results[results.length - 1].cost - results[0].cost
                    ).toLocaleString()}
                    <span className="text-xs font-normal text-slate-400">
                      /yr
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* SEO content */}
            <div className="mt-8 space-y-5 text-sm text-slate-600 leading-relaxed">
              <h2 className="text-lg font-bold text-slate-900">
                How the Fee Simulator Works
              </h2>
              <p>
                Our interactive fee simulator calculates the true annual cost of
                using each of the {brokers.length} Australian investment
                platforms we track. Unlike simple fee tables, it factors in your
                exact trading frequency, trade size, and international allocation
                to show you what you would actually pay.
              </p>
              <h3 className="text-base font-bold text-slate-900">
                What&apos;s included in the calculation
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>ASX brokerage:</strong> Flat fees or percentage-based
                  fees per trade on Australian shares
                </li>
                <li>
                  <strong>US brokerage:</strong> Per-trade costs for US/international
                  shares
                </li>
                <li>
                  <strong>FX conversion:</strong> Currency conversion spread on
                  international trades (often the biggest hidden cost)
                </li>
                <li>
                  <strong>Inactivity fees:</strong> Charges for accounts with low
                  trading activity
                </li>
              </ul>
              <p>
                All fee data is sourced from official PDS documents and verified
                monthly. Try the{" "}
                <Link
                  href="/switching-calculator"
                  className="text-violet-600 hover:underline"
                >
                  Switching Calculator
                </Link>{" "}
                to see how much you could save by changing brokers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
