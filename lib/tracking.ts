import type { Broker } from './types';
import { getSessionId } from './session';
import { logger } from "@/lib/logger";

const log = logger("tracking");

/** Standard rel attribute for all outbound affiliate links */
export const AFFILIATE_REL = "noopener noreferrer nofollow sponsored";

interface TrackClickOptions {
  userId?: string | null;
  abTestId?: string;
  abVariant?: string;
}

/**
 * Track an outbound affiliate click.
 *
 * Uses sendBeacon() as the primary method so the request survives page
 * navigation (critical — users often tab away immediately after clicking
 * a "Visit Site" button, and fetch() requests get cancelled on unload).
 * Falls back to fetch({ keepalive: true }) if sendBeacon is unavailable.
 *
 * This is the highest-revenue-impact function on the site. Every lost
 * click here is lost affiliate revenue.
 */
export function trackClick(
  brokerSlug: string,
  brokerName: string,
  source: string,
  page: string,
  layer?: string,
  scenario?: string,
  placement?: string,
  options?: TrackClickOptions,
) {
  const sessionId = getSessionId();
  const payload = JSON.stringify({
    broker_slug: brokerSlug,
    broker_name: brokerName,
    source,
    page,
    layer,
    session_id: sessionId,
    scenario,
    placement_type: placement,
    user_id: options?.userId || null,
    ab_test_id: options?.abTestId || null,
    ab_variant: options?.abVariant || null,
  });

  // Primary: sendBeacon — survives page navigation, perfect for outbound CTAs
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/track-click", blob);
      if (sent) return;
    } catch {
      // Fall through to fetch fallback
    }
  }

  // Fallback: fetch with keepalive — also survives navigation on most browsers
  fetch("/api/track-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  })
    .then((res) => res.json())
    .then((data) => {
      if (data?.click_id && typeof window !== "undefined") {
        (window as unknown as Record<string, string>).__inv_last_click_id = data.click_id;
      }
    })
    .catch(() => {
      // Silently fail — beacon already tried
    });
}

export function trackEvent(
  eventType: string,
  eventData?: Record<string, unknown>,
  page?: string
) {
  const sessionId = getSessionId();
  fetch('/api/track-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: eventType,
      event_data: eventData || {},
      page: page || (typeof window !== 'undefined' ? window.location.pathname : '/'),
      session_id: sessionId,
    }),
  }).catch((err: Error) => {
    log.warn("Event tracking failed", { error: err.message });
  });
}

export function getAffiliateLink(broker: Broker): string {
  // Route through /go/ redirect layer for server-side tracking & link hygiene
  if (broker.affiliate_url) return `/go/${broker.slug}`;
  return `/broker/${broker.slug}`;
}

export function getBenefitCta(broker: Broker, context: 'compare' | 'review' | 'calculator' | 'versus' | 'quiz'): string {
  // If no affiliate URL, show informational CTA instead of action CTA
  const hasAffiliate = !!broker.affiliate_url;

  if (broker.benefit_cta) return broker.benefit_cta;
  if (broker.cta_text) return broker.cta_text;

  if (!hasAffiliate) {
    return context === 'review' ? `Read Full Review →` : `View ${broker.name} →`;
  }

  if (broker.deal && broker.deal_text) {
    return broker.cta_text || `Claim ${broker.name} Deal`;
  }

  switch (context) {
    case 'compare':
      if (broker.asx_fee_value === 0) return `Trade $0 Brokerage →`;
      if (broker.asx_fee_value && broker.asx_fee_value <= 5) return `Trade from ${broker.asx_fee} →`;
      return `Open Free Account →`;
    case 'review':
      if (broker.deal) return broker.cta_text || `Claim Deal →`;
      return broker.cta_text || `Open ${broker.name} Account →`;
    case 'calculator':
      if (broker.asx_fee_value === 0) return `Try $0 Brokerage →`;
      return `Try ${broker.name} Free →`;
    case 'versus':
      return broker.cta_text || `Open Free Account →`;
    case 'quiz':
      return broker.cta_text || `Get Started Free →`;
    default:
      return broker.cta_text || `Learn More →`;
  }
}

export function formatPercent(n: number, decimals = 2): string {
  return n.toFixed(decimals) + '%';
}

export function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

/**
 * Track page view duration. Call once on page load.
 * Sends duration on page hide (tab switch, navigation, close).
 * Uses visibilitychange for accuracy (not beforeunload which is unreliable on mobile).
 */
export function trackPageDuration(page: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const start = Date.now();
  let sent = false;

  const send = () => {
    if (sent) return;
    sent = true;
    const duration = Math.round((Date.now() - start) / 1000);
    if (duration < 2 || duration > 3600) return; // Ignore <2s (bounces) and >1hr (stale tabs)
    const payload = JSON.stringify({
      event_type: 'page_duration',
      page,
      metadata: { duration_seconds: duration },
    });
    navigator.sendBeacon?.('/api/track-event', payload);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') send();
  });
  // Fallback for page unload (closing tab)
  window.addEventListener('pagehide', send);
}
