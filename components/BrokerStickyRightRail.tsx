"use client";

import { useEffect, useState } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, AFFILIATE_REL } from "@/lib/tracking";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import BrokerLogo from "@/components/BrokerLogo";

export default function BrokerStickyRightRail({
  broker,
  context = "review",
}: {
  broker: Broker;
  context?: "review" | "versus" | "calculator";
}) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("brokerRightRailDismissed") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dismissed) return;
    const onScroll = () => setVisible(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("brokerRightRailDismissed", "true");
    } catch {
    }
  };

  return (
    <aside
      aria-label={`Quick action for ${broker.name}`}
      aria-hidden={!visible}
      className={`hidden lg:flex fixed right-4 top-1/2 -translate-y-1/2 z-30 flex-col items-stretch w-56 xl:w-60 transition-all duration-300 ease-out ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 pointer-events-none translate-x-4"
      }`}
    >
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 p-4">
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-slate-200 shadow text-slate-400 hover:text-slate-700 flex items-center justify-center"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="text-[0.6rem] font-bold uppercase tracking-wider text-slate-400 mb-2">
          Quick action
        </div>

        <div className="flex items-center gap-2.5 mb-3">
          <BrokerLogo broker={broker} size="sm" />
          <div className="min-w-0">
            <div className="font-bold text-sm text-slate-900 truncate" title={broker.name}>
              {broker.name}
            </div>
            {broker.rating != null && (
              <div className="text-[0.65rem] text-slate-500">{broker.rating}/5 rating</div>
            )}
          </div>
        </div>

        {broker.deal && broker.deal_text && (
          <div className="mb-3 text-[0.65rem] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 rounded-md px-2 py-1.5 line-clamp-2">
            {broker.deal_text}
          </div>
        )}

        <a
          href={getAffiliateLink(broker)}
          target="_blank"
          rel={AFFILIATE_REL}
          onClick={() =>
            trackClick(
              broker.slug,
              broker.name,
              "right-rail",
              window.location.pathname,
              context,
            )
          }
          className="group flex items-center justify-center gap-2 w-full px-4 py-3 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 hover:shadow-lg hover:shadow-amber-600/30 active:bg-amber-800 active:scale-[0.98] transition-all"
        >
          <span>{getBenefitCta(broker, context)}</span>
          <svg
            className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0-5-5m5 5-5 5" />
          </svg>
        </a>

        <p className="mt-2 text-[0.6rem] leading-tight text-slate-400">
          {ADVERTISER_DISCLOSURE_SHORT}
        </p>
      </div>
    </aside>
  );
}
