"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";
import { filterByFrequencyCap, recordWinnerImpressions } from "@/lib/marketplace/frequency-cap";
import { trackClick, getAffiliateLink, AFFILIATE_REL } from "@/lib/tracking";
import type { Broker } from "@/lib/types";
import { usePathname } from "next/navigation";

const PLACEMENT = "display-sticky-footer";

/**
 * Sticky footer ad bar — shown at the bottom of the viewport on all content pages.
 * Dismissible by users (stays dismissed for the session via sessionStorage).
 * Only loads after user has scrolled past the first viewport (deferred load).
 * Fetches a direct-sold campaign; if none, shows a programmatic placeholder.
 *
 * Hidden on:
 * - Admin pages (/admin/*, /broker-portal/*)
 * - Auth pages (/auth/*)
 * - Legal pages (/privacy, /terms)
 */
const EXCLUDED_PREFIXES = ["/admin", "/broker-portal", "/auth", "/privacy", "/terms"];

export default function StickyAdFooter({ brokers }: { brokers?: Broker[] }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [winner, setWinner] = useState<PlacementWinner | null>(null);
  const [broker, setBroker] = useState<Broker | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [impressionSent, setImpressionSent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if page is excluded
  const isExcluded = EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p));

  // Check if already dismissed this session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const wasDismissed = sessionStorage.getItem("__inv_sticky_ad_dismissed");
      if (wasDismissed) setDismissed(true);
    }
  }, []);

  // Defer loading until user scrolls past first viewport
  useEffect(() => {
    if (isExcluded || dismissed) return;

    const handleScroll = () => {
      if (window.scrollY > window.innerHeight * 0.5) {
        setVisible(true);
        window.removeEventListener("scroll", handleScroll);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isExcluded, dismissed]);

  // Fetch campaign winner when visible
  useEffect(() => {
    if (!visible || loaded) return;

    getPlacementWinners(PLACEMENT).then((winners) => {
      const filtered = filterByFrequencyCap(winners, PLACEMENT, 4);
      if (filtered.length > 0) {
        const w = filtered[0];
        setWinner(w);
        const found = (brokers || []).find((b) => b.slug === w.broker_slug);
        setBroker(found || null);
      }
      setLoaded(true);
    });
  }, [visible, loaded, brokers]);

  // Track impression
  const trackImpression = useCallback(() => {
    if (impressionSent || !winner) return;
    setImpressionSent(true);
    recordWinnerImpressions([winner], PLACEMENT);
    fetch("/api/marketplace/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaign_id: winner.campaign_id,
        broker_slug: winner.broker_slug,
        page: pathname,
        placement: PLACEMENT,
      }),
    }).catch(() => {});
  }, [winner, pathname, impressionSent]);

  // Observe visibility
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

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("__inv_sticky_ad_dismissed", "1");
    }
  };

  if (isExcluded || dismissed || !visible || !loaded) return null;

  const isCampaign = !!winner && !!broker;

  // If no campaign and no AdSense, don't show anything
  if (!isCampaign) return null;

  const baseLink = getAffiliateLink(broker!);
  const affiliateLink = `${baseLink}${baseLink.includes("?") ? "&" : "?"}cid=${winner!.campaign_id}&placement=${PLACEMENT}`;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      style={{ animation: "slideUpIn 0.3s ease-out" }}
    >
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 hidden sm:flex"
            style={{ background: `${broker!.color}20`, color: broker!.color }}
          >
            {broker!.icon || broker!.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              <span className="text-[0.56rem] font-medium text-slate-400 uppercase tracking-wider mr-2">Sponsored</span>
              {broker!.name}
              {broker!.deal_text && (
                <span className="font-normal text-amber-700 ml-1 sm:ml-2 text-[0.69rem]">
                  — {broker!.deal_text}
                </span>
              )}
            </p>
          </div>
        </div>
        <a
          href={affiliateLink}
          target="_blank"
          rel={AFFILIATE_REL}
          onClick={() =>
            trackClick(broker!.slug, broker!.name, "display-sticky", pathname, "ad", undefined, PLACEMENT)
          }
          className="shrink-0 px-3 sm:px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
        >
          Learn More →
        </a>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Dismiss ad"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
