"use client";

import { useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/tracking";

/**
 * Cross-vertical cross-sell banner shown on /compare.
 *
 * Compare-page users are deep-funnel: they're actively shortlisting two or
 * more platforms in one vertical. That's the moment they're most receptive
 * to a gentle nudge that there's an *adjacent* decision worth queueing up
 * (e.g. someone comparing share brokers very often also has a stale super
 * fund). One line, one CTA, one dismiss — never blocking, never modal.
 *
 * The mapping is intentionally simple and curated, not algorithmic. See
 * CROSS_SELL_MAP below for the rationale.
 */

/**
 * The vertical keys here mirror the `PlatformType` union in
 * `app/compare/CompareClient.tsx`. We don't import that type to keep this
 * component decoupled — the parent passes the current vertical as a string
 * and we look it up here.
 */
export type CrossSellVerticalKey =
  | "shares"
  | "crypto"
  | "super"
  | "robo"
  | "savings"
  | "term-deposits"
  | "property"
  | "cfd"
  | "research";

/**
 * Curated cross-vertical mapping. Picked for "user-stage adjacency", not
 * surface similarity:
 *  - shares → super: someone optimising brokerage often has a forgotten super fund
 *  - super → savings: emergency-fund hygiene comes after super hygiene
 *  - crypto → shares: most crypto-first users still need a core ASX broker
 *  - savings → super: same long-term-money cohort
 *  - robo → super: passive-investor cohort
 *  - term-deposits → savings: cash-management adjacency
 *  - property → super: long-horizon wealth cohort (chosen over shares because
 *    property buyers tend to be older / more super-engaged)
 *  - cfd → shares: traders often hold a long-only ASX account too
 *  - research → shares: research is a means to an end; the end is execution
 */
const CROSS_SELL_MAP: Record<CrossSellVerticalKey, CrossSellVerticalKey> = {
  shares: "super",
  super: "savings",
  crypto: "shares",
  savings: "super",
  robo: "super",
  "term-deposits": "savings",
  property: "super",
  cfd: "shares",
  research: "shares",
};

const DISMISS_KEY_PREFIX = "compare-crosssell-dismissed-";

interface Props {
  /** Currently-selected vertical filter. Banner only renders for non-`all`. */
  vertical: string;
  /** Number of brokers the user has ticked for compare. */
  selectedCount: number;
  /** Map of vertical key → user-facing label, derived from CompareClient's existing config. */
  verticalLabels: Record<string, string>;
}

/**
 * sessionStorage helper. Wrapped so SSR / disabled-storage browsers don't
 * crash the render.
 */
function isDismissed(vertical: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_KEY_PREFIX + vertical) === "1";
  } catch {
    return false;
  }
}

function persistDismiss(vertical: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DISMISS_KEY_PREFIX + vertical, "1");
  } catch {
    // Quota / privacy mode — fail open, banner just stays hidden in-memory
  }
}

export default function CompareCrossSellBanner({
  vertical,
  selectedCount,
  verticalLabels,
}: Props) {
  // Lazy initialiser reads sessionStorage on first render. Avoids a
  // setState-in-effect pattern entirely. SSR returns false (window guard
  // in isDismissed) so the server-rendered HTML matches the most-common
  // client state — banner visible — and only re-renders if the user has
  // actually dismissed in this session.
  const [dismissedThisRender, setDismissedThisRender] = useState<boolean>(
    () => isDismissed(vertical),
  );

  // Look up the target vertical from the curated map. Casting via `in` so
  // we never index with an arbitrary string.
  const target: CrossSellVerticalKey | null =
    vertical in CROSS_SELL_MAP
      ? CROSS_SELL_MAP[vertical as CrossSellVerticalKey]
      : null;

  if (vertical === "all" || target === null || selectedCount < 2) return null;
  if (dismissedThisRender) return null;

  const sourceLabel = verticalLabels[vertical] ?? vertical;
  const targetLabel = verticalLabels[target] ?? target;

  const handleDismiss = () => {
    persistDismiss(vertical);
    setDismissedThisRender(true);
    trackEvent(
      "compare_crosssell_dismiss",
      { source: vertical, target, selected: selectedCount },
      "/compare",
    );
  };

  const handleClick = () => {
    trackEvent(
      "compare_crosssell_click",
      { source: vertical, target, selected: selectedCount },
      "/compare",
    );
  };

  return (
    <div
      role="complementary"
      aria-label={`Suggestion: also compare ${targetLabel}`}
      className="mb-3 md:mb-4 flex items-center justify-between gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-2.5 bg-sky-50 border border-sky-200 rounded-lg md:rounded-xl"
    >
      <p className="text-xs md:text-sm text-sky-900 leading-snug min-w-0">
        Comparing {selectedCount} {sourceLabel.toLowerCase()}? People at this
        stage often also compare{" "}
        <span className="font-semibold">{targetLabel.toLowerCase()}</span>.
      </p>
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <Link
          href={`/compare?filter=${target}`}
          onClick={handleClick}
          className="px-2.5 md:px-3 py-1 md:py-1.5 bg-sky-600 text-white text-[0.69rem] md:text-xs font-bold rounded-md md:rounded-lg hover:bg-sky-700 transition-colors whitespace-nowrap"
        >
          Compare {targetLabel} →
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss suggestion"
          className="w-6 h-6 md:w-7 md:h-7 inline-flex items-center justify-center text-sky-700/60 hover:text-sky-900 hover:bg-sky-100 rounded-md transition-colors text-sm"
        >
          ×
        </button>
      </div>
    </div>
  );
}
