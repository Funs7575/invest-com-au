"use client";

import { useState, useMemo } from "react";
import type { Broker } from "@/lib/types";
import DealCard from "@/components/DealCard";
import Icon from "@/components/Icon";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";

const TAB_OPTIONS = [
  "All Deals",
  "Share Trading",
  "Crypto",
  "International",
  "Beginner",
  "Active Trader",
] as const;
type TabOption = (typeof TAB_OPTIONS)[number];

const CATEGORY_MAP: Record<TabOption, string | null> = {
  "All Deals": null,
  "Share Trading": "shares",
  "Crypto": "crypto",
  "International": "international",
  "Beginner": "beginner",
  "Active Trader": "active-trader",
};

export default function DealsClient({ deals }: { deals: Broker[] }) {
  const [activeTab, setActiveTab] = useState<TabOption>("All Deals");

  const filteredDeals = useMemo(() => {
    const category = CATEGORY_MAP[activeTab];
    if (!category) return deals;
    return deals.filter((b) => b.deal_category === category);
  }, [deals, activeTab]);

  // Only show tabs that have deals (or "All Deals")
  const availableTabs = useMemo(() => {
    return TAB_OPTIONS.filter((tab) => {
      const cat = CATEGORY_MAP[tab];
      if (!cat) return true; // Always show "All Deals"
      return deals.some((b) => b.deal_category === cat);
    });
  }, [deals]);

  return (
    <div>
      {/* Filter Tabs — horizontal scroll on mobile, wrap on desktop */}
      {availableTabs.length > 2 && (
        <div className="flex gap-1.5 md:gap-2 mb-4 md:mb-6 overflow-x-auto md:overflow-x-visible md:flex-wrap scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-1" role="tablist" aria-label="Deal category filter">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              aria-selected={activeTab === tab}
              className={`whitespace-nowrap shrink-0 px-3 md:px-4 py-2 md:py-2.5 rounded-full md:rounded-lg text-xs md:text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Deals Grid */}
      {filteredDeals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredDeals.map((broker) => (
            <DealCard key={broker.id} broker={broker} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 md:py-12">
          <Icon name="search" size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-xs md:text-sm text-slate-500">
            No deals in this category. Try &quot;All Deals&quot; instead.
          </p>
        </div>
      )}

      {/* Compliance */}
      <div className="mt-4 md:mt-6">
        <CompactDisclaimerLine />
      </div>
    </div>
  );
}
