"use client";

import { useState, useEffect } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, AFFILIATE_REL } from "@/lib/tracking";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import RiskWarningInline from "@/components/RiskWarningInline";

export default function MobileFloatingCTA({
  broker,
  pagePath,
}: {
  broker: Broker;
  pagePath: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 800);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] safe-area-inset-bottom">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: `${broker.color}20`, color: broker.color }}
        >
          {broker.icon || broker.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-brand truncate">
            {broker.name}
          </div>
          <div className="text-xs text-slate-500">
            {broker.rating?.toFixed(1)}/5
            {broker.fx_rate != null && (
              <span>
                {" "}
                &middot; {broker.fx_rate}% FX
              </span>
            )}
          </div>
        </div>
        <a
          href={getAffiliateLink(broker)}
          target="_blank"
          rel={AFFILIATE_REL}
          onClick={() =>
            trackClick(
              broker.slug,
              broker.name,
              "mobile-floating-cta",
              pagePath,
              "article"
            )
          }
          className="shrink-0 px-5 py-2.5 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 transition-colors"
        >
          Open Account
        </a>
      </div>
      <div className="px-4 pb-1.5 text-[0.55rem] text-slate-400 text-center">
        {ADVERTISER_DISCLOSURE_SHORT}
        <RiskWarningInline />
      </div>
    </div>
  );
}
