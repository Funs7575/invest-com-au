import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * Homepage hero — pre-launch posture: variant B (quiz-heavy) is forced.
 *
 * The 3-variant A/B test (a control, b quiz-heavy, c value-first) is
 * intentionally paused until launch traffic is real. Pre-launch the
 * cohort sizes are too small for statistical significance, founder
 * navigation contaminates the dataset, and the 30-day cookie pinning
 * means launch-window cohorts inherit pre-launch buckets.
 *
 * To re-enable post-launch:
 *   1. Restore the original implementation from
 *      `components/HomeHero.tsx` at commit 9d82f401 (the N-stream merge
 *      that introduced the test).
 *   2. Re-add `"use client"` directive at the top.
 *   3. Re-import `useEffect`, `useState` from "react".
 *   4. Wire `/api/track-event` payloads (still active — the route
 *      doesn't need to change).
 *   5. Verify `_inv_ab_home_hero_v1` cookie behaviour against staging
 *      before flipping production.
 *
 * Current rendering matches variant B from the original test:
 *   "Find your broker in 60 seconds" + "Take the 60-second quiz" CTA
 *   + secondary "Or browse N+ platforms" link.
 *
 * `brokerCount`, `listingCount`, `updatedMonth` are still required
 * props (callsite hasn't changed) so the post-launch re-enable is a
 * pure component-internal swap.
 */

interface Props {
  brokerCount: number;
  listingCount: number;
  updatedMonth: string;
}

export default function HomeHero({ brokerCount, listingCount, updatedMonth }: Props) {
  return (
    <div className="max-w-3xl mx-auto text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-white mb-4">
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
        Updated {updatedMonth} &middot; {brokerCount}+ platforms &middot; {listingCount || 55}+ investment listings
      </div>
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
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
        >
          <Icon name="zap" size={16} />
          Take the 60-second quiz
        </Link>
        <Link
          href="/compare"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-slate-200 hover:border-amber-400 text-slate-900 font-semibold rounded-xl text-sm transition-colors"
        >
          Or browse {brokerCount}+ platforms
        </Link>
      </div>
    </div>
  );
}
