import Icon from "@/components/Icon";
import {
  transparencyLevelLabel,
  type LotTransparency as Assessment,
} from "@/lib/listings/lot-transparency";

/**
 * Listing-transparency meter: what this listing states vs what's worth
 * requesting, with a segment bar per check. Buyer-framed completeness —
 * presence of information only, never an opinion on the asset — so it can
 * render on every lot without implying a recommendation.
 */
export default function LotTransparency({ assessment }: { assessment: Assessment }) {
  const stated = assessment.checks.filter((c) => c.met);
  const missing = assessment.checks.filter((c) => !c.met);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Icon name="clipboard-list" size={16} className="text-slate-500" />
          <h2 className="text-base font-bold text-slate-900">Listing transparency</h2>
        </div>
        <span className="text-xs font-semibold text-slate-600">
          {transparencyLevelLabel(assessment.level)} · {assessment.metCount}/{assessment.total}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        How much of the full picture this listing states up front.
      </p>

      <div className="flex gap-1 mb-5" role="img" aria-label={`${assessment.metCount} of ${assessment.total} information checks stated`}>
        {assessment.checks.map((check) => (
          <span
            key={check.id}
            className={`h-1.5 flex-1 rounded-full ${check.met ? "bg-emerald-500" : "bg-slate-200"}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {stated.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Stated in this listing
            </p>
            <ul className="space-y-1.5">
              {stated.map((check) => (
                <li key={check.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <Icon name="check-circle" size={14} className="text-emerald-600 shrink-0" />
                  {check.label}
                </li>
              ))}
            </ul>
          </div>
        )}
        {missing.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Worth requesting
            </p>
            <ul className="space-y-1.5">
              {missing.map((check) => (
                <li key={check.id} className="flex items-center gap-2 text-sm text-slate-500">
                  <Icon name="plus-circle" size={14} className="text-slate-400 shrink-0" />
                  {check.label}
                </li>
              ))}
            </ul>
            <a
              href="#enquire"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900"
            >
              Request these details
              <Icon name="arrow-right" size={12} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
