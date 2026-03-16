"use client";

import { useState } from "react";
import Link from "next/link";

export function TopBar() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
            <span className="font-semibold text-slate-700">Partner-supported.</span>
            <span className="hidden md:inline">All ratings are independent — never influenced by partners.</span>
            <span className="opacity-40 hidden sm:inline mx-0.5">·</span>
            <Link
              href="/how-we-earn"
              className="font-semibold text-amber-600 hover:text-amber-700 transition-colors"
            >
              How We Earn
            </Link>
            <span className="opacity-40 mx-0.5 hidden sm:inline">·</span>
            <Link
              href="/methodology"
              className="hidden sm:inline text-amber-600 hover:text-amber-700 transition-colors"
            >
              Methodology
            </Link>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-md hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
