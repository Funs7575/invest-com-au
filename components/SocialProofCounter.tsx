"use client";

import { useEffect, useState } from "react";
import type { SocialProofMetric } from "@/lib/social-proof";

/**
 * Social-proof counter — REAL aggregates only.
 *
 * The original implementation fabricated the "X investors compared
 * platforms today" figure from a time-of-day sine curve (fake social
 * proof on revenue pages — ACL s18 misleading-conduct exposure). It was
 * disabled to render nothing, and is now re-enabled against a real
 * source: GET /api/social-proof computes a daily-cached aggregate from
 * `analytics_events` (lib/social-proof.ts) and only reports a figure at
 * or above SOCIAL_PROOF_MIN_COUNT.
 *
 * Honesty contract:
 *   - The label is rendered verbatim from the server (single source of
 *     phrasing in lib/social-proof.ts) — this component never invents,
 *     extrapolates, or animates a number.
 *   - Below the visibility floor / while loading / on any error it
 *     renders nothing at all (no DOM node → zero layout shift).
 *
 * `variant="inline"` is used in dotted meta rows (·-separated). When
 * visible it renders its own trailing separator so the row reads
 * cleanly in both states — call sites must NOT add a separator after it.
 */
export default function SocialProofCounter({
  variant = "inline",
  metric = "compare",
}: {
  variant?: "inline" | "badge";
  metric?: SocialProofMetric;
}) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/social-proof?metric=${metric}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { show?: boolean; label?: unknown } | null) => {
        if (!cancelled && data?.show === true && typeof data.label === "string" && data.label) {
          setLabel(data.label);
        }
      })
      .catch(() => {
        // Fail closed — no counter is better than a wrong one.
      });
    return () => {
      cancelled = true;
    };
  }, [metric]);

  // Hidden state (below threshold / loading / error): no DOM at all.
  if (!label) return null;

  if (variant === "badge") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
        <svg
          className="h-3.5 w-3.5 text-slate-400"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
        {label}
      </span>
    );
  }

  return (
    <>
      <span className="flex items-center gap-1.5">
        <svg
          className="h-3 w-3 text-slate-400"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
        {label}
      </span>
      <span className="text-slate-300" aria-hidden="true">
        ·
      </span>
    </>
  );
}
