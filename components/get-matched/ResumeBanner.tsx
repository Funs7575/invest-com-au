"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import {
  clearPartialPlan,
  describePartial,
  getPartialPlan,
  type PartialPlan,
} from "@/lib/getmatched/recall";

/**
 * Drop-off rescue banner. Shown on the homepage + /get-matched first
 * load when a partial plan exists in sessionStorage. Pure client-side —
 * no DB hit, no auth gate.
 */

export default function ResumeBanner() {
  const [plan, setPlan] = useState<PartialPlan | null>(null);

  useEffect(() => {
    // Read sessionStorage once on mount. Can't use a state initializer
    // because `window` is undefined during SSR. Cascading-render warning
    // doesn't apply here — single read, no listening.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlan(getPartialPlan());
  }, []);

  if (!plan) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
      <div className="flex-1 min-w-0 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Icon name="rotate-ccw" size={18} className="text-amber-700" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">Welcome back</p>
          <p className="text-xs sm:text-sm text-slate-600">
            Your action plan is half-built — {describePartial(plan)}. Pick up where you left off.
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          href="/get-matched"
          className="inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs sm:text-sm px-4 py-2 rounded-lg"
        >
          Continue <Icon name="arrow-right" size={12} />
        </Link>
        <button
          type="button"
          onClick={() => {
            clearPartialPlan();
            setPlan(null);
          }}
          className="text-xs sm:text-sm text-slate-500 hover:text-slate-700 font-semibold px-3 py-2"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
