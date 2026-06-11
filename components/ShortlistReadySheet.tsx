"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/ui/Sheet";
import { SHORTLIST_READY_EVENT } from "@/components/ShortlistButton";
import { useUser } from "@/lib/hooks/useUser";
import { trackEvent } from "@/lib/tracking";

/**
 * "Three's a shortlist" moment (RETAIL_UX_NORTHSTAR §5 D2).
 * Listens for the once-ever event dispatched by ShortlistButton when the
 * shortlist first reaches three platforms, and offers the side-by-side
 * comparison. Pure invitation — dismissing it is final (the event never
 * fires again).
 */
export default function ShortlistReadySheet() {
  const [slugs, setSlugs] = useState<string[] | null>(null);
  const { user } = useUser();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail) && detail.length >= 3) {
        setSlugs(detail.filter((s): s is string => typeof s === "string"));
        trackEvent("shortlist_ready_shown", { count: detail.length });
      }
    };
    window.addEventListener(SHORTLIST_READY_EVENT, handler);
    return () => window.removeEventListener(SHORTLIST_READY_EVENT, handler);
  }, []);

  if (!slugs) return null;

  const compareHref = `/shortlist/compare?brokers=${slugs.slice(0, 4).join(",")}`;

  return (
    <Sheet open onClose={() => setSlugs(null)} title="Three's a shortlist">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        You&apos;ve saved three platforms — that&apos;s enough to put them side by side and
        see how the numbers actually compare.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <Link
          href={compareHref}
          onClick={() => {
            trackEvent("shortlist_ready_accepted", { count: slugs.length });
            setSlugs(null);
          }}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors"
        >
          Compare your 3
        </Link>
        <button
          type="button"
          onClick={() => setSlugs(null)}
          className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Keep browsing
        </button>
        {!user ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
            A free account keeps this shortlist on all your devices.
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
