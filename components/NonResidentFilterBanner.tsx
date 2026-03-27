"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface Props {
  /** Total brokers shown on the page */
  total: number;
  /** How many accept non-residents */
  nonResidentCount: number;
  /** Vertical — so we can link to the right foreign-investment sub-page */
  vertical?: "shares" | "crypto" | "savings" | "cfd";
}

const VERTICAL_LINKS: Record<string, string> = {
  shares: "/foreign-investment/shares",
  crypto: "/foreign-investment/crypto",
  savings: "/foreign-investment/savings",
  cfd: "/foreign-investment/shares",
};

export default function NonResidentFilterBanner({ total, nonResidentCount, vertical = "shares" }: Props) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || nonResidentCount === 0) return null;

  const href = VERTICAL_LINKS[vertical] || "/foreign-investment";

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-start gap-3">
      <span className="text-xl leading-none mt-0.5 shrink-0">🌏</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-blue-900 mb-1">
          Based outside Australia? Only {nonResidentCount} of {total} platforms accept non-residents.
        </p>
        <p className="text-xs text-blue-700 mb-2">
          Many Australian brokers require an Australian address or residential status. See our filtered guide showing only platforms that accept international applicants.
        </p>
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Icon name="filter" size={13} />
          Show non-resident friendly platforms only →
        </Link>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-blue-400 hover:text-blue-600 transition-colors shrink-0 mt-0.5"
      >
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
