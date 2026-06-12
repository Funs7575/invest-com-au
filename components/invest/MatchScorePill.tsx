"use client";

import { useState } from "react";
import Link from "next/link";
import BottomSheet from "@/components/BottomSheet";
import { RISK_WARNING_CTA } from "@/lib/compliance";
import { trackEvent } from "@/lib/tracking";

interface MatchScorePillProps {
  score: number;
  /** Factual matched-criteria lines from `computeMatchBreakdown`. When
   *  empty/absent the pill renders as a static badge. */
  reasons?: string[] | null;
}

/**
 * The listing match-score pill (Northstar D11 — every score explains
 * itself). Tap opens a sheet with the factual matched criteria and the
 * profile link that sharpens future scores. Lives inside Link-wrapped
 * cards, so the click never bubbles into navigation; the sheet itself is
 * portalled to <body> by BottomSheet.
 */
export default function MatchScorePill({ score, reasons }: MatchScorePillProps) {
  const [open, setOpen] = useState(false);
  const hasReasons = !!reasons && reasons.length > 0;

  if (!hasReasons) {
    return (
      <span className="iv2-pill absolute bottom-1.5 left-1.5 bg-emerald-500 text-white" style={{ fontSize: "10px" }}>
        {score}% match
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
          trackEvent("score_reasons_opened", { surface: "listing_card", score });
        }}
        aria-label={`${score}% match — see why`}
        className="iv2-pill absolute bottom-1.5 left-1.5 bg-emerald-500 text-white transition-colors hover:bg-emerald-600"
        style={{ fontSize: "10px" }}
      >
        {score}% match
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={`Why ${score}% match`}>
        <ul className="space-y-2">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
              <svg
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {reason}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Factual comparison against your stated profile. {RISK_WARNING_CTA}
        </p>
        <Link
          href="/account/investor-profile"
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Add profile detail → sharper matching
        </Link>
      </BottomSheet>
    </>
  );
}
