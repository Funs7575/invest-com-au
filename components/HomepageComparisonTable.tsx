"use client";

import { useState, useMemo } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, renderStars } from "@/lib/tracking";

const TAB_OPTIONS = ["All Platforms", "Share Trading", "Crypto Exchanges", "SMSF"] as const;
type TabOption = (typeof TAB_OPTIONS)[number];

function deriveCategory(broker: Broker): string {
  if (broker.is_crypto) return "Crypto Exchanges";
  if (broker.smsf_support) return "SMSF";
  return "Share Trading";
}

export default function HomepageComparisonTable({
  brokers,
  defaultTab = "All Platforms",
}: {
  brokers: Broker[];
  defaultTab?: TabOption;
}) {
  const [activeTab, setActiveTab] = useState<TabOption>(defaultTab);

  // Filter by active tab, sort by rating, take top 8
  const displayBrokers = useMemo(() => {
    const base =
      activeTab === "All Platforms"
        ? brokers
        : brokers.filter((b) => deriveCategory(b) === activeTab);
    return [...base]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 8);
  }, [brokers, activeTab]);

  // Compute editor picks from the displayed list
  const editorPicks = useMemo(() => {
    const picks: Record<string, string> = {};
    if (displayBrokers.length > 0) {
      const cheapest = displayBrokers.reduce((a, b) =>
        (a.asx_fee_value ?? 999) <= (b.asx_fee_value ?? 999) ? a : b
      );
      const bestOverall = displayBrokers.reduce((a, b) =>
        (a.rating ?? 0) >= (b.rating ?? 0) ? a : b
      );
      const bestValue = displayBrokers
        .filter((b) => b.chess_sponsored && (b.asx_fee_value ?? 999) <= 5)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];

      if (cheapest) picks[cheapest.slug] = "Lowest Fees";
      if (bestOverall && bestOverall.slug !== cheapest?.slug)
        picks[bestOverall.slug] = "Editor\u2019s Choice";
      if (bestValue && !picks[bestValue.slug]) picks[bestValue.slug] = "Best Value";
    }
    return picks;
  }, [displayBrokers]);

  return (
    <div>
      {/* Compliance header */}
      <div className="flex justify-end mb-2">
        <a
          href="#advertiser-disclosure"
          className="text-xs text-gray-400 underline hover:text-gray-600 transition-colors"
        >
          Advertiser Disclosure
        </a>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-green-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border border-slate-200 rounded-xl overflow-hidden">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-xs text-slate-500 w-8">#</th>
              <th className="px-4 py-3 text-left font-semibold text-sm">Broker</th>
              <th className="px-4 py-3 text-left font-semibold text-sm">ASX Fee</th>
              <th className="px-4 py-3 text-left font-semibold text-sm">US Fee</th>
              <th className="px-4 py-3 text-left font-semibold text-sm">FX Rate</th>
              <th className="px-4 py-3 text-center font-semibold text-sm">CHESS</th>
              <th className="px-4 py-3 text-center font-semibold text-sm">Rating</th>
              <th className="px-4 py-3 text-center font-semibold text-sm"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {displayBrokers.map((broker, i) => (
              <tr
                key={broker.id}
                className={`hover:bg-slate-50 transition-colors ${
                  editorPicks[broker.slug] ? "bg-green-50/40" : ""
                }`}
              >
                <td className="px-3 py-3 text-sm text-slate-400 font-medium">
                  {i + 1}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-green-900 text-sm shrink-0">
                      {broker.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <a
                        href={`/broker/${broker.slug}`}
                        className="font-semibold text-brand hover:text-green-700 transition-colors"
                      >
                        {broker.name}
                      </a>
                      {editorPicks[broker.slug] && (
                        <div className="text-[0.6rem] font-extrabold text-green-700 uppercase tracking-wide">
                          {editorPicks[broker.slug]}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{broker.asx_fee || "N/A"}</td>
                <td className="px-4 py-3 text-sm">{broker.us_fee || "N/A"}</td>
                <td className="px-4 py-3 text-sm">
                  {broker.fx_rate != null ? `${broker.fx_rate}%` : "N/A"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={
                      broker.chess_sponsored
                        ? "text-green-600 font-semibold"
                        : "text-red-500"
                    }
                  >
                    {broker.chess_sponsored ? "\u2713 Yes" : "\u2717 No"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-amber">{renderStars(broker.rating || 0)}</span>
                  <span className="text-sm text-slate-500 ml-1">{broker.rating}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <a
                      href={getAffiliateLink(broker)}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      onClick={() =>
                        trackClick(
                          broker.slug,
                          broker.name,
                          "homepage-table",
                          "/",
                          "homepage"
                        )
                      }
                      className="inline-block px-4 py-2 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-600 hover:shadow-md transition-all active:scale-[0.97]"
                    >
                      {getBenefitCta(broker, "compare")}
                    </a>
                    {broker.deal && (
                      <span className="text-[0.55rem] text-amber-600 font-semibold">🔥 Deal</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {displayBrokers.map((broker, i) => (
          <div
            key={broker.id}
            className={`rounded-xl border p-4 bg-white ${
              editorPicks[broker.slug]
                ? "border-green-700 ring-1 ring-green-700/30"
                : "border-slate-200"
            }`}
          >
            {editorPicks[broker.slug] && (
              <div className="text-[0.6rem] font-extrabold uppercase tracking-wide text-green-700 mb-2">
                {editorPicks[broker.slug]}
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="text-xs font-bold text-slate-400 w-5">#{i + 1}</div>
              <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-green-900 text-sm shrink-0">
                {broker.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={`/broker/${broker.slug}`}
                  className="font-bold text-sm hover:text-green-700 transition-colors"
                >
                  {broker.name}
                </a>
                <div className="text-xs text-amber">
                  {renderStars(broker.rating || 0)}{" "}
                  <span className="text-slate-500">{broker.rating}/5</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-slate-50 rounded-md p-2">
                <div className="text-[0.6rem] uppercase text-slate-500 font-medium">
                  ASX Fee
                </div>
                <div className="text-sm font-semibold">{broker.asx_fee || "N/A"}</div>
              </div>
              <div className="bg-slate-50 rounded-md p-2">
                <div className="text-[0.6rem] uppercase text-slate-500 font-medium">
                  US Fee
                </div>
                <div className="text-sm font-semibold">{broker.us_fee || "N/A"}</div>
              </div>
              <div className="bg-slate-50 rounded-md p-2">
                <div className="text-[0.6rem] uppercase text-slate-500 font-medium">
                  FX Rate
                </div>
                <div className="text-sm font-semibold">
                  {broker.fx_rate != null ? `${broker.fx_rate}%` : "N/A"}
                </div>
              </div>
              <div className="bg-slate-50 rounded-md p-2">
                <div className="text-[0.6rem] uppercase text-slate-500 font-medium">
                  CHESS
                </div>
                <div
                  className={`text-sm font-semibold ${
                    broker.chess_sponsored ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {broker.chess_sponsored ? "\u2713 Yes" : "\u2717 No"}
                </div>
              </div>
            </div>

            <a
              href={getAffiliateLink(broker)}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onClick={() =>
                trackClick(
                  broker.slug,
                  broker.name,
                  "homepage-mobile-card",
                  "/",
                  "homepage"
                )
              }
              className="block w-full text-center py-3 bg-green-700 text-white font-bold rounded-lg mt-4 hover:bg-green-800 transition-colors"
            >
              {getBenefitCta(broker, "compare")}
            </a>
          </div>
        ))}
      </div>

      {/* Affiliate disclosure */}
      <p id="advertiser-disclosure" className="text-[0.6rem] text-slate-400 mt-4 text-center">
        Sponsored — we may earn a commission if you open an account via our links, at no
        extra cost to you. Rankings are based on editorial assessment and not influenced by
        compensation.
      </p>
    </div>
  );
}
