"use client";

import { memo } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import SponsorBadge from "@/components/SponsorBadge";
import Icon from "@/components/Icon";
import ShortlistButton from "@/components/ShortlistButton";
import BrokerLogo from "@/components/BrokerLogo";
import { isSponsored } from "@/lib/sponsorship";

export default memo(function BrokerCard({
  broker,
  badge,
  context = 'compare',
  isSelected,
  onToggleSelect,
  selectionDisabled,
}: {
  broker: Broker;
  badge?: string;
  context?: 'compare' | 'review' | 'calculator' | 'versus' | 'quiz';
  isSelected?: boolean;
  onToggleSelect?: (slug: string) => void;
  selectionDisabled?: boolean;
}) {
  const isSponsoredBroker = isSponsored(broker);
  const isShareOrCFD = broker.platform_type === 'share_broker' || broker.platform_type === 'cfd_forex';

  return (
    <div className={`group relative rounded-xl border bg-white transition-all duration-200 hover:shadow-md ${
      isSelected
        ? 'border-slate-700 ring-2 ring-slate-700/30'
        : isSponsoredBroker
        ? 'border-blue-400 ring-1 ring-blue-400/30 bg-blue-50/20'
        : badge
        ? 'border-slate-700 ring-1 ring-slate-700/30'
        : 'border-slate-200'
    }`}>
      {/* Selection checkbox */}
      {onToggleSelect && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (selectionDisabled && !isSelected) return; onToggleSelect(broker.slug); }}
          disabled={selectionDisabled && !isSelected}
          className="absolute -top-1 -right-1 z-10 w-10 h-10 flex items-center justify-center"
          aria-label={isSelected ? `Deselect ${broker.name}` : `Select ${broker.name}`}
        >
          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-150 shadow-sm ${
            isSelected ? 'bg-slate-900 border-slate-900 scale-110' : selectionDisabled ? 'bg-white border-slate-200 opacity-40' : 'bg-white border-slate-300 active:scale-95'
          }`}>
            {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </span>
        </button>
      )}

      {/* Badge */}
      {isSponsoredBroker ? (
        <div className="px-3 pt-2.5 pb-0"><SponsorBadge broker={broker} /></div>
      ) : badge ? (
        <div className="px-3 pt-2.5 pb-0 text-[0.62rem] font-extrabold uppercase tracking-wide text-slate-700">{badge}</div>
      ) : null}

      {/* ── COMPACT CARD LAYOUT ── */}
      <div className="p-3">
        {/* Row 1: Logo + Name + Rating + CTA */}
        <div className="flex items-center gap-2.5 mb-2">
          <BrokerLogo broker={broker} size="md" />
          <div className="flex-1 min-w-0">
            <a href={`/broker/${broker.slug}`} className="font-bold text-sm text-slate-900 hover:text-slate-700 transition-colors block truncate">
              {broker.name}
            </a>
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 text-xs">{renderStars(broker.rating || 0)}</span>
              <span className="text-[0.65rem] font-semibold text-slate-500">{broker.rating}/5</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <ShortlistButton slug={broker.slug} name={broker.name} size="sm" />
            <a
              href={getAffiliateLink(broker)}
              target="_blank"
              rel={AFFILIATE_REL}
              onClick={() => trackClick(broker.slug, broker.name, 'compare-mobile', window.location.pathname, context)}
              className="px-3 py-1.5 text-[0.69rem] font-bold rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.98] transition-all"
            >
              {getBenefitCta(broker, context)}
            </a>
          </div>
        </div>

        {/* Row 2: Key metrics — single compact row */}
        <div className="flex items-center gap-1 mb-1.5">
          {isShareOrCFD ? (
            <>
              <span className="text-[0.6rem] px-1.5 py-0.5 bg-slate-50 rounded font-semibold text-slate-700">ASX {broker.asx_fee || 'N/A'}</span>
              <span className="text-[0.6rem] px-1.5 py-0.5 bg-slate-50 rounded font-semibold text-slate-700">US {broker.us_fee || 'N/A'}</span>
              {broker.fx_rate != null && <span className="text-[0.6rem] px-1.5 py-0.5 bg-slate-50 rounded font-semibold text-slate-700">FX {broker.fx_rate}%</span>}
              <span className={`text-[0.6rem] px-1.5 py-0.5 rounded font-bold ${broker.chess_sponsored ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'}`}>
                CHESS {broker.chess_sponsored ? '✓' : '✗'}
              </span>
            </>
          ) : broker.platform_type === 'crypto_exchange' ? (
            <>
              <span className="text-[0.6rem] px-1.5 py-0.5 bg-slate-50 rounded font-semibold text-slate-700">Fees {broker.asx_fee || 'Varies'}</span>
              <span className="text-[0.6rem] px-1.5 py-0.5 bg-emerald-50 rounded font-bold text-emerald-700">AUSTRAC ✓</span>
            </>
          ) : broker.platform_type === 'super_fund' ? (
            <>
              <span className="text-[0.6rem] px-1.5 py-0.5 bg-slate-50 rounded font-semibold text-slate-700">{broker.asx_fee || 'Varies'}</span>
              <span className="text-[0.6rem] px-1.5 py-0.5 bg-emerald-50 rounded font-bold text-emerald-700">APRA ✓</span>
              <span className="text-[0.6rem] px-1.5 py-0.5 bg-emerald-50 rounded font-bold text-emerald-700">Insurance ✓</span>
            </>
          ) : broker.platform_type === 'robo_advisor' ? (
            <>
              <span className="text-[0.6rem] px-1.5 py-0.5 bg-slate-50 rounded font-semibold text-slate-700">{broker.asx_fee || 'Varies'}</span>
              <span className="text-[0.6rem] px-1.5 py-0.5 bg-emerald-50 rounded font-bold text-emerald-700">Auto ✓</span>
              <span className="text-[0.6rem] px-1.5 py-0.5 bg-emerald-50 rounded font-bold text-emerald-700">AFSL ✓</span>
            </>
          ) : (
            <>
              <span className="text-[0.6rem] px-1.5 py-0.5 bg-slate-50 rounded font-semibold text-slate-700">{broker.asx_fee || 'Varies'}</span>
              <span className="text-[0.6rem] px-1.5 py-0.5 bg-emerald-50 rounded font-bold text-emerald-700">ASIC ✓</span>
            </>
          )}
        </div>

        {/* Row 3: Deal (if active) */}
        {broker.deal && broker.deal_text && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200/80 rounded-lg">
            <Icon name="flame" size={11} className="text-amber-500 shrink-0" />
            <span className="text-[0.6rem] text-amber-700 font-semibold truncate">{broker.deal_text}</span>
            {broker.deal_expiry && (() => {
              const daysLeft = Math.ceil((new Date(broker.deal_expiry).getTime() - Date.now()) / 86400000);
              if (daysLeft <= 0) return null;
              return <span className={`text-[0.55rem] shrink-0 font-bold px-1.5 py-0.5 rounded-full ${daysLeft <= 7 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{daysLeft}d left</span>;
            })()}
          </div>
        )}
      </div>
    </div>
  );
})
