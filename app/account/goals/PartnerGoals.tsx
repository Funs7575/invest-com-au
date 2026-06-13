import { projectGoal } from "@/lib/goals/project";
import AttributionChip from "@/components/household/AttributionChip";

/**
 * PartnerGoals — read-only render of the goals your household partner shares.
 * Server component: partner goals are never editable here (sharing grants READ
 * only), so there's no client state. Mirrors the GoalCard projection display.
 */

export interface PartnerGoalRow {
  id: number;
  label: string;
  goalType: string;
  targetCents: number;
  targetDate: string;
  currentBalanceCents: number;
  monthlyContributionCents: number;
  expectedReturnPct: number;
}

const fmt = (cents: number) =>
  (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

export default function PartnerGoals({
  goals,
  partnerLabel,
}: {
  goals: PartnerGoalRow[];
  partnerLabel: string;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold text-slate-900 mb-1">
        Shared with you by {partnerLabel}
      </h2>
      {goals.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          {partnerLabel} hasn&apos;t shared any goals with your household yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => {
            const projection = projectGoal({
              targetCents: g.targetCents,
              targetDate: g.targetDate,
              currentBalanceCents: g.currentBalanceCents,
              monthlyContributionCents: g.monthlyContributionCents,
              expectedReturnPct: g.expectedReturnPct,
            });
            const onTrack = projection.surplusCents >= 0;
            const tone = onTrack
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200";
            return (
              <li key={g.id} className={`border rounded-xl p-4 ${tone}`}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    {g.label}
                    <AttributionChip mine={false} partnerLabel={partnerLabel} />
                  </h3>
                  <span className="text-xs text-slate-600">
                    target {fmt(g.targetCents)} by {g.targetDate}
                  </span>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <Stat
                    label="Current"
                    value={g.currentBalanceCents === 0 ? "—" : fmt(g.currentBalanceCents)}
                  />
                  <Stat
                    label="Monthly"
                    value={g.monthlyContributionCents === 0 ? "—" : fmt(g.monthlyContributionCents)}
                  />
                  <Stat label="Projected" value={fmt(projection.projectedBalanceCents)} />
                </div>
                <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-white/70">
                  <div
                    className={`h-full ${onTrack ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${Math.min(100, projection.progressPct)}%` }}
                    aria-hidden
                  />
                </div>
                <p className="text-[10px] italic text-slate-500">
                  Read-only — shared by {partnerLabel}. Pure projection, general information only.
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
