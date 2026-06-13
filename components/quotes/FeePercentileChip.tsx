"use client";

import { useId, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { FeePercentileInfo } from "@/lib/fee-benchmark";

/** "35" → "35th" — display percentiles are multiples of 5, so "th" suffices,
 *  but keep the general ordinal rule for safety. */
function ordinalLabel(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

/**
 * Neutral, factual price-context chip for one quote: "Around the 35th
 * percentile for SMSF Accountant quotes in NSW". Renders only when the
 * matching benchmark cell met the minimum sample (the server decides —
 * this component just displays what it is given). Never judges a price
 * as good or bad.
 */
export default function FeePercentileChip({ info }: { info: FeePercentileInfo }) {
  const [open, setOpen] = useState(false);
  const noteId = useId();

  const scope = info.stateUsed ? `in ${info.stateUsed}` : "nationally";
  const months = Math.round(info.windowDays / 30.4);

  return (
    <div className="mt-2" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={noteId}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
      >
        <Icon name="percent" size={11} className="text-slate-500" aria-hidden="true" />
        <span>
          Around the {ordinalLabel(info.percentile)} percentile for {info.typeLabel} quotes {scope}
        </span>
        <Icon name="info" size={11} className="text-slate-500" aria-hidden="true" />
      </button>
      <div
        id={noteId}
        role="note"
        hidden={!open}
        className="mt-1.5 max-w-md rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] leading-relaxed text-slate-600 shadow-sm"
      >
        Based on {info.sampleSize} {info.typeLabel} quotes submitted {scope} on Invest.com.au
        in the last {months} months. A lower percentile means a lower quoted price — it says
        nothing about quality or fit. General information only, not a recommendation.{" "}
        <Link href="/advice-fees" className="font-semibold text-slate-700 underline hover:text-slate-900">
          See all fee benchmarks
        </Link>
      </div>
    </div>
  );
}
