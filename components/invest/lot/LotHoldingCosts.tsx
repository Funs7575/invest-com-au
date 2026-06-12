import Icon from "@/components/Icon";
import type { LotProfile } from "@/lib/listings/lot-profile";
import type { VerticalIntel } from "@/lib/listings/vertical-intel";

/**
 * "What it costs to hold" — the honesty panel alt-asset sellers usually
 * skip. Structured `holding_costs[]` from the listing render as itemised
 * rows; otherwise the vertical's typical-cost lines render with an
 * explicit "ask for the full schedule" nudge, clearly labelled as
 * class-level guidance rather than this asset's figures.
 */
export default function LotHoldingCosts({
  profile,
  intel,
}: {
  profile: LotProfile;
  intel: VerticalIntel;
}) {
  const hasStated = profile.holdingCosts.length > 0;
  if (!hasStated && intel.typicalCosts.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="dollar-sign" size={16} className="text-slate-500" />
        <h2 className="text-base font-bold text-slate-900">What it costs to hold</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        {hasStated
          ? "Ongoing costs stated by the seller."
          : `Typical ongoing costs for ${intel.noun === "opportunity" ? "this asset class" : `a ${intel.noun} like this`} — the seller hasn't itemised costs for this listing.`}
      </p>

      {hasStated ? (
        <ul className="divide-y divide-slate-100">
          {profile.holdingCosts.map((cost, i) => (
            <li key={`${cost.label}-${i}`} className="flex items-baseline justify-between gap-4 py-2">
              <div className="min-w-0">
                <p className="text-sm text-slate-800">{cost.label}</p>
                {cost.note && <p className="text-xs text-slate-500">{cost.note}</p>}
              </div>
              {cost.amount && (
                <p className="text-sm font-bold text-slate-900 whitespace-nowrap">{cost.amount}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {intel.typicalCosts.map((line) => (
            <li key={line} className="flex gap-2.5 text-sm text-slate-700">
              <Icon name="dollar-sign" size={14} className="text-slate-400 shrink-0 mt-0.5" />
              {line}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-slate-400">
        {hasStated
          ? "Confirm every figure independently before committing."
          : "General guide only — "}
        {!hasStated && (
          <a href="#enquire" className="font-semibold text-amber-700 hover:text-amber-900">
            ask the seller for the full cost schedule
          </a>
        )}
        {!hasStated && "."}
      </p>
    </div>
  );
}
