"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/**
 * Floating sticky CTA bar shown on mobile only after the user scrolls
 * past the hero section (~400px). Dismissed on click or after navigation.
 */
export default function MobileStickyAdvisorCta() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    const onScroll = () => {
      setVisible(window.scrollY > 420);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed]);

  if (!visible || dismissed) return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.10)] px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900 leading-tight">Find the right advisor</p>
          <p className="text-[0.65rem] text-slate-500">Free &middot; no obligation &middot; 60 seconds</p>
        </div>
        <Link
          href="/find-advisor"
          onClick={() => setDismissed(true)}
          className="shrink-0 px-4 py-2.5 min-h-[44px] flex items-center bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors"
        >
          Find My Advisor — Free &rarr;
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-lg"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
