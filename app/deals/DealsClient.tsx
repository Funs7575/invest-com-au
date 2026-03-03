"use client";

import { useState, useMemo, useEffect } from "react";
import type { Broker } from "@/lib/types";
import DealCard from "@/components/DealCard";
import BrokerLogo from "@/components/BrokerLogo";
import Icon from "@/components/Icon";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import ImpressionTracker from "@/components/ImpressionTracker";
import { getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";
import { filterByFrequencyCap } from "@/lib/marketplace/frequency-cap";
import { trackClick, getAffiliateLink, getBenefitCta, AFFILIATE_REL } from "@/lib/tracking";

const TAB_OPTIONS = [
  "All Deals",
  "Share Trading",
  "Crypto",
  "Robo-Advisors",
  "Super Funds",
  "Property",
  "CFD & Forex",
  "Research Tools",
  "International",
  "Beginner",
  "Active Trader",
] as const;
type TabOption = (typeof TAB_OPTIONS)[number];

const TAB_ICONS: Record<TabOption, string> = {
  "All Deals": "\uD83C\uDFF7\uFE0F",
  "Share Trading": "\uD83D\uDCC8",
  "Crypto": "\u20BF",
  "Robo-Advisors": "\uD83E\uDD16",
  "Super Funds": "\uD83C\uDFDB\uFE0F",
  "Property": "\uD83C\uDFE0",
  "CFD & Forex": "\uD83D\uDCB1",
  "Research Tools": "\uD83D\uDD0D",
  "International": "\uD83C\uDF0D",
  "Beginner": "\uD83C\uDFAF",
  "Active Trader": "\u26A1",
};

/**
 * Maps tab → filter config.
 * Each entry can match by deal_category, platform_type, or both.
 * "both:" prefix matches either deal_category OR platform_type.
 */
interface TabFilter {
  dealCategory?: string;
  platformType?: string;
}
const CATEGORY_MAP: Record<TabOption, TabFilter | null> = {
  "All Deals": null,
  "Share Trading": { dealCategory: "shares", platformType: "share_broker" },
  "Crypto": { dealCategory: "crypto", platformType: "crypto_exchange" },
  "Robo-Advisors": { platformType: "robo_advisor" },
  "Super Funds": { platformType: "super_fund" },
  "Property": { platformType: "property_platform" },
  "CFD & Forex": { platformType: "cfd_forex" },
  "Research Tools": { platformType: "research_tool" },
  "International": { dealCategory: "international" },
  "Beginner": { dealCategory: "beginner" },
  "Active Trader": { dealCategory: "active-trader" },
};

export default function DealsClient({ deals }: { deals: Broker[] }) {
  const [activeTab, setActiveTab] = useState<TabOption>("All Deals");
  const [featuredWinners, setFeaturedWinners] = useState<PlacementWinner[]>([]);
  const [cpcWinners, setCpcWinners] = useState<PlacementWinner[]>([]);

  // Fetch campaign placement winners for the deals page
  useEffect(() => {
    getPlacementWinners("deals-featured").then((winners) => {
      setFeaturedWinners(filterByFrequencyCap(winners, "deals-featured", 8));
    });
    getPlacementWinners("deals-cpc").then(setCpcWinners);
  }, []);

  const featuredSlugs = useMemo(
    () => new Set(featuredWinners.map((w) => w.broker_slug)),
    [featuredWinners]
  );

  // Map broker_slug -> campaign_id for CPC attribution
  const cpcCampaignMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of cpcWinners) {
      if (!map.has(w.broker_slug)) map.set(w.broker_slug, w.campaign_id);
    }
    return map;
  }, [cpcWinners]);

  // Find Deal of the Month broker
  const dealOfMonth = useMemo(
    () => deals.find((b) => b.sponsorship_tier === "deal_of_month") || null,
    [deals]
  );

  /** Check if a broker matches a tab filter (by deal_category OR platform_type) */
  function matchesFilter(b: Broker, filter: TabFilter): boolean {
    if (filter.dealCategory && b.deal_category === filter.dealCategory) return true;
    if (filter.platformType && b.platform_type === filter.platformType) return true;
    return false;
  }

  const filteredDeals = useMemo(() => {
    const filter = CATEGORY_MAP[activeTab];
    let base: Broker[];
    if (!filter) {
      base = deals;
    } else {
      base = deals.filter((b) => matchesFilter(b, filter));
    }

    // Sort: featured campaign winners first, then original order
    return [...base].sort((a, b) => {
      const aFeatured = featuredSlugs.has(a.slug) ? 0 : 1;
      const bFeatured = featuredSlugs.has(b.slug) ? 0 : 1;
      return aFeatured - bFeatured;
    });
  }, [deals, activeTab, featuredSlugs]);

  // Only show tabs that have deals (or "All Deals")
  const availableTabs = useMemo(() => {
    return TAB_OPTIONS.filter((tab) => {
      const filter = CATEGORY_MAP[tab];
      if (!filter) return true; // Always show "All Deals"
      return deals.some((b) => matchesFilter(b, filter));
    });
  }, [deals]);

  return (
    <div>
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-6 md:px-8 md:py-10 mb-5 md:mb-8">
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl md:text-3xl font-extrabold text-white">
              Exclusive Platform Deals
            </h2>
            <span className="inline-flex items-center px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs md:text-sm font-bold rounded-full border border-amber-500/30">
              {deals.length} Active
            </span>
          </div>
          <p className="text-sm md:text-base text-slate-400 max-w-xl">
            Limited-time offers and promotions from Australia&apos;s top investing platforms
          </p>
        </div>
      </div>

      {/* Deal of the Month Spotlight */}
      {dealOfMonth && (
        <div
          className="relative overflow-hidden rounded-xl mb-5 md:mb-8 p-4 md:p-6 border"
          style={{
            background: `linear-gradient(135deg, ${dealOfMonth.color}12, ${dealOfMonth.color}06, transparent)`,
            borderColor: `${dealOfMonth.color}30`,
          }}
        >
          {/* Star badge */}
          <div className="absolute top-3 right-3 md:top-4 md:right-4">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] md:text-xs font-bold border shadow-sm"
              style={{
                background: `${dealOfMonth.color}15`,
                color: dealOfMonth.color,
                borderColor: `${dealOfMonth.color}30`,
              }}
            >
              <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Deal of the Month
            </span>
          </div>

          <div className="flex items-start gap-3 md:gap-4">
            {/* Broker icon */}
            <BrokerLogo broker={dealOfMonth} size="xl" />
            <div className="flex-1 min-w-0 pr-20 md:pr-32">
              <h3 className="font-bold text-base md:text-lg text-slate-900 mb-0.5">
                {dealOfMonth.name}
              </h3>
              <p className="text-sm md:text-lg font-bold text-slate-800 leading-snug mb-3">
                {dealOfMonth.deal_text}
              </p>
              <a
                href={getAffiliateLink(dealOfMonth)}
                target="_blank"
                rel={AFFILIATE_REL}
                onClick={() =>
                  trackClick(dealOfMonth.slug, dealOfMonth.name, "deals-hub", "/deals", "compare")
                }
                className="inline-block px-5 py-2.5 md:px-6 md:py-3 text-white text-xs md:text-sm font-bold rounded-lg transition-all duration-200 active:scale-[0.98] hover:shadow-[0_0_20px_rgba(217,119,6,0.35)]"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                }}
              >
                {dealOfMonth.deal_text?.toLowerCase().includes("free")
                  ? "Get Free Access \u2192"
                  : getBenefitCta(dealOfMonth, "compare")}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs - pill-shaped with icons */}
      {availableTabs.length > 2 && (
        <div className="flex gap-1.5 md:gap-2 mb-4 md:mb-6 overflow-x-auto md:overflow-x-visible md:flex-wrap scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-1" role="tablist" aria-label="Deal category filter">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              className={`whitespace-nowrap shrink-0 px-3.5 md:px-5 py-2 md:py-2.5 min-h-[44px] rounded-full text-xs md:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === tab
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:shadow-sm"
              }`}
            >
              <span className="text-sm md:text-base">{TAB_ICONS[tab]}</span>
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Deals Grid with subtle background and staggered entrance */}
      {filteredDeals.length > 0 ? (
        <div className="relative">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 via-transparent to-slate-50/30 rounded-2xl -mx-2 -my-2 px-2 py-2 pointer-events-none" />
          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 portal-stagger">
            {filteredDeals.map((broker) => (
              <DealCard
                key={broker.id}
                broker={broker}
                isFeaturedCampaign={featuredSlugs.has(broker.slug)}
                campaignId={cpcCampaignMap.get(broker.slug)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 md:py-12">
          <Icon name="search" size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-xs md:text-sm text-slate-500">
            No deals in this category. Try &quot;All Deals&quot; instead.
          </p>
        </div>
      )}

      {/* Impression tracking for featured campaign winners */}
      {featuredWinners.length > 0 && (
        <ImpressionTracker winners={featuredWinners} placement="deals-featured" page="/deals" />
      )}

      {/* Compliance */}
      <div className="mt-4 md:mt-6">
        <CompactDisclaimerLine />
      </div>
    </div>
  );
}
