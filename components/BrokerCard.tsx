"use client";

import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, renderStars } from "@/lib/tracking";

export default function BrokerCard({ broker, badge, context = 'compare', ctaColor = 'amber' }: { broker: Broker; badge?: string; context?: 'compare' | 'review' | 'calculator' | 'versus' | 'quiz'; ctaColor?: 'amber' | 'green' }) {
  return (
    <div className={`rounded-xl border p-4 bg-white ${badge ? 'border-amber ring-1 ring-amber/30' : 'border-slate-200'}`}>
      {badge && (
        <div className="text-[0.6rem] font-extrabold uppercase tracking-wide text-amber-700 mb-2">{badge}</div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: `${broker.color}20`, color: broker.color }}
        >
          {broker.icon || broker.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <a href={`/broker/${broker.slug}`} className="font-bold text-sm hover:text-amber transition-colors">
            {broker.name}
          </a>
          <div className="text-xs text-amber">
            {renderStars(broker.rating || 0)} <span className="text-slate-500">{broker.rating}/5</span>
          </div>
        </div>
        <a
          href={`/broker/${broker.slug}`}
          className="text-xs px-2 py-1 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shrink-0"
        >
          Review
        </a>
      </div>

      <a
        href={getAffiliateLink(broker)}
        target="_blank"
        rel="noopener noreferrer nofollow"
        onClick={() => trackClick(broker.slug, broker.name, 'compare-mobile', window.location.pathname, context)}
        className={`block w-full text-center text-sm px-3 py-2 font-semibold rounded-lg transition-colors mb-3 ${ctaColor === 'green' ? 'bg-green-700 text-white hover:bg-green-800' : 'bg-amber text-white hover:bg-amber-600'}`}
      >
        {getBenefitCta(broker, context)}
      </a>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-50 rounded-md p-2">
          <div className="text-[0.6rem] uppercase text-slate-500 font-medium">ASX Fee</div>
          <div className="text-sm font-semibold">{broker.asx_fee || 'N/A'}</div>
        </div>
        <div className="bg-slate-50 rounded-md p-2">
          <div className="text-[0.6rem] uppercase text-slate-500 font-medium">US Fee</div>
          <div className="text-sm font-semibold">{broker.us_fee || 'N/A'}</div>
        </div>
        <div className="bg-slate-50 rounded-md p-2">
          <div className="text-[0.6rem] uppercase text-slate-500 font-medium">FX Rate</div>
          <div className="text-sm font-semibold">{broker.fx_rate != null ? `${broker.fx_rate}%` : 'N/A'}</div>
        </div>
        <div className="bg-slate-50 rounded-md p-2">
          <div className="text-[0.6rem] uppercase text-slate-500 font-medium">CHESS</div>
          <div className={`text-sm font-semibold ${broker.chess_sponsored ? 'text-green-600' : 'text-red-500'}`}>
            {broker.chess_sponsored ? '✓ Yes' : '✗ No'}
          </div>
        </div>
      </div>
    </div>
  );
}
