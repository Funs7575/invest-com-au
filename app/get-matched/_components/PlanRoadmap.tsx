"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import type { ChecklistItem } from "@/lib/getmatched/types";
import { groupChecklist, timelineBadgeLabel } from "@/lib/getmatched/roadmap";

/**
 * Get Matched Showcase G6 — plan as roadmap.
 *
 * Renders the flat result checklist as a Today / This week / This month
 * timeline with a vertical rail (numbered dots + connecting line). The
 * grouping is DISPLAY-ONLY (see lib/getmatched/roadmap.ts): every toggle is
 * wired by the item's ORIGINAL index so checklist persistence
 * (`/api/get-matched/plans/[id]/checklist`) keeps working unchanged.
 *
 * Compliance unchanged: "educational steps based on your answers".
 */

interface Props {
  checklist: ChecklistItem[];
  /** User's stated timeline answer key (e.g. "3_6_months"), for the badge. */
  timeline: string | null;
  /** Toggle done-state by ORIGINAL checklist index. */
  onToggle: (index: number) => void;
}

export default function PlanRoadmap({ checklist, timeline, onToggle }: Props) {
  const phases = groupChecklist(checklist);
  const timelineLabel = timelineBadgeLabel(timeline);

  // Sequential 1-based display number per item across phases, keyed by the
  // item's original index. Computed up-front so render stays side-effect-free.
  const stepNumberByIndex = new Map<number, number>();
  let counter = 0;
  for (const phase of phases) {
    for (const item of phase.items) {
      counter += 1;
      stepNumberByIndex.set(item.index, counter);
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-xl font-extrabold text-slate-900">Your roadmap</h2>
        {timelineLabel && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
            <Icon name="map-pin" size={12} />
            Your timeline: {timelineLabel}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Educational steps based on your answers — Invest.com.au never gives
        personal advice.
      </p>

      <div className="space-y-7">
        {phases.map((phase) => (
          <section key={phase.key} aria-label={phase.label}>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-3">
              {phase.label}
            </p>
            <ul className="relative ml-1 border-l-2 border-slate-200 space-y-4 pl-6">
              {phase.items.map((item) => {
                const n = stepNumberByIndex.get(item.index) ?? item.index + 1;
                return (
                  <li key={item.index} className="relative">
                    {/* Numbered dot on the rail */}
                    <span
                      aria-hidden="true"
                      className={`absolute -left-[1.95rem] top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                        item.done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white text-slate-500"
                      }`}
                    >
                      {item.done ? <Icon name="check" size={12} /> : n}
                    </span>
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onToggle(item.index)}
                        aria-pressed={!!item.done}
                        aria-label={`Mark "${item.label}" ${item.done ? "not done" : "done"}`}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                          item.done
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-slate-300 hover:border-slate-400"
                        }`}
                      >
                        {item.done && (
                          <Icon name="check" size={12} className="text-white" />
                        )}
                      </button>
                      <span
                        className={`text-sm ${
                          item.done
                            ? "text-slate-500 line-through"
                            : "text-slate-700"
                        }`}
                      >
                        {item.href ? (
                          <Link href={item.href} className="hover:underline">
                            {item.label}
                          </Link>
                        ) : (
                          item.label
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
