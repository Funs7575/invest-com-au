"use client";

import Link from "next/link";
import { useListingShortlist } from "@/lib/hooks/useListingShortlist";
import Icon from "@/components/Icon";

/**
 * Sticky bottom-of-viewport bar that surfaces the current listing
 * shortlist + "Compare X listings" CTA. Mirrors the violet bar pattern
 * already used by `/advisors` so the two surfaces feel cohesive.
 *
 * Renders nothing when the shortlist is empty so it never blocks
 * content on first paint.
 */
export default function ListingCompareBar() {
  const { count, max, clear } = useListingShortlist();
  if (count === 0) return null;

  const canCompare = count >= 2;
  const compareHref = `/invest/compare`; // slugs read from localStorage by the page

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pointer-events-none">
      <div className="container-custom max-w-5xl pointer-events-auto">
        <div className="rounded-2xl bg-violet-600 text-white shadow-2xl shadow-violet-900/30 px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <Icon name="bookmark-check" size={16} className="text-violet-200 shrink-0" />
            <span className="text-sm font-semibold truncate">
              {count} listing{count !== 1 ? "s" : ""} saved
              {count === 1 && (
                <span className="hidden sm:inline text-violet-200 font-normal"> — save 1 more to compare</span>
              )}
              {count >= max && (
                <span className="hidden sm:inline text-violet-200 font-normal"> · max reached</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={clear}
              className="px-2.5 py-1.5 text-violet-200 text-xs font-semibold hover:text-white transition-colors"
            >
              Clear
            </button>
            {canCompare ? (
              <Link
                href={compareHref}
                className="px-3 py-1.5 bg-white text-violet-700 text-xs font-extrabold rounded-lg hover:bg-violet-50 transition-colors inline-flex items-center gap-1"
              >
                Compare {count}
                <Icon name="arrow-right" size={12} />
              </Link>
            ) : (
              <span className="px-3 py-1.5 bg-white/10 text-violet-100 text-xs font-bold rounded-lg cursor-not-allowed">
                Save 1 more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
