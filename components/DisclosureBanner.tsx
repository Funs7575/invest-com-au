"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ADVERTISER_DISCLOSURE,
  ADVERTISER_DISCLOSURE_SHORT,
} from "@/lib/compliance";

export default function DisclosureBanner({
  variant = "inline",
}: {
  variant?: "header" | "inline" | "footer";
}) {
  const [expanded, setExpanded] = useState(false);

  const [dismissed, setDismissed] = useState(false);

  if (variant === "header") {
    if (dismissed) return null;
    return (
      <div className="bg-slate-50 border-b border-slate-200 py-1 md:py-2 text-center text-[0.6rem] md:text-xs text-slate-400 md:text-slate-500">
        <div className="container-custom flex items-center justify-center gap-2">
          {/* Mobile: short one-liner + dismiss */}
          <span className="md:hidden">
            Partner-supported.{" "}
            <Link href="/how-we-earn" className="text-blue-700 underline">Learn more</Link>
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="md:hidden text-slate-300 p-0.5"
            aria-label="Dismiss"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <span className="hidden md:inline">
            {ADVERTISER_DISCLOSURE_SHORT}{" "}
            <Link
              href="/how-we-earn"
              className="text-blue-700 hover:text-blue-800 underline transition-colors"
            >
              How we earn
            </Link>
            {" · "}
            <Link
              href="/methodology"
              className="text-blue-700 hover:text-blue-800 underline transition-colors"
            >
              Methodology
            </Link>
          </span>
        </div>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <p className="text-xs text-slate-400 leading-relaxed">
        <strong className="text-slate-300">Advertiser Disclosure:</strong>{" "}
        {ADVERTISER_DISCLOSURE}
      </p>
    );
  }

  // "inline" variant — expandable
  return (
    <div className="text-xs text-slate-500 leading-relaxed">
      <span>{ADVERTISER_DISCLOSURE_SHORT}</span>{" "}
      <button
        onClick={() => setExpanded(!expanded)}
        className="underline hover:text-slate-600 transition-colors"
      >
        {expanded ? "Less" : "More"}
      </button>
      {expanded && (
        <span className="block mt-1 text-slate-500">
          {ADVERTISER_DISCLOSURE}{" "}
          <Link
            href="/how-we-earn"
            className="text-blue-700 hover:text-blue-800 underline"
          >
            How we earn
          </Link>
        </span>
      )}
    </div>
  );
}
