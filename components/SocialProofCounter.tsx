"use client";

import { useEffect, useState } from "react";

/**
 * Social-proof counter backed by real numbers.
 *
 * The previous implementation fabricated the "X investors compared platforms
 * today" figure from a time-of-day sine curve (killed in #1489 — ACL s18
 * misleading-conduct exposure). This version fetches a genuine trailing-7-day
 * distinct-session count from /api/social-proof and renders NOTHING until the
 * server says the real number clears its minimum threshold. No floor, no
 * synthetic variance — below threshold the element simply doesn't exist.
 */

type Surface = "compare" | "calculator" | "quiz" | "rates";

const COPY: Record<Surface, (n: string) => string> = {
  compare: (n) => `${n} investors compared platforms in the last 7 days`,
  calculator: (n) => `${n} people ran calculations in the last 7 days`,
  quiz: (n) => `${n} investors used the matcher in the last 7 days`,
  rates: (n) => `${n} people checked rates in the last 7 days`,
};

export default function SocialProofCounter({
  variant = "inline",
  surface = "compare",
}: {
  variant?: "inline" | "badge";
  surface?: Surface;
}) {
  const [state, setState] = useState<{ show: boolean; count: number | null } | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/social-proof?surface=${surface}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setState(data);
      })
      .catch(() => {
        /* counter is decorative — fail to nothing */
      });
    return () => {
      active = false;
    };
  }, [surface]);

  if (!state?.show || !state.count) return null;

  const label = COPY[surface](state.count.toLocaleString("en-AU"));

  if (variant === "badge") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.65rem] font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        {label}
      </span>
    );
  }

  return <span className="text-xs text-slate-500">{label}</span>;
}
