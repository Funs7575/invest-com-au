"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function TopBar() {
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Auto-collapse after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setCollapsed(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed) return null;

  return (
    <div className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex items-center gap-1 text-xs text-slate-300 flex-wrap">
              <span>Partner-supported.</span>
              <Link
                href="/how-we-earn"
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
              >
                How We Earn
              </Link>
              <span className="hidden sm:inline text-slate-500 mx-1">·</span>
              <Link
                href="/methodology"
                className="hidden sm:inline text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
              >
                Methodology
              </Link>
              <span className="hidden md:inline text-slate-500 mx-1">·</span>
              <span className="hidden md:inline text-slate-400">
                All ratings are independent — never influenced by partners.
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Collapse button */}
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200"
                aria-label="Collapse disclosure bar"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              {/* Dismiss button (mobile only) */}
              <button
                onClick={() => setDismissed(true)}
                className="p-1.5 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-200 sm:hidden"
                aria-label="Dismiss disclosure bar"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between py-1">
            <button
              onClick={() => setCollapsed(false)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Partner-supported ·{" "}
              <span className="text-amber-400">How we earn</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-slate-700 transition-colors text-slate-600 hover:text-slate-400"
              aria-label="Dismiss"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
