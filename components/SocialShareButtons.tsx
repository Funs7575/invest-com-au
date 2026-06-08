"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

export interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  compact?: boolean;
}

export default function SocialShareButtons({
  url,
  title,
  description,
  compact = false,
}: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  // ADV-014: only offer the native share sheet when the browser supports it.
  // Detected after mount to avoid an SSR/CSR hydration mismatch.
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    // Client-only capability check; must run post-mount to keep SSR/CSR markup
    // identical (server can't know about navigator.share).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot capability detection after hydration
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title, text: description, url });
    } catch {
      // User dismissed the share sheet, or share failed — no-op.
    }
  }

  const btnBase =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 min-h-9 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900";

  return (
    <div className="flex items-center gap-2 flex-wrap" aria-label="Share this page">
      {canNativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className={btnBase}
          aria-label="Share"
        >
          <Icon name="share-2" size={13} className="shrink-0" />
          {!compact && <span>Share</span>}
        </button>
      )}
      <a
        href={twitterHref}
        target="_blank"
        rel="noopener noreferrer"
        className={btnBase}
        aria-label="Share on X (Twitter)"
      >
        <Icon name="twitter" size={13} className="shrink-0" />
        {!compact && <span>Share</span>}
      </a>

      <a
        href={linkedinHref}
        target="_blank"
        rel="noopener noreferrer"
        className={btnBase}
        aria-label="Share on LinkedIn"
      >
        <Icon name="linkedin" size={13} className="shrink-0" />
        {!compact && <span>LinkedIn</span>}
      </a>

      <button
        type="button"
        onClick={handleCopy}
        className={`${btnBase} ${copied ? "border-teal-300 bg-teal-50 text-teal-700" : ""}`}
        aria-label={copied ? "Link copied" : "Copy link"}
      >
        <Icon name={copied ? "check" : "copy"} size={13} className="shrink-0" />
        {!compact && <span>{copied ? "Copied!" : "Copy link"}</span>}
      </button>
    </div>
  );
}
