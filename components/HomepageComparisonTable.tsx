"use client";

import { useState, useMemo } from "react";
import type { Broker } from "@/lib/types";
import { getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";

import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import PromoBadge from "@/components/PromoBadge";
import SponsorBadge from "@/components/SponsorBadge";
import { sortWithSponsorship, isSponsored } from "@/lib/sponsorship";
import JargonTooltip from "@/components/JargonTooltip";

const TAB_OPTIONS = ["All Platforms", "Share Trading", "Crypto Exchanges", "SMSF"] as const;
type TabOption = (typeof TAB_OPTIONS)[number];

function getCategories(broker: Broker): string[] {
  if (broker.is_crypto) return ["Crypto Exchanges"];
  const cats: string[] = ["Share Trading"];
  if (broker.smsf_support) cats.push("SMSF");
  return cats;
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
        : brokers.filter((b) => getCategories(b).includes(activeTab));
    return sortWithSponsorship(base).slice(0, 8);
  }, [brokers, activeTab]);

  // Compute editor picks from the displayed list
  const editorPicks = useMemo(() => {
    const picks: Record<string, string> = {};
    // Exclude sponsored brokers from computed badge assignments
    const eligible = displayBrokers.filter((b) => !isSponsored(b));
    if (eligible.length > 0) {
      const cheapest = eligible.reduce((a, b) =>
        (a.asx_fee_value ?? 999) <= (b.asx_fee_value ?? 999) ? a : b
      );
      const bestOverall = eligible.reduce((a, b) =>
        (a.rating ?? 0) >= (b.rating ?? 0) ? a : b
      );
      const bestValue = eligible
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
      <div className="flex md:flex-wrap gap-2 mb-6 overflow-x-auto md:overflow-x-visible scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0" role="tablist" aria-label="Broker category filter">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            role="tab"
            aria-selected={activeTab === tab}
            className={`whitespace-nowrap shrink-0 px-4 py-2.5 md:py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-blue-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Desktop Table */}
      <div key={activeTab} className="hidden md:block overflow-x-auto motion-safe:tab-content-enter">
        <table className="w-full border border-slate-200 rounded-xl overflow-hidden compare-table">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-3 py-3 text-left font-semibold text-xs text-slate-500 w-8">#</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-sm">Broker</th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-sm"><JargonTooltip term="ASX Fee" /></th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-sm"><JargonTooltip term="US Fee" /></th>
              <th scope="col" className="px-4 py-3 text-left font-semibold text-sm"><JargonTooltip term="FX Rate" /></th>
              <th scope="col" className="px-4 py-3 text-center font-semibold text-sm"><JargonTooltip term="CHESS" /></th>
              <th scope="col" className="px-4 py-3 text-center font-semibold text-sm">Rating</th>
              <th scope="col" className="px-4 py-3 text-center font-semibold text-sm"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {displayBrokers.map((broker, i) => {
              const isTopRated = i === 0 && !isSponsored(broker);
              return (
              <tr
                key={broker.id}
                className={`group hover:bg-slate-50 transition-colors ${
                  isSponsored(broker)
                    ? "bg-blue-50/30 border-l-2 border-l-blue-400"
                    : isTopRated
                    ? "bg-amber-50/40 border-l-2 border-l-amber-400"
                    : editorPicks[broker.slug]
                    ? "bg-slate-50/40"
                    : ""
                }`}
              >
                <td className="px-3 py-3 text-sm text-slate-400 font-medium">
                  {isTopRated ? (
                    <span className="text-amber-500" title="Top Rated">🏆</span>
                  ) : (
                    i + 1
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-slate-900 text-sm shrink-0 transition-transform duration-200 group-hover:scale-110">
                      {broker.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/broker/${broker.slug}`}
                          className="font-semibold text-brand hover:text-slate-900 transition-colors"
                        >
                          {broker.name}
                        </a>
                        <PromoBadge broker={broker} />
                        <SponsorBadge broker={broker} />
                      </div>
                      {!isSponsored(broker) && editorPicks[broker.slug] && (
                        <div className="text-[0.65rem] font-extrabold text-slate-700 uppercase tracking-wide">
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
                      rel={AFFILIATE_REL}
                      className="inline-block px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 hover:shadow-md transition-all duration-200 active:scale-[0.97] group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(217,119,6,0.3)]"
                    >
                      {getBenefitCta(broker, "compare")}
                    </a>
                    {broker.deal && (
                      <span className="text-[0.55rem] text-amber-600 font-semibold">Deal</span>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: Vertical ranked list — clean, scannable, full-width */}
      <div key={`mobile-${activeTab}`} className="md:hidden divide-y divide-slate-100 motion-safe:tab-content-enter">
        {displayBrokers.slice(0, 5).map((broker, i) => {
          const isTopRatedMobile = i === 0 && !isSponsored(broker);
          return (
          <div key={broker.id} className="py-3.5 first:pt-0">
            {/* Row 1: Rank + Name + Rating + Badge */}
            <div className="flex items-center gap-3">
              <div className="w-7 text-center">
                {isTopRatedMobile ? (
                  <span className="text-amber-500 text-sm">🏆</span>
                ) : (
                  <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                )}
              </div>
              <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-slate-900 text-xs shrink-0">
                {broker.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <a href={`/broker/${broker.slug}`} className="font-bold text-sm text-slate-900 truncate">
                    {broker.name}
                  </a>
                  {isSponsored(broker) && <SponsorBadge broker={broker} />}
                  <PromoBadge broker={broker} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-amber">{renderStars(broker.rating || 0)}</span>
                  <span className="text-xs text-slate-400">{broker.rating}/5</span>
                  {!isSponsored(broker) && editorPicks[broker.slug] && (
                    <span className="text-[0.6rem] font-bold uppercase text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      {editorPicks[broker.slug]}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Row 2: Key fees + CTA */}
            <div className="flex items-center gap-2 mt-2.5 ml-10">
              <div className="flex items-center gap-3 flex-1 text-xs text-slate-500">
                <span><span className="font-semibold text-slate-700">{broker.asx_fee || "N/A"}</span> ASX</span>
                <span><span className="font-semibold text-slate-700">{broker.us_fee || "N/A"}</span> US</span>
                {broker.chess_sponsored && (
                  <span className="text-green-600 font-semibold">CHESS ✓</span>
                )}
              </div>
              <a
                href={getAffiliateLink(broker)}
                target="_blank"
                rel={AFFILIATE_REL}
                className="shrink-0 px-3.5 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 active:scale-[0.97] transition-all"
              >
                Visit
              </a>
            </div>
          </div>
          );
        })}
      </div>

      {/* Affiliate disclosure */}
      <div id="advertiser-disclosure" className="mt-4 text-center">
        <CompactDisclaimerLine />
      </div>
    </div>
  );
}
