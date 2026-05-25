"use client";

import { useState, useCallback } from "react";
import Toast from "@/components/Toast";
import { trackEvent } from "@/lib/tracking";

interface ShareComparisonButtonProps {
  /** Public broker slugs that make up the comparison. */
  brokerSlugs: string[];
  /** Optional label for the share sheet title. */
  name?: string;
  /** Optional extra classes for layout tweaks at the call site. */
  className?: string;
}

/**
 * Share a saved comparison as a deep link.
 *
 * Mirrors the share path in <CompareSaveShareBar/> but works from any surface
 * that already knows the slugs (e.g. the /account/saved list), not just the
 * live /compare selection. The link encodes only public broker slugs via
 * `?ids=`, which CompareClient reads on load to re-pin the same brokers — no
 * personal data, account id, or saved-comparison id is shared.
 *
 * Prefers the native share sheet on mobile, falls back to clipboard, then to a
 * prompt so the link is never lost.
 */
export default function ShareComparisonButton({
  brokerSlugs,
  name,
  className,
}: ShareComparisonButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (brokerSlugs.length === 0) return;

    // CompareClient pins at most 4; keep the link in sync with that cap.
    const ids = brokerSlugs.slice(0, 4).join(",");
    const shareUrl = `${window.location.origin}/compare?ids=${encodeURIComponent(ids)}`;

    trackEvent(
      "saved_comparison_share",
      { count: String(brokerSlugs.length) },
      "/account/saved",
    );

    if (navigator.share) {
      try {
        await navigator.share({
          title: name
            ? `${name} — invest.com.au`
            : "Compare investing platforms — invest.com.au",
          url: shareUrl,
        });
        return;
      } catch {
        // Share sheet dismissed/unavailable — fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      window.prompt("Copy this comparison link:", shareUrl);
    }
  }, [brokerSlugs, name]);

  if (brokerSlugs.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors ${className ?? ""}`}
        title="Copy a shareable link to this comparison"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Share
      </button>

      <Toast
        message="Comparison link copied!"
        visible={copied}
        onDone={() => setCopied(false)}
        icon="copy"
      />
    </>
  );
}
