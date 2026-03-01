"use client";

import { useState, useMemo, useEffect } from "react";
import type { Broker } from "@/lib/types";
import { getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import { getMostRecentFeeCheck } from "@/lib/utils";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import PromoBadge from "@/components/PromoBadge";
import SponsorBadge from "@/components/SponsorBadge";
import ImpressionTracker from "@/components/ImpressionTracker";
import { sortWithSponsorship, isSponsored, getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";
import { filterByFrequencyCap } from "@/lib/marketplace/frequency-cap";
import JargonTooltip from "@/components/JargonTooltip";
import ShortlistButton from "@/components/ShortlistButton";

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
  const [campaignWinners, setCampaignWinners] = useState<PlacementWinner[]>([]);
  const [cpcCampaigns, setCpcCampaigns] = useState<PlacementWinner[]>([]);

  // Fetch campaign placement winners
  useEffect(() => {
    getPlacementWinners("home-featured").then((winners) => {
      setCampaignWinners(filterByFrequencyCap(winners, "home-featured", 8));
    });
    getPlacementWinners("home-cpc").then((winners) => {
      setCpcCampaigns(winners);
    });
  }, []);

  // Map broker_slug → campaign_id for CPC attribution
  const cpcCampaignMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of cpcCampaigns) {
      if (!map.has(w.broker_slug)) map.set(w.broker_slug, w.campaign_id);
    }
    return map;
  }, [cpcCampaigns]);

  const campaignWinnerSlugs = useMemo(
    () => new Set(campaignWinners.map((w) => w.broker_slug)),
    [campaignWinners]
  );

  // Filter by active tab, sort with campaign winners first, then sponsorship, take top 8
  const displayBrokers = useMemo(() => {
    const base =
      activeTab === "All Platforms"
        ? brokers
        : brokers.filter((b) => getCategories(b).includes(activeTab));

    // Sort: campaign winners → sponsored → rating
    const sorted = [...base].sort((a, b) => {
      const aIsCampaign = campaignWinnerSlugs.has(a.slug) ? 0 : 1;
      const bIsCampaign = campaignWinnerSlugs.has(b.slug) ? 0 : 1;
      if (aIsCampaign !== bIsCampaign) return aIsCampaign - bIsCampaign;

      const aPriority = isSponsored(a) ? 1 : 2;
      const bPriority = isSponsored(b) ? 1 : 2;
      if (aPriority !== bPriority) return aPriority - bPriority;

      return (b.rating ?? 0) - (a.rating ?? 0);
    });

    return sorted.slice(0, 8);
  }, [brokers, activeTab, campaignWinnerSlugs]);

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
      {/* Filter Tabs */}
      <div className="px-3 pt-3 pb-1 md:px-5 md:pt-5 md:pb-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 md:gap-2 overflow-x-auto md:overflow-x-visible md:flex-wrap scrollbar-hide" role="tablist" aria-label="Broker category filter">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                className={`whitespace-nowrap shrink-0 px-3 md:px-3.5 py-2 min-h-[44px] rounded-full text-[0.69rem] md:text-xs font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <a
            href="#advertiser-disclosure"
            className="hidden md:inline text-[0.69rem] text-slate-400 underline hover:text-slate-600 transition-colors shrink-0 ml-4"
          >
            Advertiser Disclosure
          </a>
        </div>
      </div>

      {/* Desktop Table */}
      <div key={activeTab} className="hidden md:block overflow-x-auto motion-safe:tab-content-enter">
        <table className="w-full compare-table">
          <thead>
            <tr className="border-y border-slate-100">
              <th scope="col" className="pl-5 pr-2 py-2 text-left font-semibold text-[0.69rem] uppercase tracking-wider text-slate-400 w-10">#</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold text-[0.69rem] uppercase tracking-wider text-slate-400 w-[28%]">Broker</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold text-[0.69rem] uppercase tracking-wider text-slate-400"><JargonTooltip term="ASX Fee" /></th>
              <th scope="col" className="px-3 py-2 text-left font-semibold text-[0.69rem] uppercase tracking-wider text-slate-400"><JargonTooltip term="US Fee" /></th>
              <th scope="col" className="px-3 py-2 text-left font-semibold text-[0.69rem] uppercase tracking-wider text-slate-400 whitespace-nowrap"><JargonTooltip term="FX Rate" /></th>
              <th scope="col" className="px-3 py-2 text-center font-semibold text-[0.69rem] uppercase tracking-wider text-slate-400"><JargonTooltip term="CHESS" /></th>
              <th scope="col" className="px-3 py-2 text-center font-semibold text-[0.69rem] uppercase tracking-wider text-slate-400">Rating</th>
              <th scope="col" className="px-3 py-2 pr-5 text-center font-semibold text-[0.69rem] uppercase tracking-wider text-slate-400 w-[155px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayBrokers.map((broker, i) => {
              const isCampaignWinner = campaignWinnerSlugs.has(broker.slug);
              const isTopRated = i === 0 && !isSponsored(broker) && !isCampaignWinner;
              const cid = cpcCampaignMap.get(broker.slug);
              const brokerLink = (() => {
                const link = getAffiliateLink(broker);
                return cid ? `${link}${link.includes("?") ? "&" : "?"}cid=${cid}` : link;
              })();
              return (
              <tr
                key={broker.id}
                className={`group hover:bg-slate-50/80 transition-colors ${
                  isCampaignWinner
                    ? "bg-blue-50/30 border-l-2 border-l-blue-400"
                    : isSponsored(broker)
                    ? "bg-blue-50/30 border-l-2 border-l-blue-400"
                    : isTopRated
                    ? "bg-amber-50/40 border-l-2 border-l-amber-400"
                    : editorPicks[broker.slug]
                    ? "bg-slate-50/30"
                    : ""
                }`}
              >
                <td className="pl-5 pr-2 py-2.5 text-xs text-slate-400 font-medium">
                  {isTopRated ? (
                    <span className="text-amber-500 text-sm" title="Top Rated">🏆</span>
                  ) : (
                    i + 1
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-900 text-xs shrink-0 transition-transform duration-200 group-hover:scale-110">
                      {broker.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/broker/${broker.slug}`}
                          className="font-semibold text-sm text-brand hover:text-slate-900 transition-colors"
                        >
                          {broker.name}
                        </a>
                        <PromoBadge broker={broker} />
                        <SponsorBadge broker={broker} />
                        {isCampaignWinner && !isSponsored(broker) && (
                          <span className="text-[0.62rem] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full uppercase tracking-wide">Sponsored</span>
                        )}
                      </div>
                      {!isSponsored(broker) && !isCampaignWinner && editorPicks[broker.slug] && (
                        <div className="text-[0.69rem] font-bold text-slate-500 uppercase tracking-wide">
                          {editorPicks[broker.slug]}
                        </div>
                      )}
                    </div>
                    <ShortlistButton slug={broker.slug} name={broker.name} size="sm" />
                  </div>
                </td>
                <td className="px-3 py-2.5 text-sm text-slate-700">{broker.asx_fee || "N/A"}</td>
                <td className="px-3 py-2.5 text-sm text-slate-700">{broker.us_fee || "N/A"}</td>
                <td className="px-3 py-2.5 text-sm text-slate-700">
                  {broker.fx_rate != null ? `${broker.fx_rate}%` : "N/A"}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span
                    className={`text-xs font-semibold ${
                      broker.chess_sponsored
                        ? "text-emerald-600"
                        : "text-slate-400"
                    }`}
                  >
                    {broker.chess_sponsored ? "\u2713 Yes" : "\u2717 No"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-amber text-xs">{renderStars(broker.rating || 0)}</span>
                    <span className="text-xs font-semibold text-slate-600">{broker.rating}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 pr-5 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <a
                      href={brokerLink}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      className="inline-block whitespace-nowrap text-center px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 hover:shadow-md transition-all duration-200 active:scale-[0.97] group-hover:scale-105 group-hover:shadow-[0_0_12px_rgba(217,119,6,0.3)]"
                    >
                      {getBenefitCta(broker, "compare")}
                    </a>
                    {broker.deal && (
                      <span className="text-[0.69rem] text-amber-600 font-semibold">Deal</span>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: Compact ranked list */}
      <div key={`mobile-${activeTab}`} className="md:hidden divide-y divide-slate-100 px-3 motion-safe:tab-content-enter">
        {displayBrokers.slice(0, 5).map((broker, i) => {
          const isCampaignMobile = campaignWinnerSlugs.has(broker.slug);
          const isTopRatedMobile = i === 0 && !isSponsored(broker) && !isCampaignMobile;
          const cidMobile = cpcCampaignMap.get(broker.slug);
          const mobileLink = (() => {
            const link = getAffiliateLink(broker);
            return cidMobile ? `${link}${link.includes("?") ? "&" : "?"}cid=${cidMobile}` : link;
          })();
          return (
          <div key={broker.id} className="flex items-center gap-2 py-2.5 first:pt-1">
            {/* Rank */}
            <div className="w-5 text-center shrink-0">
              {isTopRatedMobile ? (
                <span className="text-amber-500 text-xs">🏆</span>
              ) : (
                <span className="text-[0.62rem] font-bold text-slate-400">{i + 1}</span>
              )}
            </div>

            {/* Icon */}
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-900 text-[0.62rem] shrink-0">
              {broker.name.substring(0, 2).toUpperCase()}
            </div>

            {/* Name + rating + fees */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <a href={`/broker/${broker.slug}`} className="font-bold text-[0.8rem] text-slate-900 truncate">
                  {broker.name}
                </a>
                {isSponsored(broker) && <SponsorBadge broker={broker} />}
                {isCampaignMobile && !isSponsored(broker) && (
                  <span className="text-[0.56rem] font-bold uppercase text-blue-700 bg-blue-50 px-1 py-px rounded shrink-0">Sponsored</span>
                )}
                <PromoBadge broker={broker} />
                {!isSponsored(broker) && !isCampaignMobile && editorPicks[broker.slug] && (
                  <span className="text-[0.56rem] font-bold uppercase text-blue-700 bg-blue-50 px-1 py-px rounded shrink-0">
                    {editorPicks[broker.slug]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-px">
                <span className="text-[0.69rem] text-amber">{renderStars(broker.rating || 0)}</span>
                <span className="text-[0.62rem] text-slate-400">{broker.rating}</span>
                <span className="text-slate-300 text-[0.62rem]">·</span>
                <span className="text-[0.62rem] text-slate-500">
                  <span className="font-semibold text-slate-600">{broker.asx_fee || "N/A"}</span> ASX
                </span>
                {broker.chess_sponsored && (
                  <span className="text-[0.62rem] text-emerald-600 font-semibold">CHESS✓</span>
                )}
              </div>
            </div>

            {/* CTA */}
            <a
              href={mobileLink}
              target="_blank"
              rel={AFFILIATE_REL}
              className="shrink-0 px-3 py-2 min-h-[44px] inline-flex items-center bg-amber-500 text-white text-[0.62rem] font-bold rounded-lg hover:bg-amber-600 active:scale-[0.97] transition-all max-w-[120px] text-center leading-tight"
            >
              {getBenefitCta(broker, "compare")}
            </a>
          </div>
          );
        })}
      </div>

      {/* Impression tracking for campaign winners */}
      {campaignWinners.length > 0 && (
        <ImpressionTracker winners={campaignWinners} placement="home-featured" page="/" />
      )}

      {/* Affiliate disclosure + fee freshness */}
      <div id="advertiser-disclosure" className="px-4 py-3 md:px-5 border-t border-slate-100 text-center space-y-1">
        <CompactDisclaimerLine />
        {(() => {
          const lastChecked = getMostRecentFeeCheck(displayBrokers);
          return lastChecked ? (
            <p className="text-[0.62rem] text-slate-400">
              Fees last verified {new Date(lastChecked).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          ) : null;
        })()}
      </div>
    </div>
  );
}
