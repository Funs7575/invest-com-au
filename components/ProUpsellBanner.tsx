"use client";

import Link from "next/link";
import { useSubscription } from "@/lib/hooks/useSubscription";

type Variant = "inline" | "sidebar" | "compact";

const COPY: Record<Variant, { badge: string; headline: string; sub: string; cta: string }> = {
  inline: {
    badge: "Investor Pro",
    headline: "Get the full picture",
    sub: "Unlock fee alerts, advanced comparisons, health scores, and expert courses for just $9/mo.",
    cta: "Try Pro Free for 7 Days",
  },
  sidebar: {
    badge: "Pro",
    headline: "Unlock Pro tools",
    sub: "Fee alerts, health scores, and advanced comparisons.",
    cta: "Start Free Trial",
  },
  compact: {
    badge: "Pro",
    headline: "Want fee alerts & advanced tools?",
    sub: "",
    cta: "Try Pro →",
  },
};

export default function ProUpsellBanner({ variant = "inline" }: { variant?: Variant }) {
  const { isPro } = useSubscription();

  // Don't show to Pro users
  if (isPro) return null;

  const copy = COPY[variant];

  if (variant === "compact") {
    return (
      <Link
        href="/pro"
        className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm hover:bg-amber-100 transition-colors group"
      >
        <span className="text-[0.69rem] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
          {copy.badge}
        </span>
        <span className="text-slate-700 font-medium">{copy.headline}</span>
        <span className="text-amber-600 font-semibold ml-auto group-hover:translate-x-0.5 transition-transform">
          {copy.cta}
        </span>
      </Link>
    );
  }

  if (variant === "sidebar") {
    return (
      <div className="rounded-xl p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
        <div className="text-[0.69rem] font-bold uppercase tracking-wide text-amber-600 mb-1">{copy.badge}</div>
        <h4 className="font-bold text-slate-900 mb-1 text-sm">{copy.headline}</h4>
        <p className="text-xs text-slate-600 mb-3 leading-relaxed">{copy.sub}</p>
        <Link
          href="/pro"
          className="block text-center py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors"
        >
          {copy.cta}
        </Link>
      </div>
    );
  }

  // inline variant
  return (
    <div className="rounded-xl p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[0.69rem] font-bold uppercase tracking-wide text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
              {copy.badge}
            </span>
          </div>
          <h4 className="font-bold text-slate-900 text-lg">{copy.headline}</h4>
          <p className="text-sm text-slate-600 mt-0.5">{copy.sub}</p>
        </div>
        <Link
          href="/pro"
          className="shrink-0 px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 hover:scale-105 hover:shadow-lg transition-all"
        >
          {copy.cta}
        </Link>
      </div>
    </div>
  );
}
