"use client";

import Link from "next/link";
import EligibilityQuiz from "@/components/EligibilityQuiz";
import type { QuizAnswers, QuizQuestion } from "@/components/EligibilityQuiz";

export interface HubOnboardingResult {
  headline: string;
  summary: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  advisorCta?: { href: string; specialty?: string };
}

export interface HubOnboardingConfig {
  hubSlug: string;
  hubName: string;
  heading: string;
  subheading: string;
  questions: QuizQuestion[];
  evaluate: (answers: QuizAnswers) => HubOnboardingResult;
}

interface HubOnboardingShellProps {
  config: HubOnboardingConfig;
}

/**
 * <HubOnboardingShell> — generic diagnostic-quiz shell for hub onboarding.
 *
 * Accepts a hub-specific config (questions + evaluate function). Renders an
 * <EligibilityQuiz> and surfaces personalised result cards with CTAs. Each
 * hub page supplies its own `HubOnboardingConfig` from `lib/hub-onboarding-configs.ts`.
 *
 * OB-01 — hub onboarding stream (REMEDIATION_QUEUE.md).
 */
export default function HubOnboardingShell({ config }: HubOnboardingShellProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{config.heading}</h1>
        <p className="text-slate-600">{config.subheading}</p>
      </div>

      <EligibilityQuiz
        heading="Quick diagnostic"
        questions={config.questions}
        renderResults={(answers, reset) => {
          const result = config.evaluate(answers);
          return (
            <div className="space-y-6" data-testid="hub-onboarding-results">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-emerald-900 mb-2">
                  {result.headline}
                </h2>
                <p className="text-emerald-800 text-sm leading-relaxed">{result.summary}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={result.primaryCta.href}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-lg px-5 py-3 text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  {result.primaryCta.label}
                  <span aria-hidden="true">→</span>
                </Link>
                {result.secondaryCta && (
                  <Link
                    href={result.secondaryCta.href}
                    className="flex-1 inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 rounded-lg px-5 py-3 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    {result.secondaryCta.label}
                  </Link>
                )}
              </div>

              {result.advisorCta && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Want expert advice?</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Match with a licensed {result.advisorCta.specialty ?? "financial adviser"}
                    </p>
                  </div>
                  <Link
                    href={result.advisorCta.href}
                    className="shrink-0 inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-xs font-medium hover:bg-slate-50 transition-colors"
                  >
                    Find an Adviser
                    <span aria-hidden="true">›</span>
                  </Link>
                </div>
              )}

              <button
                onClick={reset}
                className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors pt-2"
              >
                ← Restart quiz
              </button>
            </div>
          );
        }}
      />
    </div>
  );
}
