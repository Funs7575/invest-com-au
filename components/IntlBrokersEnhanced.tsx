"use client";

import type { Broker } from "@/lib/types";
import BrokerComparisonTable from "./BrokerComparisonTable";
import EmbeddedFxCalc from "./EmbeddedFxCalc";
import FeeBarChart from "./FeeBarChart";
import MobileFloatingCTA from "./MobileFloatingCTA";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

export default function IntlBrokersEnhanced({
  brokers,
  topPick,
  pagePath,
}: {
  brokers: Broker[];
  topPick: Broker | null;
  pagePath: string;
}) {
  return (
    <>
      {/* Affiliate Disclaimer */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-8 text-xs text-slate-500 leading-relaxed">
        <strong>Disclosure:</strong> {ADVERTISER_DISCLOSURE_SHORT}{" "}
        <a href="/how-we-earn" className="text-blue-700 underline hover:text-blue-800">
          How we earn money
        </a>
      </div>

      {/* Phase 1: Comparison Table */}
      <BrokerComparisonTable brokers={brokers} />

      {/* Phase 4: Fee Bar Chart */}
      <FeeBarChart brokers={brokers} tradeAmount={10000} />

      {/* Phase 2: Embedded FX Calculator */}
      <EmbeddedFxCalc brokers={brokers} />

      {/* Phase 3: Mobile Floating CTA */}
      {topPick && (
        <MobileFloatingCTA broker={topPick} pagePath={pagePath} />
      )}
    </>
  );
}
