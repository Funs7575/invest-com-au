import type { Broker } from './types';
import { getSessionId } from './session';

/** Standard rel attribute for all outbound affiliate links */
export const AFFILIATE_REL = "noopener noreferrer nofollow sponsored";

export function trackClick(brokerSlug: string, brokerName: string, source: string, page: string, layer?: string, scenario?: string, placement?: string) {
  const sessionId = getSessionId();
  fetch('/api/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ broker_slug: brokerSlug, broker_name: brokerName, source, page, layer, session_id: sessionId, scenario, placement_type: placement }),
  })
    .then((res) => res.json())
    .then((data) => {
      // If click_id returned, append to outbound links for attribution
      if (data?.click_id && typeof window !== 'undefined') {
        (window as unknown as Record<string, string>).__inv_last_click_id = data.click_id;
      }
    })
    .catch(() => {});
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
  }).catch(() => {});
}

export function getAffiliateLink(broker: Broker): string {
  // Route through /go/ redirect layer for server-side tracking & link hygiene
  if (broker.affiliate_url) return `/go/${broker.slug}`;
  return `/broker/${broker.slug}`;
}

export function getBenefitCta(broker: Broker, context: 'compare' | 'review' | 'calculator' | 'versus' | 'quiz'): string {
  if (broker.benefit_cta) return broker.benefit_cta;
  if (broker.cta_text) return broker.cta_text;

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
