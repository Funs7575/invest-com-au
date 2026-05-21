"use client";

import { useState, useCallback } from "react";
import SaveComparisonButton from "@/components/SaveComparisonButton";
import Toast from "@/components/Toast";
import { trackEvent } from "@/lib/tracking";

interface CompareSaveShareBarProps {
  /** Currently pinned broker slugs (the user's shortlist). */
  selectedSlugs: string[];
  /** Optional quiz signals carried alongside the comparison when saved. */
  quizResults?: Record<string, unknown> | null;
}

/**
 * Save + Share affordances for the /compare shortlist.
 *
 * - "Save" reuses <SaveComparisonButton/> (authed users persist to
 *   user_saved_comparisons via /api/saved-comparisons; RLS-scoped to auth.uid()).
 * - "Share" copies a deep link to the *current selection* using ?ids=, which
 *   CompareClient reads on load to re-pin the same brokers. No personal data is
 *   shared — the link only encodes public broker slugs.
 *
 * Both actions only render once the user has pinned at least 2 brokers, mirroring
 * the side-by-side comparison threshold used elsewhere in the compare flow.
 */
export default function CompareSaveShareBar({
  selectedSlugs,
  quizResults,
}: CompareSaveShareBarProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;

    // Build a clean share URL: preserve the user's filter/sort context already
    // on the URL, but force ?ids= to the current pinned shortlist so the
    // recipient lands on exactly these brokers.
    const url = new URL(window.location.href);
    url.searchParams.set("ids", selectedSlugs.slice(0, 4).join(","));
    const shareUrl = url.toString();

    trackEvent(
      "compare_share",
      { count: String(selectedSlugs.length) },
      "/compare",
    );

    // Prefer the native share sheet on mobile; fall back to clipboard.
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Compare investing platforms — invest.com.au",
          url: shareUrl,
        });
        return;
      } catch {
        // User dismissed the share sheet, or it's unavailable — fall through
        // to the clipboard path so the action still does something useful.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context / permissions) — surface the URL
      // via prompt as a last resort so the link is never lost.
      window.prompt("Copy this comparison link:", shareUrl);
    }
  }, [selectedSlugs]);

  if (selectedSlugs.length < 2) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <SaveComparisonButton
          brokerSlugs={selectedSlugs}
          quizResults={quizResults}
        />
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          title="Copy a shareable link to this comparison"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Share
        </button>
      </div>

      <Toast
        message="Comparison link copied!"
        visible={copied}
        onDone={() => setCopied(false)}
        icon="copy"
      />
    </>
  );
}
