"use client";

import { useState, useMemo } from "react";
import type { Broker } from "@/lib/types";
import DealCard from "@/components/DealCard";
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
      {/* Filter Tabs — only show if there are multiple categories */}
      {availableTabs.length > 2 && (
        <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Deal category filter">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              aria-selected={activeTab === tab}
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
      )}

      {/* Deals Grid */}
      {filteredDeals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeals.map((broker) => (
            <DealCard key={broker.id} broker={broker} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm text-slate-500">
            No deals in this category right now. Try &quot;All Deals&quot; to see
            everything available.
          </p>
        </div>
      )}

      {/* Compliance */}
      <div className="mt-6">
        <CompactDisclaimerLine />
      </div>
    </div>
  );
}
