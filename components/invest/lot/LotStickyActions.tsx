"use client";

import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/tracking";
import LotSaveButton from "@/components/invest/lot/LotSaveButton";

/**
 * Mobile sticky action bar for lot pages: price + Save + Enquire, pinned to
 * the bottom edge once the reader scrolls past the page header (an
 * IntersectionObserver sentinel rendered by ListingDetailView). Hidden on
 * md+ where the sidebar enquiry card is always visible.
 *
 * "Enquire" is an in-page anchor to `#enquire` (the sidebar form) so the
 * bar adds zero new lead plumbing — it shortens the path to the existing
 * one.
 */
export interface LotStickyActionsProps {
  sentinelId: string;
  priceLabel: string;
  priceValue: string;
  enquiryCta: string;
  slug: string;
  title: string;
  vertical: string;
}

export default function LotStickyActions({
  sentinelId,
  priceLabel,
  priceValue,
  enquiryCta,
  slug,
  title,
  vertical,
}: LotStickyActionsProps) {
  const [visible, setVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setVisible(!entry.isIntersecting);
      },
      { rootMargin: "0px" },
    );
    observerRef.current.observe(sentinel);
    return () => observerRef.current?.disconnect();
  }, [sentinelId]);

  return (
    <div
      aria-hidden={!visible}
      // `inert` (React 19) removes the off-screen bar's Save/Enquire from
      // the tab order — aria-hidden alone leaves them keyboard-focusable.
      inert={!visible}
      className={[
        "fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-slate-200 bg-white/95 backdrop-blur",
        "transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full",
      ].join(" ")}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {priceLabel}
          </p>
          <p className="text-base font-extrabold text-slate-900 truncate">{priceValue}</p>
        </div>
        <LotSaveButton slug={slug} title={title} vertical={vertical} variant="bar" />
        {enquiryCta && (
        <a
          href="#enquire"
          onClick={() => trackEvent("listing_sticky_enquire", { vertical, ref: slug })}
          className="inline-flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold px-5 py-2.5 transition-colors"
        >
          {enquiryCta}
        </a>
        )}
      </div>
    </div>
  );
}
