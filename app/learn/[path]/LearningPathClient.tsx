"use client";

import Link from "next/link";
import { useLearningPathProgress } from "@/hooks/use-learning-path-progress";
import { useState } from "react";
import Confetti from "@/components/ui/Confetti";
import { celebrateMilestone } from "@/lib/celebrate";
import { LEARNING_PATHS } from "@/lib/learning-paths";
import type { LearningPath, LearningPathStep } from "@/lib/learning-paths";
import { resolvePath } from "@/lib/learning-paths";

// ─── Colour maps (Tailwind classes — must be complete strings for purging) ────

const ACCENT: Record<
  string,
  { ring: string; bg: string; text: string; badge: string; button: string; progressBar: string }
> = {
  teal: {
    ring: "ring-teal-500",
    bg: "bg-teal-600",
    text: "text-teal-700",
    badge: "bg-teal-50 text-teal-700 border-teal-200",
    button: "bg-teal-600 hover:bg-teal-700 text-white",
    progressBar: "bg-teal-500",
  },
  blue: {
    ring: "ring-blue-500",
    bg: "bg-blue-600",
    text: "text-blue-700",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    button: "bg-blue-600 hover:bg-blue-700 text-white",
    progressBar: "bg-blue-500",
  },
  amber: {
    ring: "ring-amber-500",
    bg: "bg-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    button: "bg-amber-500 hover:bg-amber-400 text-slate-900",
    progressBar: "bg-amber-400",
  },
  purple: {
    ring: "ring-purple-500",
    bg: "bg-purple-600",
    text: "text-purple-700",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    button: "bg-purple-600 hover:bg-purple-700 text-white",
    progressBar: "bg-purple-500",
  },
  rose: {
    ring: "ring-rose-500",
    bg: "bg-rose-600",
    text: "text-rose-700",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    button: "bg-rose-600 hover:bg-rose-700 text-white",
    progressBar: "bg-rose-500",
  },
};

function getAccent(colorClass: string) {
  return ACCENT[colorClass] ?? ACCENT["teal"]!;
}

// ─── Step badge ───────────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
  article: "Article",
  question: "Q&A",
  glossary: "Glossary",
  calculator: "Calculator",
  page: "Guide",
};

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  isComplete,
  onToggle,
  accent,
}: {
  step: LearningPathStep;
  index: number;
  isComplete: boolean;
  onToggle: (idx: number) => void;
  accent: ReturnType<typeof getAccent>;
}) {
  const href = resolvePath(step);

  return (
    <div
      className={`group relative flex gap-4 rounded-2xl border bg-white p-5 transition-all duration-150 ${
        isComplete
          ? "border-slate-200 opacity-80"
          : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      {/* Step number / check toggle */}
      <button
        type="button"
        aria-label={isComplete ? `Mark step ${index + 1} incomplete` : `Mark step ${index + 1} complete`}
        onClick={() => onToggle(index)}
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-bold text-sm transition-all duration-150 ${
          isComplete
            ? `${accent.bg} border-transparent text-white`
            : `border-slate-300 text-slate-500 hover:border-slate-400`
        }`}
      >
        {isComplete ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span>{index + 1}</span>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className={`text-[0.65rem] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${accent.badge}`}
          >
            {KIND_LABEL[step.kind] ?? step.kind}
          </span>
          <span className="text-[0.7rem] text-slate-500">
            ~{step.estimatedMinutes} min
          </span>
        </div>

        <Link
          href={href}
          className={`block font-bold text-slate-900 leading-snug mb-1 transition-colors group-hover:${accent.text} ${
            isComplete ? "line-through text-slate-500" : ""
          }`}
        >
          {step.title}
        </Link>

        {step.description && (
          <p className="text-xs text-slate-500 leading-relaxed">
            {step.description}
          </p>
        )}
      </div>

      {/* Arrow */}
      <Link
        href={href}
        aria-label={`Open ${step.title}`}
        tabIndex={-1}
        className="flex items-center text-slate-300 hover:text-slate-500 transition-colors ml-1 shrink-0"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  completed,
  total,
  accent,
}: {
  completed: number;
  total: number;
  accent: ReturnType<typeof getAccent>;
}) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-500">
        <span>
          {completed} of {total} steps complete
        </span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${accent.progressBar}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function LearningPathClient({
  path,
}: {
  path: LearningPath;
}) {
  const accent = getAccent(path.colorClass);
  const { completedCount, isComplete, markComplete, markIncomplete, isHydrated, resetProgress } =
    useLearningPathProgress(path.slug, path.steps.length);

  // True only when the final step was ticked in THIS session — an already-
  // finished path re-opened later stays calm (no confetti on page load).
  const [completedNow, setCompletedNow] = useState(false);

  function handleToggle(idx: number) {
    if (isComplete(idx)) {
      markIncomplete(idx);
    } else {
      markComplete(idx);
      celebrateMilestone("first_path_step");
      if (completedCount + 1 === path.steps.length) {
        setCompletedNow(true);
        celebrateMilestone("path_complete", {
          title: `${path.title} — complete`,
          body: `Every step done. That's real groundwork.`,
        });
      }
    }
  }

  const allDone = isHydrated && completedCount === path.steps.length;
  const nextPath = LEARNING_PATHS.find((p) => p.slug !== path.slug && p.slug !== "");

  return (
    <div>
      {/* Progress strip */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Your progress
          </h2>
          {isHydrated && completedCount > 0 && (
            <button
              type="button"
              onClick={resetProgress}
              className="text-xs text-slate-500 hover:text-slate-600 underline underline-offset-2 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        {isHydrated ? (
          <ProgressBar
            completed={completedCount}
            total={path.steps.length}
            accent={accent}
          />
        ) : (
          <div className="h-2 rounded-full bg-slate-200 animate-pulse" />
        )}

        {allDone && (
          <div className="relative mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2 overflow-hidden">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-800">
                Path complete — every step done. That&apos;s real groundwork.
              </p>
              {nextPath && (
                <p className="mt-0.5 text-xs text-emerald-700">
                  Keep the momentum:{" "}
                  <Link href={`/learn/${nextPath.slug}`} className="font-semibold underline underline-offset-2">
                    {nextPath.title}
                  </Link>{" "}
                  is a natural next step.
                </p>
              )}
            </div>
            {completedNow && <Confetti count={18} />}
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {path.steps.map((step, idx) => (
          <StepCard
            key={`${step.kind}-${step.slug}`}
            step={step}
            index={idx}
            isComplete={isHydrated ? isComplete(idx) : false}
            onToggle={handleToggle}
            accent={accent}
          />
        ))}
      </div>
    </div>
  );
}
