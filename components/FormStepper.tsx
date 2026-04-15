import type { ReactNode } from "react";

/**
 * Reusable multi-step form progress indicator.
 *
 * Pure display component — the parent form manages which step is
 * active and passes in `currentStepIndex`. Horizontally scrollable
 * on mobile with scroll-snap so long forms stay legible.
 *
 * Usage:
 *
 *     <FormStepper
 *       steps={[
 *         { label: "Your details" },
 *         { label: "Experience" },
 *         { label: "Verification" },
 *         { label: "Review" },
 *       ]}
 *       currentStepIndex={2}
 *     />
 *
 * Accessibility:
 *   - `role="list"` + `aria-label="Form progress"`
 *   - Current step has `aria-current="step"`
 *   - Completed steps have `aria-label="Step X (completed)"`
 */

export interface StepperStep {
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface Props {
  steps: StepperStep[];
  currentStepIndex: number;
  className?: string;
}

export default function FormStepper({ steps, currentStepIndex, className = "" }: Props) {
  return (
    <ol
      role="list"
      aria-label="Form progress"
      className={`flex items-center gap-2 overflow-x-auto pb-1 snap-x snap-mandatory ${className}`}
    >
      {steps.map((step, i) => {
        const state =
          i < currentStepIndex
            ? "completed"
            : i === currentStepIndex
              ? "current"
              : "upcoming";
        const isLast = i === steps.length - 1;
        return (
          <li
            key={`${i}-${step.label}`}
            aria-current={state === "current" ? "step" : undefined}
            aria-label={
              state === "completed"
                ? `Step ${i + 1} ${step.label} (completed)`
                : state === "current"
                  ? `Step ${i + 1} ${step.label} (current)`
                  : `Step ${i + 1} ${step.label}`
            }
            className="flex items-center gap-2 shrink-0 snap-start"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  state === "completed"
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : state === "current"
                      ? "bg-white border-amber-400 text-amber-700 ring-4 ring-amber-100"
                      : "bg-white border-slate-300 text-slate-400"
                }`}
                aria-hidden="true"
              >
                {state === "completed" ? "✓" : i + 1}
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className={`text-xs font-semibold ${
                    state === "current" ? "text-slate-900" : state === "completed" ? "text-slate-700" : "text-slate-500"
                  }`}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-[0.6rem] text-slate-500 truncate max-w-[18ch]">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
            {!isLast && (
              <div
                className={`w-8 h-px ${
                  state === "completed" ? "bg-emerald-400" : "bg-slate-200"
                }`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
