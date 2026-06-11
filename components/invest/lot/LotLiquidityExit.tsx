import Icon from "@/components/Icon";
import type { LotProfile } from "@/lib/listings/lot-profile";
import type { VerticalIntel } from "@/lib/listings/vertical-intel";

/**
 * "Getting your money out" — honest liquidity + exit paths. The
 * differentiating panel: comparison platforms compare the way in; this
 * states the way out. Listing-level `typical_time_to_sell` /
 * `liquidity_note` win over the vertical's class-level narrative.
 */
export default function LotLiquidityExit({
  profile,
  intel,
}: {
  profile: LotProfile;
  intel: VerticalIntel;
}) {
  const narrative = profile.liquidityNote ?? intel.liquidity;
  if (!narrative && !profile.timeToSell && intel.exitPaths.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="arrow-left-right" size={16} className="text-slate-500" />
        <h2 className="text-base font-bold text-slate-900">Getting your money out</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Liquidity and exit, stated plainly.
      </p>

      {profile.timeToSell && (
        <div className="mb-4 inline-flex items-baseline gap-2 rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Typical time to sell
          </span>
          <span className="text-lg font-extrabold text-slate-900">{profile.timeToSell}</span>
        </div>
      )}

      {narrative && <p className="text-sm text-slate-700 mb-4">{narrative}</p>}

      {intel.exitPaths.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Realistic exit paths
          </p>
          <ul className="space-y-1.5">
            {intel.exitPaths.map((path) => (
              <li key={path} className="flex items-center gap-2 text-sm text-slate-700">
                <Icon name="arrow-right" size={13} className="text-amber-600 shrink-0" />
                {path}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        General guidance for the asset class — actual timeframes and options vary by asset and market conditions.
      </p>
    </div>
  );
}
