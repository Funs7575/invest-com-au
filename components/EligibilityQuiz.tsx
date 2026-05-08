"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Icon from "@/components/Icon";

/**
 * <EligibilityQuiz> — generalised step-by-step quiz shell.
 *
 * Handles: question sequencing, progress bar, answer accumulation, back
 * navigation, and "done" state. The caller provides questions and a
 * renderResults callback that receives the collected answers and a reset
 * function. All domain-specific logic (evaluation, results display, lead
 * form) belongs in the renderResults callback.
 *
 * W-10 — hub foundation stream (REMEDIATION_QUEUE.md).
 */

export interface QuizQuestion {
  /** Stable ID used as the key in the answers record. */
  id: string;
  /** Prompt displayed to the user. */
  question: string;
  options: QuizOption[];
}

export interface QuizOption {
  value: string;
  label: string;
}

/** Collected answers: question id → selected option value. */
export type QuizAnswers = Record<string, string>;

export interface EligibilityQuizProps {
  questions: QuizQuestion[];
  /**
   * Called once all questions are answered. Return the full results view
   * (table, cards, outcome text, lead form, etc.). `reset` clears state
   * and returns to step 0.
   */
  renderResults: (answers: QuizAnswers, reset: () => void) => ReactNode;
  /** Optional label shown above the progress bar. Defaults to "Eligibility Quiz". */
  heading?: string;
}

export default function EligibilityQuiz({
  questions,
  renderResults,
  heading = "Eligibility Quiz",
}: EligibilityQuizProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [done, setDone] = useState(false);

  function handleOption(question: QuizQuestion, value: string) {
    const next: QuizAnswers = { ...answers, [question.id]: value };
    setAnswers(next);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function reset() {
    setAnswers({});
    setStep(0);
    setDone(false);
  }

  if (done) {
    return (
      <div data-testid="eligibility-quiz-results">
        {renderResults(answers, reset)}
      </div>
    );
  }

  const currentQuestion = questions[step];
  if (!currentQuestion) return null;

  const progressPct = Math.round((step / questions.length) * 100);

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm"
      data-testid="eligibility-quiz"
    >
      <div
        className="flex items-center justify-between mb-5"
        data-testid="eligibility-quiz-meta"
      >
        <p className="text-xs uppercase tracking-wider font-extrabold text-slate-500">
          {heading} · {step + 1} of {questions.length}
        </p>
        <p
          className="text-xs font-bold text-slate-500"
          data-testid="eligibility-quiz-progress-label"
        >
          {progressPct}%
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Quiz progress: ${progressPct}%`}
        className="h-1.5 w-full bg-slate-100 rounded-full mb-6 overflow-hidden"
        data-testid="eligibility-quiz-progress"
      >
        <div
          className="h-full bg-amber-500 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <h2
        className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5"
        data-testid="eligibility-quiz-question"
      >
        {currentQuestion.question}
      </h2>

      <div className="space-y-2" data-testid="eligibility-quiz-options">
        {currentQuestion.options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleOption(currentQuestion, option.value)}
            className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 transition-colors flex items-center justify-between gap-2"
            data-testid={`eligibility-quiz-option-${option.value}`}
          >
            <span className="text-sm font-bold text-slate-900">{option.label}</span>
            <Icon name="arrow-right" size={14} className="text-slate-400 shrink-0" />
          </button>
        ))}
      </div>

      {step > 0 && (
        <button
          type="button"
          onClick={handleBack}
          className="mt-5 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
          data-testid="eligibility-quiz-back"
        >
          <Icon name="chevron-left" size={14} /> Back
        </button>
      )}
    </div>
  );
}
