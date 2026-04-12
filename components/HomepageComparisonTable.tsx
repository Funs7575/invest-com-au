"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import BrokerLogo from "@/components/BrokerLogo";
import { getMostRecentFeeCheck } from "@/lib/utils";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import PromoBadge from "@/components/PromoBadge";
import SponsorBadge from "@/components/SponsorBadge";
import ImpressionTracker from "@/components/ImpressionTracker";
import { isSponsored, getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";
import { filterByFrequencyCap } from "@/lib/marketplace/frequency-cap";
import JargonTooltip from "@/components/JargonTooltip";
import ShortlistButton from "@/components/ShortlistButton";
import { SHOW_RATINGS, SHOW_EDITORIAL_BADGES } from "@/lib/compliance-config";

// Homepage shows focused categories only — niche tabs live on /compare
const TAB_OPTIONS = ["All Platforms", "Share Trading", "Super Funds", "Robo-Advisors", "Savings", "Crypto Exchanges"] as const;
type TabOption = (typeof TAB_OPTIONS)[number];

// --- Column config per platform category ---
type ColumnDef = {
  header: string;
  align?: "left" | "center";
  accessor: (broker: Broker) => React.ReactNode;
};

const SHARE_TRADING_COLUMNS: ColumnDef[] = [
  { header: "ASX Fee", accessor: (b) => b.asx_fee || "N/A" },
  { header: "US Fee", accessor: (b) => b.us_fee || "N/A" },
  { header: "Intl. Fee", accessor: (b) => (b.fx_rate != null ? `${b.fx_rate}%` : "N/A") },
  {
    header: "CHESS",
    align: "center",
    accessor: (b) => (
      <span className={`text-xs font-semibold ${b.chess_sponsored ? "text-emerald-600" : "text-slate-400"}`}>
        {b.chess_sponsored ? "\u2713 Yes" : "\u2717 No"}
      </span>
    ),
  },
];

const CRYPTO_COLUMNS: ColumnDef[] = [
  { header: "Trading Fee", accessor: (b) => b.asx_fee || "N/A" },
  { header: "Coins", accessor: (b) => b.us_fee || "N/A" },
  { header: "FX Rate", accessor: (b) => (b.fx_rate != null ? `${b.fx_rate}%` : "N/A") },
  {
    header: "Staking",
    align: "center",
    accessor: (b) => (
      <span className={`text-xs font-semibold ${b.chess_sponsored ? "text-emerald-600" : "text-slate-400"}`}>
        {b.chess_sponsored ? "\u2713 Yes" : "\u2717 No"}
      </span>
    ),
  },
];

const SUPER_FUND_COLUMNS: ColumnDef[] = [
  { header: "Management Fee", accessor: (b) => b.asx_fee || "N/A" },
  { header: "Min Deposit", accessor: (b) => b.min_deposit || "N/A" },
  { header: "Insurance", accessor: (b) => (b.smsf_support ? "Included" : "Optional") },
];

const SAVINGS_COLUMNS: ColumnDef[] = [
  { header: "Interest Rate", accessor: (b) => b.asx_fee || "N/A" },
  { header: "Min Deposit", accessor: (b) => b.min_deposit || "N/A" },
  { header: "Bonus Conditions", accessor: (b) => b.us_fee || b.tagline || "N/A" },
];

const ROBO_ADVISOR_COLUMNS: ColumnDef[] = [
  { header: "Management Fee", accessor: (b) => b.asx_fee || "N/A" },
  { header: "Min Investment", accessor: (b) => b.min_deposit || "N/A" },
  { header: "Portfolio Types", accessor: (b) => b.tagline || "N/A" },
];

function getColumnsForTab(tab: TabOption): ColumnDef[] {
  switch (tab) {
    case "Share Trading":
    case "All Platforms":
      return SHARE_TRADING_COLUMNS;
    case "Crypto Exchanges":
      return CRYPTO_COLUMNS;
    case "Super Funds":
      return SUPER_FUND_COLUMNS;
    case "Savings":
      return SAVINGS_COLUMNS;
    case "Robo-Advisors":
      return ROBO_ADVISOR_COLUMNS;
    default:
      return SHARE_TRADING_COLUMNS;
  }
}

function getCategories(broker: Broker): string[] {
  const pt = broker.platform_type || (broker.is_crypto ? "crypto_exchange" : "share_broker");
  switch (pt) {
    case "crypto_exchange":
      return ["Crypto Exchanges"];
    case "robo_advisor":
      return ["Robo-Advisors"];
    case "research_tool":
      return ["Research Tools"];
    case "super_fund":
      return ["Super Funds"];
    case "property_platform":
      return ["Property"];
    case "cfd_forex":
      return ["CFD & Forex"];
    case "savings_account":
      return ["Savings"];
    case "term_deposit":
      return ["Term Deposits"];
    default: {
      const cats: string[] = ["Share Trading"];
      if (broker.smsf_support) cats.push("SMSF");
      return cats;
    }
  }
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

  const activeColumns = useMemo(() => getColumnsForTab(activeTab), [activeTab]);

  return (
    <div>
      {/* Filter Tabs */}
      <div className="px-3 pt-2 pb-1 md:px-5 md:pt-5 md:pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1.5 md:gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Platform category filter">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                className={`whitespace-nowrap shrink-0 px-2.5 md:px-3.5 py-1.5 md:py-2 min-h-[36px] md:min-h-[44px] rounded-full text-[0.65rem] md:text-xs font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* Sticky View All link — always visible */}
          <Link
            href="/compare"
            className="shrink-0 text-[0.69rem] font-semibold text-amber-600 hover:text-amber-800 transition-colors whitespace-nowrap"
          >
            View full comparison &rarr;
          </Link>
        </div>
      </div>

      {/* Desktop Table */}
      <div key={activeTab} className="hidden md:block overflow-x-auto motion-safe:tab-content-enter">
        <table className="w-full compare-table">
          <thead>
            <tr className="border-y border-slate-100">
              <th scope="col" className="sticky left-0 z-10 bg-white pl-5 pr-2 py-2 text-left font-semibold text-[0.69rem] uppercase tracking-wider text-slate-400 w-10">#</th>
              <th scope="col" className="sticky left-10 z-10 bg-white px-3 py-2 text-left font-semibold text-[0.69rem] uppercase tracking-wider text-slate-400 w-[28%]">Platform</th>
              {activeColumns.map((col, ci) => (
                <th key={ci} scope="col" className={`px-3 py-2 font-semibold text-[0.69rem] uppercase tracking-wider text-slate-400 whitespace-nowrap ${col.align === "center" ? "text-center" : "text-left"}`}>
                  <JargonTooltip term={col.header} />
                </th>
              ))}
              {SHOW_RATINGS && (
              <th scope="col" className="px-3 py-2 text-center font-semibold text-[0.69rem] uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1 justify-center">
                  Rating
                  <Link href="/methodology" className="text-amber-500 hover:text-amber-700 transition-colors font-normal normal-case tracking-normal text-[0.6rem]" title="How we rate platforms">(how we rate)</Link>
                </span>
              </th>
              )}
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
                    ? "bg-amber-50/30 border-l-2 border-l-amber-400"
                    : isSponsored(broker)
                    ? "bg-amber-50/30 border-l-2 border-l-amber-400"
                    : isTopRated
                    ? "bg-amber-50/40 border-l-2 border-l-amber-400"
                    : editorPicks[broker.slug]
                    ? "bg-slate-50/30"
                    : ""
                }`}
              >
                <td className="sticky left-0 z-10 bg-inherit pl-5 pr-2 py-2.5 text-xs text-slate-400 font-medium">
                  {SHOW_EDITORIAL_BADGES && isTopRated ? (
                    <span className="text-amber-500 text-sm" title="Top Rated">🏆</span>
                  ) : (
                    i + 1
                  )}
                </td>
                <td className="sticky left-10 z-10 bg-inherit px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <BrokerLogo broker={broker} size="sm" className="transition-transform duration-200 group-hover:scale-110" />
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
                      {SHOW_EDITORIAL_BADGES && !isSponsored(broker) && !isCampaignWinner && editorPicks[broker.slug] && (
                        <div className={`text-[0.65rem] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                          editorPicks[broker.slug] === "Editor\u2019s Choice"
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : editorPicks[broker.slug] === "Lowest Fees"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {editorPicks[broker.slug]}
                        </div>
                      )}
                    </div>
                    <ShortlistButton slug={broker.slug} name={broker.name} size="sm" />
                  </div>
                </td>
                {activeColumns.map((col, ci) => (
                  <td key={ci} className={`px-3 py-2.5 text-sm text-slate-700 ${col.align === "center" ? "text-center" : ""}`}>
                    {col.accessor(broker)}
                  </td>
                ))}
                {SHOW_RATINGS && (
                <td className="px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-amber text-xs">{renderStars(broker.rating || 0)}</span>
                    <span className="text-xs font-semibold text-slate-600">{broker.rating}</span>
                  </div>
                </td>
                )}
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

      {/* Mobile: Compact list */}
      <div key={`mobile-${activeTab}`} className="md:hidden divide-y divide-slate-100 px-3 motion-safe:tab-content-enter">
        {displayBrokers.slice(0, 5).map((broker, i) => {
          const isCampaignMobile = campaignWinnerSlugs.has(broker.slug);
          const cidMobile = cpcCampaignMap.get(broker.slug);
          const mobileLink = (() => {
            const link = getAffiliateLink(broker);
            return cidMobile ? `${link}${link.includes("?") ? "&" : "?"}cid=${cidMobile}` : link;
          })();
          return (
          <div key={broker.id} className="py-3 first:pt-1">
            <div className="flex items-center gap-2.5">
              <span className="w-5 text-center text-xs font-bold text-slate-400 shrink-0">{i + 1}</span>
              <BrokerLogo broker={broker} size="sm" />
              <div className="flex-1 min-w-0">
                <a href={`/broker/${broker.slug}`} className="font-bold text-sm text-slate-900 block truncate">{broker.name}</a>
                <div className="flex items-center gap-2 mt-0.5 text-[0.7rem] text-slate-500">
                  <span className="font-semibold text-slate-700">{activeColumns[0].accessor(broker)}</span>
                  {activeColumns.length > 1 && <span className="text-slate-400">·</span>}
                  {activeColumns.length > 1 && <span className="font-semibold text-slate-700">{activeColumns[1].accessor(broker)}</span>}
                  {(isSponsored(broker) || isCampaignMobile) && <span className="text-[0.56rem] font-bold uppercase text-blue-700 bg-blue-50 px-1 py-px rounded">Ad</span>}
                </div>
              </div>
              <a
                href={mobileLink}
                target="_blank"
                rel={AFFILIATE_REL}
                className="shrink-0 px-3.5 py-2 min-h-[36px] inline-flex items-center bg-amber-500 text-slate-900 text-xs font-bold rounded-lg active:scale-[0.97] transition-all"
              >
                Go →
              </a>
            </div>
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
        <p className="text-[0.62rem] text-slate-400">
          Before applying, check the product&apos;s{" "}
          <a href="https://asic.gov.au/regulatory-resources/financial-services/financial-product-advice/target-market-determinations/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Target Market Determination (TMD)</a>{" "}
          to confirm it suits your needs and objectives.
        </p>
      </div>
    </div>
  );
}
