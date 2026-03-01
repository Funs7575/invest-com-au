"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAffiliateLink, renderStars, trackClick, AFFILIATE_REL } from "@/lib/tracking";
import Icon from "@/components/Icon";
import type { Broker } from "@/lib/types";

interface ComparisonMetric {
  label: string;
  key: string;
  getValue: (b: Broker) => string;
  getNumericValue?: (b: Broker) => number | null;
  /** "lower" = green highlight for lowest, "higher" = green for highest */
  bestIs?: "lower" | "higher";
}

const METRICS: ComparisonMetric[] = [
  {
    label: "Rating",
    key: "rating",
    getValue: (b) => `${b.rating || 0}/5`,
    getNumericValue: (b) => b.rating || 0,
    bestIs: "higher",
  },
  {
    label: "ASX Brokerage",
    key: "asx_fee",
    getValue: (b) => b.asx_fee || "N/A",
    getNumericValue: (b) => b.asx_fee_value ?? null,
    bestIs: "lower",
  },
  {
    label: "US Trading Fee",
    key: "us_fee",
    getValue: (b) => b.us_fee || "N/A",
    getNumericValue: (b) => b.us_fee_value ?? null,
    bestIs: "lower",
  },
  {
    label: "FX Rate",
    key: "fx_rate",
    getValue: (b) => b.fx_rate ? `${b.fx_rate}%` : "N/A",
    getNumericValue: (b) => b.fx_rate ?? null,
    bestIs: "lower",
  },
  {
    label: "Min Deposit",
    key: "min_deposit",
    getValue: (b) => b.min_deposit || "$0",
  },
  {
    label: "CHESS Sponsored",
    key: "chess_sponsored",
    getValue: (b) => b.chess_sponsored ? "Yes" : "No",
  },
  {
    label: "Platforms",
    key: "platforms",
    getValue: (b) => (b.platforms || []).join(", ") || "N/A",
  },
  {
    label: "Markets",
    key: "markets",
    getValue: (b) => (b.markets || []).join(", ") || "N/A",
  },
  {
    label: "Regulated By",
    key: "regulated_by",
    getValue: (b) => b.regulated_by || "N/A",
  },
  {
    label: "Founded",
    key: "year_founded",
    getValue: (b) => b.year_founded ? String(b.year_founded) : "N/A",
  },
  {
    label: "SMSF Support",
    key: "smsf_support",
    getValue: (b) => b.smsf_support ? "Yes" : "No",
  },
  {
    label: "Inactivity Fee",
    key: "inactivity_fee",
    getValue: (b) => b.inactivity_fee || "None",
  },
  {
    label: "Payment Methods",
    key: "payment_methods",
    getValue: (b) => (b.payment_methods || []).join(", ") || "N/A",
  },
];

export default function CompareClient() {
  const searchParams = useSearchParams();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const brokerParam = searchParams.get("brokers");
    if (!brokerParam) {
      setLoading(false);
      return;
    }

    const slugs = brokerParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (slugs.length === 0) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from("brokers")
      .select("*")
      .in("slug", slugs)
      .eq("status", "active")
      .then(({ data }) => {
        if (data) {
          // Maintain original order
          const sorted = slugs
            .map((slug) => data.find((b) => b.slug === slug))
            .filter(Boolean) as Broker[];
          setBrokers(sorted);
        }
        setLoading(false);
      });
  }, [searchParams]);

  // Find best values for highlighting
  const getBest = (metric: ComparisonMetric): string | null => {
    if (!metric.getNumericValue || !metric.bestIs) return null;

    const values = brokers
      .map((b) => ({ slug: b.slug, val: metric.getNumericValue!(b) }))
      .filter((v) => v.val !== null && v.val !== undefined);

    if (values.length < 2) return null;

    if (metric.bestIs === "lower") {
      const min = Math.min(...values.map((v) => v.val!));
      return values.find((v) => v.val === min)?.slug || null;
    } else {
      const max = Math.max(...values.map((v) => v.val!));
      return values.find((v) => v.val === max)?.slug || null;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded mb-4" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (brokers.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <h2 className="text-lg font-bold text-slate-900 mb-2">No brokers to compare</h2>
        <p className="text-sm text-slate-500 mb-6">Add brokers to your shortlist first, then come back to compare them.</p>
        <Link
          href="/shortlist"
          className="inline-block px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
        >
          Go to Shortlist &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/shortlist" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">&larr; Back to Shortlist</Link>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1">
            Detailed Comparison
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            {brokers.length} broker{brokers.length !== 1 ? "s" : ""} compared side-by-side
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Broker headers */}
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-4 text-left text-xs font-semibold text-slate-500 uppercase bg-slate-50 sticky left-0 z-10 min-w-[140px]">
                  Feature
                </th>
                {brokers.map((broker) => (
                  <th key={broker.slug} className="px-4 py-4 text-center min-w-[160px]">
                    <Link
                      href={`/broker/${broker.slug}`}
                      className="inline-flex flex-col items-center gap-2 group"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{ background: `${broker.color}20`, color: broker.color }}
                      >
                        {broker.icon || broker.name.charAt(0)}
                      </div>
                      <span className="font-bold text-sm text-slate-900 group-hover:underline">
                        {broker.name}
                      </span>
                    </Link>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className="text-xs text-amber-500">{renderStars(broker.rating || 0)}</span>
                      <span className="text-[0.65rem] text-slate-400">{broker.rating}/5</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {METRICS.map((metric) => {
                const bestSlug = getBest(metric);
                return (
                  <tr key={metric.key} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-700 bg-slate-50/50 sticky left-0 z-10">
                      {metric.label}
                    </td>
                    {brokers.map((broker) => {
                      const value = metric.getValue(broker);
                      const isBest = bestSlug === broker.slug;
                      return (
                        <td
                          key={broker.slug}
                          className={`px-4 py-3 text-sm text-center ${
                            isBest
                              ? "bg-emerald-50 text-emerald-700 font-semibold"
                              : "text-slate-600"
                          }`}
                        >
                          {value}
                          {isBest && (
                            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[0.6rem] font-bold rounded">
                              Best
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Pros row */}
              <tr className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-sm font-medium text-slate-700 bg-slate-50/50 sticky left-0 z-10">
                  Pros
                </td>
                {brokers.map((broker) => (
                  <td key={broker.slug} className="px-4 py-3 text-xs text-slate-600 align-top">
                    {(broker.pros || []).length > 0 ? (
                      <ul className="space-y-1">
                        {broker.pros!.slice(0, 4).map((pro, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-emerald-500 shrink-0 mt-0.5">+</span>
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400">---</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Cons row */}
              <tr className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-sm font-medium text-slate-700 bg-slate-50/50 sticky left-0 z-10">
                  Cons
                </td>
                {brokers.map((broker) => (
                  <td key={broker.slug} className="px-4 py-3 text-xs text-slate-600 align-top">
                    {(broker.cons || []).length > 0 ? (
                      <ul className="space-y-1">
                        {broker.cons!.slice(0, 4).map((con, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-red-400 shrink-0 mt-0.5">-</span>
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400">---</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Deal row */}
              <tr className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-sm font-medium text-slate-700 bg-slate-50/50 sticky left-0 z-10">
                  Current Deal
                </td>
                {brokers.map((broker) => (
                  <td key={broker.slug} className="px-4 py-3 text-xs text-center">
                    {broker.deal && broker.deal_text ? (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200/80 rounded-lg">
                        <Icon name="flame" size={12} className="text-amber-500" />
                        <span className="text-amber-700 font-semibold">{broker.deal_text}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">No current deal</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>

            {/* CTA row */}
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="px-4 py-4 sticky left-0 z-10 bg-slate-50" />
                {brokers.map((broker) => (
                  <td key={broker.slug} className="px-4 py-4 text-center">
                    <a
                      href={getAffiliateLink(broker)}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      onClick={() => trackClick(broker.slug, broker.name, "shortlist-compare", "/shortlist/compare", "compare")}
                      className="inline-flex items-center justify-center px-4 py-2.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors min-h-[44px]"
                    >
                      Visit {broker.name} &rarr;
                    </a>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Best For Recommendations */}
      {brokers.length >= 2 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Best For...</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              const recommendations: { label: string; broker: Broker; reason: string }[] = [];

              // Lowest ASX fee
              const byAsx = brokers.filter((b) => b.asx_fee_value != null).sort((a, b) => (a.asx_fee_value || 999) - (b.asx_fee_value || 999));
              if (byAsx.length > 0) {
                recommendations.push({
                  label: "Lowest ASX Fees",
                  broker: byAsx[0],
                  reason: `${byAsx[0].asx_fee || "N/A"} per trade`,
                });
              }

              // Best rated
              const byRating = [...brokers].sort((a, b) => (b.rating || 0) - (a.rating || 0));
              if (byRating.length > 0 && byRating[0].rating) {
                recommendations.push({
                  label: "Highest Rated",
                  broker: byRating[0],
                  reason: `${byRating[0].rating}/5 rating`,
                });
              }

              // Best for US trading
              const byUs = brokers.filter((b) => b.us_fee_value != null).sort((a, b) => (a.us_fee_value || 999) - (b.us_fee_value || 999));
              if (byUs.length > 0) {
                recommendations.push({
                  label: "Best for US Trading",
                  broker: byUs[0],
                  reason: `${byUs[0].us_fee || "N/A"} US trades`,
                });
              }

              // Best FX rate
              const byFx = brokers.filter((b) => b.fx_rate != null).sort((a, b) => (a.fx_rate || 999) - (b.fx_rate || 999));
              if (byFx.length > 0) {
                recommendations.push({
                  label: "Best FX Rate",
                  broker: byFx[0],
                  reason: `${byFx[0].fx_rate}% FX rate`,
                });
              }

              // Has current deal
              const withDeal = brokers.filter((b) => b.deal);
              if (withDeal.length > 0) {
                recommendations.push({
                  label: "Best Current Deal",
                  broker: withDeal[0],
                  reason: withDeal[0].deal_text || "Active promotion",
                });
              }

              // CHESS sponsored
              const chess = brokers.filter((b) => b.chess_sponsored);
              if (chess.length > 0) {
                recommendations.push({
                  label: "CHESS Sponsored",
                  broker: chess[0],
                  reason: "Direct ASX ownership",
                });
              }

              return recommendations.slice(0, 6).map((rec) => (
                <div key={rec.label} className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{rec.label}</div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: `${rec.broker.color}20`, color: rec.broker.color }}
                    >
                      {rec.broker.icon || rec.broker.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900">{rec.broker.name}</p>
                      <p className="text-xs text-emerald-600 font-medium">{rec.reason}</p>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
