"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { ActionPlanAnswers, QuestionDef } from "@/lib/getmatched/types";

/**
 * Single-question card with emoji-badge options, amber selected state,
 * and animated chip transitions. Ported polish from the old quiz's
 * `QuizQuestionScreen.tsx`.
 *
 * Question kinds supported:
 *   - select       → 1-of-N radio chips
 *   - contextual   → same UI as select; the difference is semantic
 *   - multiselect  → N-of-M checkbox chips + Continue button
 *   - text         → single text input
 *   - number       → single numeric input
 *
 * The wrapper is `key`-bound on `question.slug` so React resets internal
 * state (multi-select array, text value) when navigating to the next
 * question.
 */

interface Props {
  question: QuestionDef;
  answers: ActionPlanAnswers;
  submitting: boolean;
  onAnswer: (value: string | string[] | number) => void;
}

export default function QuestionCard({
  question,
  answers,
  submitting,
  onAnswer,
}: Props) {
  const previous = answers[question.slug];

  const initialMulti = Array.isArray(previous) ? (previous as string[]) : [];
  const [selectedMulti, setSelectedMulti] = useState<string[]>(initialMulti);

  const initialText = typeof previous === "string" ? (previous as string) : "";
  const initialNumber = typeof previous === "number" ? (previous as number) : null;

  return (
    <article
      key={question.slug}
      className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8"
      style={{ animation: "iv-question-in 220ms ease-out" }}
    >
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
        {question.prompt}
      </h1>
      {question.subtitle && (
        <p className="text-sm text-slate-500 mb-6">{question.subtitle}</p>
      )}

      {(question.kind === "select" || question.kind === "contextual") && (
        <div
          className="space-y-2.5 sm:space-y-3"
          role="radiogroup"
          aria-label={question.prompt}
        >
          {question.options.map((opt) => {
            const isSelected = previous === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                role="radio"
                aria-checked={isSelected}
                onClick={() => onAnswer(opt.value)}
                disabled={submitting}
                className={`w-full text-left rounded-xl border p-4 sm:p-4.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  isSelected
                    ? "border-amber-500 bg-amber-50/80 scale-[0.985] shadow-sm"
                    : "border-slate-200 bg-white hover:border-amber-400 hover:bg-amber-50/40"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <span className="flex items-start gap-3">
                  {opt.emoji && (
                    <span
                      className={`text-lg shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                        isSelected ? "bg-amber-100" : "bg-slate-100"
                      }`}
                      aria-hidden="true"
                    >
                      {opt.emoji}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <p className="text-sm sm:text-base font-semibold text-slate-900">
                      {opt.label}
                    </p>
                    {opt.sub && (
                      <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5 leading-snug">
                        {opt.sub}
                      </p>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {question.kind === "multiselect" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pick all that apply</span>
            <span>{selectedMulti.length} selected</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {question.options.map((opt) => {
              const checked = selectedMulti.includes(opt.value);
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    setSelectedMulti((prev) =>
                      checked
                        ? prev.filter((x) => x !== opt.value)
                        : [...prev, opt.value],
                    );
                  }}
                  className={`text-left rounded-xl border p-4 flex items-center gap-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    checked
                      ? "border-amber-500 bg-amber-50 ring-2 ring-amber-300"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                      checked
                        ? "border-amber-500 bg-amber-500"
                        : "border-slate-300"
                    }`}
                  >
                    {checked && <Icon name="check" size={12} className="text-white" />}
                  </span>
                  {opt.emoji && <span className="text-lg shrink-0">{opt.emoji}</span>}
                  <span className="text-sm font-semibold text-slate-900 min-w-0 flex-1">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => onAnswer(selectedMulti)}
              disabled={submitting || selectedMulti.length === 0}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold px-6 py-2.5 rounded-xl"
            >
              Continue <Icon name="arrow-right" size={14} />
            </button>
          </div>
        </div>
      )}

      {question.kind === "text" && (
        <TextInput initial={initialText} onSubmit={(v) => onAnswer(v)} disabled={submitting} />
      )}

      {question.kind === "number" && (
        <NumberInput
          initial={initialNumber}
          onSubmit={(v) => onAnswer(v)}
          disabled={submitting}
        />
      )}

      <style>{`
        @keyframes iv-question-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="iv-question-in"] { animation: none !important; }
        }
      `}</style>
    </article>
  );
}

function TextInput({
  initial,
  onSubmit,
  disabled,
}: {
  initial: string;
  onSubmit: (v: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={300}
        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <button
        type="button"
        onClick={() => onSubmit(value.trim())}
        disabled={disabled || value.trim().length === 0}
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold px-5 py-2.5 rounded-xl"
      >
        Continue <Icon name="arrow-right" size={14} />
      </button>
    </div>
  );
}

function NumberInput({
  initial,
  onSubmit,
  disabled,
}: {
  initial: number | null;
  onSubmit: (v: number) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState<string>(initial === null ? "" : String(initial));
  return (
    <div className="space-y-3">
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
      <button
        type="button"
        onClick={() => {
          const num = Number(value);
          if (Number.isFinite(num)) onSubmit(num);
        }}
        disabled={disabled || value.length === 0}
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold px-5 py-2.5 rounded-xl"
      >
        Continue <Icon name="arrow-right" size={14} />
      </button>
    </div>
  );
}
