import { AFFILIATE_REL } from "@/lib/tracking";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import type { CrossBorderPartner } from "@/lib/foreign-investment-country-data";

/**
 * Cross-border partner panel for the foreign-investment country pages.
 * Renders a grid of vetted remittance/FX, non-resident-mortgage and FIRB
 * legal partners as affiliate cards. FIN_NOTEBOOK #24 Phase B — corridors
 * spend on FX + non-resident mortgages + FIRB lawyers long before they
 * convert to an advisor lead, so this captures upstream commission.
 *
 * Compliance: every CTA carries the affiliate `rel`
 * ("noopener noreferrer nofollow sponsored") and the panel footer renders
 * the canonical advertiser disclosure. Promoted/commercial — never
 * presented as editorial ranking.
 *
 * Server-safe (links only, no client interactivity). The parent only
 * renders this when `partners.length > 0`.
 */

const CATEGORY_LABELS: Record<CrossBorderPartner["category"], string> = {
  remittance: "Money transfer",
  fx: "FX & multi-currency",
  mortgage: "Non-resident mortgage",
  legal: "FIRB & legal",
};

const CATEGORY_BADGE: Record<CrossBorderPartner["category"], string> = {
  remittance: "bg-emerald-100 text-emerald-700",
  fx: "bg-blue-100 text-blue-700",
  mortgage: "bg-amber-100 text-amber-700",
  legal: "bg-violet-100 text-violet-700",
};

export default function CrossBorderPartnerPanel({
  partners,
}: {
  partners: ReadonlyArray<CrossBorderPartner>;
}) {
  if (partners.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map((p) => (
          <div
            key={p.slug}
            className="flex flex-col border border-slate-200 rounded-xl p-4 hover:border-amber-300 hover:bg-amber-50/20 transition-all"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-semibold text-sm text-slate-800">{p.name}</span>
              <span
                className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${CATEGORY_BADGE[p.category]}`}
              >
                {CATEGORY_LABELS[p.category]}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-2">{p.tagline}</p>
            <p className="text-sm text-slate-700 leading-relaxed flex-1">{p.benefit}</p>
            <a
              href={p.href}
              target="_blank"
              rel={AFFILIATE_REL}
              data-partner={p.slug}
              className="mt-3 inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-4 py-2.5 rounded-lg transition-colors"
            >
              {p.ctaLabel} &rarr;
            </a>
            {p.note ? <p className="mt-2 text-[11px] text-slate-500 leading-snug">{p.note}</p> : null}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{ADVERTISER_DISCLOSURE_SHORT}</p>
    </div>
  );
}
