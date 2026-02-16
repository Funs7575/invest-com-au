"use client";

import { useState, useEffect } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta } from "@/lib/tracking";

export default function StickyCTABar({ broker, detail, context = 'review' }: { broker: Broker; detail: string; context?: 'review' | 'versus' | 'calculator' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-green-700/20 shadow-lg">
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
            <div className="text-xs text-slate-400 truncate">{detail}</div>
          </div>
        </div>
        <a
          href={getAffiliateLink(broker)}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={() => trackClick(broker.slug, broker.name, 'sticky-cta', window.location.pathname, context)}
          className="shrink-0 px-5 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
        >
          {getBenefitCta(broker, context)}
        </a>
        <span className="hidden sm:inline text-[0.55rem] text-slate-500">Sponsored</span>
      </div>
    </div>
  );
}
