"use client";

import { useState, useEffect } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, AFFILIATE_REL } from "@/lib/tracking";
import { ADVERTISER_DISCLOSURE_SHORT, RISK_WARNING_CTA } from "@/lib/compliance";

export default function StickyCTABar({ broker, detail, context = 'review' }: { broker: Broker; detail: string; context?: 'review' | 'versus' | 'calculator' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-amber-500 border-t border-amber-600/30 shadow-lg bounce-in-up ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="container-custom py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: `${broker.color}30`, color: broker.color }}
          >
            {broker.icon || broker.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm text-white truncate">{broker.name}</div>
            <div className="text-xs text-amber-50 truncate">{detail}</div>
          </div>
          {broker.deal && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 border border-white/30 rounded-full text-[0.6rem] text-white font-semibold">
              🔥 Deal Available
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={getAffiliateLink(broker)}
            target="_blank"
            rel={AFFILIATE_REL}
            onClick={() => trackClick(broker.slug, broker.name, 'sticky-cta', window.location.pathname, context)}
            className="shrink-0 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 hover:shadow-lg transition-all active:scale-[0.97]"
          >
            {getBenefitCta(broker, context)}
          </a>
          <span className="hidden sm:inline text-[0.55rem] text-amber-100/70 max-w-[200px] leading-tight">{ADVERTISER_DISCLOSURE_SHORT} {RISK_WARNING_CTA}</span>
        </div>
      </div>
    </div>
  );
}
