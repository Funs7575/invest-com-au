"use client";

import { useState } from "react";
import Link from "next/link";

/* ─── Emoji map for the goal question (first question only) ─── */
const GOAL_EMOJI: Record<string, string> = {
  grow:     "📈",
  income:   "💰",
  crypto:   "₿",
  trade:    "⚡",
  automate: "🤖",
  super:    "🏦",
  property: "🏠",
  home:     "🔑",
  help:     "🤝",
};

interface QuizQuestion {
  question_text: string;
  options: { label: string; key: string; sub?: string; emoji?: string }[];
}

interface ContextBanner {
  tone: "info" | "intl";
  title: string;
  body: string;
}

type Option = { label: string; key: string; sub?: string; emoji?: string };

/**
 * Multi-select option list (the "who will you need?" needs question). Toggles
 * options on/off and submits the whole set via an explicit Continue button —
 * the user can pick several professionals (multi-intent). "I'm not sure" is
 * mutually exclusive with concrete needs. Keyed by the question in the parent
 * so it re-initialises from `initial` when the question (re)mounts.
 */
function MultiSelectOptions({
  options,
  initial,
  animating,
  onSubmit,
}: {
  options: Option[];
  initial: string[];
  animating: boolean;
  onSubmit: (keys: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initial);

  const toggle = (key: string) => {
    setSelected((prev) => {
      if (key === "not-sure") return prev.includes("not-sure") ? [] : ["not-sure"];
      const without = prev.filter((k) => k !== "not-sure");
      return without.includes(key) ? without.filter((k) => k !== key) : [...without, key];
    });
  };

  return (
    <>
      <p className="text-xs md:text-sm text-slate-500 -mt-3 mb-4">Select all that apply.</p>
      <div className="space-y-2.5 md:space-y-3" role="group" aria-label="Select all that apply">
        {options.map((opt) => {
          const checked = selected.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => toggle(opt.key)}
              className={`w-full text-left border rounded-xl px-4 py-3.5 md:px-5 md:py-4 min-h-13 transition-all font-medium text-sm md:text-base ${
                checked
                  ? "border-amber-500 bg-amber-50/80 shadow-sm"
                  : "border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 bg-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    checked ? "border-amber-500 bg-amber-500" : "border-slate-300 bg-white"
                  }`}
                  aria-hidden="true"
                >
                  {checked && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-slate-900">{opt.label}</span>
                  {opt.sub && (
                    <span className="block text-xs text-slate-500 font-normal mt-0.5 leading-relaxed">{opt.sub}</span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onSubmit(selected)}
        disabled={selected.length === 0 || animating}
        className="mt-5 w-full bg-amber-500 text-slate-900 font-bold rounded-xl px-5 py-4 min-h-13 transition-colors hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue{selected.length > 0 ? ` (${selected.length})` : ""}
      </button>
    </>
  );
}

interface Props {
  step: number;
  questions: QuizQuestion[];
  selectedKey: string | null;
  animating: boolean;
  fetchError: string | null;
  resumePrompt: boolean;
  resumeQuestionNumber?: number | null;
  resumeTotalQuestions?: number | null;
  contextBanner?: ContextBanner | null;
  questionIndex?: number;
  totalQuestions?: number;
  multiSelect?: boolean;
  selectedKeys?: string[];
  onMultiAnswer?: (keys: string[]) => void;
  onAnswer: (key: string) => void;
  onBack: () => void;
  onJumpTo?: (targetIndex: number) => void;
  onResume: () => void;
  onStartOver: () => void;
  questionHeadingRef: React.RefObject<HTMLHeadingElement | null>;
}

export default function QuizQuestionScreen({
  step,
  questions,
  selectedKey,
  animating,
  fetchError,
  resumePrompt,
  resumeQuestionNumber,
  resumeTotalQuestions,
  contextBanner,
  questionIndex,
  totalQuestions,
  multiSelect,
  selectedKeys,
  onMultiAnswer,
  onAnswer,
  onBack,
  onJumpTo,
  onResume,
  onStartOver,
  questionHeadingRef,
}: Props) {
  const current = questions[step] ?? questions[0];
  const displayIndex = questionIndex !== undefined ? questionIndex : step;
  const displayTotal = totalQuestions !== undefined ? totalQuestions : questions.length;
  const isGoalQuestion = displayIndex === 0;

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-2xl mx-auto">
        {/* Data fetch error notice */}
        {fetchError && (
          <div role="alert" className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 md:p-3 mb-3 md:mb-4 text-[0.62rem] md:text-xs text-amber-700">
            {fetchError}
          </div>
        )}

        {/* Resume prompt */}
        {resumePrompt && displayIndex === 0 && (
          <div
            className="mb-4 md:mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3 md:p-4 flex items-center justify-between gap-3"
            style={{ animation: "resultCardIn 0.3s ease-out" }}
          >
            <div>
              <p className="text-xs md:text-sm font-semibold text-amber-800">Welcome back!</p>
              <p className="text-[0.62rem] md:text-xs text-amber-700">
                {resumeQuestionNumber && resumeTotalQuestions
                  ? `You were on question ${resumeQuestionNumber} of ${resumeTotalQuestions}. Pick up where you left off?`
                  : "You have a quiz in progress. Pick up where you left off?"}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={onResume}
                className="px-3 py-1.5 bg-amber-500 text-slate-900 text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors"
              >
                Resume
              </button>
              <button
                onClick={onStartOver}
                className="px-3 py-1.5 bg-white text-amber-700 text-xs font-semibold border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Context banner — explains a path the user just routed into
            (e.g. international → advisor-only). Set above the progress dots
            so it reads as a moment of orientation, not noise alongside Q text. */}
        {contextBanner && (
          <div
            className={`mb-4 md:mb-6 rounded-xl p-3 md:p-4 flex items-start gap-3 border ${
              contextBanner.tone === "intl"
                ? "bg-blue-50 border-blue-200"
                : "bg-slate-50 border-slate-200"
            }`}
            style={{ animation: "resultCardIn 0.3s ease-out" }}
          >
            <span className="text-xl leading-none mt-0.5" aria-hidden="true">
              {contextBanner.tone === "intl" ? "🌏" : "💡"}
            </span>
            <div>
              <p className={`text-xs md:text-sm font-semibold ${contextBanner.tone === "intl" ? "text-blue-900" : "text-slate-800"}`}>
                {contextBanner.title}
              </p>
              <p className={`text-[0.65rem] md:text-xs leading-relaxed mt-0.5 ${contextBanner.tone === "intl" ? "text-blue-700" : "text-slate-600"}`}>
                {contextBanner.body}
              </p>
            </div>
          </div>
        )}

        {/* Progress dots — desktop only. Past dots are clickable so users can
            jump back to any earlier question without spamming the back button. */}
        <div className="hidden md:flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: displayTotal }).map((_, i) => {
            const isPast = i < displayIndex;
            const isCurrent = i === displayIndex;
            const canJump = isPast && typeof onJumpTo === "function";
            const dotClass = isPast
              ? "w-3 h-3 bg-amber-500"
              : isCurrent
              ? "w-3 h-3 bg-amber-500 ring-4 ring-amber-200"
              : "w-2.5 h-2.5 bg-slate-200";
            if (canJump) {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onJumpTo!(i)}
                  aria-label={`Jump back to question ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${dotClass} hover:scale-125 hover:bg-amber-600 cursor-pointer`}
                />
              );
            }
            return (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${dotClass}`}
              />
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mb-1.5 md:mb-2">
          <div className="flex justify-between items-center text-[0.62rem] md:text-xs text-slate-500 mb-1">
            <span>Question {displayIndex + 1} of {displayTotal}</span>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-amber-600">
                {Math.round(((displayIndex + 1) / displayTotal) * 100)}%
              </span>
              {/* Escape hatch — users who started the quiz but changed
                  their mind previously had to use the browser back
                  button. This lets them exit cleanly without feeling
                  trapped in the flow. */}
              <Link
                href="/"
                className="text-slate-400 hover:text-slate-600 underline-offset-2 hover:underline"
              >
                Exit quiz
              </Link>
            </div>
          </div>
          <div
            className="h-1.5 bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={displayIndex + 1}
            aria-valuemin={1}
            aria-valuemax={displayTotal}
            aria-label={`Question ${displayIndex + 1} of ${displayTotal}`}
          >
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${((displayIndex + 1) / displayTotal) * 100}%` }}
            />
          </div>
        </div>

        {/* No aria-live here — it would re-announce the back button + every
            option on each step. Per-step announcement is handled by moving
            focus to the question heading (see page.tsx handlers). */}
        <div key={displayIndex} className="quiz-question-enter">
          {/* Back button — single instance above the question */}
          {displayIndex > 0 && (
            <button
              onClick={onBack}
              aria-label="Go back to previous question"
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 mt-3 mb-1 min-h-11 transition-colors"
            >
              <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}

          <h1
            ref={questionHeadingRef}
            tabIndex={-1}
            className="text-xl md:text-3xl font-extrabold mb-5 md:mb-8 mt-3 md:mt-5 outline-none"
          >
            {current.question_text}
          </h1>

          {/* Multi-select needs question (the user can pick several
              professionals). Keyed by the question so it re-initialises on
              (re)mount — e.g. when navigating back to it. */}
          {multiSelect && onMultiAnswer ? (
            <MultiSelectOptions
              key={current.question_text}
              options={current.options}
              initial={selectedKeys ?? []}
              animating={animating}
              onSubmit={onMultiAnswer}
            />
          ) : (
          /* role="group" (not radiogroup): the options auto-advance on click,
              so they're buttons, not a persistent radio selection — "button"
              is the truthful semantic and needs no arrow-key model. */
          <div className="space-y-2.5 md:space-y-3" role="group" aria-label={current.question_text}>
            {current.options.map((opt) => {
              const emoji = opt.emoji ?? (isGoalQuestion ? GOAL_EMOJI[opt.key] : undefined);
              const isSelected = selectedKey === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => onAnswer(opt.key)}
                  disabled={animating}
                  aria-label={opt.label}
                  className={`w-full text-left border rounded-xl px-4 py-3.5 md:px-5 md:py-4 min-h-13 transition-all font-medium text-sm md:text-base ${
                    isSelected
                      ? "border-amber-500 bg-amber-50/80 scale-[0.985] shadow-sm"
                      : "border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 bg-white"
                  } ${animating && !isSelected ? "opacity-40" : ""}`}
                >
                  <span className="flex items-center gap-3">
                    {/* Emoji badge for goal question */}
                    {emoji && (
                      <span
                        className={`text-lg shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                          isSelected ? "bg-amber-100" : "bg-slate-100"
                        }`}
                        aria-hidden="true"
                      >
                        {emoji}
                      </span>
                    )}

                    {/* Checkmark (when selected and no emoji) or checkmark alongside emoji */}
                    {isSelected && !emoji && (
                      <svg
                        className="w-4 h-4 md:w-5 md:h-5 text-amber-500 shrink-0 check-pop"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isSelected && emoji && (
                      <span className="absolute">
                        <svg
                          className="w-3.5 h-3.5 text-amber-500 check-pop"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}

                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-slate-900">{opt.label}</span>
                      {opt.sub && (
                        <span className="block text-xs text-slate-500 font-normal mt-0.5 leading-relaxed">
                          {opt.sub}
                        </span>
                      )}
                    </span>

                    {/* Selected indicator (right side checkmark with emoji) */}
                    {isSelected && emoji && (
                      <svg
                        className="w-4 h-4 text-amber-500 shrink-0 check-pop"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
