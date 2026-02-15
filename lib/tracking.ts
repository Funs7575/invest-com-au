import type { Broker } from './types';

export function trackClick(brokerSlug: string, brokerName: string, source: string, page: string, layer?: string) {
  fetch('/api/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ broker_slug: brokerSlug, broker_name: brokerName, source, page, layer }),
  }).catch(() => {});
}

export function getAffiliateLink(broker: Broker): string {
  return broker.affiliate_url || `/broker/${broker.slug}`;
}

export function getBenefitCta(broker: Broker, context: 'compare' | 'review' | 'calculator' | 'versus' | 'quiz'): string {
  if (broker.benefit_cta) return broker.benefit_cta;
  if (broker.cta_text) return broker.cta_text;

  if (broker.deal && broker.deal_text) {
    return broker.cta_text || `Claim ${broker.name} Deal`;
  }

  switch (context) {
    case 'compare':
      if (broker.asx_fee_value === 0) return `Trade $0 →`;
      if (broker.asx_fee_value && broker.asx_fee_value <= 5) return `Trade from ${broker.asx_fee} →`;
      return `Visit ${broker.name} →`;
    case 'review':
      if (broker.deal) return broker.cta_text || `Claim Deal →`;
      return broker.cta_text || `Open ${broker.name} Account →`;
    case 'calculator':
      return `Try ${broker.name} →`;
    case 'versus':
      return broker.cta_text || `Visit ${broker.name} →`;
    case 'quiz':
      return broker.cta_text || `Get Started with ${broker.name} →`;
    default:
      return broker.cta_text || `Visit ${broker.name}`;
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
