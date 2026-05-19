import Link from "next/link";
import { getCrossBorderCta } from "@/lib/cross-border-cta";

/**
 * Country-aware "Talk to a specialist" CTA for cross-border surfaces.
 *
 * Renders a prominent CTA that deep-links into /find-advisor with both
 * `?specialty=` and `?country=` populated so the lead carries its
 * cross-border context all the way to the matcher (and the 1.75× premium
 * pricing tier in `lib/advisor-billing-multipliers.ts`).
 *
 * Returns null when the country slug has no mapping in
 * `lib/cross-border-cta.ts` — caller decides whether to render a generic
 * fallback CTA in that case.
 *
 * Style matches the existing slate-gradient CTA band already used by
 * `app/foreign-investment/from/[country]/page.tsx` so the section reads
 * as a tightening of the existing pattern, not a new one.
 */

export interface CrossBorderAdvisorCTAProps {
  /**
   * Country slug — ISO alpha-2 lowercased ("gb", "us"...), the rich-hub
   * directory name ("united-kingdom"...), or the colloquial alias ("uk").
   * See `lib/cross-border-cta.ts` for the full accepted list.
   */
  countrySlug: string;
  /**
   * Optional secondary action rendered as a ghost button to the right of
   * the primary CTA. Use this to keep the existing "back to hub" link
   * alongside the specialty CTA without losing it.
   */
  secondaryHref?: string;
  /** Secondary button label — required when `secondaryHref` is provided. */
  secondaryLabel?: string;
}

export default function CrossBorderAdvisorCTA({
  countrySlug,
  secondaryHref,
  secondaryLabel,
}: CrossBorderAdvisorCTAProps) {
  const cta = getCrossBorderCta(countrySlug);
  if (!cta) return null;

  return (
    <section
      className="py-10 bg-gradient-to-br from-slate-900 to-slate-800"
      data-testid="cross-border-advisor-cta"
    >
      <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-white mb-1">{cta.ctaLabel}</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{cta.ctaSub}</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            href={cta.href}
            data-specialty={cta.specialty ?? ""}
            data-country={cta.countryParam}
            className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
          >
            {cta.specialty ? "Find a specialist" : "Find an advisor"}
          </Link>
          {secondaryHref && secondaryLabel && (
            <Link
              href={secondaryHref}
              className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
