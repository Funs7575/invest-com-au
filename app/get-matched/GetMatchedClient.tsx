"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Icon from "@/components/Icon";
import type {
  ActionPlan,
  ActionPlanAnswers,
  ListingMatch,
  QuestionDef,
  ResultTemplate,
  RouteType,
  TopMatch,
  Vertical,
} from "@/lib/getmatched/types";
import { inferRoute } from "@/lib/getmatched/inference";
import { buildInvestorProfile } from "@/lib/getmatched/investor-profile";
import QuestionCard from "./_components/QuestionCard";
import ProgressDots from "./_components/ProgressDots";
import AnalyzingScreen from "./_components/AnalyzingScreen";
import TopMatchCarousel from "./_components/TopMatchCarousel";
import MatchExplainerCard from "./_components/MatchExplainerCard";
import LaneResults from "./_components/LaneResults";
import WhatIfPanel, { type WhatIfControl } from "./_components/WhatIfPanel";
import PlanRoadmap from "./_components/PlanRoadmap";
import SharpenCard from "./_components/SharpenCard";
import SupplyNarrowing from "./_components/SupplyNarrowing";
import FreeTextIntake from "./_components/FreeTextIntake";
import WealthStackSection, {
  type StackSlotView,
} from "./_components/WealthStackSection";
import MatchAlertCapture from "./_components/MatchAlertCapture";
import type { LaneResolution } from "@/lib/getmatched/resolve-lanes";
import { clearPartialPlan, setPartialPlan } from "@/lib/getmatched/recall";
import { trackEvent as phTrack } from "@/lib/posthog/events";

/** Serialise an answer for analytics: option keys / slugs only, bounded. */
function answerLabel(value: string | string[] | number | boolean | null): string {
  const s = Array.isArray(value) ? value.join(",") : String(value ?? "");
  return s.slice(0, 60);
}

type NextStep =
  | {
      done: false;
      question: QuestionDef;
      totalSteps: number;
      currentStep: number;
    }
  | {
      done: true;
      totalSteps: number;
      currentStep: number;
    };

interface StartResponse {
  plan_id: number;
  share_token: string | null;
  session_id: string;
  next: NextStep;
  ephemeral?: boolean;
  ephemeral_reason?: string | null;
}

interface AnswerResponse {
  plan_id: number;
  next: NextStep;
  ephemeral?: boolean;
}

interface ResolveResponse {
  plan: ActionPlan;
  lanes?: LaneResolution;
  listing_matches?: ListingMatch[];
  template: ResultTemplate;
  recommended_brief_template: string | null;
  accept_credits_cost: number | null;
  recommended_providers: { kind: string; id: number }[];
  top_matches?: TopMatch[];
  primary_href?: string;
  vertical?: Vertical | null;
  advisor_type?: string | null;
  match_explainer?: { score: number; bullets: string[] };
  /** Showcase G9 — server-computed wealth stack for platform-shaped results. */
  stack?: StackSlotView[];
  ephemeral?: boolean;
}

interface ErrorResponse {
  error: string;
  code?: string;
  detail?: string;
}

interface ErrorState {
  message: string;
  code?: string;
  detail?: string;
}

interface Props {
  initialGoal: string | null;
  initialIntent: string | null;
  initialContext: string | null;
  initialPlanId: number | null;
  initialMode: "fast" | "guided" | "both";
}

const SESSION_STORAGE_KEY = "iv_gm_session";

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function GetMatchedClient(props: Props) {
  const router = useRouter();
  const [planId, setPlanId] = useState<number | null>(props.initialPlanId);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [step, setStep] = useState<NextStep | null>(null);
  const [answers, setAnswers] = useState<ActionPlanAnswers>({});
  /** Stack of (slug, mapsTo) pairs we wrote on each answer, in answer
   *  order. Used by the Back button to unwind the most recent write
   *  without affecting earlier ones. */
  const [history, setHistory] = useState<Array<{ slug: string; mapsTo: string }>>([]);
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  /** Bridge state: the final answer has been submitted and we've kicked
   *  off /resolve. While true the AnalyzingScreen renders so the user
   *  perceives the personalisation work. */
  const [analyzing, setAnalyzing] = useState(false);
  /** When `analyzing` flips false this is set to the (possibly
   *  still-pending) resolve promise's result. We wait for BOTH the
   *  1.5s timer AND the resolve fetch to finish before showing the
   *  result screen — whichever takes longer wins. */
  const [pendingResolveResult, setPendingResolveResult] =
    useState<ResolveResponse | null>(null);
  const [analyzingTimerDone, setAnalyzingTimerDone] = useState(false);
  const [result, setResult] = useState<ResolveResponse | null>(null);
  // Ephemeral mode: the server couldn't persist a plan row (migrations
  // pending), so we hold all state client-side and disable save / brief
  // creation until the DB is ready.
  const [ephemeral, setEphemeral] = useState(false);

  // Promote the analyzing result to `result` only once BOTH the 1.5s
  // timer AND the resolve fetch have finished — gives the perceived-
  // effort moment a guaranteed minimum dwell.
  useEffect(() => {
    if (analyzingTimerDone && pendingResolveResult) {
      setResult(pendingResolveResult);
      setAnalyzing(false);
      setPendingResolveResult(null);
      setAnalyzingTimerDone(false);
      // Plan completed — wipe the partial-plan cache so the homepage
      // resume banner stops surfacing.
      clearPartialPlan();
    }
  }, [analyzingTimerDone, pendingResolveResult]);

  // Funnel-analytics anchors: when the session started (for time-taken on
  // resolve) and whether we've already emitted funnel_started this mount
  // (start() is also re-entered by React strict-mode/dep changes).
  const startedAtRef = useRef<number | null>(null);
  const startTrackedRef = useRef(false);

  // Anonymous session id, persisted across refreshes so Back keeps progress.
  const sessionIdRef = useRef<string>("");
  if (!sessionIdRef.current && typeof window !== "undefined") {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    sessionIdRef.current = stored ?? newSessionId();
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionIdRef.current);
  }

  // Build the "start" payload based on context + goal hints from query.
  const startPrefill = useMemo(() => {
    const prefill: ActionPlanAnswers = {};
    if (props.initialGoal) prefill.intent = props.initialGoal;
    if (props.initialIntent && !prefill.intent) prefill.intent = props.initialIntent;
    return prefill;
  }, [props.initialGoal, props.initialIntent]);

  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/get-matched/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          mode: props.initialMode,
          prefill: startPrefill,
          source_page: window.location.pathname,
        }),
      });
      const data = (await res.json()) as StartResponse | ErrorResponse;
      if (!res.ok || !("plan_id" in data)) {
        const errData = data as ErrorResponse;
        setError({
          message: errData.error ?? "Failed to start.",
          code: errData.code,
          detail: errData.detail,
        });
        return;
      }
      setPlanId(data.plan_id);
      setShareToken(data.share_token);
      setAnswers(startPrefill);
      setStep(data.next);
      if (data.ephemeral) setEphemeral(true);
      if (!startTrackedRef.current) {
        startTrackedRef.current = true;
        startedAtRef.current = Date.now();
        phTrack("funnel_started", {
          funnel: "get_matched",
          source_page: window.location.pathname,
          mode: props.initialMode,
          prefilled: Object.keys(startPrefill).length > 0,
          resumed: props.initialPlanId !== null,
        });
      }
      if (data.next.done) {
        await resolve(data.plan_id, startPrefill);
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Failed to start.",
      });
    } finally {
      setLoading(false);
    }
  }, [props.initialMode, props.initialPlanId, startPrefill]);

  useEffect(() => {
    void start();
  }, [start]);

  async function submitAnswer(value: ActionPlanAnswers[string]) {
    if (planId === null || !step || step.done) return;
    setSubmitting(true);
    setError(null);
    const slug = step.question.slug;
    const mapsTo = step.question.maps_to;
    const nextAnswers = { ...answers, [slug]: value, [mapsTo]: value };
    setAnswers(nextAnswers);
    setHistory((h) => [...h, { slug, mapsTo }]);
    try {
      const res = await fetch("/api/get-matched/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          question_slug: slug,
          value,
          // Always send the latest answers so the server can resolve
          // ephemerally without a DB lookup if needed.
          answers: nextAnswers,
        }),
      });
      const data = (await res.json()) as AnswerResponse | ErrorResponse;
      if (!res.ok || !("plan_id" in data)) {
        const errData = data as ErrorResponse;
        setError({
          message: errData.error ?? "Failed to save answer.",
          code: errData.code,
          detail: errData.detail,
        });
        return;
      }
      if (data.ephemeral) setEphemeral(true);
      setStep(data.next);
      phTrack("funnel_step_answered", {
        funnel: "get_matched",
        step_slug: slug,
        step_index: step.currentStep,
        total_steps: step.totalSteps,
        answer: answerLabel(value),
      });
      // Persist partial plan so the homepage banner can surface
      // "continue where you left off" if the user drops off mid-quiz.
      if (!data.next.done) {
        setPartialPlan({
          answers: nextAnswers,
          stepIndex: data.next.currentStep,
          totalSteps: data.next.totalSteps,
        });
      }
      if (data.next.done) {
        // Show the 1.5s analyzing interstitial concurrently with the
        // resolve fetch. Whichever takes longer determines the actual
        // dwell time — but the user always sees the personalisation
        // moment.
        setAnalyzing(true);
        setAnalyzingTimerDone(false);
        // `history` here is the pre-push state — the just-given answer makes
        // it +1 (setHistory above hasn't flushed yet).
        void resolve(data.plan_id, nextAnswers, history.length + 1);
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Failed to save answer.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (history.length === 0) return;
    const last = history[history.length - 1]!;
    const { [last.slug]: _a, [last.mapsTo]: _b, ...rest } = answers;
    void _a; void _b;
    phTrack("funnel_step_back", {
      funnel: "get_matched",
      step_slug: last.slug,
      step_index: step && !step.done ? step.currentStep : history.length,
    });
    setAnswers(rest);
    setHistory((h) => h.slice(0, -1));
    // Rebuilding the step requires re-running nextQuestion on the
    // server. Easiest: re-fetch by calling /answer with the previous
    // value or just re-starting. We use a lightweight approach: call
    // /start again to get a fresh step computation from the current
    // (truncated) answer set. The plan_id is preserved.
    void rewindFetch(rest);
  }

  async function rewindFetch(currentAnswers: ActionPlanAnswers) {
    try {
      // The /start endpoint accepts a prefill — pass the truncated
      // answers and it computes the next-unanswered question for us.
      const res = await fetch("/api/get-matched/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          mode: props.initialMode,
          prefill: currentAnswers,
          source_page: window.location.pathname,
        }),
      });
      const data = (await res.json()) as StartResponse | ErrorResponse;
      if (res.ok && "plan_id" in data) {
        setStep(data.next);
      }
    } catch {
      // Silent — back button stays usable, just the step UI may lag.
    }
  }

  async function resolve(id: number, finalAnswers: ActionPlanAnswers, stepCount = 0) {
    setError(null);
    try {
      const res = await fetch("/api/get-matched/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: id, answers: finalAnswers }),
      });
      const data = (await res.json()) as ResolveResponse | ErrorResponse;
      if (!res.ok || !("plan" in data)) {
        const errData = data as ErrorResponse;
        setError({
          message: errData.error ?? "Failed to resolve.",
          code: errData.code,
          detail: errData.detail,
        });
        // Bail out of analyzing mode so the user sees the error not
        // a hung spinner.
        setAnalyzing(false);
        setAnalyzingTimerDone(false);
        return;
      }
      if (data.ephemeral) setEphemeral(true);
      phTrack("funnel_resolved", {
        funnel: "get_matched",
        outcome: String(data.template?.route ?? "unknown"),
        advisor_type: data.advisor_type ?? null,
        match_count: data.top_matches?.length ?? 0,
        step_count: stepCount,
        time_taken_seconds: startedAtRef.current
          ? Math.round((Date.now() - startedAtRef.current) / 1000)
          : 0,
      });
      setPendingResolveResult(data);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Failed to resolve.",
      });
      setAnalyzing(false);
      setAnalyzingTimerDone(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-slate-500">Building your plan…</div>
      </div>
    );
  }

  if (analyzing && !result) {
    return (
      <AnalyzingScreen
        onComplete={() => setAnalyzingTimerDone(true)}
        result={pendingResolveResult}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-5 max-w-lg">
          <p className="font-semibold mb-2">Get Matched ran into a problem</p>
          <p className="mb-3">{error.message}</p>
          {error.code && (
            <p className="text-[11px] uppercase tracking-widest text-red-500 mb-1">
              Code: {error.code}
            </p>
          )}
          {error.detail && error.detail !== error.message && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-red-600 hover:underline">
                Technical detail
              </summary>
              <pre className="mt-2 text-[11px] whitespace-pre-wrap break-all text-red-700/80">
                {error.detail}
              </pre>
            </details>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void start()}
              className="text-xs font-semibold underline"
            >
              Try again
            </button>
            <Link
              href="/compare"
              className="text-xs font-semibold underline"
            >
              Browse comparisons instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <ActionPlanScreen
        result={result}
        shareToken={shareToken}
        ephemeral={ephemeral}
        planId={planId}
        onResolve={async (resolvePlanId, resolveAnswers) => {
          // Stateless re-resolve used by what-if (G4, always plan_id 0) and
          // sharpen (G7, real plan_id when persistent). The resolve route
          // does NOT mutate the plan row when plan_id is 0.
          const res = await fetch("/api/get-matched/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan_id: resolvePlanId, answers: resolveAnswers }),
          });
          const data = (await res.json()) as ResolveResponse | ErrorResponse;
          if (!res.ok || !("plan" in data)) {
            const errData = data as ErrorResponse;
            throw new Error(errData.error ?? "Failed to recalculate.");
          }
          return data;
        }}
        onChecklistToggle={async (index) => {
          // Skip the DB write when we're in ephemeral mode — checklist
          // toggles are still visually applied via local state in the
          // screen component.
          if (!planId || ephemeral) return;
          await fetch(`/api/get-matched/plans/${planId}/checklist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ index }),
          });
        }}
        onSaveByEmail={async (email) => {
          if (!planId || ephemeral) return null;
          const res = await fetch(`/api/get-matched/plans/${planId}/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error ?? "Failed to save.");
          return data.view_url as string;
        }}
        onCreateBrief={() => {
          if (!planId || ephemeral) return;
          router.push(`/briefs/new?plan_id=${planId}`);
        }}
        onRestart={() => {
          window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
          sessionIdRef.current = newSessionId();
          window.sessionStorage.setItem(
            SESSION_STORAGE_KEY,
            sessionIdRef.current,
          );
          setResult(null);
          setAnswers({});
          setStep(null);
          setPlanId(null);
          void start();
        }}
      />
    );
  }

  if (!step || step.done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-slate-500">Finalising your plan…</div>
      </div>
    );
  }

  return (
    <QuestionScreen
      key={step.question.slug}
      step={step}
      answers={answers}
      submitting={submitting}
      canGoBack={history.length > 0}
      onAnswer={(value) => void submitAnswer(value)}
      onBack={goBack}
    />
  );
}

// ─── Question screen ──────────────────────────────────────────────────────

const ROUTE_PREVIEW: Record<RouteType, { emoji: string; label: string }> = {
  compare:        { emoji: "🏆", label: "Compare platforms" },
  browse:         { emoji: "👀", label: "Browse opportunities" },
  individual:     { emoji: "👤", label: "Talk to a verified expert" },
  firm:           { emoji: "🏢", label: "Talk to a verified firm" },
  expert_team:    { emoji: "👥", label: "Get a Pro Squad" },
  investor_brief: { emoji: "📋", label: "Get quotes from pros" },
  listing_brief:  { emoji: "🏷️", label: "List your opportunity" },
  second_opinion: { emoji: "🔍", label: "Get a second opinion" },
  guide:          { emoji: "📖", label: "Start with guides" },
};

// ─── Question screen wrapper (3-pane desktop / single-column mobile) ───

function QuestionScreen({
  step,
  answers,
  submitting,
  canGoBack,
  onAnswer,
  onBack,
}: {
  step: { done: false; question: QuestionDef; totalSteps: number; currentStep: number };
  answers: ActionPlanAnswers;
  submitting: boolean;
  canGoBack: boolean;
  onAnswer: (value: ActionPlanAnswers[string]) => void;
  onBack: () => void;
}) {
  const { question, totalSteps, currentStep } = step;
  const progress = Math.max(0, Math.min(100, (currentStep / totalSteps) * 100));
  const remainingSecs = (totalSteps - currentStep) * 20;
  const remainingLabel = remainingSecs >= 60 ? `~${Math.ceil(remainingSecs / 60)} min remaining` : `~${remainingSecs}s remaining`;
  const intentSummary = (answers.intent as string | undefined) ?? null;
  const helpSummary = (answers.help_preference as string | undefined) ?? null;
  const budgetSummary = (answers.budget_band as string | undefined) ?? null;
  const timelineSummary = (answers.timeline as string | undefined) ?? null;

  // Live route prediction — pure computation, updates on every answer change
  const predictedRoute = intentSummary ? inferRoute(answers).route : null;
  const routePreview = predictedRoute ? ROUTE_PREVIEW[predictedRoute] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Mobile progress strip */}
        <div className="lg:hidden mb-4">
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-1 bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">
            Step {currentStep} of {totalSteps} · {remainingLabel}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_320px] gap-6 lg:gap-10">
          {/* LEFT — progress + reassurance */}
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <ProgressDots total={totalSteps} current={currentStep - 1} />
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-3">
                <div className="h-1 bg-amber-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">
                Step {currentStep} of {totalSteps} · {remainingLabel}
              </p>
              <ul className="text-xs text-slate-500 space-y-2">
                <li className="flex items-start gap-2"><Icon name="check" size={12} className="mt-0.5 text-emerald-600 shrink-0" /> No account needed yet</li>
                <li className="flex items-start gap-2"><Icon name="check" size={12} className="mt-0.5 text-emerald-600 shrink-0" /> General information only</li>
                <li className="flex items-start gap-2"><Icon name="check" size={12} className="mt-0.5 text-emerald-600 shrink-0" /> You stay in control</li>
                <li className="flex items-start gap-2"><Icon name="check" size={12} className="mt-0.5 text-emerald-600 shrink-0" /> Providers deliver under their own licence</li>
              </ul>
              {/* G5 — live supply narrowing (factual counts, fail-soft). */}
              <div className="mt-4">
                <SupplyNarrowing answers={answers} />
              </div>
            </div>
          </aside>

          {/* CENTRE — question card */}
          <main>
            {canGoBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-2 min-h-11"
              >
                <Icon name="arrow-left" size={14} /> Back
              </button>
            )}
            {/* G8 — free-text intake, FIRST screen only (nothing answered). */}
            {currentStep === 1 && !intentSummary && (
              <FreeTextIntake onIntent={(intent) => onAnswer(intent)} />
            )}
            <div id="gm-question-card">
              <QuestionCard
                question={question}
                answers={answers}
                submitting={submitting}
                onAnswer={onAnswer}
              />
            </div>
            <p className="lg:hidden text-[11px] text-slate-500 mt-3 text-center">
              General information only · You stay in control
            </p>
          </main>

          {/* RIGHT — live plan preview */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 rounded-2xl border border-slate-200 p-5 bg-white shadow-sm" aria-live="polite">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">Your plan so far</p>
              <ul className="text-sm space-y-2">
                {intentSummary && (<li className="text-slate-900"><strong>Goal:</strong> {humanise(intentSummary)}</li>)}
                {helpSummary && (<li className="text-slate-700"><strong>Help:</strong> {humanise(helpSummary)}</li>)}
                {budgetSummary && (<li className="text-slate-700"><strong>Budget:</strong> {humanise(budgetSummary)}</li>)}
                {timelineSummary && (<li className="text-slate-700"><strong>Timeline:</strong> {humanise(timelineSummary)}</li>)}
                {!intentSummary && (
                  <li className="text-slate-500 italic text-xs">Answer the questions and your action plan appears here.</li>
                )}
              </ul>
              {routePreview && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Based on your answers</p>
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <span className="text-xl leading-none">{routePreview.emoji}</span>
                    <span className="text-sm font-bold text-amber-900">{routePreview.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">This updates as you answer — different choices lead to a different plan.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function humanise(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Action plan result screen ────────────────────────────────────────────

/** Match-score dial in the profile hero — counts up from 0 on mount.
 *  prefers-reduced-motion: shows the final value immediately. */
function ScoreDial({ score }: { score: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(score);
      return;
    }
    const steps = 24;
    let frame = 0;
    const iv = setInterval(() => {
      frame++;
      setDisplay(Math.round((score * frame) / steps));
      if (frame >= steps) clearInterval(iv);
    }, 30);
    return () => clearInterval(iv);
  }, [score]);

  return (
    <div className="shrink-0 text-center" aria-label={`Match score ${score} out of 100`}>
      <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-amber-400/60 ring-2 ring-amber-400/20 flex items-center justify-center mx-auto">
        <span className="text-3xl font-extrabold text-amber-400">{display}</span>
      </div>
      <p className="text-[10px] uppercase tracking-widest font-bold text-amber-400 mt-2">
        Match score
      </p>
    </div>
  );
}

function ActionPlanScreen({
  result: originalResult,
  shareToken,
  ephemeral,
  planId,
  onResolve,
  onChecklistToggle,
  onSaveByEmail,
  onCreateBrief,
  onRestart,
}: {
  result: ResolveResponse;
  shareToken: string | null;
  ephemeral: boolean;
  planId: number | null;
  onResolve: (
    planId: number,
    answers: ActionPlanAnswers,
  ) => Promise<ResolveResponse>;
  onChecklistToggle: (index: number) => Promise<void>;
  onSaveByEmail: (email: string) => Promise<string | null>;
  onCreateBrief: () => void;
  onRestart: () => void;
}) {
  // The displayed result. Starts as the original resolve; G4 what-ifs and G7
  // sharpening swap a recomputed result in here. Resetting restores
  // `originalResult` from memory (no refetch).
  const [displayResult, setDisplayResult] = useState<ResolveResponse>(
    originalResult,
  );
  // True when the current display is a what-if recalculation (G4) — drives the
  // compliance label and the Reset link. Sharpening (G7) is a genuine
  // refinement and does NOT set this.
  const [isWhatIf, setIsWhatIf] = useState(false);
  const [whatIfBusy, setWhatIfBusy] = useState(false);
  const [whatIfError, setWhatIfError] = useState<string | null>(null);
  const [sharpenBusy, setSharpenBusy] = useState(false);
  const [sharpenError, setSharpenError] = useState<string | null>(null);
  // Card fade-stagger trigger — incremented on each recompute so the cards
  // re-key and animate in. Respect prefers-reduced-motion via CSS.
  const [revealKey, setRevealKey] = useState(0);

  const result = displayResult;
  const { plan, template, accept_credits_cost } = result;
  // Showcase G2 — factual investor profile composed from the user's own
  // answers (never advice; "based on what you told us"). See investor-profile.ts.
  const profile = buildInvestorProfile(plan.answers ?? {});
  const matchScore = result.match_explainer?.score ?? null;
  const [checklist, setChecklist] = useState(plan.checklist);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Keep the checklist in sync when the displayed result changes (what-if /
  // sharpen produce a fresh checklist).
  useEffect(() => {
    setChecklist(displayResult.plan.checklist);
  }, [displayResult]);

  const isRiskHeld =
    plan.risk_severity === "review" || plan.risk_severity === "block";

  // Current effective answer bands for the what-if controls.
  const currentBudget = (plan.answers?.budget_band as string | undefined) ?? null;
  const currentTimeline = (plan.answers?.timeline as string | undefined) ?? null;
  const currentHelp =
    (plan.answers?.help_preference as string | undefined) ?? null;

  // ── G4: what-if recompute (always plan_id 0 — never mutate the saved row) ──
  async function runWhatIf(
    control: WhatIfControl,
    from: string | null,
    to: string,
  ) {
    const answerKey =
      control === "budget"
        ? "budget_band"
        : control === "timeline"
          ? "timeline"
          : "help_preference";
    const merged: ActionPlanAnswers = {
      ...(plan.answers ?? {}),
      [answerKey]: to,
    };
    setWhatIfBusy(true);
    setWhatIfError(null);
    try {
      const next = await onResolve(0, merged);
      setDisplayResult(next);
      setIsWhatIf(true);
      setRevealKey((k) => k + 1);
      phTrack("whatif_used", { control, from, to });
    } catch (err) {
      // Keep the current result; surface a small inline note.
      setWhatIfError(
        err instanceof Error ? err.message : "Could not recalculate.",
      );
    } finally {
      setWhatIfBusy(false);
    }
  }

  function resetWhatIf() {
    setDisplayResult(originalResult);
    setIsWhatIf(false);
    setWhatIfError(null);
    setRevealKey((k) => k + 1);
  }

  // ── G7: sharpen — a genuine refinement of the user's own answers ──
  async function runSharpen(questionSlug: string, value: string) {
    // The question slug's canonical answer key (maps_to). All sharpen
    // questions map their slug→answer key 1:1 except `budget` → `budget_band`.
    const answerKey = questionSlug === "budget" ? "budget_band" : questionSlug;
    const merged: ActionPlanAnswers = {
      ...(plan.answers ?? {}),
      [questionSlug]: value,
      [answerKey]: value,
    };
    // Use the real plan_id when one exists and we're not ephemeral / mid
    // what-if — sharpening should persist. Otherwise resolve statelessly.
    const useRealPlan = planId !== null && planId > 0 && !ephemeral && !isWhatIf;
    setSharpenBusy(true);
    setSharpenError(null);
    try {
      const next = await onResolve(useRealPlan ? planId : 0, merged);
      setDisplayResult(next);
      setRevealKey((k) => k + 1);
      phTrack("sharpen_answered", {
        question_slug: questionSlug,
        new_score: next.match_explainer?.score ?? null,
      });
    } catch (err) {
      setSharpenError(
        err instanceof Error ? err.message : "Could not sharpen.",
      );
    } finally {
      setSharpenBusy(false);
    }
  }

  async function toggle(idx: number) {
    const next = checklist.map((c, i) =>
      i === idx ? { ...c, done: !c.done } : c,
    );
    setChecklist(next);
    await onChecklistToggle(idx);
  }

  async function handleSave() {
    setSaveError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSaveError("Please enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      const url = await onSaveByEmail(email);
      if (url) setSavedUrl(url);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const primary = template.primary_cta;
  // Routing precedence on the primary CTA:
  //   1. plan_id-linked brief deep-link (when a brief template is on offer
  //      and we have a persisted plan)
  //   2. server-computed `primary_href` (engine's inferred terminal URL
  //      with vertical / advisor-type filters baked in)
  //   3. template's default href (fallback)
  const recommendedBriefHref =
    result.recommended_brief_template && plan.id && !ephemeral
      ? `/briefs/new?plan_id=${plan.id}`
      : result.primary_href ?? primary?.href ?? "/";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADLINE STRIP — Investor Profile hero (G2). Identity card composed
          purely from the user's stated answers. */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-amber-400 text-[11px] font-semibold uppercase tracking-widest mb-2">
                Your stated profile
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
                {profile.label}
              </h1>
              {plan.goal && (
                <p className="text-slate-300 text-sm sm:text-base mb-3">
                  {plan.goal}
                </p>
              )}
              {profile.signals.length > 0 && (
                <ul className="flex flex-wrap gap-2 mb-1" aria-label="What you told us">
                  {profile.signals.map((s) => (
                    <li
                      key={`${s.name}:${s.value}`}
                      className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs"
                    >
                      <span className="text-slate-400">{s.name}:</span>
                      <span className="font-semibold text-white">{s.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {matchScore !== null && (
              <ScoreDial score={matchScore} />
            )}
          </div>

          <p className="text-slate-300 max-w-2xl leading-relaxed mt-6">
            {template.why_text}
          </p>
          <p className="text-[11px] text-slate-400 mt-2 max-w-2xl">
            Based on your answers. General information only — not personal advice.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-[11px]">
            {["Verified providers", "Masked previews", "Credit-based accept", "You stay in control"].map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-2.5 py-1"
              >
                <Icon name="shield-check" size={11} className="text-amber-400" />
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {isRiskHeld && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-900">
            <p className="font-semibold mb-1">Quick safety check</p>
            <p>
              Your answers mention topics that need a quick safety check. If you ask for quotes from this plan, we&apos;ll confirm before sending it to verified pros — usually within a business day.
            </p>
          </div>
        )}

        {/* G4 — "Play with your plan" what-if controls. Re-ranks via a
            stateless resolve (plan_id 0); never mutates the saved plan. */}
        <WhatIfPanel
          budget={currentBudget}
          timeline={currentTimeline}
          help={currentHelp}
          busy={whatIfBusy}
          isWhatIf={isWhatIf}
          error={whatIfError}
          onChange={(control, from, to) => void runWhatIf(control, from, to)}
          onReset={resetWhatIf}
        />

        {/* Compliance: make clear a what-if view is a recalculation of the
            user's ADJUSTED answers, not their saved plan. */}
        {isWhatIf && (
          <p
            className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-6"
            aria-live="polite"
          >
            <Icon name="sliders" size={12} className="text-amber-700" />
            What-if view — based on adjusted answers, not your saved plan.
          </p>
        )}

        {/* Match-score badge + "why we matched you here" transparency strip */}
        {result.match_explainer && (
          <MatchExplainerCard
            score={result.match_explainer.score}
            bullets={result.match_explainer.bullets}
          />
        )}

        {/* G7 — "Sharpen my match" confidence loop. Only when a sub-80 score
            exists and there are unanswered high-information questions. */}
        {result.match_explainer && result.match_explainer.score < 80 && (
          <SharpenCard
            score={result.match_explainer.score}
            answers={plan.answers ?? {}}
            busy={sharpenBusy}
            error={sharpenError}
            onAnswer={(slug, value) => void runSharpen(slug, value)}
          />
        )}

        {/* Card stack re-keys on each recompute so the updated result
            fade-staggers in. prefers-reduced-motion disables the animation.
            While a recompute is in flight the stack dims + shimmers. */}
        <div
          key={revealKey}
          className={`iv-whatif-reveal ${whatIfBusy || sharpenBusy ? "iv-whatif-busy" : ""}`}
          aria-busy={whatIfBusy || sharpenBusy}
        >

        {/* Top-3 match carousel — only present for `compare` route */}
        {/* Decision Engine P5: composite lane surface (hero + secondaries +
            My Options). Data-driven — renders only when resolve returns lanes. */}
        {result.lanes && (
          <LaneResults
            resolution={result.lanes}
            topMatches={result.top_matches ?? []}
            listingMatches={result.listing_matches ?? []}
            planId={result.plan?.id ?? null}
            shareToken={shareToken}
            ephemeral={ephemeral}
            initialSaved={result.plan?.saved_items ?? []}
            advisorType={result.advisor_type ?? null}
          />
        )}
        {result.top_matches && result.top_matches.length > 0 && (
          <TopMatchCarousel matches={result.top_matches} />
        )}

        {/* G6 — plan as a Today / This week / This month roadmap. Toggles
            persist by ORIGINAL checklist index (display-only grouping). */}
        <PlanRoadmap
          checklist={checklist}
          timeline={currentTimeline}
          onToggle={(idx) => void toggle(idx)}
        />

        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 mb-6">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 mb-3">
            <Icon name="check-circle" size={12} />
            Recommended route · {humanise(plan.route ?? "guide")}
          </span>

          {ephemeral && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-900">
              <p className="font-semibold mb-1">Preview mode</p>
              <p>
                Your plan is shown here for review. Saving it to your account and routing a brief to verified professionals is temporarily unavailable while we finish setting up the database. The cross-sell links below all work — explore them now, or come back to save your plan once the system is fully online.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {result.recommended_brief_template && !ephemeral ? (
              <button
                type="button"
                onClick={onCreateBrief}
                className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-base px-6 py-3.5 rounded-xl"
              >
                {primary?.label ?? "Continue"}
                {accept_credits_cost ? (
                  <span className="text-xs font-semibold opacity-80">
                    · ~{accept_credits_cost} credits
                  </span>
                ) : null}
                <Icon name="arrow-right" size={16} />
              </button>
            ) : (
              <Link
                href={recommendedBriefHref}
                className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-base px-6 py-3.5 rounded-xl"
              >
                {primary?.label ?? "Continue"}
                <Icon name="arrow-right" size={16} />
              </Link>
            )}
            {template.secondary_ctas?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {template.secondary_ctas.slice(0, 3).map((cta) => (
                  <Link
                    key={cta.href}
                    href={cta.href}
                    className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm px-4 py-2.5 rounded-lg"
                  >
                    {cta.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>{/* /iv-whatif-reveal */}

        {template.cross_sells?.length > 0 && (
          <section className="mb-6">
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
              Other things you might find useful
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {template.cross_sells.slice(0, 3).map((c) => (
                <Link
                  key={c.href}
                  href={c.href}
                  className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 hover:border-slate-300"
                >
                  <Icon name={c.icon ?? "arrow-right"} size={18} className="text-slate-500 mt-0.5" />
                  <span className="text-sm font-semibold text-slate-800">
                    {c.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* G9 — "Your full wealth stack" for platform-shaped results. */}
        {result.stack && result.stack.length > 0 && (
          <WealthStackSection stack={result.stack} />
        )}

        {/* G9 — match-change alerts (rides the existing fee-alert infra).
            Hidden in ephemeral mode where the subscribe path is unavailable. */}
        {!ephemeral &&
          result.top_matches &&
          result.top_matches.length > 0 && (
            <MatchAlertCapture
              matchSlugs={result.top_matches.map((m) => m.slug)}
              shareToken={shareToken}
            />
          )}

        {/* Save your plan strip — hidden in ephemeral mode because the
            save endpoints depend on a DB-backed plan row. */}
        {!ephemeral && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <p className="font-semibold text-slate-900 mb-1">
            Want to save this plan or get quotes from verified pros?
          </p>
          <p className="text-xs text-slate-500 mb-4">
            We&apos;ll email you a private link. No account needed.
          </p>
          {savedUrl ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">
              Saved. Your plan is at{" "}
              <Link href={savedUrl} className="underline font-semibold">
                {savedUrl}
              </Link>
              .
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                placeholder="you@example.com"
                aria-label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm px-5 py-2.5 rounded-lg"
              >
                {saving ? "Saving…" : "Email me my plan"}
              </button>
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-800 font-semibold text-sm px-5 py-2.5 rounded-lg hover:border-slate-300"
              >
                Create free account
              </Link>
            </div>
          )}
          {saveError && (
            <p role="alert" className="mt-2 text-xs text-red-700">{saveError}</p>
          )}
          {shareToken && !savedUrl && (
            <p className="mt-3 text-[11px] text-slate-500">
              Direct link:{" "}
              <Link href={`/plans/${shareToken}`} className="underline">
                /plans/{shareToken.slice(0, 8)}…
              </Link>
            </p>
          )}
        </section>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={onRestart}
            className="text-xs text-slate-500 underline hover:text-slate-700"
          >
            Start over with different answers
          </button>
        </div>
      </section>

      <style>{`
        .iv-whatif-reveal {
          animation: iv-whatif-in 320ms ease-out;
        }
        @keyframes iv-whatif-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .iv-whatif-busy {
          opacity: 0.55;
          transition: opacity 150ms ease-out;
          animation: iv-whatif-pulse 1.1s ease-in-out infinite;
        }
        @keyframes iv-whatif-pulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.78; }
        }
        @media (prefers-reduced-motion: reduce) {
          .iv-whatif-reveal { animation: none !important; }
          .iv-whatif-busy { animation: none !important; opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
