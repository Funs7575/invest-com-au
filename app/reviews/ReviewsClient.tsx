"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Broker, PlatformType } from "@/lib/types";
import BrokerLogo from "@/components/BrokerLogo";

const PLATFORM_TABS = [
  { key: "all", label: "All Platforms", icon: "🏦" },
  { key: "share_broker", label: "Share Brokers", icon: "📈" },
  { key: "crypto_exchange", label: "Crypto", icon: "₿" },
  { key: "robo_advisor", label: "Robo-Advisors", icon: "🤖" },
  { key: "super_fund", label: "Super Funds", icon: "🏛️" },
  { key: "research_tool", label: "Research Tools", icon: "🔍" },
  { key: "property_platform", label: "Property", icon: "🏠" },
  { key: "cfd_forex", label: "CFD & Forex", icon: "💱" },
] as const;

type TabKey = (typeof PLATFORM_TABS)[number]["key"];

export default function ReviewsClient({ brokers }: { brokers: Broker[] }) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const filteredBrokers = useMemo(() => {
    if (activeTab === "all") return brokers;
    return brokers.filter((b) => b.platform_type === activeTab);
  }, [brokers, activeTab]);

  // Only show tabs that have at least one broker (or "all")
  const availableTabs = useMemo(() => {
    return PLATFORM_TABS.filter((tab) => {
      if (tab.key === "all") return true;
      return brokers.some((b) => b.platform_type === tab.key);
    });
  }, [brokers]);

  return (
    <div>
      {/* Platform Type Tabs */}
      {availableTabs.length > 2 && (
        <div
          className="flex gap-1.5 md:gap-2 mb-4 md:mb-8 overflow-x-auto md:overflow-x-visible md:flex-wrap scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-1"
          role="tablist"
          aria-label="Platform type filter"
        >
          {availableTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`whitespace-nowrap shrink-0 px-3.5 md:px-5 py-2 md:py-2.5 min-h-[44px] rounded-full text-xs md:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:shadow-sm"
              }`}
            >
              <span className="text-sm md:text-base">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Results count */}
      <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">
        {filteredBrokers.length} platform{filteredBrokers.length !== 1 ? "s" : ""} reviewed
      </p>

      {/* Broker Grid */}
      {filteredBrokers.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6">
          {filteredBrokers.map((broker) => (
            <BrokerReviewCard key={broker.id} broker={broker} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 md:py-12 text-slate-500">
          <p className="text-sm md:text-lg font-medium mb-1">No platforms in this category yet</p>
          <p className="text-xs md:text-sm">Check back soon — we&apos;re adding more reviews regularly.</p>
        </div>
      )}
    </div>
  );
}

function BrokerReviewCard({ broker }: { broker: Broker }) {
  const platformLabel = getPlatformLabel(broker.platform_type);

  return (
    <Link
      href={`/broker/${broker.slug}`}
      className="border border-slate-200 rounded-xl overflow-hidden hover-lift hover:scale-[1.02] transition-all flex flex-col"
    >
      <div className="p-3 md:p-5 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
          <BrokerLogo broker={broker} size="md" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm md:text-lg font-bold leading-tight truncate">{broker.name}</h2>
            <div className="text-xs text-amber">
              {"★".repeat(Math.floor(broker.rating || 0))}
              <span className="text-slate-400 ml-1 text-[0.69rem]">{broker.rating}/5</span>
            </div>
          </div>
        </div>

        {/* Platform type badge */}
        <div className="mb-2 md:mb-3">
          <span className={`text-[0.62rem] md:text-[0.69rem] font-semibold px-1.5 md:px-2 py-0.5 rounded-full ${getPlatformColor(broker.platform_type)}`}>
            {platformLabel}
          </span>
        </div>

        {/* Tagline — hidden on mobile to save space */}
        {broker.tagline && (
          <p className="hidden md:block text-sm text-slate-600 mb-3 line-clamp-2">{broker.tagline}</p>
        )}

        {/* Fees — compact inline on mobile */}
        <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400 md:text-slate-500">ASX Fee</span>
            <span className="font-semibold">{broker.asx_fee || "N/A"}</span>
          </div>
          {broker.platform_type !== "research_tool" && (
            <div className="flex justify-between">
              <span className="text-slate-400 md:text-slate-500">FX Rate</span>
              <span className="font-semibold">{broker.fx_rate != null ? `${broker.fx_rate}%` : "N/A"}</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 md:gap-2 mt-2 md:mt-3">
          {broker.chess_sponsored && (
            <span className="px-1.5 md:px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[0.62rem] md:text-[0.69rem] rounded border border-emerald-200 font-semibold">CHESS</span>
          )}
          {broker.smsf_support && (
            <span className="px-1.5 md:px-2 py-0.5 bg-blue-50 text-blue-700 text-[0.62rem] md:text-[0.69rem] rounded border border-blue-200 font-semibold">SMSF</span>
          )}
          {broker.deal && (
            <span className="px-1.5 md:px-2 py-0.5 bg-amber-50 text-amber-700 text-[0.62rem] md:text-[0.69rem] rounded border border-amber-200 font-semibold">Deal</span>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-3 md:px-5 py-2 md:py-3 bg-slate-50 border-t border-slate-200 text-center mt-auto">
        <span className="text-xs md:text-sm font-semibold text-slate-700">Read Review →</span>
      </div>
    </Link>
  );
}

function getPlatformLabel(type: PlatformType): string {
  const labels: Record<PlatformType, string> = {
    share_broker: "Share Broker",
    crypto_exchange: "Crypto Exchange",
    robo_advisor: "Robo-Advisor",
    research_tool: "Research Tool",
    super_fund: "Super Fund",
    property_platform: "Property Platform",
    cfd_forex: "CFD & Forex",
  };
  return labels[type] || type;
}

function getPlatformColor(type: PlatformType): string {
  const colors: Record<PlatformType, string> = {
    share_broker: "bg-blue-50 text-blue-700",
    crypto_exchange: "bg-orange-50 text-orange-700",
    robo_advisor: "bg-violet-50 text-violet-700",
    research_tool: "bg-cyan-50 text-cyan-700",
    super_fund: "bg-emerald-50 text-emerald-700",
    property_platform: "bg-lime-50 text-lime-700",
    cfd_forex: "bg-rose-50 text-rose-700",
  };
  return colors[type] || "bg-slate-50 text-slate-700";
}
