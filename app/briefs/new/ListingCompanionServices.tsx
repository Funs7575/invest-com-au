"use client";

import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * Listing-side companion services strip.
 *
 * Shown on /briefs/new when the user picks a listing-side template
 * (`listing` or `listing_readiness`). Selling an opportunity rarely
 * happens in isolation — the user usually needs a transaction lawyer,
 * an accountant for tax structuring, and an independent valuer at
 * minimum. We surface these cross-sells *while the user is still
 * deciding* rather than after, so they can fold them into their plan.
 *
 * Each card deep-links to a filtered /advisors page or a dedicated
 * Get Matched flow so the user picks the right provider without having
 * to re-explain their context.
 */

interface CompanionService {
  label: string;
  description: string;
  href: string;
  icon: string;
}

const COMPANION_SERVICES: CompanionService[] = [
  {
    label: "Transaction lawyer",
    description: "Contract drafting, settlement, structuring.",
    href: "/advisors?type=lawyer",
    icon: "scale",
  },
  {
    label: "Tax / accounting",
    description: "CGT planning, structure review, post-sale tax.",
    href: "/advisors?type=accountant",
    icon: "calculator",
  },
  {
    label: "Independent valuation",
    description: "Defensible price for negotiations + DD pack.",
    href: "/advisors?type=valuer",
    icon: "trending-up",
  },
  {
    label: "Listing readiness coach",
    description: "Pitch deck, due-diligence pack, buyer comms.",
    href: "/get-matched?goal=listing_readiness",
    icon: "file-text",
  },
];

export default function ListingCompanionServices() {
  return (
    <section className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">
        Companion services
      </p>
      <h3 className="text-base font-bold text-slate-900 mb-1">
        Have you considered…?
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Selling rarely happens in isolation. Verified professionals you may want lined up alongside your listing.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {COMPANION_SERVICES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-3.5 hover:border-amber-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Icon
              name={s.icon}
              size={18}
              className="text-slate-400 group-hover:text-amber-600 shrink-0 mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {s.label}
              </p>
              <p className="text-xs text-slate-500 leading-snug">
                {s.description}
              </p>
            </div>
            <Icon
              name="arrow-right"
              size={14}
              className="text-slate-300 group-hover:text-amber-500 shrink-0 mt-1"
            />
          </Link>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-3">
        These are optional — your Listing Brief still works on its own. Pick any of the above before, during, or after you submit it.
      </p>
    </section>
  );
}
