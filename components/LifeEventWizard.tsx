"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { getChecklist, type WizardStep } from "@/lib/life-event-checklist";
import { buildLifeEventUrl, type LifeEvent } from "@/lib/life-events";

interface FormData {
  completed?: string[];
  [key: string]: unknown;
}

interface Props {
  event: LifeEvent;
  initialFormData?: FormData;
  onComplete?: () => void;
}

export default function LifeEventWizard({
  event,
  initialFormData = {},
  onComplete,
}: Props) {
  const steps: WizardStep[] = getChecklist(event.id);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const completed = new Set(formData.completed ?? []);
  const completedCount = steps.filter((s) => completed.has(s.id)).length;
  const totalSteps = steps.length;
  const pct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const allDone = completedCount === totalSteps && totalSteps > 0;

  const save = useCallback(
    async (nextData: FormData) => {
      setSaving(true);
      try {
        const newCompleted = nextData.completed ?? [];
        const step = steps.findIndex((s) => !newCompleted.includes(s.id));
        await fetch("/api/account/life-event-wizard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            life_event_id: event.id,
            step: step === -1 ? totalSteps : step,
            form_data: nextData,
          }),
        });
      } finally {
        setSaving(false);
      }
    },
    [event.id, steps, totalSteps],
  );

  function toggle(stepId: string) {
    setFormData((prev) => {
      const prevCompleted = prev.completed ?? [];
      const next = prevCompleted.includes(stepId)
        ? prevCompleted.filter((id) => id !== stepId)
        : [...prevCompleted, stepId];
      const nextData = { ...prev, completed: next };
      void save(nextData);
      return nextData;
    });
  }

  async function reset() {
    const next: FormData = { completed: [] };
    setFormData(next);
    await fetch(`/api/account/life-event-wizard?event_id=${event.id}`, {
      method: "DELETE",
    });
  }

  const advisorUrl = buildLifeEventUrl(event);

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-semibold text-slate-700">
            {completedCount} of {totalSteps} steps completed
          </span>
          <span className="text-sm font-semibold text-indigo-600">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              allDone ? "bg-emerald-500" : "bg-indigo-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {allDone && (
          <p className="text-xs font-semibold text-emerald-600 mt-1">
            All steps complete! 🎉
          </p>
        )}
      </div>

      {/* Steps checklist */}
      {steps.length === 0 ? (
        <p className="text-sm text-slate-500">
          No checklist available for this life event yet.
        </p>
      ) : (
        <ol className="space-y-2">
          {steps.map((step, i) => {
            const done = completed.has(step.id);
            return (
              <li key={step.id}>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <span className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {i + 1}
                    </span>
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggle(step.id)}
                      disabled={saving}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-semibold ${done ? "text-slate-400 line-through" : "text-slate-900 group-hover:text-indigo-700"}`}>
                      {step.title}
                    </span>
                    {step.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                    )}
                    {step.href && !done && (
                      <Link
                        href={step.href}
                        className="text-xs font-semibold text-indigo-600 hover:underline mt-0.5 inline-block"
                      >
                        {step.hrefLabel ?? "Learn more"} →
                      </Link>
                    )}
                  </div>
                </label>
              </li>
            );
          })}
        </ol>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100 flex-wrap">
        <Link
          href={advisorUrl}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Find an advisor for this →
        </Link>
        {completedCount > 0 && (
          <button
            onClick={reset}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Reset progress
          </button>
        )}
        {saving && (
          <span className="text-xs text-slate-400">Saving…</span>
        )}
        {onComplete && allDone && (
          <button
            onClick={onComplete}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
          >
            Mark complete
          </button>
        )}
      </div>
    </div>
  );
}
