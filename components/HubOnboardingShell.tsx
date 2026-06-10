"use client";

import Link from "next/link";
import { useState } from "react";
import EligibilityQuiz from "@/components/EligibilityQuiz";
import type { QuizAnswers, QuizQuestion } from "@/components/EligibilityQuiz";
import { isValidEmailClient } from "@/lib/validate-email";
import { HUB_ONBOARDING_CONFIGS } from "@/lib/hub-onboarding-configs";

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
  /**
   * Serialisable key into HUB_ONBOARDING_CONFIGS (the config's `hubSlug`).
   * A string — NOT the config object — because the config carries an
   * `evaluate` function, and functions cannot be passed from a Server
   * Component (the /quiz pages, which export `metadata`) to this Client
   * Component (Next throws an RSC render error / React #419 if you try).
   */
  configKey: string;
}

type CaptureState = "idle" | "submitting" | "done" | "error";

/** Renders the quiz result + optional email capture form. Extracted to allow hooks. */
function HubResultPanel({
  result,
  answers,
  hubSlug,
  hubName,
  reset,
}: {
  result: HubOnboardingResult;
  answers: QuizAnswers;
  hubSlug: string;
  hubName: string;
  reset: () => void;
}) {
  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!isValidEmailClient(trimmedEmail)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setCaptureState("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/hub-quiz/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hubSlug,
          answers,
          email: trimmedEmail,
          name: name.trim() || undefined,
          resultKey: result.headline.slice(0, 200),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMsg(body.error ?? "Something went wrong. Please try again.");
        setCaptureState("error");
        return;
      }
      setCaptureState("done");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setCaptureState("error");
    }
  }

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

      {/* Optional email capture — non-blocking (CTAs above always work) */}
      <div className="border border-slate-200 rounded-xl p-5 bg-white">
        {captureState === "done" ? (
          <p className="text-sm text-emerald-700 font-medium text-center py-1">
            Thanks! Personalised {hubName} tips are on their way.
          </p>
        ) : (
          <form onSubmit={handleCapture} noValidate>
            <p className="text-sm font-medium text-slate-800 mb-3">
              Get personalised {hubName} tips by email{" "}
              <span className="text-slate-500 font-normal">(optional)</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <input
                type="text"
                placeholder="Your name (optional)"
                aria-label="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoComplete="name"
                maxLength={100}
              />
              <input
                type="email"
                placeholder="Your email address"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoComplete="email"
                maxLength={254}
              />
              <button
                type="submit"
                disabled={captureState === "submitting"}
                className="shrink-0 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {captureState === "submitting" ? "Sending…" : "Send me tips"}
              </button>
            </div>
            {errorMsg && (
              <p className="text-xs text-red-600 mt-1" role="alert">
                {errorMsg}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              No spam. Unsubscribe any time.
            </p>
          </form>
        )}
      </div>

      <button
        onClick={reset}
        className="w-full text-center text-sm text-slate-500 hover:text-slate-600 transition-colors pt-2"
      >
        ← Restart quiz
      </button>
    </div>
  );
}

/**
 * <HubOnboardingShell> — generic diagnostic-quiz shell for hub onboarding.
 *
 * Accepts a hub-specific config (questions + evaluate function). Renders an
 * <EligibilityQuiz> and surfaces personalised result cards with CTAs. An
 * optional email capture form below the CTAs sends results to
 * /api/hub-quiz/capture for lead nurturing (non-blocking — CTAs work without
 * email). Each hub page supplies its own `HubOnboardingConfig` from
 * `lib/hub-onboarding-configs.ts`.
 *
 * OB-01 — hub onboarding stream (REMEDIATION_QUEUE.md).
 */
export default function HubOnboardingShell({ configKey }: HubOnboardingShellProps) {
  const config = HUB_ONBOARDING_CONFIGS[configKey];
  if (!config) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center text-slate-500">
        This quiz isn’t available right now.
      </div>
    );
  }
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
            <HubResultPanel
              result={result}
              answers={answers}
              hubSlug={config.hubSlug}
              hubName={config.hubName}
              reset={reset}
            />
          );
        }}
      />
    </div>
  );
}
