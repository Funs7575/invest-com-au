"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

/**
 * Copy-link button on /account/plans/[id]. The owner gets a public
 * read-only URL (/plans/[share_token]) they can pass to a partner /
 * adviser / family member to look over before turning it into a
 * Match Request.
 */
export default function SharePlanButton({ shareToken }: { shareToken: string }) {
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://invest.com.au";
  const url = `${baseUrl}/plans/${shareToken}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setShowUrl(true);
    }
  }

  return (
    <div className="inline-flex flex-col gap-1.5">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm px-4 py-2.5 rounded-lg"
      >
        <Icon name={copied ? "check" : "link"} size={14} />
        {copied ? "Link copied" : "Share plan"}
      </button>
      {showUrl && (
        <input
          type="text"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="text-xs text-slate-600 border border-slate-200 rounded px-2 py-1 max-w-xs"
        />
      )}
    </div>
  );
}
