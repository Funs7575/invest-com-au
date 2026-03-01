"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";
import { filterByFrequencyCap, recordWinnerImpressions } from "@/lib/marketplace/frequency-cap";
import { trackClick, getAffiliateLink, AFFILIATE_REL } from "@/lib/tracking";
import { SPONSORED_DISCLOSURE_SHORT } from "@/lib/compliance";
import type { Broker } from "@/lib/types";

/**
 * AdSlot — Unified display advertising component.
 *
 * Priority system:
 * 1. Direct-sold campaign (from marketplace allocation engine)
 * 2. Programmatic fallback (AdSense-ready container with data attributes)
 * 3. Collapse (hidden) — if no ad to show and no fallback content
 *
 * Features:
 * - Lazy loads ad content via IntersectionObserver (CLS-safe with reserved height)
 * - Tracks impressions only when 50% visible (viewability)
 * - Supports all layout variants: sidebar, in-content, sticky-footer, banner
 * - Mobile-responsive: sidebar ads collapse on mobile, in-content ads stay
 * - Frequency capping via existing marketplace system
 * - SEO-safe: reserved height containers, lazy loading, labeled as advertisement
 */

export type AdVariant = "sidebar" | "in-content" | "sticky-footer" | "banner" | "results";

interface AdSlotProps {
  /** Marketplace placement slug (e.g., "display-sidebar-review") */
  placement: string;
  /** Layout variant controls dimensions and behavior */
  variant: AdVariant;
  /** Current page path for attribution */
  page: string;
  /** Full broker list to look up campaign winner details */
  brokers?: Broker[];
  /** Optional: Hide on mobile (default: true for sidebar, false for others) */
  hideOnMobile?: boolean;
  /** Optional: Custom CSS class */
  className?: string;
  /** Optional: AdSense ad slot ID for programmatic fallback */
  adsenseSlot?: string;
  /** Optional: AdSense ad client ID */
  adsenseClient?: string;
}

/** Dimensions and styling per variant */
const VARIANT_CONFIG: Record<
  AdVariant,
  {
    width: string;
    height: string;
    containerClass: string;
    mobileHide: boolean;
    adsenseFormat: string;
  }
> = {
  sidebar: {
    width: "w-full",
    height: "min-h-[250px]",
    containerClass: "rounded-xl border border-slate-200 overflow-hidden",
    mobileHide: true,
    adsenseFormat: "rectangle",
  },
  "in-content": {
    width: "w-full",
    height: "min-h-[120px]",
    containerClass: "rounded-xl border border-slate-200 overflow-hidden my-8",
    mobileHide: false,
    adsenseFormat: "fluid",
  },
  "sticky-footer": {
    width: "w-full",
    height: "min-h-[60px]",
    containerClass: "",
    mobileHide: false,
    adsenseFormat: "horizontal",
  },
  banner: {
    width: "w-full",
    height: "min-h-[90px]",
    containerClass: "rounded-xl border border-slate-200 overflow-hidden",
    mobileHide: false,
    adsenseFormat: "horizontal",
  },
  results: {
    width: "w-full",
    height: "min-h-[250px]",
    containerClass: "rounded-xl border border-slate-200 overflow-hidden",
    mobileHide: false,
    adsenseFormat: "rectangle",
  },
};

export default function AdSlot({
  placement,
  variant,
  page,
  brokers = [],
  hideOnMobile,
  className = "",
  adsenseSlot,
  adsenseClient,
}: AdSlotProps) {
  const [winner, setWinner] = useState<PlacementWinner | null>(null);
  const [broker, setBroker] = useState<Broker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [impressionSent, setImpressionSent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const config = VARIANT_CONFIG[variant];
  const shouldHideOnMobile = hideOnMobile ?? config.mobileHide;

  // Fetch campaign winner on mount
  useEffect(() => {
    getPlacementWinners(placement).then((winners) => {
      const filtered = filterByFrequencyCap(winners, placement, 8);
      if (filtered.length > 0) {
        const w = filtered[0];
        setWinner(w);
        const found = brokers.find((b) => b.slug === w.broker_slug);
        setBroker(found || null);
      }
      setLoaded(true);
    });
  }, [placement, brokers]);

  // Viewability-based impression tracking
  const trackImpression = useCallback(() => {
    if (impressionSent || !winner) return;
    setImpressionSent(true);

    // Record client-side frequency cap
    recordWinnerImpressions([winner], placement);

    // Fire server-side impression
    fetch("/api/marketplace/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: winner.campaign_id,
        broker_slug: winner.broker_slug,
        page,
        placement,
      }),
    }).catch(() => {});
  }, [winner, placement, page, impressionSent]);

  // IntersectionObserver for viewability
  useEffect(() => {
    if (!loaded || !winner || impressionSent) return;
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            trackImpression();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loaded, winner, impressionSent, trackImpression]);

  // Don't render if dismissed (sticky footer)
  if (dismissed) return null;

  // Not yet loaded — show reserved-height skeleton to prevent CLS
  if (!loaded) {
    return (
      <div
        className={`${config.width} ${config.height} ${config.containerClass} bg-slate-50 animate-pulse ${shouldHideOnMobile ? "hidden lg:block" : ""} ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isCampaign = !!winner && !!broker;

  // ── STICKY FOOTER VARIANT ──────────────────────────────────────
  if (variant === "sticky-footer") {
    if (!isCampaign && !adsenseSlot) return null;

    return (
      <div
        ref={containerRef}
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg ${className}`}
      >
        <div className="container-custom py-2">
          <div className="flex items-center gap-3">
            {isCampaign ? (
              <DirectSoldStickyAd
                broker={broker!}
                winner={winner!}
                placement={placement}
                page={page}
              />
            ) : (
              <ProgrammaticContainer
                adsenseSlot={adsenseSlot}
                adsenseClient={adsenseClient}
                format="horizontal"
                placement={placement}
              />
            )}
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Dismiss ad"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <span className="text-[0.56rem] text-slate-400 uppercase tracking-wider">
            Advertisement
          </span>
        </div>
      </div>
    );
  }

  // ── DIRECT-SOLD CAMPAIGN AD ──────────────────────────────────
  if (isCampaign) {
    return (
      <div
        ref={containerRef}
        className={`${config.width} ${config.containerClass} ${shouldHideOnMobile ? "hidden lg:block" : ""} ${className}`}
      >
        <DirectSoldDisplayAd
          broker={broker!}
          winner={winner!}
          variant={variant}
          placement={placement}
          page={page}
        />
      </div>
    );
  }

  // ── PROGRAMMATIC FALLBACK ──────────────────────────────────────
  if (adsenseSlot) {
    return (
      <div
        ref={containerRef}
        className={`${config.width} ${config.height} ${config.containerClass} ${shouldHideOnMobile ? "hidden lg:block" : ""} ${className}`}
      >
        <ProgrammaticContainer
          adsenseSlot={adsenseSlot}
          adsenseClient={adsenseClient}
          format={config.adsenseFormat}
          placement={placement}
        />
      </div>
    );
  }

  // ── NO AD AVAILABLE — COLLAPSE ─────────────────────────────────
  return null;
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────

/** Direct-sold broker display ad card */
function DirectSoldDisplayAd({
  broker,
  winner,
  variant,
  placement,
  page,
}: {
  broker: Broker;
  winner: PlacementWinner;
  variant: AdVariant;
  placement: string;
  page: string;
}) {
  const baseLink = getAffiliateLink(broker);
  const affiliateLink = `${baseLink}${baseLink.includes("?") ? "&" : "?"}cid=${winner.campaign_id}&placement=${placement}`;

  const handleClick = () => {
    trackClick(
      broker.slug,
      broker.name,
      `display-${variant}`,
      page,
      "ad",
      undefined,
      placement
    );
  };

  // Compact in-content layout
  if (variant === "in-content") {
    return (
      <div className="bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[0.56rem] font-bold uppercase tracking-wider text-slate-400">
            Sponsored
          </span>
          <span className="text-[0.56rem] text-slate-400 uppercase tracking-wider">Ad</span>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: `${broker.color}20`, color: broker.color }}
            >
              {broker.icon || broker.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm truncate">{broker.name}</p>
              {broker.tagline && (
                <p className="text-xs text-slate-500 truncate">{broker.tagline}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {broker.deal && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full hidden sm:inline-block">
                {broker.deal_text || broker.deal}
              </span>
            )}
            <a
              href={affiliateLink}
              target="_blank"
              rel={AFFILIATE_REL}
              onClick={handleClick}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Learn More →
            </a>
          </div>
        </div>
        <p className="text-[0.56rem] text-slate-400 mt-2">{SPONSORED_DISCLOSURE_SHORT}</p>
      </div>
    );
  }

  // Sidebar / banner / results layout (richer card)
  return (
    <div className="bg-white">
      {/* Header stripe */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[0.69rem] font-extrabold uppercase tracking-wider text-white/90">
          Sponsored
        </span>
        <span className="text-[0.56rem] font-medium text-white/60 uppercase tracking-wider">
          Ad
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{ background: `${broker.color}20`, color: broker.color }}
          >
            {broker.icon || broker.name.charAt(0)}
          </div>
          <div>
            <p className="font-extrabold text-slate-900">{broker.name}</p>
            {broker.rating != null && (
              <div className="flex items-center gap-1">
                <span className="text-amber-500 text-sm">★</span>
                <span className="text-xs font-semibold text-slate-600">
                  {broker.rating.toFixed(1)}/5
                </span>
              </div>
            )}
          </div>
        </div>

        {broker.tagline && (
          <p className="text-xs text-slate-500 mb-3">{broker.tagline}</p>
        )}

        {/* Key stats */}
        <div className="space-y-1.5 mb-3">
          {broker.asx_fee && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">ASX Trades</span>
              <span className="font-bold text-slate-900">{broker.asx_fee}</span>
            </div>
          )}
          {broker.us_fee && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">US Trades</span>
              <span className="font-bold text-slate-900">{broker.us_fee}</span>
            </div>
          )}
          {broker.fx_rate != null && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">FX Fee</span>
              <span className="font-bold text-emerald-600">{broker.fx_rate}%</span>
            </div>
          )}
        </div>

        {/* Deal badge */}
        {broker.deal && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs font-bold text-amber-800">
              🔥 {broker.deal_text || broker.deal}
            </p>
          </div>
        )}

        {/* CTA */}
        <a
          href={affiliateLink}
          target="_blank"
          rel={AFFILIATE_REL}
          onClick={handleClick}
          className="block w-full text-center px-4 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-all hover:scale-[1.02]"
        >
          Open Account →
        </a>

        <a
          href={`/broker/${broker.slug}`}
          className="block w-full text-center text-xs text-slate-500 hover:text-slate-700 mt-2 transition-colors"
        >
          Read Full Review
        </a>

        <p className="text-[0.56rem] text-slate-400 mt-3 leading-relaxed">
          {SPONSORED_DISCLOSURE_SHORT}
        </p>
      </div>
    </div>
  );
}

/** Direct-sold sticky footer ad */
function DirectSoldStickyAd({
  broker,
  winner,
  placement,
  page,
}: {
  broker: Broker;
  winner: PlacementWinner;
  placement: string;
  page: string;
}) {
  const baseLink = getAffiliateLink(broker);
  const affiliateLink = `${baseLink}${baseLink.includes("?") ? "&" : "?"}cid=${winner.campaign_id}&placement=${placement}`;

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: `${broker.color}20`, color: broker.color }}
      >
        {broker.icon || broker.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900 truncate">
          {broker.name}
          {broker.deal_text && (
            <span className="font-normal text-amber-700 ml-2 text-xs">
              — {broker.deal_text}
            </span>
          )}
        </p>
      </div>
      <a
        href={affiliateLink}
        target="_blank"
        rel={AFFILIATE_REL}
        onClick={() =>
          trackClick(broker.slug, broker.name, "display-sticky", page, "ad", undefined, placement)
        }
        className="shrink-0 px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
      >
        Open Account →
      </a>
    </div>
  );
}

/**
 * Programmatic ad container — renders an AdSense-ready div.
 * When AdSense script is loaded (via layout), it will auto-fill these containers.
 * If no AdSense is configured, shows a subtle placeholder.
 */
function ProgrammaticContainer({
  adsenseSlot,
  adsenseClient,
  format,
  placement,
}: {
  adsenseSlot?: string;
  adsenseClient?: string;
  format: string;
  placement: string;
}) {
  const adRef = useRef<HTMLDivElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    // If AdSense is available, push an ad
    if (adsenseSlot && typeof window !== "undefined" && window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdLoaded(true);
      } catch {
        // AdSense not ready
      }
    }
  }, [adsenseSlot]);

  if (adsenseSlot && adsenseClient) {
    return (
      <div ref={adRef} className="w-full" data-placement={placement}>
        <div className="flex items-center justify-between px-3 pt-2">
          <span className="text-[0.56rem] text-slate-400 uppercase tracking-wider">
            Advertisement
          </span>
        </div>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={adsenseClient}
          data-ad-slot={adsenseSlot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Placeholder when no AdSense configured — will be invisible in production
  // Serves as a marker for where ads will go once AdSense is approved
  return (
    <div
      ref={adRef}
      className="w-full flex items-center justify-center bg-slate-50 text-slate-300 py-6"
      data-placement={placement}
      data-ad-format={format}
      aria-hidden="true"
    >
      <span className="text-[0.56rem] uppercase tracking-widest">Ad Space</span>
    </div>
  );
}
