import Icon from "@/components/Icon";
import type { SquadTierBadge as SquadTierBadgeData } from "@/lib/expert-teams/badge-tier";

/**
 * Visual badge for a Pro Squad's verification tier (Bronze / Silver /
 * Gold). Shown inline on the team profile page and as a filter chip on
 * /advisors#expert-teams.
 *
 * Compliance: "verification tier based on team composition + outcomes"
 * — passive, no advice.
 */

interface Props {
  badge: SquadTierBadgeData;
  /** When true, render the "what's next" upgrade tooltip beneath the
   *  badge. Default false (clean inline display). */
  showUpgradeHint?: boolean;
}

const TONE_CLASSES: Record<"amber" | "slate" | "yellow", string> = {
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  slate: "bg-slate-100 border-slate-300 text-slate-700",
  yellow: "bg-yellow-50 border-yellow-300 text-yellow-800",
};

const TONE_ICON: Record<"amber" | "slate" | "yellow", string> = {
  amber: "award",
  slate: "shield-check",
  yellow: "trophy",
};

export default function SquadTierBadge({ badge, showUpgradeHint = false }: Props) {
  const tone = TONE_CLASSES[badge.tone];
  return (
    <div>
      <div
        className={`inline-flex items-center gap-1.5 ${tone} border rounded-full px-3 py-1`}
        aria-label={badge.label}
      >
        <Icon name={TONE_ICON[badge.tone]} size={12} />
        <span className="text-xs font-bold">{badge.label}</span>
      </div>
      {showUpgradeHint && badge.nextStep && (
        <p className="text-[11px] text-slate-500 mt-1.5">
          {badge.nextStep}
        </p>
      )}
    </div>
  );
}
