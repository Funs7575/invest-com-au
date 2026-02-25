"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useShortlist } from "@/lib/hooks/useShortlist";
import { createClient } from "@/lib/supabase/client";
import { trackClick, getAffiliateLink, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import Icon from "@/components/Icon";
import type { Broker } from "@/lib/types";

export default function ShortlistClient() {
  const { slugs, count, toggle, clear } = useShortlist();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slugs.length === 0) {
      setBrokers([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from("brokers")
      .select("*")
      .in("slug", slugs)
      .eq("status", "active")
      .then(({ data }) => {
        if (data) {
          const sorted = slugs
            .map((slug) => data.find((b) => b.slug === slug))
            .filter(Boolean) as Broker[];
          setBrokers(sorted);
        }
        setLoading(false);
      });
  }, [slugs]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (count === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-12 text-center">
        <svg className="w-8 h-8 md:w-12 md:h-12 mx-auto text-slate-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <h2 className="text-base md:text-lg font-bold text-slate-900 mb-1.5">No brokers saved yet</h2>
        <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6">
          Tap the heart icon on any broker to save it here.
        </p>
        <Link
          href="/compare"
          className="inline-block px-5 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
        >
          Browse Brokers &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs md:text-sm text-slate-500">
          {count} broker{count !== 1 ? "s" : ""} saved
        </p>
        <button
          onClick={clear}
          className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors px-2 py-1 min-h-[36px]"
        >
          Clear All
        </button>
      </div>

      {/* Compact broker rows */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {brokers.map((broker) => (
          <div key={broker.id} className="flex items-center gap-2.5 md:gap-4 px-3 md:px-5 py-3 md:py-4 hover:bg-slate-50/50 transition-colors">
            {/* Broker icon */}
            <Link
              href={`/broker/${broker.slug}`}
              className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold shrink-0"
              style={{ background: `${broker.color}20`, color: broker.color }}
            >
              {broker.icon || broker.name.charAt(0)}
            </Link>

            {/* Name + rating + key fee */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/broker/${broker.slug}`}
                  className="font-bold text-sm text-slate-900 hover:underline truncate"
                >
                  {broker.name}
                </Link>
                {broker.deal && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 border border-amber-200/80 rounded text-[0.62rem] md:text-[0.69rem] text-amber-700 font-semibold shrink-0">
                    <Icon name="flame" size={10} className="text-amber-500" />
                    Deal
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 md:gap-3 mt-0.5">
                <span className="text-[0.69rem] text-amber-500">{renderStars(broker.rating || 0)}</span>
                <span className="text-[0.62rem] md:text-[0.69rem] text-slate-400">{broker.rating}/5</span>
                <span className="text-slate-200 hidden sm:inline">|</span>
                <span className="text-[0.62rem] md:text-[0.69rem] text-slate-400 hidden sm:inline">
                  ASX {broker.asx_fee || "N/A"}
                </span>
                {broker.us_fee && (
                  <>
                    <span className="text-slate-200 hidden md:inline">|</span>
                    <span className="text-[0.69rem] text-slate-400 hidden md:inline">
                      US {broker.us_fee}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
              {/* Visit broker CTA */}
              <a
                href={getAffiliateLink(broker)}
                target="_blank"
                rel={AFFILIATE_REL}
                onClick={() => trackClick(broker.slug, broker.name, "shortlist", "/shortlist", "compare")}
                className="px-2.5 md:px-3 py-1.5 md:py-2 bg-amber-600 text-white text-[0.69rem] md:text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors min-h-[36px] inline-flex items-center"
              >
                <span className="hidden sm:inline">Visit Broker</span>
                <span className="sm:hidden">Visit</span>
              </a>

              {/* Remove button */}
              <button
                onClick={() => toggle(broker.slug)}
                className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors min-h-[36px]"
                aria-label={`Remove ${broker.name} from shortlist`}
                title="Remove"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Compare CTA — primary action */}
      {count >= 2 && (
        <div className="mt-4 md:mt-6">
          <Link
            href={`/versus?vs=${brokers.slice(0, 4).map((b) => b.slug).join(",")}`}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 md:py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Compare {Math.min(count, 4)} Brokers Side-by-Side &rarr;
          </Link>
        </div>
      )}

      {count === 1 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400 mb-2">Save one more broker to compare side-by-side</p>
          <Link
            href="/compare"
            className="inline-block px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors min-h-[36px]"
          >
            Browse More Brokers &rarr;
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="mt-4 md:mt-6 flex flex-wrap gap-2">
        <Link
          href="/compare"
          className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 bg-slate-50 rounded-lg min-h-[36px] inline-flex items-center"
        >
          + Add more brokers
        </Link>
        <Link
          href="/quiz"
          className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 bg-slate-50 rounded-lg min-h-[36px] inline-flex items-center"
        >
          Not sure? Take the quiz
        </Link>
      </div>
    </div>
  );
}
