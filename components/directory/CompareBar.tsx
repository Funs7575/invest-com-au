"use client";

import Link from "next/link";

/**
 * Canonical sticky shortlist + compare bar for directory pages.
 *
 * Renders only when the shortlist has ≥1 item. Tone:
 *   1 item   → "1 saved — save N more to compare" (no compare CTA)
 *   2-max    → "N saved · Compare N →" (action-ready)
 *   at max   → same as above; toggle on an unsaved tile becomes a
 *              no-op silently (the hook caps internally)
 *
 * Visual style aligns with the site's slate/amber palette — the
 * shortlist bar on /advisors used to be bg-violet-600 which broke
 * the design system (recolored in QW6 of the directory UX plan).
 * This primitive bakes in the slate-900 + amber-500 pairing so
 * future consumers don't drift.
 */
export interface CompareBarProps {
  count: number;
  max: number;
  /** Singular noun for "N <noun> saved". E.g. "advisor", "listing". */
  noun: string;
  /** Where the "Compare N" CTA lands. */
  compareHref: string;
  /** Where "View saved" lands (typically a list page like /shortlist/advisors). */
  viewHref?: string;
  className?: string;
}

export default function CompareBar({
  count,
  max,
  noun,
  compareHref,
  viewHref,
  className = "",
}: CompareBarProps) {
  if (count <= 0) return null;
  const plural = count === 1 ? "" : "s";
  return (
    <div className={`sticky top-16 z-30 mb-3 ${className}`}>
      <div
        role="region"
        aria-label="Comparison shortlist"
        className="bg-slate-900 text-white rounded-xl px-4 py-2.5 flex items-center justify-between shadow-lg shadow-slate-300"
      >
        <span className="text-sm font-semibold">
          {count} {noun}
          {plural} saved
          {count === 1 && (
            <span className="text-slate-300 font-normal">
              {" "}
              — save 1 more to compare
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {viewHref && (
            <Link
              href={viewHref}
              className="px-3 py-1.5 text-slate-300 text-xs font-semibold hover:text-white transition-colors"
            >
              View saved
            </Link>
          )}
          {count >= 2 ? (
            <Link
              href={compareHref}
              className="px-3 py-1.5 bg-amber-500 text-slate-900 text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors"
            >
              Compare {count} &rarr;
            </Link>
          ) : (
            <span className="text-xs text-slate-400">
              {max - count} more to compare
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
