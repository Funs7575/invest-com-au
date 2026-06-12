"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const KEY = "iv_last_plan";
const MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

/**
 * F4.1 (RETAIL_UX_NORTHSTAR): the action plan used to vanish the moment the
 * user navigated away — re-findable only via an optional email. This chip
 * points at the latest persisted plan from localStorage. Hidden inside the
 * funnel and on the plan page itself.
 */
export default function YourPlanChip({ variant = "chip" }: { variant?: "chip" | "menu-row" }) {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      const stamp = parsed as { token?: unknown; ts?: unknown };
      if (typeof stamp.token !== "string" || typeof stamp.ts !== "number") return;
      if (Date.now() - stamp.ts > MAX_AGE_MS) return;
      const tokenValue = stamp.token;
      raf = requestAnimationFrame(() => setToken(tokenValue));
    } catch {
      /* ignore */
    }
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!token) return null;
  if (pathname?.startsWith("/get-matched") || pathname?.startsWith("/plans/")) return null;

  if (variant === "menu-row") {
    return (
      <Link
        href={`/plans/${token}`}
        className="block w-full py-2.5 min-h-11 text-center text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
      >
        Your action plan →
      </Link>
    );
  }

  return (
    <Link
      href={`/plans/${token}`}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
      Your plan
    </Link>
  );
}
