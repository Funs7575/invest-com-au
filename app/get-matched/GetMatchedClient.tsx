"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Icon from "@/components/Icon";
import type {
  ActionPlan,
  ActionPlanAnswers,
  QuestionDef,
  ResultTemplate,
} from "@/lib/getmatched/types";

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
  share_token: string;
  session_id: string;
  next: NextStep;
}

interface AnswerResponse {
  plan_id: number;
  next: NextStep;
}

interface ResolveResponse {
  plan: ActionPlan;
  template: ResultTemplate;
  recommended_brief_template: string | null;
  accept_credits_cost: number | null;
  recommended_providers: { kind: string; id: number }[];
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
  const [error, setError] = useState<ErrorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ResolveResponse | null>(null);

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
      if (data.next.done) {
        await resolve(data.plan_id);
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Failed to start.",
      });
    } finally {
      setLoading(false);
    }
  }, [props.initialMode, startPrefill]);

  useEffect(() => {
    void start();
  }, [start]);

  async function submitAnswer(value: ActionPlanAnswers[string]) {
    if (!planId || !step || step.done) return;
    setSubmitting(true);
    setError(null);
    const slug = step.question.slug;
    const mapsTo = step.question.maps_to;
    const nextAnswers = { ...answers, [slug]: value, [mapsTo]: value };
    setAnswers(nextAnswers);
    try {
      const res = await fetch("/api/get-matched/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          question_slug: slug,
          value,
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
      setStep(data.next);
      if (data.next.done) {
        await resolve(planId);
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Failed to save answer.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function resolve(id: number) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/get-matched/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: id }),
      });
      const data = (await res.json()) as ResolveResponse | ErrorResponse;
      if (!res.ok || !("plan" in data)) {
        const errData = data as ErrorResponse;
        setError({
          message: errData.error ?? "Failed to resolve.",
          code: errData.code,
          detail: errData.detail,
        });
        return;
      }
      setResult(data);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Failed to resolve.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-slate-500">Building your plan…</div>
      </div>
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
        onChecklistToggle={async (index) => {
          if (!planId) return;
          await fetch(`/api/get-matched/plans/${planId}/checklist`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ index }),
          });
        }}
        onSaveByEmail={async (email) => {
          if (!planId) return null;
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
          if (!planId) return;
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
      onAnswer={(value) => void submitAnswer(value)}
    />
  );
}

// ─── Question screen ──────────────────────────────────────────────────────

function QuestionScreen({
  step,
  answers,
  submitting,
  onAnswer,
}: {
  step: { done: false; question: QuestionDef; totalSteps: number; currentStep: number };
  answers: ActionPlanAnswers;
  submitting: boolean;
  onAnswer: (value: ActionPlanAnswers[string]) => void;
}) {
  const { question, totalSteps, currentStep } = step;
  const progress = Math.max(0, Math.min(100, (currentStep / totalSteps) * 100));

  // The selected-multi state is keyed on `question.slug` so React resets it
  // when we navigate to a new question — no setState-in-effect needed.
  const initialSelected = (() => {
    const v = answers[question.slug];
    return Array.isArray(v) ? (v as string[]) : [];
  })();
  const [selectedMulti, setSelectedMulti] = useState<string[]>(initialSelected);

  const intentSummary = (answers.intent as string | undefined) ?? null;
  const helpSummary = (answers.help_preference as string | undefined) ?? null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Mobile progress */}
        <div className="lg:hidden mb-4">
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-1 bg-amber-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">
            Step {currentStep} of {totalSteps} · No account needed yet
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_320px] gap-6 lg:gap-10">
          {/* LEFT — progress + reassurance */}
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-3">
                <div
                  className="h-1 bg-amber-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">
                Step {currentStep} of {totalSteps}
              </p>
              <ul className="text-xs text-slate-500 space-y-2">
                <li className="flex items-start gap-2">
                  <Icon name="check" size={12} className="mt-0.5 text-emerald-600 shrink-0" />
                  No account needed yet
                </li>
                <li className="flex items-start gap-2">
                  <Icon name="check" size={12} className="mt-0.5 text-emerald-600 shrink-0" />
                  General information only
                </li>
                <li className="flex items-start gap-2">
                  <Icon name="check" size={12} className="mt-0.5 text-emerald-600 shrink-0" />
                  You stay in control
                </li>
                <li className="flex items-start gap-2">
                  <Icon name="check" size={12} className="mt-0.5 text-emerald-600 shrink-0" />
                  Providers deliver under their own licence
                </li>
              </ul>
            </div>
          </aside>

          {/* CENTRE — question card */}
          <main>
            <article
              key={question.slug}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 transition-all duration-200"
              style={{ animation: "iv-fade-in 200ms ease-out" }}
            >
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                {question.prompt}
              </h1>
              {question.subtitle && (
                <p className="text-sm text-slate-500 mb-6">{question.subtitle}</p>
              )}
              {(question.kind === "select" || question.kind === "contextual") && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {question.options.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => onAnswer(opt.value)}
                      disabled={submitting}
                      className={`text-left rounded-xl border p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        answers[question.slug] === opt.value
                          ? "border-amber-500 bg-amber-50 ring-2 ring-amber-300"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      <p className="text-sm font-semibold text-slate-900">
                        {opt.label}
                      </p>
                    </button>
                  ))}
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
                            {checked && (
                              <Icon name="check" size={12} className="text-white" />
                            )}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
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
                <TextInput
                  initial={typeof answers[question.slug] === "string" ? (answers[question.slug] as string) : ""}
                  onSubmit={(v) => onAnswer(v)}
                  disabled={submitting}
                />
              )}
              {question.kind === "number" && (
                <NumberInput
                  initial={typeof answers[question.slug] === "number" ? (answers[question.slug] as number) : null}
                  onSubmit={(v) => onAnswer(v)}
                  disabled={submitting}
                />
              )}
            </article>

            <p className="lg:hidden text-[10px] text-slate-400 mt-3 text-center">
              General information only · You stay in control
            </p>
          </main>

          {/* RIGHT — live action plan preview */}
          <aside className="hidden lg:block">
            <div
              className="sticky top-6 rounded-2xl border border-slate-200 p-5 bg-gradient-to-br from-slate-50 to-white"
              aria-live="polite"
            >
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                Your plan so far
              </p>
              <ul className="text-sm space-y-1.5">
                {intentSummary && (
                  <li className="text-slate-900">
                    <strong>Goal:</strong> {humanise(intentSummary)}
                  </li>
                )}
                {helpSummary && (
                  <li className="text-slate-700">
                    <strong>Likely route:</strong> {humanise(helpSummary)}
                  </li>
                )}
                {(answers.budget_band as string | undefined) && (
                  <li className="text-slate-700">
                    <strong>Budget:</strong> {humanise(answers.budget_band as string)}
                  </li>
                )}
                {(answers.timeline as string | undefined) && (
                  <li className="text-slate-700">
                    <strong>Timeline:</strong> {humanise(answers.timeline as string)}
                  </li>
                )}
                {!intentSummary && (
                  <li className="text-slate-400 italic">
                    Answer the questions and your action plan appears here.
                  </li>
                )}
              </ul>
            </div>
          </aside>
        </div>
      </div>
      <style>{`
        @keyframes iv-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="iv-fade-in"] { animation: none !important; }
        }
      `}</style>
    </div>
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

function humanise(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Action plan result screen ────────────────────────────────────────────

function ActionPlanScreen({
  result,
  shareToken,
  onChecklistToggle,
  onSaveByEmail,
  onCreateBrief,
  onRestart,
}: {
  result: ResolveResponse;
  shareToken: string | null;
  onChecklistToggle: (index: number) => Promise<void>;
  onSaveByEmail: (email: string) => Promise<string | null>;
  onCreateBrief: () => void;
  onRestart: () => void;
}) {
  const { plan, template, accept_credits_cost } = result;
  const [checklist, setChecklist] = useState(plan.checklist);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isRiskHeld =
    plan.risk_severity === "review" || plan.risk_severity === "block";

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
  const recommendedBriefHref =
    result.recommended_brief_template && plan.id
      ? `/briefs/new?plan_id=${plan.id}`
      : primary?.href ?? "/";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADLINE STRIP */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <p className="text-amber-400 text-[11px] font-semibold uppercase tracking-widest mb-2">
            Your Investment Action Plan
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3">
            {plan.goal ?? template.headline}
          </h1>
          <p className="text-slate-300 max-w-2xl leading-relaxed">
            {template.why_text}
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
            <p className="font-semibold mb-1">Quick compliance check</p>
            <p>
              Your answers mention topics that need a brief review. If you create a brief from this plan, we&apos;ll hold it for review before routing it to providers — usually within a business day.
            </p>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 mb-6">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 mb-3">
            <Icon name="check-circle" size={12} />
            Recommended route · {humanise(plan.route ?? "guide")}
          </span>

          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            Your checklist
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Educational steps based on your answers — Invest.com.au never gives personal advice.
          </p>
          <ul className="space-y-2 mb-6">
            {checklist.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => void toggle(idx)}
                  aria-pressed={!!item.done}
                  className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    item.done
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {item.done && (
                    <Icon name="check" size={12} className="text-white" />
                  )}
                </button>
                <span
                  className={`text-sm ${
                    item.done ? "text-slate-400 line-through" : "text-slate-700"
                  }`}
                >
                  {item.href ? (
                    <Link href={item.href} className="hover:underline">
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            {result.recommended_brief_template ? (
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

        {/* Save your plan strip */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <p className="font-semibold text-slate-900 mb-1">
            Want to save this action plan or send a brief to verified professionals?
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
                type="email"
                placeholder="you@example.com"
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
                href="/auth/sign-up"
                className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-800 font-semibold text-sm px-5 py-2.5 rounded-lg hover:border-slate-300"
              >
                Create free account
              </Link>
            </div>
          )}
          {saveError && (
            <p className="mt-2 text-xs text-red-700">{saveError}</p>
          )}
          {shareToken && !savedUrl && (
            <p className="mt-3 text-[11px] text-slate-400">
              Direct link:{" "}
              <Link href={`/plans/${shareToken}`} className="underline">
                /plans/{shareToken.slice(0, 8)}…
              </Link>
            </p>
          )}
        </section>

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
    </div>
  );
}
