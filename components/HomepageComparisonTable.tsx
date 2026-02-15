"use client";

import { useMemo } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, renderStars } from "@/lib/tracking";

export default function HomepageComparisonTable({ brokers }: { brokers: Broker[] }) {
  // Show top brokers sorted by rating (non-crypto first)
  const topBrokers = useMemo(() => {
    return [...brokers]
      .filter((b) => !b.is_crypto)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 8);
  }, [brokers]);

  // Compute editor picks (same algorithm as CompareClient)
  const editorPicks = useMemo(() => {
    const picks: Record<string, string> = {};
    if (topBrokers.length > 0) {
      const cheapest = topBrokers.reduce((a, b) =>
        (a.asx_fee_value ?? 999) <= (b.asx_fee_value ?? 999) ? a : b
      );
      const bestOverall = topBrokers.reduce((a, b) =>
        (a.rating ?? 0) >= (b.rating ?? 0) ? a : b
      );
      const bestValue = topBrokers
        .filter((b) => b.chess_sponsored && (b.asx_fee_value ?? 999) <= 5)
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0];

      if (cheapest) picks[cheapest.slug] = "Lowest Fees";
      if (bestOverall && bestOverall.slug !== cheapest?.slug)
        picks[bestOverall.slug] = "Editor\u2019s Choice";
      if (bestValue && !picks[bestValue.slug]) picks[bestValue.slug] = "Best Value";
    }
    return picks;
  }, [topBrokers]);

  return (
    <div>
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
            {topBrokers.map((broker, i) => (
              <tr
                key={broker.id}
                className={`hover:bg-slate-50 transition-colors ${
                  editorPicks[broker.slug] ? "bg-amber-50/40" : ""
                }`}
              >
                <td className="px-3 py-3 text-sm text-slate-400 font-medium">
                  {i + 1}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: `${broker.color}20`,
                        color: broker.color,
                      }}
                    >
                      {broker.icon || broker.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <a
                        href={`/broker/${broker.slug}`}
                        className="font-semibold text-brand hover:text-green-700 transition-colors"
                      >
                        {broker.name}
                      </a>
                      {editorPicks[broker.slug] && (
                        <div className="text-[0.6rem] font-extrabold text-amber-700 uppercase tracking-wide">
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
                    className="inline-block px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
                  >
                    {getBenefitCta(broker, "compare")}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {topBrokers.map((broker, i) => (
          <div
            key={broker.id}
            className={`rounded-xl border p-4 bg-white ${
              editorPicks[broker.slug]
                ? "border-amber ring-1 ring-amber/30"
                : "border-slate-200"
            }`}
          >
            {editorPicks[broker.slug] && (
              <div className="text-[0.6rem] font-extrabold uppercase tracking-wide text-amber-700 mb-2">
                {editorPicks[broker.slug]}
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="text-xs font-bold text-slate-400 w-5">#{i + 1}</div>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                  background: `${broker.color}20`,
                  color: broker.color,
                }}
              >
                {broker.icon || broker.name.charAt(0)}
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
              className="block w-full text-center text-sm px-3 py-2.5 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors"
            >
              {getBenefitCta(broker, "compare")}
            </a>
          </div>
        ))}
      </div>

      {/* Affiliate disclosure */}
      <p className="text-[0.6rem] text-slate-400 mt-4 text-center">
        Sponsored — we may earn a commission if you open an account via our links, at no
        extra cost to you. Rankings are based on editorial assessment and not influenced by
        compensation.
      </p>
    </div>
  );
}
