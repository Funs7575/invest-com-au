"use client";

import { useState } from "react";
import type { Broker } from "@/lib/types";
import { getAffiliateLink, formatPercent, AFFILIATE_REL } from "@/lib/tracking";

function FxBadge({ rate }: { rate: number }) {
  const color =
    rate <= 0.1
      ? "bg-emerald-100 text-emerald-700"
      : rate <= 0.5
      ? "bg-amber-100 text-amber-700"
      : "bg-red-100 text-red-700";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {formatPercent(rate)}
    </span>
  );
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.3;
  const stars: React.ReactNode[] = [];
  for (let i = 0; i < full; i++)
    stars.push(
      <span key={`f${i}`} className="text-amber">
        &#9733;
      </span>
    );
  if (half)
    stars.push(
      <span key="h" className="text-amber">
        &#189;
      </span>
    );
  while (stars.length < 5)
    stars.push(
      <span key={`e${stars.length}`} className="text-slate-300">
        &#9733;
      </span>
    );
  return <span className="text-sm">{stars}</span>;
}

export default function BrokerComparisonTable({
  brokers,
}: {
  brokers: Broker[];
}) {
  const [sortBy, setSortBy] = useState<"fx_rate" | "rating" | "us_fee_value">(
    "fx_rate"
  );

  const sorted = [...brokers].sort((a, b) => {
    if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    if (sortBy === "us_fee_value")
      return (a.us_fee_value ?? 999) - (b.us_fee_value ?? 999);
    return (a.fx_rate ?? 999) - (b.fx_rate ?? 999);
  });

  return (
    <div className="my-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-lg font-extrabold text-brand">
          International Broker Comparison
        </h3>
        <div className="flex gap-1.5 text-xs" role="tablist" aria-label="Sort brokers by">
          {(
            [
              ["fx_rate", "FX Fee"],
              ["us_fee_value", "US Fee"],
              ["rating", "Rating"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              role="tab"
              aria-selected={sortBy === key}
              className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                sortBy === key
                  ? "bg-brand text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Broker
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                FX Fee
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                US Trade
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((b, i) => (
              <tr
                key={b.slug}
                className="hover:bg-slate-50 transition-colors group"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 group-hover:scale-105 transition-transform"
                      style={{
                        background: `${b.color}20`,
                        color: b.color,
                      }}
                    >
                      {b.icon || b.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-brand">
                        {b.name}
                      </div>
                      <div className="flex gap-1.5 mt-0.5">
                        {b.chess_sponsored && (
                          <span className="text-[0.65rem] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            CHESS
                          </span>
                        )}
                        {i === 0 && sortBy === "fx_rate" && (
                          <span className="text-[0.65rem] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                            LOWEST FX
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  {b.fx_rate != null ? (
                    <FxBadge rate={b.fx_rate} />
                  ) : (
                    <span className="text-xs text-slate-400">N/A</span>
                  )}
                </td>
                <td className="px-5 py-4 text-center text-sm font-medium text-slate-700">
                  {b.us_fee || "N/A"}
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Stars rating={b.rating ?? 0} />
                    <span className="text-xs text-slate-500">
                      {b.rating?.toFixed(1)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <a
                    href={getAffiliateLink(b)}
                    target="_blank"
                    rel={AFFILIATE_REL}
                    className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 hover:scale-105 transition-all"
                  >
                    Go to Site &rarr;
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {sorted.map((b, i) => (
          <div
            key={b.slug}
            className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md hover:scale-[1.01] transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: `${b.color}20`, color: b.color }}
              >
                {b.icon || b.name.charAt(0)}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-brand">{b.name}</div>
                <div className="flex gap-1.5 mt-0.5">
                  {b.chess_sponsored && (
                    <span className="text-[0.65rem] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                      CHESS
                    </span>
                  )}
                  {i === 0 && sortBy === "fx_rate" && (
                    <span className="text-[0.65rem] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                      LOWEST FX
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <Stars rating={b.rating ?? 0} />
                <div className="text-xs text-slate-500">
                  {b.rating?.toFixed(1)}/5
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs mb-3">
              <div className="bg-slate-50 rounded-lg py-2">
                <div className="text-slate-500">FX Fee</div>
                <div className="font-bold mt-0.5">
                  {b.fx_rate != null ? formatPercent(b.fx_rate) : "N/A"}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg py-2">
                <div className="text-slate-500">US Trade</div>
                <div className="font-bold mt-0.5">{b.us_fee || "N/A"}</div>
              </div>
              <div className="bg-slate-50 rounded-lg py-2">
                <div className="text-slate-500">CHESS</div>
                <div className="font-bold mt-0.5">
                  {b.chess_sponsored ? "Yes" : "No"}
                </div>
              </div>
            </div>
            <a
              href={getAffiliateLink(b)}
              target="_blank"
              rel={AFFILIATE_REL}
              className="block w-full text-center px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Go to Site &rarr;
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
