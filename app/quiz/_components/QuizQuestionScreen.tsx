"use client";

import { useRef } from "react";

interface QuizQuestion {
  question_text: string;
  options: { label: string; key: string }[];
}

interface Props {
  step: number;
  questions: QuizQuestion[];
  selectedKey: string | null;
  animating: boolean;
  fetchError: string | null;
  resumePrompt: boolean;
  onAnswer: (key: string) => void;
  onBack: () => void;
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
  onAnswer,
  onBack,
  onResume,
  onStartOver,
  questionHeadingRef,
}: Props) {
  const current = questions[step];

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-2xl mx-auto">
        {/* Data fetch error notice */}
        {fetchError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 md:p-3 mb-3 md:mb-4 text-[0.62rem] md:text-xs text-amber-700">
            {fetchError}
          </div>
        )}

        {/* Resume prompt — shown when saved progress exists */}
        {resumePrompt && step === 0 && (
          <div className="mb-4 md:mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 flex items-center justify-between gap-3" style={{ animation: "resultCardIn 0.3s ease-out" }}>
            <div>
              <p className="text-xs md:text-sm font-semibold text-blue-800">Welcome back!</p>
              <p className="text-[0.62rem] md:text-xs text-blue-600">You have a quiz in progress. Pick up where you left off?</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={onResume}
                className="px-3 py-1.5 bg-blue-700 text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition-colors"
              >
                Resume
              </button>
              <button
                onClick={onStartOver}
                className="px-3 py-1.5 bg-white text-blue-700 text-xs font-semibold border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Progress dots — hidden on mobile (progress bar is enough) */}
        <div className="hidden md:flex items-center justify-center gap-1.5 md:gap-2 mb-4 md:mb-8">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-colors ${
                i < step ? 'bg-blue-700' : i === step ? 'bg-blue-700 ring-2 ring-blue-700/30 ring-offset-2' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-1.5 md:mb-2">
          <div className="flex justify-between text-[0.62rem] md:text-xs text-slate-500 mb-0.5 md:mb-1">
            <span>Question {step + 1} of {questions.length}</span>
            <span>{Math.round(((step + 1) / questions.length) * 100)}%</span>
          </div>
          <div
            className="h-1 md:h-1.5 bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={questions.length}
            aria-label={`Question ${step + 1} of ${questions.length}`}
          >
            <div className="h-full bg-blue-700 rounded-full transition-all duration-500" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
          </div>
        </div>

        <div key={step} className="quiz-question-enter" aria-live="polite">
          {step > 0 && (
            <button
              onClick={() => {
                onBack();
              }}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 mt-2 mb-1 min-h-[44px] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
          )}
          <h1
            ref={questionHeadingRef}
            tabIndex={-1}
            className="text-lg md:text-3xl font-extrabold mb-4 md:mb-8 mt-3 md:mt-6 outline-none"
          >
            {current.question_text}
          </h1>

          <div className="space-y-2 md:space-y-3" role="radiogroup" aria-label={current.question_text}>
            {current.options.map((opt: { label: string; key: string }) => (
              <button
                key={opt.label}
                onClick={() => onAnswer(opt.key)}
                disabled={animating}
                role="radio"
                aria-checked={selectedKey === opt.key}
                aria-label={opt.label}
                className={`w-full text-left border rounded-lg md:rounded-xl px-4 py-3.5 md:px-6 md:py-4 min-h-[48px] transition-all font-medium text-xs md:text-base ${
                  selectedKey === opt.key
                    ? "border-slate-700 bg-slate-700/5 scale-[0.98]"
                    : "border-slate-200 hover:border-slate-700 hover:bg-slate-700/5"
                } ${animating && selectedKey !== opt.key ? "opacity-50" : ""}`}
              >
                <span className="flex items-center gap-2 md:gap-3">
                  {selectedKey === opt.key && (
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 shrink-0 check-pop" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {step > 0 && (
          <button
            onClick={onBack}
            className="mt-3 md:mt-6 px-3 py-2 min-h-[44px] inline-flex items-center text-xs md:text-sm text-slate-500 hover:text-slate-700 active:text-slate-900 transition-colors rounded-lg"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
