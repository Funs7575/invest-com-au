"use client";

import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, formatPercent, AFFILIATE_REL } from "@/lib/tracking";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.3;
  const stars: React.ReactNode[] = [];
  for (let i = 0; i < full; i++)
    stars.push(
      <span key={`f${i}`} className="text-amber">&#9733;</span>
    );
  if (half) stars.push(<span key="h" className="text-amber">&#189;</span>);
  while (stars.length < 5)
    stars.push(
      <span key={`e${stars.length}`} className="text-slate-300">&#9733;</span>
    );
  return <span className="text-sm">{stars}</span>;
}

export default function ArticleSidebar({
  broker,
  pagePath,
}: {
  broker: Broker;
  pagePath: string;
}) {
  return (
    <div className="hidden lg:block">
      <div className="sticky top-20 w-64 xl:w-72">
        <div className="border border-green-700/30 rounded-xl bg-white shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 px-5 py-3">
            <div className="text-[0.6rem] font-extrabold uppercase tracking-wider text-green-100">
              Top Pick
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold"
                style={{ background: `${broker.color}20`, color: broker.color }}
              >
                {broker.icon || broker.name.charAt(0)}
              </div>
              <div>
                <div className="font-extrabold text-brand">{broker.name}</div>
                <Stars rating={broker.rating ?? 0} />
              </div>
            </div>

            {broker.tagline && (
              <p className="text-xs text-slate-500 mb-3">{broker.tagline}</p>
            )}

            {/* Key Stats */}
            <div className="space-y-2 mb-4">
              {broker.fx_rate != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">FX Fee</span>
                  <span className="font-bold text-emerald-600">
                    {formatPercent(broker.fx_rate)}
                  </span>
                </div>
              )}
              {broker.us_fee && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">US Trades</span>
                  <span className="font-bold">{broker.us_fee}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">CHESS</span>
                <span className="font-bold">
                  {broker.chess_sponsored ? "Yes" : "No"}
                </span>
              </div>
            </div>

            {/* CTA */}
            <a
              href={getAffiliateLink(broker)}
              target="_blank"
              rel={AFFILIATE_REL}
              onClick={() =>
                trackClick(
                  broker.slug,
                  broker.name,
                  "sidebar-top-pick",
                  pagePath,
                  "article"
                )
              }
              className="block w-full text-center px-4 py-3 bg-green-700 text-white font-bold text-sm rounded-lg hover:bg-green-800 hover:scale-[1.02] transition-all"
            >
              Open Account &rarr;
            </a>

            <a
              href={`/broker/${broker.slug}`}
              className="block w-full text-center text-xs text-slate-500 hover:text-brand mt-2 transition-colors"
            >
              Read Full Review
            </a>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-[0.6rem] text-slate-400 mt-3 leading-relaxed px-1">
          {ADVERTISER_DISCLOSURE_SHORT}{" "}
          <a href="/how-we-earn" className="underline hover:text-slate-600">
            Learn more
          </a>
        </p>
      </div>
    </div>
  );
}
