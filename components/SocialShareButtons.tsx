"use client";

import { useState } from "react";
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
  compact = false,
}: SocialShareButtonsProps) {
  const [copied, setCopied] = useState(false);

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

  const btnBase =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900";

  return (
    <div className="flex items-center gap-2 flex-wrap" aria-label="Share this page">
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
