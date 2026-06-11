"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import Icon from "@/components/Icon";
import { trackEvent } from "@/lib/tracking";
import { trackEvent as phTrack } from "@/lib/posthog/events";
import { submitLead } from "@/lib/submit-lead-client";
import { isCrossBorderSpecialty } from "@/lib/advisor-billing-multipliers";
import { browseAdvisorsHref } from "@/lib/find-advisor/browse-link";
import { formatCountdown, secondsRemaining } from "@/lib/format-countdown";
import EligibilityQuizSkipBanner from "@/components/EligibilityQuizSkipBanner";
import CountryRuleAlerts from "@/components/CountryRuleAlerts";
import {
  SHOW_GENERIC_VERIFIED,
  SHOW_ADVISOR_RATINGS,
  SHOW_ADVISOR_VERIFIED_BADGE,
} from "@/lib/compliance-config";
import { INTENT_COUNTRY_COOKIE, INTENT_COUNTRY_TTL_SECONDS } from "@/lib/intent-context";
import {
  type Intent,
  INTENT_OPTIONS,
  CONTEXT_CONFIG,
  toggleContextSelection,
  STATES,
  BUDGETS,
  budgetLabelForIntent,
  TIMELINE_OPTIONS,
  timelineContextId,
  OVERSEAS_COUNTRY_OPTIONS,
  overseasSpecialtyFor,
  isOverseasCorridor,
  overseasCountryName,
  overseasCountryIso,
  intentToNeed,
  NEED_TO_INTENT,
  PRIORITY_TO_NEED,
  GOAL_TO_NEED,
  isPlausiblePhone,
} from "@/lib/find-advisor/quiz-config";
import { buildMatchReasons, matchedSpecialties } from "@/lib/find-advisor/match-reasons";
import {
  saveQuizProgress,
  loadQuizProgress,
  clearQuizProgress,
  type QuizProgress,
} from "@/lib/find-advisor/progress-storage";

// ADV-015: OTP codes are valid for 10 minutes server-side; mirror that for the
// expiry countdown. Resend is gated for a short cooldown to discourage spamming
// the rate-limited send endpoint, then re-enabled.
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

// ─── Types ─────────────────────────────────────────────────────────────────

interface HandoffHolding {
  ticker: string;
  exchange: string;
  shares: number;
  cost_basis_per_share_cents: number;
  acquired_at: string;
  broker_slug: string | null;
  notes: string | null;
}

interface HandoffData {
  intent: string;
  holdings: HandoffHolding[];
  created_at: string;
}

interface MatchedAdvisor {
  id: number;
  slug: string;
  name: string;
  firm_name: string | null;
  type: string;
  photo_url: string | null;
  rating: number;
  review_count: number;
  location_display: string | null;
  /** AU state code ("NSW") the advisor is based in — used for the
   *  local-vs-remote match reason. Present in the API match payload. */
  location_state?: string | null;
  specialties: string[];
  fee_description: string | null;
  verified: boolean;
  /** Used by the response-time badge — null when no leads have been logged yet. */
  avg_response_minutes?: number | null;
  /** Lowercase ISO codes of corridors the advisor serves (cross-border). */
  available_in_countries?: string[] | null;
}

interface QuizState {
  step: number;
  intent: Intent | null;
  context: string[];
  state: string;
  postcode: string;
  suburb: string;
  budget: string;
  /** Optional urgency signal — "asap" | "weeks" | "research" | "". */
  timeline: string;
  /** True when the user told us they live outside Australia. */
  overseas: boolean;
  /** Intent-country code ("uk") or "other" when overseas. */
  country: string;
  firstName: string;
  email: string;
  phone: string;
  consent: boolean;
}

/** The PII-free slice of QuizState that may be persisted to localStorage. */
function toProgress(quiz: QuizState): QuizProgress {
  return {
    step: quiz.step,
    intent: quiz.intent,
    context: quiz.context,
    state: quiz.state,
    postcode: quiz.postcode,
    suburb: quiz.suburb,
    budget: quiz.budget,
    timeline: quiz.timeline,
    overseas: quiz.overseas,
    country: quiz.country,
  };
}

// ─── Session persistence helpers ─────────────────────────────────────────────

const STORAGE_KEY = "invest_quiz_match";

interface PersistedMatch {
  matchedAdvisors: MatchedAdvisor[];
  excludeIds: number[];
  leadIds: number[];
  confirmedAdvisorId: number | null;
  quizData: {
    intent: string;
    context: string[];
    state: string;
    postcode: string;
    suburb: string;
    budget: string;
    timeline?: string;
    overseas?: boolean;
    country?: string;
    firstName: string;
    email: string;
  };
  timestamp: number;
}

function saveMatchToStorage(data: PersistedMatch) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

function loadMatchFromStorage(): PersistedMatch | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedMatch;
    // Expire after 1 hour
    if (Date.now() - data.timestamp > 60 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch { return null; }
}

function clearMatchStorage() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

// In-progress quiz persistence (ADV-008) lives in
// lib/find-advisor/progress-storage.ts — PII-free by construction and
// restore-capped at step 3. Question/option config + intent maps live in
// lib/find-advisor/quiz-config.ts.

// ─── Matchmaker bridge ────────────────────────────────────────────────────────
// Maps the /start matchmaker priority answers to find-advisor intents so users
// arriving from the unified funnel (without a ?need= param) are pre-qualified.

function getMatchmakerIntent(): Intent | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem("invest-matchmaker-result");
    if (!raw) return null;
    const data = JSON.parse(raw) as { answers?: Record<string, string>; type?: string; completedAt?: string };
    // Only use if completed within the last 30 minutes
    if (!data.completedAt || Date.now() - new Date(data.completedAt).getTime() > 30 * 60 * 1000) return null;
    // Only apply when matchmaker routed to advisor or both paths
    if (data.type !== "advisor" && data.type !== "both") return null;
    const answers = data.answers ?? {};
    const needKey = PRIORITY_TO_NEED[answers.priority ?? ""] ?? GOAL_TO_NEED[answers.goal ?? ""] ?? null;
    return needKey ? (NEED_TO_INTENT[needKey] ?? null) : null;
  } catch { return null; }
}

// ─── Handoff Banner ───────────────────────────────────────────────────────────

/**
 * Renders a read-only "Shared by the investor" summary card when the page
 * is opened with a ?handoff=<token> query param.
 *
 * Fetches the token from the public API endpoint (GET /api/account/holdings/
 * handoff/[token]). The token is single-use and expires in 14 days.
 */
function HandoffBanner({ token }: { token: string }) {
  const [data, setData] = useState<HandoffData | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) return;
    void fetch(`/api/account/holdings/handoff/${encodeURIComponent(token)}`, {
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (!res.ok) { setStatus("error"); return; }
        const json = await res.json() as HandoffData;
        setData(json);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "loading") {
    return (
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-pulse">
        Loading shared portfolio summary…
      </div>
    );
  }

  if (status === "error" || !data) {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        The shared portfolio link has expired or was already viewed. Ask the investor to generate a new one from their Holdings page.
      </div>
    );
  }

  const totalCostCents = data.holdings.reduce(
    (acc, h) => acc + Math.round(h.shares * h.cost_basis_per_share_cents),
    0,
  );

  function fmtAUD(cents: number) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency", currency: "AUD", maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  return (
    <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm">
      <div className="flex items-start gap-2 mb-3">
        <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="font-semibold text-emerald-900">Shared portfolio summary</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            This investor shared their holdings with you on{" "}
            {new Date(data.created_at).toLocaleDateString("en-AU")}.
            For their tax-year review.
          </p>
        </div>
      </div>

      {data.holdings.length === 0 ? (
        <p className="text-xs text-emerald-700">No holdings in snapshot.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-700 border-collapse" aria-label="Portfolio snapshot holdings">
            <thead>
              <tr className="border-b border-emerald-200 text-emerald-800">
                <th scope="col" className="text-left pb-1 font-semibold">Ticker</th>
                <th scope="col" className="text-left pb-1 font-semibold">Exchange</th>
                <th scope="col" className="text-right pb-1 font-semibold">Shares</th>
                <th scope="col" className="text-right pb-1 font-semibold">Cost basis</th>
                <th scope="col" className="text-right pb-1 font-semibold">Acquired</th>
              </tr>
            </thead>
            <tbody>
              {data.holdings.map((h, i) => (
                <tr key={i} className="border-b border-emerald-100 last:border-0">
                  <td className="py-1 font-semibold">{h.ticker}</td>
                  <td className="py-1 text-slate-500">{h.exchange}</td>
                  <td className="py-1 text-right">{h.shares.toLocaleString("en-AU")}</td>
                  <td className="py-1 text-right">{fmtAUD(Math.round(h.shares * h.cost_basis_per_share_cents))}</td>
                  <td className="py-1 text-right text-slate-500">{h.acquired_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalCostCents > 0 && (
        <p className="mt-2 text-xs text-emerald-800 font-semibold text-right">
          Total cost basis: {fmtAUD(totalCostCents)}
        </p>
      )}

      <p className="mt-3 text-[0.65rem] text-emerald-600">
        General information only — cost basis figures are investor-reported. Always verify against brokerage statements before preparing a tax return.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FindAdvisorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white py-8 md:py-16"><div className="max-w-xl mx-auto px-4 text-center text-slate-500 text-sm">Loading quiz...</div></div>}>
      <FindAdvisorQuiz />
    </Suspense>
  );
}

function FindAdvisorQuiz() {
  const searchParams = useSearchParams();
  const needParam = searchParams.get("need");
  const handoffToken = searchParams.get("handoff");
  const prefilledIntent = needParam ? NEED_TO_INTENT[needParam] || null : null;

  // LX-04 — pre-filled form params from hub CTAs, calculators, onboarding results.
  // CM-01 — context pre-fill from life-event matcher (?context=first_home,investment).
  const stateParam = searchParams.get("state");
  const postcodeParam = searchParams.get("postcode");
  const budgetParam = searchParams.get("budget");
  const firstNameParam = searchParams.get("first_name");
  const contextParam = searchParams.get("context");
  // Cross-border Phase A — pre-filter advisor pool by specialty when the
  // user arrives from a country page (/foreign-investment/uk → ?specialty=
  // UK+Pension+Transfer). Validated against the cross-border specialty
  // taxonomy in lib/advisor-billing-multipliers.ts; any other value is
  // ignored to keep this URL surface narrow.
  const specialtyParam = searchParams.get("specialty");
  const preferredSpecialty = isCrossBorderSpecialty([specialtyParam ?? ""])
    ? specialtyParam ?? undefined
    : undefined;

  // Read sessionStorage once synchronously so all lazy initialisers share the same
  // parsed value — avoids 5 separate JSON.parse calls and, crucially, avoids the
  // two-render flash (step-1 paint → useEffect → step-5 repaint).
  const _savedMatch = typeof sessionStorage !== "undefined" ? loadMatchFromStorage() : null;
  const savedMatch = _savedMatch && _savedMatch.matchedAdvisors.length > 0 ? _savedMatch : null;

  // ADV-008: in-progress answers persisted to localStorage. Only offer a resume
  // when there's no completed match to restore and the user actually got past
  // the first step. Read in a mount effect (not synchronously) — the banner is
  // additive UI, and a synchronous read makes the server- and client-rendered
  // trees disagree, which React reports as a hydration error.
  const [resumableQuiz, setResumableQuiz] = useState<QuizProgress | null>(null);
  useEffect(() => {
    if (savedMatch) return;
    const p = loadQuizProgress();
    if (p && p.step > 1) {
      setResumableQuiz(p);
      setShowResumePrompt(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only storage read
  }, []);

  // If no explicit ?need= param, check whether the user just came through the
  // /start matchmaker and use that context to pre-fill their intent.
  const matchmakerIntent = !prefilledIntent ? getMatchmakerIntent() : null;
  const initialIntent = prefilledIntent ?? matchmakerIntent ?? null;

  const [quiz, setQuiz] = useState<QuizState>(() => {
    if (savedMatch) {
      return {
        // Confirmed → the post-lead screen; otherwise back to the preview
        // (contact+OTP now comes AFTER the preview — §5.6).
        step: savedMatch.confirmedAdvisorId ? 6 : 4,
        intent: (savedMatch.quizData.intent as Intent) ?? (initialIntent ?? null),
        context: savedMatch.quizData.context ?? [],
        state: savedMatch.quizData.state ?? "",
        postcode: savedMatch.quizData.postcode ?? "",
        suburb: savedMatch.quizData.suburb ?? "",
        budget: savedMatch.quizData.budget ?? "",
        timeline: savedMatch.quizData.timeline ?? "",
        overseas: savedMatch.quizData.overseas ?? false,
        country: savedMatch.quizData.country ?? "",
        firstName: savedMatch.quizData.firstName ?? "",
        email: savedMatch.quizData.email ?? "",
        phone: "",
        consent: false,
      };
    }
    return {
      step: initialIntent ? 2 : 1,
      intent: initialIntent,
      // CM-01: pre-select context from life-event matcher (?context=first_home,income_protection,…)
      context: contextParam ? contextParam.split(",").filter(Boolean) : [],
      // LX-04: seed state/postcode/budget/firstName from URL so Step 3 + Step 4
      // are pre-populated when the user reaches them — reduces form friction.
      state: stateParam ?? "",
      postcode: postcodeParam ?? "",
      suburb: "",
      budget: budgetParam ?? "",
      timeline: "",
      overseas: false,
      country: "",
      firstName: firstNameParam ?? "",
      email: "", phone: "", consent: false,
    };
  });

  // Handle late searchParams changes (e.g. client-side navigation)
  const [appliedNeed, setAppliedNeed] = useState<string | null>(needParam);
  useEffect(() => {
    if (needParam && needParam !== appliedNeed) {
      const intent = NEED_TO_INTENT[needParam] || null;
      if (intent) {
        setQuiz(prev => ({
          ...prev,
          step: 2,
          intent,
          context: contextParam ? contextParam.split(",").filter(Boolean) : [],
          // Re-apply pre-fill params on navigation changes too
          state: stateParam ?? prev.state,
          postcode: postcodeParam ?? prev.postcode,
          budget: budgetParam ?? prev.budget,
          firstName: firstNameParam ?? prev.firstName,
        }));
        setAppliedNeed(needParam);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- other params are intentionally read at apply-time only, not re-applied on every change.
  }, [needParam, appliedNeed]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(!!savedMatch);
  // ADV-008: whether the "Resume your quiz" banner should still show. Hidden
  // once the user resumes or dismisses it.
  const [showResumePrompt, setShowResumePrompt] = useState(!!resumableQuiz);
  const [matchedAdvisors, setMatchedAdvisors] = useState<MatchedAdvisor[]>(() => savedMatch?.matchedAdvisors ?? []);
  const [excludeIds, setExcludeIds] = useState<number[]>(() => savedMatch?.excludeIds ?? []);
  const [leadIds, setLeadIds] = useState<number[]>(() => savedMatch?.leadIds ?? []);
  const [confirming, setConfirming] = useState(false);
  const [confirmedAdvisorId, setConfirmedAdvisorId] = useState<number | null>(() => savedMatch?.confirmedAdvisorId ?? null);
  const [noMoreMatches, setNoMoreMatches] = useState(false);
  // The previewed advisor the user clicked "Connect" on — the contact+OTP step
  // confirms THIS advisor (one lead, one advisor) once the email verifies.
  const [pendingAdvisor, setPendingAdvisor] = useState<MatchedAdvisor | null>(null);
  const [rematching, setRematching] = useState(false);
  const [otpStage, setOtpStage] = useState<"idle" | "sending" | "sent" | "verifying">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  // Tracks whether THIS session wrote the corridor cookie (overseas path),
  // so restart can clean it up without clobbering a cookie set elsewhere.
  const corridorCookieSetRef = useRef(false);
  // ADV-015: OTP expiry countdown + resend cooldown. Codes are valid for 10 min
  // server-side; the resend button is gated for a short cooldown then re-enabled.
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpResendAt, setOtpResendAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Tick once a second while a code is outstanding so the countdown and the
  // resend-cooldown derived values stay live. Stops at expiry to avoid a
  // permanent interval.
  const otpPanelActive = otpStage === "sent" || otpStage === "verifying";
  useEffect(() => {
    if (!otpPanelActive || otpExpiresAt == null) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [otpPanelActive, otpExpiresAt]);

  const otpSecondsLeft = otpExpiresAt ? secondsRemaining(otpExpiresAt, nowMs) : 0;
  const otpExpired = otpExpiresAt != null && otpSecondsLeft <= 0;
  const otpCanResend = otpResendAt == null || nowMs >= otpResendAt;
  const otpResendInSeconds = otpResendAt ? secondsRemaining(otpResendAt, nowMs) : 0;

  // ADV-008: persist in-progress answers so the quiz can be resumed later.
  // Skip the pristine step-1 state and stop once a match is submitted (the
  // match payload owns that lifecycle, and we clear progress on success).
  useEffect(() => {
    if (submitted) return;
    if (quiz.step > 1) saveQuizProgress(quiz);
  }, [quiz, submitted]);

  const currentMatch = matchedAdvisors.length > 0 ? matchedAdvisors[matchedAdvisors.length - 1] : null;

  const update = useCallback((updates: Partial<QuizState>) => {
    setQuiz((prev) => {
      const next = { ...prev, ...updates };
      // ADV-025: sync localStorage on every state update so progress is always current
      if (next.step >= 1 && next.step <= 4 && next.intent) {
        saveQuizProgress(toProgress(next));
      } else if (next.step >= 5) {
        clearQuizProgress();
      }
      return next;
    });
  }, []);

  // ADV-008: also save on mount in case quiz was initialised from URL params
  useEffect(() => {
    if (quiz.step >= 1 && quiz.step <= 4 && quiz.intent) {
      saveQuizProgress(toProgress(quiz));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // §5.8 funnel analytics — mirrors /get-matched's events so drop-off and the
  // preview-before-OTP change are measurable per step. Option keys only.
  const funnelStartedAtRef = useRef<number>(Date.now());
  useEffect(() => {
    phTrack("funnel_started", {
      funnel: "find_advisor",
      source_page: typeof window !== "undefined" ? window.location.pathname : "/find-advisor",
      mode: preferredSpecialty ?? null,
      prefilled: !!initialIntent,
      resumed: !!savedMatch || !!resumableQuiz,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only funnel start
  }, []);

  const phStep = (stepIndex: number, slug: string, answer: string) =>
    phTrack("funnel_step_answered", {
      funnel: "find_advisor",
      step_slug: slug,
      step_index: stepIndex,
      total_steps: 4,
      answer: answer.slice(0, 60),
    });

  // A11y: when the step changes, move focus to the step container so
  // keyboard and screen-reader users land on the new content instead of
  // a button that no longer exists. Skipped on first paint.
  const stepContainerRef = useRef<HTMLDivElement | null>(null);
  const prevStepRef = useRef(quiz.step);
  useEffect(() => {
    if (prevStepRef.current !== quiz.step) {
      prevStepRef.current = quiz.step;
      window.scrollTo({ top: 0, behavior: "smooth" });
      stepContainerRef.current?.focus({ preventScroll: true });
    }
  }, [quiz.step]);

  const restart = () => {
    setQuiz({ step: 1, intent: null, context: [], state: "", postcode: "", suburb: "", budget: "", timeline: "", overseas: false, country: "", firstName: "", email: "", phone: "", consent: false });
    setErrors({}); setSubmitError(null); setSubmitted(false);
    setMatchedAdvisors([]); setExcludeIds([]); setNoMoreMatches(false);
    setPendingAdvisor(null);
    setShowResumePrompt(false);
    clearMatchStorage();
    clearQuizProgress(); // ADV-008
    // If this session set the cross-border corridor cookie, clear it too —
    // a restarted (possibly domestic) quiz shouldn't inherit the corridor.
    if (corridorCookieSetRef.current) {
      document.cookie = `${INTENT_COUNTRY_COOKIE}=; path=/; max-age=0; samesite=lax`;
      corridorCookieSetRef.current = false;
    }
  };

  // ADV-008: restore a previously-saved in-progress quiz. The storage module
  // caps the restored step at 3 (the last form step) so we never resume into
  // a stale match preview.
  const resumeQuiz = () => {
    if (!resumableQuiz) return;
    setQuiz((prev) => ({ ...prev, ...resumableQuiz }));
    setShowResumePrompt(false);
    setErrors({});
    trackEvent("find_advisor_resume", { step: resumableQuiz.step }, "/find-advisor");
  };

  const dismissResume = () => {
    setShowResumePrompt(false);
    clearQuizProgress();
  };

  const handleIntent = (intent: Intent) => {
    update({ intent, step: 2, context: [] });
    setErrors({});
    trackEvent("find_advisor_step1", { intent }, "/find-advisor");
    phStep(1, "intent", intent);
  };

  const toggleContext = (id: string, isRadio: boolean) => {
    setQuiz((prev) => ({
      ...prev,
      // Not-sure exclusivity lives in quiz-config so it's unit-tested:
      // picking "I'm not sure" clears concrete options and vice versa.
      context: toggleContextSelection(prev.context, id, isRadio),
    }));
  };

  const handleStep2Next = () => {
    if (quiz.context.length === 0) { setErrors({ context: "Please select at least one option" }); return; }
    setErrors({});
    update({ step: 3 });
    trackEvent("find_advisor_step2", { context: quiz.context }, "/find-advisor");
    phStep(2, "context", quiz.context.join(","));
  };

  // §5.6: show the match preview BEFORE asking for contact details. The
  // dry-run match needs no PII (the API allows a contact-less dry run), so
  // the user sees who they'd be connected with before any wall.
  const handleStep3Next = async () => {
    if (quiz.overseas) {
      if (!quiz.country) { setErrors({ state: "Please select where you live" }); return; }
    } else if (!quiz.state) {
      setErrors({ state: "Please enter a postcode or select your state or territory" });
      return;
    }
    setErrors({});
    // Overseas corridor: persist the intent-country cookie so the matcher's
    // corridor boost (and every country-aware surface) recognises the user.
    // Same-origin fetches below carry the cookie on this very request.
    if (quiz.overseas && isOverseasCorridor(quiz.country)) {
      document.cookie = `${INTENT_COUNTRY_COOKIE}=${quiz.country}; path=/; max-age=${INTENT_COUNTRY_TTL_SECONDS}; samesite=lax`;
      corridorCookieSetRef.current = true;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const data = await findMatch([]);
      if (data.matched) {
        const advisor = data.matched as MatchedAdvisor;
        setMatchedAdvisors([advisor]);
        setExcludeIds([advisor.id]);
        setLeadIds([]);
        setConfirmedAdvisorId(null);
        saveMatchToStorage({
          matchedAdvisors: [advisor],
          excludeIds: [advisor.id],
          leadIds: [],
          confirmedAdvisorId: null,
          quizData: {
            intent: quiz.intent || "",
            context: quiz.context,
            state: quiz.state,
            postcode: quiz.postcode,
            suburb: quiz.suburb,
            budget: quiz.budget,
            firstName: quiz.firstName,
            email: quiz.email,
          },
          timestamp: Date.now(),
        });
      } else {
        // No match — the preview screen renders its honest empty state.
        setMatchedAdvisors([]);
        setNoMoreMatches(true);
      }
      update({ step: 4 });
      trackEvent("find_advisor_match_previewed", {
        intent: quiz.intent,
        matched: !!data.matched,
        overseas: quiz.overseas || undefined,
        timeline: quiz.timeline || undefined,
      }, "/find-advisor");
      phStep(3, "location", quiz.overseas ? `overseas:${quiz.country}` : quiz.state);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /** Preview → "Connect with {advisor}": remember the pick, then collect
   *  verified contact details at the side-effecting confirm (step 5). */
  const handleConnectClick = (advisor: MatchedAdvisor) => {
    setPendingAdvisor(advisor);
    setSubmitError(null);
    update({ step: 5 });
    trackEvent("find_advisor_connect_clicked", { intent: quiz.intent, advisor: advisor.slug }, "/find-advisor");
  };

  // The specialty preference: an explicit ?specialty= URL param wins;
  // otherwise the overseas path derives one from intent + country
  // (FIRB for property buyers, pension/expat corridors where they exist).
  const effectiveSpecialty =
    preferredSpecialty ??
    (quiz.overseas ? overseasSpecialtyFor(quiz.intent, quiz.country) : undefined);

  /** Lead payload shared by the dry-run preview and the confirm call. */
  const buildLeadPayload = () => ({
    lead_type: "advisor" as const,
    user_email: quiz.email.trim(),
    user_name: quiz.firstName.trim(),
    user_phone: quiz.phone.trim() || undefined,
    // Overseas users have no AU state — the matcher's any-state fallback
    // plus the corridor cookie route them to remote-capable advisors.
    user_location_state: quiz.overseas ? "" : quiz.state,
    user_postcode: (!quiz.overseas && quiz.postcode) || undefined,
    user_suburb: (!quiz.overseas && quiz.suburb) || undefined,
    user_intent: {
      need: intentToNeed(quiz.intent!),
      // timeline_* ids are lead-quality signals: ignored by the server's
      // type resolver, surfaced to the advisor with the enquiry.
      context: quiz.timeline
        ? [...quiz.context, timelineContextId(quiz.timeline as "asap" | "weeks" | "research")]
        : quiz.context,
      budget: quiz.budget,
    },
    source_page: effectiveSpecialty
      ? `/find-advisor?specialty=${effectiveSpecialty}`
      : "/find-advisor",
    preferred_specialty: effectiveSpecialty,
  });

  /** Find a matching advisor WITHOUT creating a lead or sending any emails (dry run). */
  const findMatch = async (excludeList: number[] = []) => {
    return submitLead({
      ...buildLeadPayload(),
      exclude_advisor_ids: excludeList,
      dry_run: true,
    });
  };

  /** Confirm a previewed advisor: creates the lead and sends advisor email. */
  const confirmMatch = async (advisorId: number) => {
    return submitLead({
      ...buildLeadPayload(),
      confirm_advisor_id: advisorId,
    });
  };

  const validateStep4 = () => {
    const errs: Record<string, string> = {};
    if (!quiz.firstName.trim()) errs.firstName = "Please enter your first name";
    if (!quiz.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quiz.email)) errs.email = "Please enter a valid email";
    if (!isPlausiblePhone(quiz.phone)) errs.phone = "That phone number doesn't look right — check it or leave it blank";
    if (!quiz.consent) errs.consent = "You must agree to our Privacy Policy and Terms";
    return errs;
  };

  const handleSendOtp = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const errs = validateStep4();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setOtpError(null);
    setOtpStage("sending");
    try {
      const res = await fetch("/api/verify-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: quiz.email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error || "Failed to send code."); setOtpStage("idle"); return; }
      const sentAt = Date.now();
      setOtpExpiresAt(sentAt + OTP_TTL_MS);
      setOtpResendAt(sentAt + OTP_RESEND_COOLDOWN_MS);
      setNowMs(sentAt);
      setOtpStage("sent");
      phStep(4, "contact", "contact_submitted"); // no PII in analytics
    } catch {
      setOtpError("Network error. Please try again.");
      setOtpStage("idle");
    }
  };

  const handleVerifyAndSubmit = async () => {
    if (otpCode.trim().length !== 6) { setOtpError("Please enter the 6-digit code."); return; }
    setOtpError(null);
    setOtpStage("verifying");
    try {
      const res = await fetch("/api/verify-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: quiz.email.trim(), code: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setOtpError(data.error || "Incorrect code."); setOtpStage("sent"); return; }
    } catch {
      setOtpError("Network error. Please try again.");
      setOtpStage("sent");
      return;
    }
    // OTP verified at the side-effecting moment (§5.6): the user has already
    // seen and chosen their advisor on the preview step — create the lead now.
    const advisor = pendingAdvisor ?? currentMatch;
    if (!advisor) {
      setOtpError("Your matched advisor expired — please go back and rematch.");
      setOtpStage("sent");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      const data = await confirmMatch(advisor.id);
      if (!data.lead_id) {
        throw new Error((data as { error?: string }).error || "Couldn't confirm. Please try again.");
      }
      setConfirmedAdvisorId(advisor.id);
      setLeadIds([data.lead_id as number]);
      saveMatchToStorage({
        matchedAdvisors,
        excludeIds,
        leadIds: [data.lead_id as number],
        confirmedAdvisorId: advisor.id,
        quizData: {
          intent: quiz.intent || "",
          context: quiz.context,
          state: quiz.state,
          postcode: quiz.postcode,
          suburb: quiz.suburb,
          budget: quiz.budget,
          firstName: quiz.firstName,
          email: quiz.email,
        },
        timestamp: Date.now(),
      });
      setSubmitted(true);
      update({ step: 6 });
      clearQuizProgress(); // ADV-008: quiz finished — drop the resume snapshot.
      trackEvent("find_advisor_confirmed", { intent: quiz.intent, advisor: advisor.slug }, "/find-advisor");
      trackEvent("find_advisor_complete", { intent: quiz.intent, matched: true }, "/find-advisor");
      phTrack("funnel_resolved", {
        funnel: "find_advisor",
        outcome: "lead_confirmed",
        advisor_type: quiz.intent ? intentToNeed(quiz.intent) : null,
        match_count: matchedAdvisors.length,
        step_count: 4,
        time_taken_seconds: Math.round((Date.now() - funnelStartedAtRef.current) / 1000),
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Legacy direct-confirm (used by the confirmed screen's internals if ever
  // re-triggered); the primary path now confirms inside handleVerifyAndSubmit.
  const handleConfirm = async (advisor: MatchedAdvisor) => {
    setConfirming(true);
    setSubmitError(null);
    try {
      const data = await confirmMatch(advisor.id);
      if (data.lead_id) {
        setConfirmedAdvisorId(advisor.id);
        setLeadIds([data.lead_id as number]);
        saveMatchToStorage({
          matchedAdvisors,
          excludeIds,
          leadIds: [data.lead_id as number],
          confirmedAdvisorId: advisor.id,
          quizData: {
            intent: quiz.intent || "",
            context: quiz.context,
            state: quiz.state,
            postcode: quiz.postcode,
            suburb: quiz.suburb,
            budget: quiz.budget,
            firstName: quiz.firstName,
            email: quiz.email,
          },
          timestamp: Date.now(),
        });
        trackEvent("find_advisor_confirmed", { intent: quiz.intent, advisor: advisor.slug }, "/find-advisor");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Couldn't confirm. Please try again.");
    } finally {
      setConfirming(false);
    }
  };

  const handleRematch = async () => {
    setRematching(true);
    setSubmitError(null);

    try {
      // dry_run: find next advisor preview without creating any lead or sending emails
      const data = await findMatch(excludeIds);

      if (data.no_more_matches) {
        setNoMoreMatches(true);
        trackEvent("find_advisor_no_more_matches", { intent: quiz.intent, matched_count: matchedAdvisors.length }, "/find-advisor");
      } else if (data.matched) {
        const advisor = data.matched as MatchedAdvisor;
        const newAdvisors = [...matchedAdvisors, advisor];
        const newExclude = [...excludeIds, advisor.id];
        setMatchedAdvisors(newAdvisors);
        setExcludeIds(newExclude);
        setConfirmedAdvisorId(null); // new preview — not yet confirmed
        saveMatchToStorage({
          matchedAdvisors: newAdvisors,
          excludeIds: newExclude,
          leadIds, // unchanged — no new lead yet
          confirmedAdvisorId: null, // new preview — not yet confirmed
          quizData: {
            intent: quiz.intent || "",
            context: quiz.context,
            state: quiz.state,
            postcode: quiz.postcode,
            suburb: quiz.suburb,
            budget: quiz.budget,
            firstName: quiz.firstName,
            email: quiz.email,
          },
          timestamp: Date.now(),
        });
        trackEvent("find_advisor_rematch", { intent: quiz.intent, new_advisor: advisor.slug, match_number: newAdvisors.length }, "/find-advisor");
      }
    } catch {
      setSubmitError("Couldn't find another match. Please try again.");
    } finally {
      setRematching(false);
    }
  };

  const goBack = () => {
    setErrors({});
    phTrack("funnel_step_back", {
      funnel: "find_advisor",
      step_slug: ["", "intent", "context", "location", "preview", "contact"][quiz.step] ?? String(quiz.step),
      step_index: quiz.step,
    });
    update({ step: quiz.step - 1 });
  };

  /** Preview → "Edit my answers": back to the location step with every
   *  answer intact. Changing anything re-runs a fresh match on Continue. */
  const editAnswers = () => {
    setErrors({});
    setNoMoreMatches(false);
    phTrack("funnel_step_back", { funnel: "find_advisor", step_slug: "preview_edit", step_index: 4 });
    update({ step: 3 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white py-8 md:py-16">
      <div ref={stepContainerRef} tabIndex={-1} className="max-w-xl mx-auto px-4 outline-none">

        {/* Handoff banner — rendered when investor shares holdings from the holdings page */}
        {handoffToken && <HandoffBanner token={handoffToken} />}

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/advisors" className="hover:text-slate-700 transition-colors">Advisors</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">Find an Advisor</span>
        </nav>

        {/* Resume-in-progress banner (ADV-008) */}
        {showResumePrompt && resumableQuiz && quiz.step === 1 && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <Icon name="clock" size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-900">Pick up where you left off</p>
                <p className="text-xs text-amber-700">
                  You started this quiz earlier — resume to skip the questions you already answered.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="primary" onClick={resumeQuiz} className="px-4 py-2 text-sm">
                Resume quiz
              </Button>
              <button
                type="button"
                onClick={dismissResume}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 px-2 py-2"
              >
                Start fresh
              </button>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {/* Bar covers the form steps (3 questions + contact); the step-4
            match preview is a result moment, not a form step. */}
        {(quiz.step <= 3 || quiz.step === 5) && (
          <div className="mb-8">
            <ProgressBar currentStep={quiz.step <= 3 ? quiz.step : 4} totalSteps={4} />
          </div>
        )}

        {/* Step 1 */}
        {quiz.step === 1 && (
          <>
            <CountryRuleAlerts />
            <EligibilityQuizSkipBanner />
            {preferredSpecialty && (
              <div className="mb-6 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                <strong className="font-semibold">Routing you to a {preferredSpecialty} specialist.</strong>{" "}
                Cross-border matters carry more risk and effort than a domestic referral, so we
                prioritise advisors with proven track records in this specialty.
              </div>
            )}
            <Step1 onSelect={handleIntent} />
          </>
        )}

        {/* Step 2 */}
        {quiz.step === 2 && quiz.intent && (
          <Step2
            intent={quiz.intent}
            selections={quiz.context}
            onToggle={toggleContext}
            onNext={handleStep2Next}
            onBack={goBack}
            error={errors.context}
          />
        )}

        {/* Step 3 */}
        {quiz.step === 3 && (
          <Step3
            intent={quiz.intent}
            stateValue={quiz.state}
            postcodeValue={quiz.postcode}
            suburbValue={quiz.suburb}
            budgetValue={quiz.budget}
            timelineValue={quiz.timeline}
            overseas={quiz.overseas}
            countryValue={quiz.country}
            onStateChange={(v) => update({ state: v })}
            onPostcodeChange={(postcode, state, suburb) => update({ postcode, state, suburb })}
            onBudgetChange={(v) => update({ budget: v })}
            onTimelineChange={(v) => update({ timeline: v })}
            onOverseasChange={(overseas) => update(overseas ? { overseas, state: "", postcode: "", suburb: "" } : { overseas, country: "" })}
            onCountryChange={(v) => update({ country: v })}
            onNext={handleStep3Next}
            onBack={goBack}
            error={errors.state}
            submitting={submitting}
          />
        )}

        {/* Step 4: match preview (§5.6 — value BEFORE the contact wall).
            Connect → step 5 collects verified contact details. */}
        {quiz.step === 4 && (
          <MatchConfirmation
            userEmail={quiz.email}
            userFirstName={quiz.firstName}
            userIntent={quiz.intent}
            userState={quiz.state}
            userContext={quiz.context}
            overseasName={quiz.overseas ? overseasCountryName(quiz.country) : null}
            overseasIso={quiz.overseas ? overseasCountryIso(quiz.country) : null}
            currentMatch={currentMatch}
            allMatches={matchedAdvisors}
            onRematch={handleRematch}
            rematching={rematching}
            noMoreMatches={noMoreMatches}
            onRestart={restart}
            onEditAnswers={editAnswers}
            submitError={submitError}
            onConfirm={handleConnectClick}
            confirming={false}
            confirmedAdvisorId={null}
          />
        )}

        {/* Step 5: contact + email verification, at the side-effecting confirm */}
        {quiz.step === 5 && (
          <Step4
            firstName={quiz.firstName}
            email={quiz.email}
            phone={quiz.phone}
            consent={quiz.consent}
            advisorName={(pendingAdvisor ?? currentMatch)?.name ?? null}
            onChange={(f, v) => update({ [f]: v } as Partial<QuizState>)}
            onSubmit={handleSendOtp}
            onBack={goBack}
            submitting={submitting}
            errors={errors}
            submitError={submitError}
            otpStage={otpStage}
            otpCode={otpCode}
            otpError={otpError}
            onOtpCodeChange={setOtpCode}
            onOtpVerify={handleVerifyAndSubmit}
            onOtpResend={handleSendOtp}
            onEditContact={() => {
              // Typo escape hatch: unlock the contact fields without losing
              // the quiz answers or the previewed match.
              setOtpStage("idle");
              setOtpCode("");
              setOtpError(null);
              setOtpExpiresAt(null);
              setOtpResendAt(null);
            }}
            otpSecondsLeft={otpSecondsLeft}
            otpExpired={otpExpired}
            otpCanResend={otpCanResend}
            otpResendInSeconds={otpResendInSeconds}
          />
        )}

        {/* Step 6: confirmed — the lead is created and the advisor notified */}
        {quiz.step === 6 && submitted && (
          <MatchConfirmation
            userEmail={quiz.email}
            userFirstName={quiz.firstName}
            userIntent={quiz.intent}
            userState={quiz.state}
            userContext={quiz.context}
            overseasName={quiz.overseas ? overseasCountryName(quiz.country) : null}
            overseasIso={quiz.overseas ? overseasCountryIso(quiz.country) : null}
            currentMatch={(pendingAdvisor ?? currentMatch)}
            allMatches={matchedAdvisors}
            onRematch={handleRematch}
            rematching={rematching}
            noMoreMatches={noMoreMatches}
            onRestart={restart}
            submitError={submitError}
            onConfirm={handleConfirm}
            confirming={confirming}
            confirmedAdvisorId={confirmedAdvisorId}
          />
        )}

        {/* Legal footer */}
        {quiz.step <= 5 && (
          <p className="text-center text-xs text-slate-500 mt-8 leading-relaxed">
            This is not financial advice. We help you find the right type of professional — the choice is always yours.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

function Step1({ onSelect }: { onSelect: (intent: Intent) => void }) {
  return (
    <Card variant="default" padding="lg">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3 leading-tight">
          What&apos;s your biggest<br className="hidden sm:block" /> financial priority right now?
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          This helps us match you with the right type of professional.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {INTENT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={`
              group relative p-5 rounded-2xl border-2 bg-gradient-to-br text-left
              transition-all duration-200 focus:outline-none focus-visible:ring-2
              focus-visible:ring-amber-400 focus-visible:ring-offset-2
              hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97]
              ${opt.baseClass}
            `}
          >
            <div className="text-3xl mb-3 leading-none" aria-hidden="true">{opt.emoji}</div>
            <h3 className="text-base font-bold text-slate-900 mb-1">{opt.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{opt.desc}</p>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
        {[SHOW_GENERIC_VERIFIED ? "ASIC-verified professionals" : "Credentials shown on every profile", "100% free to use", "No spam \u2014 ever"].map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {t}
          </span>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Link href="/find-advisor/life-event" className="text-xs text-amber-700 hover:text-amber-800 font-semibold">
          Find by life event instead (getting married, new baby, selling a business…) &rarr;
        </Link>
      </div>
    </Card>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

function Step2({
  intent, selections, onToggle, onNext, onBack, error,
}: {
  intent: Intent; selections: string[];
  onToggle: (id: string, isRadio: boolean) => void;
  onNext: () => void; onBack: () => void; error?: string;
}) {
  const config = CONTEXT_CONFIG[intent];
  const isRadio = config.type === "radio";

  return (
    <Card variant="default" padding="lg">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 leading-tight">{config.title}</h1>
        <p className="text-slate-500 text-sm">{config.subtitle}</p>
      </div>

      <div className="space-y-2.5" role={isRadio ? "radiogroup" : "group"} aria-label={config.title}>
        {config.options.map((opt) => {
          const sel = selections.includes(opt.id);
          return (
            <label
              key={opt.id}
              className={`
                flex items-center gap-3.5 p-4 border-2 rounded-xl cursor-pointer
                transition-all duration-150 hover:border-amber-300 hover:bg-amber-50/50
                ${sel ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}
              `}
            >
              <input
                type={isRadio ? "radio" : "checkbox"}
                name={isRadio ? "quiz-context" : undefined}
                checked={sel}
                onChange={() => onToggle(opt.id, isRadio)}
                className="w-4 h-4 shrink-0 accent-amber-500 border-slate-300 focus:ring-amber-400"
              />
              <span className="text-sm font-medium text-slate-800 leading-relaxed">
                {opt.label}
                {opt.hint && (
                  <span className="block text-xs font-normal text-slate-500 mt-0.5">{opt.hint}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-600 flex items-center gap-1.5" role="alert">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          {error}
        </p>
      )}

      <div className="flex gap-3 mt-8">
        <Button variant="ghost" onClick={onBack}>&larr; Back</Button>
        <Button variant="primary" onClick={onNext} disabled={selections.length === 0} className="flex-1">
          Continue &rarr;
        </Button>
      </div>
    </Card>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

interface PostcodeSuggestion {
  postcode: string;
  locality: string;
  state: string;
}

function Step3({
  intent, stateValue, postcodeValue, suburbValue, budgetValue, timelineValue, overseas, countryValue,
  onStateChange, onPostcodeChange, onBudgetChange, onTimelineChange, onOverseasChange, onCountryChange,
  onNext, onBack, error, submitting,
}: {
  intent: Intent | null;
  stateValue: string; postcodeValue: string; suburbValue: string; budgetValue: string;
  timelineValue: string; overseas: boolean; countryValue: string;
  onStateChange: (v: string) => void;
  onPostcodeChange: (postcode: string, state: string, suburb: string) => void;
  onBudgetChange: (v: string) => void;
  onTimelineChange: (v: string) => void;
  onOverseasChange: (overseas: boolean) => void;
  onCountryChange: (v: string) => void;
  onNext: () => void; onBack: () => void; error?: string;
  /** True while the dry-run match request is in flight. */
  submitting: boolean;
}) {
  const [postcodeInput, setPostcodeInput] = useState(postcodeValue);
  const [suggestions, setSuggestions] = useState<PostcodeSuggestion[]>([]);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "found" | "notfound">("idle");
  const [showStateDropdown, setShowStateDropdown] = useState(!postcodeValue && !stateValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialise showStateDropdown properly: show it only if no postcode was already set
  useEffect(() => {
    if (postcodeValue) {
      setLookupStatus("found");
      setShowStateDropdown(false);
    } else if (stateValue) {
      setShowStateDropdown(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePostcodeInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setPostcodeInput(digits);

    // Clear previous derived state/suburb if user clears the field
    if (!digits) {
      onPostcodeChange("", "", "");
      setSuggestions([]);
      setLookupStatus("idle");
      setShowStateDropdown(true);
      return;
    }

    setShowStateDropdown(false);

    // Debounce lookup
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (digits.length < 4) {
      setSuggestions([]);
      setLookupStatus("idle");
      onPostcodeChange(digits, "", "");
      return;
    }

    setLookupStatus("loading");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/advisor-search/postcodes?q=${encodeURIComponent(digits)}`);
        const data = await res.json();
        const results: PostcodeSuggestion[] = data.postcodes ?? [];
        if (results.length > 0) {
          setSuggestions(results);
          setLookupStatus("found");
          // Auto-select if exact match
          const exact = results.find((r) => r.postcode === digits);
          const pick = exact ?? results[0];
          if (pick) onPostcodeChange(pick.postcode, pick.state, pick.locality);
        } else {
          setSuggestions([]);
          setLookupStatus("notfound");
          onPostcodeChange(digits, "", "");
        }
      } catch {
        setSuggestions([]);
        setLookupStatus("notfound");
      }
    }, 400);
  };

  const handleSuggestionSelect = (s: PostcodeSuggestion) => {
    setPostcodeInput(s.postcode);
    setSuggestions([]);
    setLookupStatus("found");
    onPostcodeChange(s.postcode, s.state, s.locality);
  };

  const hasValidLocation = overseas ? !!countryValue : !!stateValue;

  return (
    <Card variant="default" padding="lg">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 leading-tight">Where are you located?</h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          {overseas
            ? "We’ll match you with advisors experienced with international and expat clients — consultations happen remotely."
            : "We match you with advisors in your area — many also offer remote consultations."}
        </p>
      </div>

      <div className="space-y-5">
        {!overseas && (
          <>
            {/* Postcode — primary input */}
            <div>
              <label htmlFor="postcode-input" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Postcode <span className="text-slate-500 font-normal">(recommended)</span>
              </label>
              <div className="relative">
                <input
                  id="postcode-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={postcodeInput}
                  onChange={(e) => handlePostcodeInput(e.target.value)}
                  placeholder="e.g. 2000"
                  className={`
                    w-full px-4 py-3 border-2 rounded-xl text-slate-900 text-sm
                    focus:outline-none focus:border-amber-500 transition-colors bg-white
                    ${error && !postcodeInput ? "border-red-400" : "border-slate-200"}
                  `}
                  autoComplete="postal-code"
                />
                {lookupStatus === "loading" && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg role="status" aria-label="Looking up location" className="w-4 h-4 text-slate-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Suburb auto-fill result */}
              {lookupStatus === "found" && suburbValue && (
                <div className="mt-2 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700">{suburbValue}, {stateValue}</span>
                </div>
              )}

              {/* Multiple suggestions dropdown */}
              {suggestions.length > 1 && (
                <div className="mt-1 border border-slate-200 rounded-xl bg-white shadow-md overflow-hidden z-10">
                  {suggestions.map((s) => (
                    <button
                      key={`${s.postcode}-${s.locality}`}
                      type="button"
                      onClick={() => handleSuggestionSelect(s)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <span className="font-medium text-slate-800">{s.locality}</span>
                      <span className="text-slate-500 ml-1.5">{s.postcode}, {s.state}</span>
                    </button>
                  ))}
                </div>
              )}

              {lookupStatus === "notfound" && postcodeInput.length === 4 && (
                <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  Postcode not found — please select your state below
                </p>
              )}

              {/* "Don't know postcode" toggle */}
              {lookupStatus === "idle" && !postcodeInput && (
                <button
                  type="button"
                  onClick={() => setShowStateDropdown(true)}
                  className="mt-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium"
                >
                  Don&apos;t know your postcode? Select state instead
                </button>
              )}
            </div>

            {/* State dropdown — fallback */}
            {(showStateDropdown || lookupStatus === "notfound" || (!postcodeInput && stateValue)) && (
              <div className="pt-1">
                <Select
                  id="state-select"
                  label="State or Territory"
                  required={!stateValue}
                  options={STATES}
                  value={stateValue}
                  onChange={(e) => {
                    onStateChange(e.target.value);
                    // If they select state manually, clear any partial postcode lookup
                    if (postcodeInput && lookupStatus !== "found") {
                      setPostcodeInput("");
                      onPostcodeChange("", e.target.value, "");
                    }
                  }}
                  error={!postcodeInput ? error : undefined}
                />
              </div>
            )}
          </>
        )}

        {/* Overseas country picker */}
        {overseas && (
          <div>
            <Select
              id="country-select"
              label="Where do you currently live?"
              required
              options={OVERSEAS_COUNTRY_OPTIONS}
              value={countryValue}
              onChange={(e) => onCountryChange(e.target.value)}
              error={error}
            />
            {intent === "buy_property" && (
              <p className="text-xs text-slate-500 mt-1.5">
                Buying from overseas usually involves FIRB approval — we&apos;ll prioritise
                advisors who handle non-resident property purchases.
              </p>
            )}
          </div>
        )}

        {/* Domestic ↔ overseas toggle */}
        <div className="-mt-1">
          <button
            type="button"
            onClick={() => onOverseasChange(!overseas)}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium"
          >
            {overseas ? "← I’m in Australia — use a postcode instead" : "I live outside Australia →"}
          </button>
        </div>

        {/* Combined error */}
        {error && !overseas && !stateValue && !postcodeInput && (
          <p className="text-xs text-red-600 flex items-center gap-1.5 -mt-3" role="alert">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
          </p>
        )}

        {/* Budget */}
        <div>
          <Select
            id="budget-select"
            label={budgetLabelForIntent(intent)}
            options={BUDGETS}
            value={budgetValue}
            onChange={(e) => onBudgetChange(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1.5">
            Optional — helps us match you with advisors experienced at your level
          </p>
        </div>

        {/* Timeline — optional urgency signal */}
        <fieldset>
          <legend className="block text-sm font-semibold text-slate-700 mb-1.5">
            How soon do you want to talk to someone? <span className="text-slate-500 font-normal">(optional)</span>
          </legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How soon do you want to talk to someone?">
            {TIMELINE_OPTIONS.map((opt) => {
              const sel = timelineValue === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => onTimelineChange(sel ? "" : opt.id)}
                  className={`px-3.5 py-2 rounded-xl border-2 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-1 ${
                    sel
                      ? "border-amber-400 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50/50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>&larr; Back</Button>
        <Button variant="primary" onClick={onNext} loading={submitting} disabled={!hasValidLocation || submitting} className="flex-1">
          {submitting ? "Finding your match…" : "Continue →"}
        </Button>
      </div>
    </Card>
  );
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────

function Step4({
  firstName, email, phone, consent, advisorName, onChange, onSubmit, onBack,
  submitting, errors, submitError,
  otpStage, otpCode, otpError, onOtpCodeChange, onOtpVerify, onOtpResend, onEditContact,
  otpSecondsLeft, otpExpired, otpCanResend, otpResendInSeconds,
}: {
  firstName: string; email: string; phone: string; consent: boolean;
  /** The previewed advisor being connected (the user has already chosen them). */
  advisorName?: string | null;
  onChange: (field: string, value: string | boolean) => void;
  onSubmit: (e: React.FormEvent) => void; onBack: () => void;
  submitting: boolean; errors: Record<string, string>; submitError: string | null;
  otpStage: "idle" | "sending" | "sent" | "verifying";
  otpCode: string; otpError: string | null;
  onOtpCodeChange: (v: string) => void;
  onOtpVerify: () => void;
  onOtpResend: (e: React.SyntheticEvent) => void;
  /** Wrong email / typo escape hatch: back to editable fields without
   *  losing the quiz or the previewed match. */
  onEditContact: () => void;
  otpSecondsLeft: number; otpExpired: boolean;
  otpCanResend: boolean; otpResendInSeconds: number;
}) {
  const otpActive = otpStage === "sent" || otpStage === "verifying";

  return (
    <Card variant="default" padding="lg">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 leading-tight">
          {advisorName
            ? <>Almost there — where should {advisorName.split(" ")[0]} reach you?</>
            : <>Almost there — where should your advisor reach you?</>}
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          Verify your email and we&apos;ll make the introduction — usually within 24 hours.
        </p>
      </div>

      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2.5" role="alert">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          {submitError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Input id="firstName" label="First name" type="text" required placeholder="John"
          value={firstName} onChange={(e) => onChange("firstName", e.target.value)}
          error={errors.firstName} autoComplete="given-name" disabled={otpActive} />

        <Input id="email" label="Email address" type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} required placeholder="john@example.com"
          value={email} onChange={(e) => onChange("email", e.target.value)}
          hint={otpActive ? `Code sent to ${email}` : "We'll send a verification code here"}
          error={errors.email} autoComplete="email" disabled={otpActive} />

        <Input id="phone" label="Phone number" type="tel" placeholder="04XX XXX XXX"
          value={phone} onChange={(e) => onChange("phone", e.target.value)}
          hint="Optional — advisors may call to arrange a meeting"
          error={errors.phone}
          autoComplete="tel" disabled={otpActive} />

        {/* Consent */}
        <div className="space-y-1.5">
          <label className={`flex items-start gap-3 p-4 bg-slate-50 rounded-xl transition-colors ${otpActive ? "opacity-60 cursor-default" : "cursor-pointer hover:bg-slate-100"}`}>
            <input
              type="checkbox" checked={consent}
              onChange={(e) => !otpActive && onChange("consent", e.target.checked)}
              disabled={otpActive}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 accent-amber-500 focus:ring-amber-400 shrink-0"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              I agree to Invest.com.au&apos;s{" "}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 underline">Privacy Policy</Link>
              {" "}and{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 underline">Terms of Use</Link>.
              {" "}<strong className="text-slate-700">Your details go to ONE matched advisor only — no spam.</strong>
            </span>
          </label>
          {errors.consent && (
            <p className="text-xs text-red-600 flex items-center gap-1.5 px-1" role="alert">
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {errors.consent}
            </p>
          )}
        </div>

        {!otpActive && (
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onBack} disabled={otpStage === "sending"}>&larr; Back</Button>
            <Button type="submit" variant="primary" loading={otpStage === "sending"} disabled={otpStage === "sending"} className="flex-1">
              {otpStage === "sending" ? "Sending code…" : "Continue →"}
            </Button>
          </div>
        )}
      </form>

      {/* OTP verification panel */}
      {otpActive && (
        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">Check your inbox</p>
              <p className="text-xs text-slate-600 mt-0.5">We sent a 6-digit code to <strong>{email}</strong></p>
            </div>
            {/* ADV-015: single source of truth for expiry — the 10-minute
                server-side TTL mirrored by the parent's countdown. */}
            <div
              className={`shrink-0 text-xs font-semibold tabular-nums px-2.5 py-1 rounded-lg border ${otpExpired ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-amber-200 text-amber-700"}`}
              role="timer"
              aria-live="off"
            >
              {otpExpired ? "Code expired" : `Expires in ${formatCountdown(otpSecondsLeft)}`}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="otp-code" className="block text-xs font-semibold text-slate-700 mb-1.5">Verification code</label>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => onOtpCodeChange(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onOtpVerify(); } }}
                placeholder="000000"
                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 bg-white"
                autoFocus
              />
              {otpError && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5" role="alert">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {otpError}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              loading={otpStage === "verifying" || submitting}
              disabled={otpCode.length < 6 || otpStage === "verifying" || submitting}
              onClick={onOtpVerify}
              className="w-full"
            >
              {otpStage === "verifying" || submitting ? "Verifying…" : "Verify & Connect →"}
            </Button>

            {/* ADV-015: when the code expires, surface an unmissable resend
                prompt; otherwise the resend link is gated by a short cooldown. */}
            {otpExpired && (
              <p className="text-center text-xs font-semibold text-red-600">
                Your code has expired.{" "}
                <button
                  type="button"
                  onClick={onOtpResend}
                  className="underline text-red-700 hover:text-red-800"
                >
                  Send a new code
                </button>
              </p>
            )}

            <p className="text-center text-xs text-slate-500">
              Didn&apos;t get it?{" "}
              {otpCanResend ? (
                <button
                  type="button"
                  onClick={onOtpResend}
                  className="text-amber-600 hover:text-amber-700 font-semibold"
                >
                  Resend code
                </button>
              ) : (
                <span className="text-slate-500 tabular-nums">
                  Resend in {formatCountdown(otpResendInSeconds)}
                </span>
              )}
              {" "}· Wrong email?{" "}
              <button
                type="button"
                onClick={onEditContact}
                className="text-slate-600 hover:text-slate-800 font-semibold underline"
              >
                Edit details
              </button>
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Match Confirmation ───────────────────────────────────────────────────────

function typeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function MatchConfirmation({ userEmail, userFirstName, currentMatch, allMatches, onRematch, rematching, noMoreMatches, onRestart, onEditAnswers, submitError, onConfirm, confirming, confirmedAdvisorId, userIntent, userState, userContext, overseasName, overseasIso }: {
  userEmail: string; userFirstName: string; currentMatch: MatchedAdvisor | null; allMatches: MatchedAdvisor[];
  onRematch: () => void; rematching: boolean; noMoreMatches: boolean; onRestart: () => void;
  /** Present on the preview step only — returns to step 3 with answers intact. */
  onEditAnswers?: () => void;
  submitError: string | null;
  onConfirm: (advisor: MatchedAdvisor) => void; confirming: boolean; confirmedAdvisorId: number | null;
  userIntent: Intent | null; userState: string; userContext: string[];
  overseasName: string | null; overseasIso: string | null;
}) {
  const isCurrentConfirmed = !!(currentMatch && confirmedAdvisorId === currentMatch.id);

  // ADV-007: answer-driven "why we matched you" — every bullet is a fact
  // about THIS advisor tied to THIS user's answers (lib/find-advisor/
  // match-reasons.ts). Rating/verification bullets follow the central
  // licence-mode gates.
  const matchReasons = currentMatch
    ? buildMatchReasons(
        {
          intent: userIntent,
          context: userContext,
          state: userState,
          overseasCountryName: overseasName,
          overseasCountryIso: overseasIso,
        },
        currentMatch,
        { showRatings: SHOW_ADVISOR_RATINGS, showVerifiedBadge: SHOW_ADVISOR_VERIFIED_BADGE },
      )
    : [];
  const highlightedSpecs = currentMatch
    ? new Set(matchedSpecialties(userContext, currentMatch.specialties))
    : new Set<string>();

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header — success affect only when there IS a match */}
      <div className="text-center py-3">
        {currentMatch ? (
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
          {isCurrentConfirmed ? "You’re connected!" : currentMatch ? "We found a match!" : "No instant match just yet"}
        </h1>
        <p className="text-sm text-slate-600">
          {isCurrentConfirmed
            ? `${currentMatch!.name} has been notified and will be in touch shortly`
            : currentMatch
            ? `${userFirstName ? `${userFirstName}, review` : "Review"} this advisor and connect if they look right`
            : "No available advisor matched your exact criteria — here’s how to keep moving"}
        </p>
        {allMatches.length > 1 && (
          <p className="text-xs text-amber-600 font-semibold mt-1">
            Match {allMatches.length} of {allMatches.length}{noMoreMatches ? " (all available)" : ""}
          </p>
        )}
      </div>

      {/* Honest empty state — clear next steps instead of false promises */}
      {!currentMatch && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-5 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Every advisor who fits your exact answers is either at capacity right now or
            hasn’t joined the directory yet. Three good ways forward:
          </p>
          <ul className="space-y-2.5">
            {[
              { icon: "users", text: "Browse the closest matches — we’ve pre-filtered the directory to your goal and location" },
              { icon: "map-pin", text: onEditAnswers ? "Widen your search — edit your answers to try a broader location or a different focus" : "Try again with a broader location or a different focus" },
              { icon: "clock", text: "Check back soon — verified advisors join every week" },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-2.5 text-sm text-slate-700">
                <Icon name={item.icon} size={15} className="text-amber-600 shrink-0 mt-0.5" />
                {item.text}
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <Button variant="primary" href={browseAdvisorsHref(userIntent, userState)} className="flex-1 justify-center">
              Browse closest matches
            </Button>
            {onEditAnswers && (
              <Button variant="secondary" onClick={onEditAnswers} className="flex-1 justify-center">
                Edit my answers
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Matched advisor card */}
      {currentMatch && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-white shadow-lg">
          {/* Match quality bar */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Icon name="zap" size={14} className="text-white" />
              <span className="text-xs font-bold tracking-wide uppercase">Your Matched Advisor</span>
            </div>
            <div className="flex items-center gap-1.5">
              {currentMatch.avg_response_minutes != null && currentMatch.avg_response_minutes <= 60 && (
                <div className="flex items-center gap-1 bg-emerald-500/30 backdrop-blur-sm rounded-full px-2.5 py-0.5" title="Average response under 60 minutes">
                  <Icon name="zap" size={12} className="text-white" />
                  <span className="text-[0.65rem] font-semibold text-white">Fast reply (&lt;1h)</span>
                </div>
              )}
              {SHOW_ADVISOR_VERIFIED_BADGE && currentMatch.verified && (
                <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5">
                  <Icon name="shield-check" size={12} className="text-white" />
                  <span className="text-[0.65rem] font-semibold text-white">ASIC Verified</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 md:p-6">
            {/* Profile row */}
            <div className="flex items-start gap-4 mb-5">
              <div className="relative shrink-0">
                <Image
                  src={currentMatch.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentMatch.name)}&size=160&background=f59e0b&color=fff&bold=true`}
                  alt={currentMatch.name}
                  width={72}
                  height={72}
                  className="rounded-xl object-cover w-16 h-16 md:w-18 md:h-18 ring-2 ring-amber-200"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-extrabold text-slate-900 leading-tight">{currentMatch.name}</h2>
                <p className="text-sm font-semibold text-amber-600 mt-0.5">{typeLabel(currentMatch.type)}</p>
                {currentMatch.firm_name && (
                  <p className="text-xs text-slate-500 mt-0.5">{currentMatch.firm_name}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {SHOW_ADVISOR_RATINGS && currentMatch.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            className={`w-3.5 h-3.5 ${i < Math.round(currentMatch.rating) ? "text-amber-400" : "text-slate-200"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{currentMatch.rating}</span>
                      <span className="text-xs text-slate-500">({currentMatch.review_count})</span>
                    </div>
                  )}
                  {currentMatch.location_display && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Icon name="map-pin" size={11} className="text-slate-500" />
                      {currentMatch.location_display}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Specialties — chips that connect to the user's answers glow */}
            {currentMatch.specialties?.length > 0 && (
              <div className="mb-4">
                <p className="text-[0.65rem] font-semibold text-slate-500 uppercase tracking-wider mb-2">Specialties</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentMatch.specialties.slice(0, 5).map((spec) => {
                    const isMatch = highlightedSpecs.has(spec);
                    return (
                      <span
                        key={spec}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium border ${
                          isMatch
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {isMatch && <span aria-hidden="true">✓ </span>}
                        {spec}
                        {isMatch && <span className="sr-only"> (matches your answers)</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fee info */}
            {currentMatch.fee_description && (
              <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-start gap-2">
                <Icon name="coins" size={14} className="text-slate-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">{currentMatch.fee_description}</p>
              </div>
            )}

            {/* ADV-007: "Why we matched you" — answer-driven, never generic */}
            {matchReasons.length > 0 && (
              <div role="status" aria-live="polite" className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
                <p className="text-[0.65rem] font-bold text-emerald-700 uppercase tracking-wider mb-2">Why we matched you</p>
                <ul className="space-y-1">
                  {matchReasons.map((b) => (
                    <li key={b} className="flex items-start gap-1.5 text-xs text-emerald-800">
                      <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            {isCurrentConfirmed ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-100 text-emerald-700 font-bold rounded-xl text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Request sent — {currentMatch.name} will be in touch
                </div>
                <Link
                  href={`/advisor/${currentMatch.slug}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  View Full Profile
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => onConfirm(currentMatch)}
                  disabled={confirming}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl transition-all shadow-sm hover:shadow-md text-sm"
                >
                  {confirming ? "Sending request…" : `Connect with ${currentMatch.name}`}
                  {!confirming && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                </button>
                <Link
                  href={`/advisor/${currentMatch.slug}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  View Full Profile first
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Previously matched advisors */}
      {allMatches.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Previous Matches</p>
          <div className="space-y-2">
            {allMatches.slice(0, -1).reverse().map((advisor) => (
              <Link
                key={advisor.id}
                href={`/advisor/${advisor.slug}`}
                className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Image
                  src={advisor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(advisor.name)}&size=80&background=f59e0b&color=fff&bold=true`}
                  alt={advisor.name}
                  width={40}
                  height={40}
                  className="rounded-lg object-cover w-10 h-10 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{advisor.name}</p>
                  <p className="text-xs text-slate-500">{typeLabel(advisor.type)}{advisor.location_display ? ` • ${advisor.location_display}` : ""}</p>
                </div>
                {SHOW_ADVISOR_RATINGS && advisor.rating > 0 && (
                  <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold shrink-0">
                    <span>{advisor.rating}</span>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Preview actions: rematch + edit answers — hidden once confirmed */}
      {currentMatch && !isCurrentConfirmed && (
        <div className="flex flex-col sm:flex-row gap-2.5">
          {!noMoreMatches && (
            <button
              onClick={onRematch}
              disabled={rematching}
              className="flex-1 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {rematching ? (
                <span className="flex items-center justify-center gap-2">
                  <svg aria-hidden="true" className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Finding another advisor...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Icon name="refresh-cw" size={14} />
                  Match me with a different advisor
                </span>
              )}
            </button>
          )}
          {onEditAnswers && (
            <button
              onClick={onEditAnswers}
              className="sm:w-auto px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              ← Edit my answers
            </button>
          )}
        </div>
      )}

      {noMoreMatches && currentMatch && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-amber-800 mb-1">You&apos;ve seen all available matches</p>
          <p className="text-xs text-amber-700">We&apos;ve matched you with every advisor available for your criteria. Browse our full directory for more options.</p>
        </div>
      )}

      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center" role="alert">
          {submitError}
        </div>
      )}

      {/* Next steps — only meaningful when an advisor is on screen */}
      {currentMatch && (
        <Card variant="flat" padding="md">
          <h3 className="font-bold text-slate-900 text-sm mb-3.5 flex items-center gap-2">
            <Icon name="clock" size={14} className="text-amber-500" />
            What happens next{userFirstName ? `, ${userFirstName}` : ""}:
          </h3>
          {isCurrentConfirmed ? (
            <div className="space-y-3">
              {[
                {
                  icon: "mail",
                  title: "Advisor notified",
                  desc: `${currentMatch.name} has received your enquiry and your contact details.`,
                  timing: "Right now",
                  done: true,
                },
                {
                  icon: "phone",
                  title: "Initial contact",
                  desc: `Expect a call or email at ${userEmail} to introduce themselves and discuss your needs.`,
                  timing: "Within 24 hours",
                  done: false,
                },
                {
                  icon: "calendar",
                  title: "Free consultation",
                  desc: "Schedule a no-obligation initial meeting to explore how they can help you.",
                  timing: "Within 1 week",
                  done: false,
                },
                {
                  icon: "check-circle",
                  title: "Your choice",
                  desc: "Decide if they're the right fit — no pressure, no fees for matching.",
                  timing: "Whenever you're ready",
                  done: false,
                },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-emerald-100" : "bg-amber-50 border border-amber-200"}`}>
                    <Icon name={step.icon} size={14} className={step.done ? "text-emerald-600" : "text-amber-500"} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                      <span className={`text-[0.58rem] font-semibold px-1.5 py-0.5 rounded-full ${step.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{step.timing}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                <strong className="text-slate-700">In the meantime:</strong> Review {currentMatch.name}&apos;s full profile, credentials, and client reviews to make sure they&apos;re the right fit.
              </div>
            </div>
          ) : (
            <ol className="space-y-3">
              {/* Preview stage: NO lead exists yet (the advisor has not been
                  contacted) — the copy must promise, not claim. Contact details
                  are collected on the next step, so no email is shown here. */}
              {[
                `Click Connect and we'll introduce you to ${currentMatch.name}`,
                "They'll reach out within 24 hours of your introduction",
                "You'll book a free initial consultation — no obligation",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-900 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-sm text-slate-700 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {/* Trust signals */}
      <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-2 py-2">
        {[
          { icon: "shield-check", text: "Your details go to one advisor only", color: "text-emerald-500" },
          { icon: "lock", text: "Data encrypted & secure", color: "text-slate-500" },
          { icon: "x-circle", text: "Unsubscribe anytime", color: "text-slate-500" },
        ].map((item) => (
          <span key={item.text} className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name={item.icon} size={13} className={item.color} />
            {item.text}
          </span>
        ))}
      </div>

      {/* CTAs — deep-link Browse to a /advisors filter pre-populated from
          the quiz answers, so the user sees relevant alternatives, not the
          full unfiltered directory. (The empty state above promotes Browse
          to primary, so skip the duplicate here.) */}
      {currentMatch && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="secondary" href={browseAdvisorsHref(userIntent, userState)} className="flex-1 justify-center">
            Browse All Advisors
          </Button>
          <Button variant="secondary" href="/compare" className="flex-1 justify-center">
            Compare Platforms
          </Button>
        </div>
      )}

      {isCurrentConfirmed && userEmail && (
        <p className="text-center text-xs text-slate-500 leading-relaxed">
          Confirmation sent to <strong className="text-slate-600">{userEmail}</strong>
        </p>
      )}

      <div className="text-center">
        <button onClick={onRestart} className="text-xs text-slate-500 hover:text-slate-700 transition-colors underline">
          Start over with a different goal
        </button>
      </div>
    </div>
  );
}
