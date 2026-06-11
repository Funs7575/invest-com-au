"use client";

import Link from "next/link";
import type { UseMoneyProfilePrefillReturn } from "@/hooks/use-money-profile";

/**
 * Attribution chip for Money Profile prefill inside calculators.
 *
 *  - status "applied"   → "Prefilled from your Money Profile" + edit link
 *  - status "available" → one-tap "Fill from your Money Profile" button
 *  - idle / anonymous   → renders nothing (zero layout cost for most users)
 */
export default function MoneyProfileChip({
  prefill,
}: {
  prefill: UseMoneyProfilePrefillReturn;
}) {
  if (prefill.status === "idle") return null;

  if (prefill.status === "applied") {
    return (
      <p className="mb-4 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
        <svg
          className="h-3.5 w-3.5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span>
          {prefill.fieldCount} field{prefill.fieldCount === 1 ? "" : "s"} prefilled from
          your Money Profile
        </span>
        <Link
          href="/account/investor-profile"
          className="font-semibold underline underline-offset-2 hover:text-emerald-900"
        >
          Edit profile
        </Link>
      </p>
    );
  }

  return (
    <p className="mb-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
      <span>Your Money Profile can fill {prefill.fieldCount} of these inputs.</span>
      <button
        type="button"
        onClick={prefill.applyNow}
        className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
      >
        Use my numbers
      </button>
    </p>
  );
}
