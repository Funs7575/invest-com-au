import Icon from "@/components/Icon";

/**
 * "Listed by" sidebar card — surfaces whichever lister identity the
 * listing's key_metrics carries (agency / dealer / brand / operator
 * keys). Renders nothing when no identity is stated; makes no
 * verification claims (the entity-profile layer with its verification
 * ladder is a later, migration-gated phase — see
 * docs/plans/LISTINGS_LOT_EXPERIENCE.md §8).
 */

const LISTER_KEYS = [
  "agency",
  "agent",
  "dealer",
  "broker_name",
  "operator",
  "manager",
  "developer",
  "listed_by",
  "seller_name",
  "brand",
] as const;

export function listerNameFromMetrics(
  km: Record<string, unknown> | null | undefined,
): string | null {
  if (!km) return null;
  for (const key of LISTER_KEYS) {
    const value = km[key];
    if (typeof value === "string" && value.trim().length > 1) {
      return value.trim().slice(0, 80);
    }
  }
  return null;
}

export default function LotListerCard({
  km,
  noun,
}: {
  km: Record<string, unknown> | null | undefined;
  noun: string;
}) {
  const name = listerNameFromMetrics(km);
  if (!name) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
        Listed by
      </p>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
          <p className="text-xs text-slate-500">
            Replies to enquiries about this {noun} go directly to the listing party.
          </p>
        </div>
      </div>
      <a
        href="#enquire"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900"
      >
        Ask a question
        <Icon name="arrow-right" size={12} />
      </a>
    </div>
  );
}
