"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * Homepage hero with 3-variant A/B(/C) test.
 *
 * Deterministically assigns one variant per session via cookie on the
 * first render; tracks the impression through /api/ab-track; persists
 * the choice for 30 days so the user keeps the same variant on repeat
 * visits. Conversion tracking fires on CTA click (also /api/ab-track).
 *
 * Variants:
 *   a — "Compare platforms, professionals & ways to invest" (control)
 *   b — "Find your broker in 60 seconds" (tool-first, quiz-heavy)
 *   c — "The best Australian brokers, ranked by what you save" (value-first)
 *
 * Analysis happens in /admin/ab-tests. This component does not block
 * SSR: it hydrates in client with a stable default ('a') so CWV and
 * SEO aren't affected.
 */

const TEST_NAME = "home_hero_v1";
const COOKIE_KEY = "_inv_ab_home_hero_v1";
const COOKIE_TTL_DAYS = 30;
type Variant = "a" | "b" | "c";

interface Props {
  brokerCount: number;
  listingCount: number;
  updatedMonth: string;
}

function readVariantCookie(): Variant | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie.split("; ").find((c) => c.startsWith(COOKIE_KEY + "="));
  if (!entry) return null;
  const value = entry.split("=")[1];
  if (value === "a" || value === "b" || value === "c") return value;
  return null;
}

function writeVariantCookie(v: Variant) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_KEY}=${v}; path=/; max-age=${COOKIE_TTL_DAYS * 86400}; samesite=lax`;
}

function pickVariant(): Variant {
  const r = Math.random();
  if (r < 1 / 3) return "a";
  if (r < 2 / 3) return "b";
  return "c";
}

async function trackImpression(variant: Variant) {
  try {
    await fetch("/api/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "home_hero_impression",
        event_data: { test: TEST_NAME, variant },
        page: "/",
      }),
      keepalive: true,
    });
  } catch {
    // Silently drop — tracking is best-effort, should never block UX.
  }
}

async function trackClick(variant: Variant, target: string) {
  try {
    await fetch("/api/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "home_hero_click",
        event_data: { test: TEST_NAME, variant, target },
        page: "/",
      }),
      keepalive: true,
    });
  } catch {
    // ignore
  }
}

export default function HomeHero({ brokerCount, listingCount, updatedMonth }: Props) {
  // Lazy-init: read the cookie-picked variant exactly once on first render
  // so setVariant is never called inside the mount effect (the React 19
  // lint rule flags setState-in-effect as a stale-write smell).
  const [variant] = useState<Variant>(() => {
    const existing = readVariantCookie();
    if (existing) return existing;
    const fresh = pickVariant();
    writeVariantCookie(fresh);
    return fresh;
  });

  useEffect(() => {
    // Impression tracking only — the variant itself is already stable.
    void trackImpression(variant);
  }, [variant]);

  // Shared top badge — same across all variants so LCP isn't affected
  const badge = (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-white mb-4">
      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
      Updated {updatedMonth} &middot; {brokerCount}+ platforms &middot; {listingCount || 55}+ investment listings
    </div>
  );

  if (variant === "b") {
    return (
      <div className="max-w-3xl mx-auto text-center">
        {badge}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] mb-4 tracking-tight">
          Find your broker in <span className="text-amber-500">60 seconds</span>
        </h1>
        <p className="text-base md:text-lg text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
          Answer 5 quick questions. We&apos;ll match you to the cheapest Australian
          broker for your trading style — CHESS, SMSF and FX all factored in.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-6 justify-center">
          <Link
            href="/quiz"
            onClick={() => void trackClick("b", "quiz")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
          >
            <Icon name="zap" size={16} />
            Take the 60-second quiz
          </Link>
          <Link
            href="/compare"
            onClick={() => void trackClick("b", "compare")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-200 hover:border-amber-400 text-slate-900 font-semibold rounded-xl text-sm transition-colors"
          >
            Or browse {brokerCount}+ platforms
          </Link>
        </div>
      </div>
    );
  }

  if (variant === "c") {
    return (
      <div className="max-w-3xl mx-auto text-center">
        {badge}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] mb-4 tracking-tight">
          The best Australian brokers, ranked by{" "}
          <span className="text-amber-500">what you save</span>
        </h1>
        <p className="text-base md:text-lg text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
          We calculate the real annual cost of every broker against your
          trading profile — brokerage, FX, inactivity fees — and show the
          top 3 ranked by dollars saved. No sponsored results.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto mb-6 justify-center">
          <Link
            href="/tools/should-i-switch"
            onClick={() => void trackClick("c", "should-i-switch")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
          >
            <Icon name="dollar-sign" size={16} />
            See how much you&apos;d save
          </Link>
          <Link
            href="/compare"
            onClick={() => void trackClick("c", "compare")}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-200 hover:border-amber-400 text-slate-900 font-semibold rounded-xl text-sm transition-colors"
          >
            Compare all {brokerCount}+ brokers
          </Link>
        </div>
      </div>
    );
  }

  // Variant 'a' (control) — preserves the current homepage hero copy.
  return (
    <div className="max-w-3xl mx-auto text-center">
      {badge}
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] mb-4 tracking-tight">
        Compare platforms, professionals{" "}
        <span className="text-amber-500">&amp; ways to invest</span>
      </h1>
      <p className="text-base md:text-lg text-slate-600 mb-8 leading-relaxed max-w-2xl mx-auto">
        Compare fees, browse directories, and explore investment options —
        built for Australians.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-6">
        <Link
          href="/compare"
          onClick={() => void trackClick("a", "compare")}
          className="group flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-400 hover:shadow-lg transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <Icon name="bar-chart-2" size={20} className="text-amber-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Compare Platforms</p>
            <p className="text-[0.65rem] text-slate-500 mt-0.5">{brokerCount}+ platforms &middot; fees &middot; features</p>
          </div>
        </Link>
        <Link
          href="/advisors"
          onClick={() => void trackClick("a", "advisors")}
          className="group flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-400 hover:shadow-lg transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-amber-50 transition-colors">
            <Icon name="users" size={20} className="text-slate-600 group-hover:text-amber-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Browse Professionals</p>
            <p className="text-[0.65rem] text-slate-500 mt-0.5">Planners &middot; brokers &middot; accountants</p>
          </div>
        </Link>
        <Link
          href="/invest"
          onClick={() => void trackClick("a", "invest")}
          className="group flex flex-col items-center gap-2 p-4 bg-white border-2 border-slate-200 rounded-2xl hover:border-amber-400 hover:shadow-lg transition-all"
        >
          <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-amber-50 transition-colors">
            <Icon name="layers" size={20} className="text-slate-600 group-hover:text-amber-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">Explore Investments</p>
            <p className="text-[0.65rem] text-slate-500 mt-0.5">Shares &middot; property &middot; alternatives</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
