"use client";

import Icon from "@/components/Icon";
import type { BundledPriceEstimate } from "@/lib/expert-teams/pricing";
import { formatBundledPrice } from "@/lib/expert-teams/pricing";

/**
 * Bundled price preview card — renders the estimated cost range for a
 * full-stack engagement with this Pro Squad. Hidden when fewer than
 * 50% of members have published hourly rates (compliance + UX: don't
 * mislead with a half-empty range).
 *
 * Compliance: framed as "typical engagement range" — passive,
 * informational. Not personal advice; not a quote.
 */

interface Props {
  estimate: BundledPriceEstimate;
}

export default function BundledPricePreview({ estimate }: Props) {
  // Only render when at least half the squad has published rates.
  const formatted = formatBundledPrice(estimate);
  if (!formatted || estimate.pricedCount < Math.ceil(estimate.memberCount / 2)) {
    return null;
  }

  return (
    <section className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-5 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
          <Icon name="dollar-sign" size={20} className="text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-widest font-bold text-amber-700 mb-1">
            Typical bundled engagement
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
            {formatted}
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Range based on each squad member&apos;s published hourly rate × typical engagement hours.
            Final quote depends on scope — get a Match Request for an exact price.
          </p>
        </div>
      </div>
    </section>
  );
}
