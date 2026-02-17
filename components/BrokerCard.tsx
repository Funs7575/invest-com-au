"use client";

import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import RiskWarningInline from "@/components/RiskWarningInline";

export default function BrokerCard({ broker, badge, context = 'compare' }: { broker: Broker; badge?: string; context?: 'compare' | 'review' | 'calculator' | 'versus' | 'quiz' }) {
  return (
    <div className={`group rounded-xl border p-4 bg-white transition-shadow duration-200 hover:shadow-md ${badge ? 'border-green-700 ring-1 ring-green-700/30' : 'border-slate-200'}`}>
      {badge && (
        <div className="text-[0.6rem] font-extrabold uppercase tracking-wide text-green-700 mb-2">{badge}</div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: `${broker.color}20`, color: broker.color }}
        >
          {broker.icon || broker.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <a href={`/broker/${broker.slug}`} className="font-bold text-sm hover:text-green-700 transition-colors">
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

      {/* Deal badge */}
      {broker.deal && broker.deal_text && (
        <div className="mb-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-xs">🔥</span>
          <span className="text-[0.65rem] text-amber-700 font-semibold leading-tight">{broker.deal_text}</span>
        </div>
      )}

      <a
        href={getAffiliateLink(broker)}
        target="_blank"
        rel={AFFILIATE_REL}
        onClick={() => trackClick(broker.slug, broker.name, 'compare-mobile', window.location.pathname, context)}
        className="block w-full text-center text-sm px-3 py-2.5 font-bold rounded-lg transition-all mb-3 bg-green-700 text-white hover:bg-green-800 hover:shadow-md active:scale-[0.98]"
      >
        {getBenefitCta(broker, context)}
      </a>
      <RiskWarningInline />

      {/* Primary metrics — always visible */}
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

      {/* Secondary metrics — revealed on hover/focus */}
      <div className="grid grid-cols-2 gap-2 mt-2 max-h-0 overflow-hidden opacity-0 group-hover:max-h-24 group-hover:opacity-100 group-focus-within:max-h-24 group-focus-within:opacity-100 transition-all duration-300">
        <div className="bg-slate-50 rounded-md p-2">
          <div className="text-[0.6rem] uppercase text-slate-500 font-medium">SMSF</div>
          <div className={`text-sm font-semibold ${broker.smsf_support ? 'text-green-600' : 'text-red-500'}`}>
            {broker.smsf_support ? '✓ Yes' : '✗ No'}
          </div>
        </div>
        {broker.tagline && (
          <div className="bg-slate-50 rounded-md p-2 col-span-2">
            <div className="text-[0.6rem] uppercase text-slate-500 font-medium">About</div>
            <div className="text-xs text-slate-600 line-clamp-2">{broker.tagline}</div>
          </div>
        )}
      </div>
    </div>
  );
}
