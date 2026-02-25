"use client";

import { useState, useEffect } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, formatPercent, AFFILIATE_REL } from "@/lib/tracking";
import { getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";
import { filterByFrequencyCap } from "@/lib/marketplace/frequency-cap";
import ImpressionTracker from "@/components/ImpressionTracker";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.3;
  const stars: React.ReactNode[] = [];
  for (let i = 0; i < full; i++)
    stars.push(<span key={`f${i}`} className="text-amber">&#9733;</span>);
  if (half) stars.push(<span key="h" className="text-amber">&#189;</span>);
  while (stars.length < 5)
    stars.push(<span key={`e${stars.length}`} className="text-slate-300">&#9733;</span>);
  return <span className="text-sm">{stars}</span>;
}

/**
 * Campaign-driven sponsored broker widget for article sidebars.
 *
 * Fetches the winning campaign for the "articles-sidebar" placement,
 * then renders a rich broker card with CPC tracking.
 *
 * Falls back to the `fallbackBroker` (e.g. the article's top-pick broker)
 * if no active campaigns exist.
 *
 * Props:
 * - fallbackBroker: Shown when no campaigns are active
 * - allBrokers: Full broker list to look up campaign winner details
 * - pagePath: Current page path for tracking attribution
 */
export default function SponsoredBrokerWidget({
  fallbackBroker,
  allBrokers,
  pagePath,
}: {
  fallbackBroker?: Broker | null;
  allBrokers: Broker[];
  pagePath: string;
}) {
  const [winner, setWinner] = useState<PlacementWinner | null>(null);
  const [broker, setBroker] = useState<Broker | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getPlacementWinners("articles-sidebar").then((winners) => {
      // Apply frequency capping
      const filtered = filterByFrequencyCap(winners, "articles-sidebar", 6);

      if (filtered.length > 0) {
        const w = filtered[0];
        setWinner(w);
        const found = allBrokers.find((b) => b.slug === w.broker_slug);
        setBroker(found || null);
      }
      setLoaded(true);
    });
  }, [allBrokers]);

  // Use campaign winner broker, or fall back to editorial top pick
  const displayBroker = broker || fallbackBroker;
  if (!displayBroker) return null;

  const isCampaign = !!winner && !!broker;

  // Build affiliate link — if CPC campaign, add campaign ID for billing attribution
  const baseLink = getAffiliateLink(displayBroker);
  const affiliateLink = isCampaign
    ? `${baseLink}${baseLink.includes("?") ? "&" : "?"}cid=${winner.campaign_id}&placement=articles-sidebar`
    : baseLink;

  return (
    <div className="hidden lg:block">
      <div className="sticky top-20 w-64 xl:w-72">
        <div className="border border-slate-200 rounded-xl bg-white shadow-lg overflow-hidden">
          {/* Header */}
          <div className={`px-5 py-3 ${isCampaign ? "bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800" : "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900"}`}>
            <div className="flex items-center justify-between">
              <span className="text-[0.69rem] font-extrabold uppercase tracking-wider text-white/90">
                {isCampaign ? "Sponsored" : "Top Pick"}
              </span>
              {isCampaign && (
                <span className="text-[0.56rem] font-medium text-white/60 uppercase tracking-wider">
                  Ad
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold"
                style={{ background: `${displayBroker.color}20`, color: displayBroker.color }}
              >
                {displayBroker.icon || displayBroker.name.charAt(0)}
              </div>
              <div>
                <div className="font-extrabold text-brand">{displayBroker.name}</div>
                <Stars rating={displayBroker.rating ?? 0} />
              </div>
            </div>

            {displayBroker.tagline && (
              <p className="text-xs text-slate-500 mb-3">{displayBroker.tagline}</p>
            )}

            {/* Key Stats */}
            <div className="space-y-2 mb-4">
              {displayBroker.fx_rate != null && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">FX Fee</span>
                  <span className="font-bold text-emerald-600">
                    {formatPercent(displayBroker.fx_rate)}
                  </span>
                </div>
              )}
              {displayBroker.us_fee && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">US Trades</span>
                  <span className="font-bold">{displayBroker.us_fee}</span>
                </div>
              )}
              {displayBroker.asx_fee && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">ASX Trades</span>
                  <span className="font-bold">{displayBroker.asx_fee}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">CHESS</span>
                <span className="font-bold">
                  {displayBroker.chess_sponsored ? "Yes" : "No"}
                </span>
              </div>
            </div>

            {/* CTA */}
            <a
              href={affiliateLink}
              target="_blank"
              rel={AFFILIATE_REL}
              onClick={() =>
                trackClick(
                  displayBroker.slug,
                  displayBroker.name,
                  isCampaign ? "sponsored-sidebar" : "sidebar-top-pick",
                  pagePath,
                  "article",
                  undefined,
                  isCampaign ? "articles-sidebar" : undefined
                )
              }
              className={`block w-full text-center px-4 py-3 font-bold text-sm rounded-lg transition-all hover:scale-[1.02] ${
                isCampaign
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
            >
              Open Account &rarr;
            </a>

            <a
              href={`/broker/${displayBroker.slug}`}
              className="block w-full text-center text-xs text-slate-500 hover:text-brand mt-2 transition-colors"
            >
              Read Full Review
            </a>
          </div>
        </div>

        {/* Impression tracker */}
        {isCampaign && (
          <ImpressionTracker
            winners={[winner]}
            placement="articles-sidebar"
            page={pagePath}
          />
        )}

        {/* Disclaimer */}
        <p className="text-xs text-slate-400 mt-3 leading-relaxed px-1">
          {isCampaign ? "Sponsored placement." : ""} {ADVERTISER_DISCLOSURE_SHORT}{" "}
          <a href="/how-we-earn" className="underline hover:text-slate-600">
            Learn more
          </a>
        </p>
      </div>
    </div>
  );
}
