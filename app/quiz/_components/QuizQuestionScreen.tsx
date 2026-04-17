"use client";

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

interface Props {
  step: number;
  questions: QuizQuestion[];
  selectedKey: string | null;
  animating: boolean;
  fetchError: string | null;
  resumePrompt: boolean;
  questionIndex?: number;
  totalQuestions?: number;
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
  questionIndex,
  totalQuestions,
  onAnswer,
  onBack,
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 md:p-3 mb-3 md:mb-4 text-[0.62rem] md:text-xs text-amber-700">
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
                You have a quiz in progress. Pick up where you left off?
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={onResume}
                className="px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors"
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

        {/* Progress dots — desktop only */}
        <div className="hidden md:flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: displayTotal }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i < displayIndex
                  ? "w-3 h-3 bg-amber-500"
                  : i === displayIndex
                  ? "w-3 h-3 bg-amber-500 ring-4 ring-amber-200"
                  : "w-2.5 h-2.5 bg-slate-200"
              }`}
            />
          ))}
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
              <a
                href="/"
                className="text-slate-400 hover:text-slate-600 underline-offset-2 hover:underline"
              >
                Exit quiz
              </a>
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

        <div key={displayIndex} className="quiz-question-enter" aria-live="polite">
          {/* Back button — single instance above the question */}
          {displayIndex > 0 && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 mt-3 mb-1 min-h-[44px] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          <div className="space-y-2.5 md:space-y-3" role="radiogroup" aria-label={current.question_text}>
            {current.options.map((opt) => {
              const emoji = opt.emoji ?? (isGoalQuestion ? GOAL_EMOJI[opt.key] : undefined);
              const isSelected = selectedKey === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => onAnswer(opt.key)}
                  disabled={animating}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={opt.label}
                  className={`w-full text-left border rounded-xl px-4 py-3.5 md:px-5 md:py-4 min-h-[52px] transition-all font-medium text-sm md:text-base ${
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
        </div>
      </div>
    </div>
  );
}
