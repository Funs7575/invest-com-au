"use client";

import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import SponsorBadge from "@/components/SponsorBadge";
import Icon from "@/components/Icon";
import ShortlistButton from "@/components/ShortlistButton";
import { isSponsored } from "@/lib/sponsorship";

export default function BrokerCard({ broker, badge, context = 'compare' }: { broker: Broker; badge?: string; context?: 'compare' | 'review' | 'calculator' | 'versus' | 'quiz' }) {
  return (
    <div className={`group rounded-xl border p-3 md:p-4 bg-white transition-shadow duration-200 hover:shadow-md ${
      isSponsored(broker)
        ? 'border-blue-400 ring-1 ring-blue-400/30 bg-blue-50/20'
        : badge
        ? 'border-slate-700 ring-1 ring-slate-700/30'
        : 'border-slate-200'
    }`}>
      {/* Badge row — sponsor or editor pick */}
      {isSponsored(broker) ? (
        <div className="mb-1.5 md:mb-2"><SponsorBadge broker={broker} /></div>
      ) : badge ? (
        <div className="text-[0.62rem] md:text-[0.69rem] font-extrabold uppercase tracking-wide text-slate-700 mb-1.5 md:mb-2">{badge}</div>
      ) : null}

      {/* Header: icon + name + rating + actions */}
      <div className="flex items-center gap-2.5 md:gap-3 mb-2 md:mb-3">
        <div
          className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold shrink-0"
          style={{ background: `${broker.color}20`, color: broker.color }}
        >
          {broker.icon || broker.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <a href={`/broker/${broker.slug}`} className="font-bold text-sm hover:text-slate-900 transition-colors">
            {broker.name}
          </a>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-amber">{renderStars(broker.rating || 0)}</span>
            <span className="text-[0.69rem] text-slate-400">{broker.rating}/5</span>
          </div>
        </div>
        <ShortlistButton slug={broker.slug} name={broker.name} size="sm" />
        <a
          href={`/broker/${broker.slug}`}
          className="text-[0.69rem] px-2 py-1 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shrink-0"
        >
          Review
        </a>
      </div>

      {/* Metrics grid — 4 compact cells */}
      <div className="grid grid-cols-4 gap-1.5 md:gap-2 mb-2 md:mb-3">
        <div className="bg-slate-50 rounded-md px-2 py-1.5 md:p-2">
          <div className="text-[0.56rem] md:text-[0.69rem] uppercase text-slate-400 font-medium">ASX</div>
          <div className="text-xs md:text-sm font-semibold leading-tight">{broker.asx_fee || 'N/A'}</div>
        </div>
        <div className="bg-slate-50 rounded-md px-2 py-1.5 md:p-2">
          <div className="text-[0.56rem] md:text-[0.69rem] uppercase text-slate-400 font-medium">US</div>
          <div className="text-xs md:text-sm font-semibold leading-tight">{broker.us_fee || 'N/A'}</div>
        </div>
        <div className="bg-slate-50 rounded-md px-2 py-1.5 md:p-2">
          <div className="text-[0.56rem] md:text-[0.69rem] uppercase text-slate-400 font-medium">FX</div>
          <div className="text-xs md:text-sm font-semibold leading-tight">{broker.fx_rate != null ? `${broker.fx_rate}%` : 'N/A'}</div>
        </div>
        <div className="bg-slate-50 rounded-md px-2 py-1.5 md:p-2">
          <div className="text-[0.56rem] md:text-[0.69rem] uppercase text-slate-400 font-medium">CHESS</div>
          <div className={`text-xs md:text-sm font-semibold leading-tight ${broker.chess_sponsored ? 'text-green-600' : 'text-red-500'}`}>
            {broker.chess_sponsored ? '✓' : '✗'}
          </div>
        </div>
      </div>

      {/* Deal badge — compact inline */}
      {broker.deal && broker.deal_text && (
        <div className="mb-2 flex items-center gap-1.5 px-2 py-1 md:px-2.5 md:py-1.5 bg-amber-50 border border-amber-200/80 rounded-lg">
          <Icon name="flame" size={11} className="text-amber-500 shrink-0" />
          <span className="text-[0.62rem] md:text-[0.69rem] text-amber-700 font-semibold leading-tight truncate">{broker.deal_text}</span>
          {broker.deal_expiry && (
            <span className="text-[0.56rem] md:text-[0.69rem] text-amber-500 shrink-0">
              exp {new Date(broker.deal_expiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      )}

      {/* CTA */}
      <a
        href={getAffiliateLink(broker)}
        target="_blank"
        rel={AFFILIATE_REL}
        onClick={() => trackClick(broker.slug, broker.name, 'compare-mobile', window.location.pathname, context)}
        className="block w-full text-center text-xs md:text-sm px-3 py-2.5 md:py-3 font-bold rounded-lg transition-all duration-200 bg-amber-600 text-white hover:bg-amber-700 active:scale-[0.98]"
      >
        {getBenefitCta(broker, context)}
      </a>
    </div>
  );
}
