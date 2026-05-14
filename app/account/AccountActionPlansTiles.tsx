import Link from "next/link";
import Icon from "@/components/Icon";
import type { ActionPlan } from "@/lib/getmatched/types";

interface Props {
  plans: ActionPlan[];
}

/**
 * Top-of-account tiles for plans + briefs + "do next". Rendered server-side
 * so the dashboard paints in one round-trip.
 */
export default function AccountActionPlansTiles({ plans }: Props) {
  const latest = plans[0];
  const briefCount = plans.filter((p) => p.linked_brief_id).length;
  const nextSteps = latest
    ? latest.checklist
        .filter((c) => !c.done)
        .slice(0, 3)
    : [];

  return (
    <section aria-label="Your action plans" className="mb-6">
      <h2 className="text-base font-semibold text-slate-900 mb-3">
        Your action plans
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/account/plans"
          className="bg-rose-50 border border-rose-200 hover:border-rose-400 rounded-xl p-4 block transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <Icon name="file-text" size={16} className="text-rose-700" />
            <p className="text-sm font-bold text-slate-900">My Action Plans</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{plans.length}</p>
          {latest && (
            <p className="text-xs text-slate-600 truncate mt-1">
              Latest: {latest.goal ?? latest.intent_slug ?? "—"}
            </p>
          )}
          <p className="text-xs text-rose-700 mt-2 font-semibold">View all →</p>
        </Link>

        <Link
          href="/account/plans"
          className="bg-emerald-50 border border-emerald-200 hover:border-emerald-400 rounded-xl p-4 block transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <Icon name="check-circle" size={16} className="text-emerald-700" />
            <p className="text-sm font-bold text-slate-900">My Briefs</p>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{briefCount}</p>
          {latest?.linked_brief_id && (
            <p className="text-xs text-slate-600 mt-1">
              Latest brief opened from a plan.
            </p>
          )}
          <p className="text-xs text-emerald-700 mt-2 font-semibold">
            View briefs →
          </p>
        </Link>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="trending-up" size={16} className="text-amber-700" />
            <p className="text-sm font-bold text-slate-900">Do next</p>
          </div>
          {nextSteps.length === 0 ? (
            <p className="text-xs text-slate-600 mt-1">
              Build a new plan to get personalised next steps.
            </p>
          ) : (
            <ul className="text-xs text-slate-700 space-y-1 mt-1">
              {nextSteps.map((s, i) => (
                <li key={i} className="flex items-start gap-1">
                  <Icon name="arrow-right" size={12} className="mt-0.5 text-amber-700 shrink-0" />
                  {s.href ? (
                    <Link href={s.href} className="hover:underline">
                      {s.label}
                    </Link>
                  ) : (
                    <span>{s.label}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/get-matched"
            className="text-xs text-amber-700 mt-2 font-semibold inline-block"
          >
            Build a new plan →
          </Link>
        </div>
      </div>
    </section>
  );
}
