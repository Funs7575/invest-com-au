import Icon from "@/components/Icon";
import { badgeToneFor, type ProviderOutcomeBadge } from "@/lib/outcomes/profile-display";

/**
 * Outcome score badge — shown inline on provider profile pages.
 * Derived from the N4 outcome-flywheel scoreboard. Compliance copy:
 * "completion rate based on consumer reviews" — passive, no advice.
 */

interface Props {
  badge: ProviderOutcomeBadge;
}

const TONE_CLASSES: Record<"emerald" | "amber" | "slate", string> = {
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  slate: "bg-slate-50 border-slate-200 text-slate-700",
};

export default function OutcomeBadge({ badge }: Props) {
  const pct = badge.completion_rate_pct;
  if (pct === null || pct === undefined) return null;
  const tone = TONE_CLASSES[badgeToneFor(pct)];

  return (
    <div
      className={`inline-flex items-center gap-2 ${tone} border rounded-full px-3 py-1`}
      aria-label={`Completion rate ${pct}% based on ${badge.outcomes_submitted} consumer reviews`}
    >
      <Icon name="check-circle" size={12} />
      <span className="text-xs font-bold">{pct}% completed</span>
      <span className="text-[10px] opacity-70">
        · {badge.outcomes_submitted} review{badge.outcomes_submitted === 1 ? "" : "s"}
      </span>
    </div>
  );
}
