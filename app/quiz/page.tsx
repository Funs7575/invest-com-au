"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { Broker } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";
import { trackEvent as phTrack } from "@/lib/posthog/events";
import { storeQualificationData } from "@/lib/qualification-store";
import { getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";
import { scoreQuizResults, type WeightKey, type QuizWeights, type AmountKey, buildStackResults, type StackQuizInputs, type VerticalScoredResult, type ScoredResult } from "@/lib/quiz-scoring";
import { intentCountryFromSlug, quizKeyForIntentCode } from "@/lib/intent-context";
import {
  type QuestionId,
  type UnifiedAnswers,
  isInternational,
  resolveTrack,
  getNextId,
  getTotalSteps,
  inferAdvisorType,
  resolveLeadAdvisorType,
  toScoringAnswers,
} from "@/lib/quiz-flow";
import { UNIFIED_QUESTIONS } from "@/lib/quiz-questions";
import { getBrokerMatchReasons } from "@/lib/quiz-broker-match-reasons";

import QuizQuestionScreen from "./_components/QuizQuestionScreen";
import QuizAnalyzingScreen from "./_components/QuizAnalyzingScreen";
import QuizResultsScreen from "./_components/QuizResultsScreen";
import AdvisorResultsScreen from "./_components/AdvisorResultsScreen";

/* ─── Types ─── */
// "email-gate" phase removed — capture is now inline in the results screen
// so users see the value before being asked. Was a 20-40% drop-off tax.
type Phase = "questions" | "analyzing" | "advisor-analyzing" | "diy-results" | "advisor-results";


// Reorders options to put the inferred/recommended type first with a "Recommended" label
function sortByInferred(
  options: { key: string; label: string; sub?: string; emoji?: string }[],
  inferred: string
): { key: string; label: string; sub?: string; emoji?: string }[] {
  if (!inferred || inferred === "not-sure") return options;
  const idx = options.findIndex(o => o.key === inferred);
  if (idx <= 0) return options;
  const reordered = [...options];
  const [item] = reordered.splice(idx, 1);
  reordered.unshift({
    ...item,
    sub: item.sub ? `${item.sub} · Suggested based on your answers` : "Suggested based on your answers",
  });
  return reordered;
}

// Returns a context-aware advisor_type question based on prior answers
function getDynamicAdvisorTypeQuestion(a: UnifiedAnswers): { text: string; options: { key: string; label: string; sub?: string; emoji?: string }[] } {
  const allOptions = UNIFIED_QUESTIONS.advisor_type.options;
  const inferred = inferAdvisorType(a);
  const baseText = UNIFIED_QUESTIONS.advisor_type.text;

  // International track: filter to options relevant for their investment goal
  if (isInternational(a)) {
    let relevantKeys: string[];
    const goal = a.investor_goal_intl;
    if (goal === "property") {
      relevantKeys = ["buyers-agent", "mortgage-broker", "financial-planner", "not-sure"];
    } else if (goal === "shares") {
      relevantKeys = ["financial-planner", "tax-agent", "not-sure"];
    } else if (goal === "savings" || goal === "business") {
      relevantKeys = ["financial-planner", "not-sure"];
    } else {
      relevantKeys = allOptions.map(o => o.key);
    }
    const filtered = allOptions.filter(o => relevantKeys.includes(o.key));
    return { text: baseText, options: sortByInferred(filtered, inferred) };
  }

  // Domestic: curate the need options to those relevant to the goal so the
  // multi-select isn't a wall of every advisor type, then put the inferred
  // pick first ("Suggested").
  const relevantKeys = domesticNeedKeys(a);
  const filtered = allOptions.filter(o => relevantKeys.includes(o.key));
  return { text: baseText, options: sortByInferred(filtered, inferred) };
}

// The relevant advisor needs to offer for a domestic goal (multi-select).
function domesticNeedKeys(a: UnifiedAnswers): string[] {
  if (a.goal === "home") {
    return ["mortgage-broker", "conveyancer", "insurance-broker", "not-sure"];
  }
  if (a.goal === "property" || a.property_sub === "physical") {
    return ["buyers-agent", "mortgage-broker", "conveyancer", "insurance-broker", "tax-agent", "commercial-property-agent", "not-sure"];
  }
  if (a.goal === "super") {
    return ["smsf-accountant", "financial-planner", "insurance-broker", "tax-agent", "aged-care-advisor", "not-sure"];
  }
  if (a.goal === "crypto") {
    return ["tax-agent", "financial-planner", "not-sure"];
  }
  // Default (incl. goal=help): the general advisory set. Debt counselling sits
  // here — "get expert help" is the entry someone in financial difficulty picks.
  return ["financial-planner", "tax-agent", "insurance-broker", "estate-planner", "smsf-accountant", "debt-counsellor", "not-sure"];
}


/* ─── Fallback scoring weights ─── */
const fallbackScores: Record<string, Record<WeightKey, number>> = {
  // ── Share brokers ──
  "interactive-brokers": { beginner: 3, low_fee: 7, us_shares: 10, smsf: 8, crypto: 0, advanced: 10, property: 0, robo: 0 },
  "cmc-markets": { beginner: 7, low_fee: 9, us_shares: 8, smsf: 5, crypto: 0, advanced: 7, property: 0, robo: 0 },
  "stake": { beginner: 8, low_fee: 8, us_shares: 9, smsf: 3, crypto: 0, advanced: 4, property: 0, robo: 0 },
  "moomoo": { beginner: 7, low_fee: 9, us_shares: 9, smsf: 2, crypto: 0, advanced: 7, property: 0, robo: 0 },
  "selfwealth": { beginner: 6, low_fee: 6, us_shares: 6, smsf: 8, crypto: 0, advanced: 4, property: 0, robo: 0 },
  "commsec": { beginner: 9, low_fee: 2, us_shares: 4, smsf: 7, crypto: 0, advanced: 5, property: 0, robo: 0 },
  "superhero": { beginner: 8, low_fee: 9, us_shares: 7, smsf: 3, crypto: 3, advanced: 3, property: 0, robo: 0 },
  "tiger-brokers": { beginner: 5, low_fee: 8, us_shares: 8, smsf: 3, crypto: 0, advanced: 7, property: 0, robo: 0 },
  "ig": { beginner: 4, low_fee: 6, us_shares: 8, smsf: 5, crypto: 0, advanced: 8, property: 0, robo: 0 },
  "saxo": { beginner: 3, low_fee: 5, us_shares: 8, smsf: 5, crypto: 0, advanced: 9, property: 0, robo: 0 },
  "nabtrade": { beginner: 7, low_fee: 3, us_shares: 4, smsf: 7, crypto: 0, advanced: 4, property: 0, robo: 0 },
  "anz-share-investing": { beginner: 6, low_fee: 2, us_shares: 3, smsf: 6, crypto: 0, advanced: 3, property: 0, robo: 0 },
  "webull": { beginner: 7, low_fee: 10, us_shares: 9, smsf: 3, crypto: 3, advanced: 6, property: 0, robo: 0 },
  // ── Crypto exchanges ──
  "swyftx": { beginner: 8, low_fee: 6, us_shares: 0, smsf: 2, crypto: 9, advanced: 5, property: 0, robo: 0 },
  "coinspot": { beginner: 10, low_fee: 4, us_shares: 0, smsf: 2, crypto: 9, advanced: 2, property: 0, robo: 0 },
  "binance": { beginner: 3, low_fee: 10, us_shares: 0, smsf: 0, crypto: 10, advanced: 9, property: 0, robo: 0 },
  "kraken": { beginner: 4, low_fee: 7, us_shares: 0, smsf: 0, crypto: 9, advanced: 8, property: 0, robo: 0 },
  "btc-markets": { beginner: 5, low_fee: 5, us_shares: 0, smsf: 5, crypto: 8, advanced: 5, property: 0, robo: 0 },
  "coinstash": { beginner: 8, low_fee: 6, us_shares: 0, smsf: 2, crypto: 6, advanced: 2, property: 0, robo: 0 },
  "independent-reserve": { beginner: 4, low_fee: 6, us_shares: 0, smsf: 6, crypto: 8, advanced: 6, property: 0, robo: 0 },
  // ── Robo-advisors ──
  "stockspot": { beginner: 9, low_fee: 6, us_shares: 3, smsf: 5, crypto: 0, advanced: 2, property: 2, robo: 10 },
  "raiz": { beginner: 10, low_fee: 7, us_shares: 2, smsf: 2, crypto: 2, advanced: 1, property: 2, robo: 9 },
  "spaceship": { beginner: 9, low_fee: 9, us_shares: 4, smsf: 1, crypto: 0, advanced: 1, property: 0, robo: 8 },
  "sixpark": { beginner: 8, low_fee: 6, us_shares: 3, smsf: 6, crypto: 0, advanced: 2, property: 3, robo: 9 },
  "pearler": { beginner: 7, low_fee: 6, us_shares: 5, smsf: 4, crypto: 0, advanced: 3, property: 0, robo: 7 },
  "vanguard-personal-investor": { beginner: 7, low_fee: 8, us_shares: 3, smsf: 4, crypto: 0, advanced: 2, property: 2, robo: 6 },
  // ── Super funds ──
  "australian-super": { beginner: 8, low_fee: 8, us_shares: 2, smsf: 0, crypto: 0, advanced: 2, property: 4, robo: 7 },
  "hostplus": { beginner: 7, low_fee: 9, us_shares: 2, smsf: 0, crypto: 0, advanced: 2, property: 3, robo: 6 },
  "rest-super": { beginner: 7, low_fee: 6, us_shares: 1, smsf: 0, crypto: 0, advanced: 1, property: 2, robo: 6 },
  "aware-super": { beginner: 6, low_fee: 7, us_shares: 1, smsf: 0, crypto: 0, advanced: 2, property: 3, robo: 5 },
  "spaceship-super": { beginner: 9, low_fee: 7, us_shares: 3, smsf: 0, crypto: 0, advanced: 1, property: 0, robo: 8 },
  // ── Property platforms ──
  "brickx": { beginner: 7, low_fee: 5, us_shares: 0, smsf: 3, crypto: 0, advanced: 2, property: 10, robo: 4 },
  "domacom": { beginner: 3, low_fee: 4, us_shares: 0, smsf: 4, crypto: 0, advanced: 4, property: 9, robo: 2 },
  "venturecrowd": { beginner: 2, low_fee: 3, us_shares: 0, smsf: 3, crypto: 0, advanced: 5, property: 8, robo: 1 },
  // ── Research tools ──
  "simply-wall-st": { beginner: 7, low_fee: 5, us_shares: 7, smsf: 2, crypto: 0, advanced: 8, property: 0, robo: 0 },
  "tradingview": { beginner: 3, low_fee: 5, us_shares: 6, smsf: 1, crypto: 4, advanced: 10, property: 0, robo: 0 },
  "market-index": { beginner: 8, low_fee: 8, us_shares: 3, smsf: 2, crypto: 0, advanced: 5, property: 0, robo: 0 },
  // ── CFD & Forex ──
  "pepperstone": { beginner: 3, low_fee: 7, us_shares: 3, smsf: 0, crypto: 3, advanced: 9, property: 0, robo: 0 },
  "cmc-markets-cfds": { beginner: 4, low_fee: 6, us_shares: 3, smsf: 0, crypto: 2, advanced: 8, property: 0, robo: 0 },
  "ic-markets": { beginner: 2, low_fee: 8, us_shares: 2, smsf: 0, crypto: 2, advanced: 10, property: 0, robo: 0 },
  "fp-markets": { beginner: 3, low_fee: 7, us_shares: 3, smsf: 0, crypto: 2, advanced: 8, property: 0, robo: 0 },
};

/**
 * Build the wealth-stack scorer inputs from the quiz answers. Pure — used
 * both for the live `stackInputs` memo and inside `runScoring` at completion.
 */
function computeStackInputs(answers: UnifiedAnswers): StackQuizInputs {
  const riskMap: Record<string, StackQuizInputs["riskBand"]> = {
    conservative: "conservative", balanced: "balanced", growth: "growth",
  };
  const horizonMap: Record<string, StackQuizInputs["horizon"]> = {
    small: "short", medium: "mid", large: "long", xlarge: "long", whale: "long",
  };
  return {
    amount: answers.amount as AmountKey | undefined,
    riskBand: answers.stack_risk ? riskMap[answers.stack_risk] : undefined,
    horizon: answers.amount ? horizonMap[answers.amount] : undefined,
    superInterest: answers.stack_super === "super_yes" || answers.goal === "super",
    roboInterest: answers.goal === "automate",
    savingsInterest: answers.stack_savings === "savings_yes",
    goal: answers.goal,
  };
}

/**
 * Client fallback for the wealth-stack results — only used when
 * /api/quiz/score is unreachable. Scores locally with the coarse public
 * `fallbackScores` (the tuned weights never ship to the browser).
 */
function buildLocalStack(
  answers: UnifiedAnswers,
  stackInputs: StackQuizInputs,
  brokers: Broker[],
): Partial<Record<"super_fund" | "savings_account" | "robo_advisor", VerticalScoredResult[]>> {
  const superInterest = stackInputs.superInterest ?? false;
  const savingsInterest = stackInputs.savingsInterest ?? false;
  const roboInterest = stackInputs.roboInterest ?? (answers.goal === "automate");
  const perKind: Parameters<typeof buildStackResults>[0]["perKind"] = {};

  if (superInterest || answers.goal === "super" || answers.goal === "grow") {
    const superBrokers = brokers.filter(b => b.platform_type === "super_fund");
    if (superBrokers.length > 0) {
      const w: Record<string, QuizWeights> = {};
      for (const b of superBrokers) w[b.slug] = fallbackScores[b.slug] ?? { beginner: 5, low_fee: 5, us_shares: 0, smsf: 7, crypto: 0, advanced: 3, property: 3, robo: 7 };
      perKind["super_fund"] = { brokers: superBrokers, weights: w };
    }
  }
  if (savingsInterest || answers.amount === "small" || answers.goal === "property") {
    const savingsBrokers = brokers.filter(b => b.platform_type === "savings_account" || b.platform_type === "term_deposit");
    if (savingsBrokers.length > 0) {
      const w: Record<string, QuizWeights> = {};
      for (const b of savingsBrokers) w[b.slug] = fallbackScores[b.slug] ?? { beginner: 6, low_fee: 8, us_shares: 0, smsf: 3, crypto: 0, advanced: 2, property: 0, robo: 3 };
      perKind["savings_account"] = { brokers: savingsBrokers, weights: w };
    }
  }
  if (roboInterest || answers.goal === "automate") {
    const roboBrokers = brokers.filter(b => b.platform_type === "robo_advisor");
    if (roboBrokers.length > 0) {
      const w: Record<string, QuizWeights> = {};
      for (const b of roboBrokers) w[b.slug] = fallbackScores[b.slug] ?? { beginner: 8, low_fee: 6, us_shares: 3, smsf: 3, crypto: 0, advanced: 2, property: 2, robo: 9 };
      perKind["robo_advisor"] = { brokers: roboBrokers, weights: w };
    }
  }
  return buildStackResults({ inputs: stackInputs, perKind, limit: 1 });
}

const QUIZ_STORAGE_KEY = "invest-quiz-v2-progress";
const QUIZ_PROGRESS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadSavedProgress(): { currentId: QuestionId; answers: UnifiedAnswers; history: QuestionId[] } | null {
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire stale in-progress quizzes so abandoned answers don't linger on a
    // shared device (and a months-old "Welcome back" never shows).
    if (typeof parsed?.savedAt === "number" && Date.now() - parsed.savedAt > QUIZ_PROGRESS_TTL_MS) {
      clearProgress();
      return null;
    }
    if (parsed && parsed.currentId && parsed.answers && Array.isArray(parsed.history)) {
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function saveProgress(currentId: QuestionId, answers: UnifiedAnswers, history: QuestionId[]) {
  try {
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ currentId, answers, history, savedAt: Date.now() }));
  } catch { /* quota exceeded */ }
}

// Clearing a question's answer (on back / jump-back). The advisor_type slot's
// answer lives in the multi-select `needs` satellite, so drop that too.
function clearAnswerKey(answers: UnifiedAnswers, key: QuestionId) {
  delete answers[key as keyof UnifiedAnswers];
  if (key === "advisor_type") delete answers.needs;
}

function clearProgress() {
  try {
    localStorage.removeItem(QUIZ_STORAGE_KEY);
  } catch { /* ignore */ }
}

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>("questions");
  const [currentId, setCurrentId] = useState<QuestionId>("location");
  const [answers, setAnswers] = useState<UnifiedAnswers>({});
  const [history, setHistory] = useState<QuestionId[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const [resumeQuestionNumber, setResumeQuestionNumber] = useState<number | null>(null);
  const [resumeTotalQuestions, setResumeTotalQuestions] = useState<number | null>(null);

  // Inline email-capture state (rendered inside results screen, post-results).
  // "submitted" is a terminal state — the capture component swaps to its
  // thank-you view; we don't reset it within a session.
  const [emailCaptureStatus, setEmailCaptureStatus] = useState<"idle" | "loading" | "submitted" | "error">("idle");

  // Results UI state
  const [copied, setCopied] = useState(false);
  const [sharedTopSlug, setSharedTopSlug] = useState<string | null>(null);
  const [showScoring, setShowScoring] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Data
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [quizCampaignWinners, setQuizCampaignWinners] = useState<PlacementWinner[]>([]);
  // Scored results — computed server-side via /api/quiz/score at completion so
  // the tuned ranking weights never reach the browser. Falls back to a local
  // coarse score (public `fallbackScores`) if the endpoint is unreachable.
  const [results, setResults] = useState<ScoredResult[]>([]);
  // Wealth-stack per-vertical scored results (populated after DIY results phase)
  const [stackResults, setStackResults] = useState<Partial<Record<"super_fund" | "savings_account" | "robo_advisor", VerticalScoredResult[]>>>({});

  const mountedRef = useRef(true);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const quizStartedAtRef = useRef<number | null>(null);

  // Restore saved progress on mount
  useEffect(() => {
    const saved = loadSavedProgress();
    if (saved && saved.history.length > 0) {
      setResumePrompt(true);
      // Question number is 1-indexed: history.length = answers given, so they're on Q(history.length + 1)
      setResumeQuestionNumber(saved.history.length + 1);
      setResumeTotalQuestions(getTotalSteps(saved.answers));
    }
  }, []);

  // Country Mode URL prefill — soft default only, never skips Q1.
  // Country pages and the popular-links strip link to /quiz?country=<slug>
  // (and optionally &intent=<key>). We pre-seed investor_country and
  // investor_goal_intl so the user doesn't have to re-enter them after
  // confirming the location question. By default we do NOT pre-set
  // `location` — an HK-resident, an HK passport-holder living in AU, and
  // an Aussie expat in HK all might land here, and Q1 is the only signal
  // that distinguishes them, so a bare ?country= stays a hint, not a
  // bypass (user decision #6 in the v2 plan).
  //
  // The exception is an explicit `?track=international|expat`. Cross-border
  // content surfaces (FIRB explainer, non-resident mortgage guide, country
  // hubs) are unambiguously addressed to non-residents/expats, so their
  // "answer a few questions" CTAs opt in to pre-selecting the international
  // track. The user still confirms (and can change) Q1 — we only set the
  // default answer, we don't skip the question.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const countryParam = params.get("country");
    const intentParam = params.get("intent");
    const trackParam = params.get("track");
    const topParam = params.get("top");

    if (topParam) setSharedTopSlug(topParam);

    if (!countryParam && !intentParam && !trackParam) return;

    const seed: Partial<UnifiedAnswers> = {};
    // Explicit cross-border entry: pre-select the international/expat Q1
    // answer so the quiz starts on the international track.
    if (trackParam === "international" || trackParam === "expat") {
      seed.location = trackParam;
    }
    if (countryParam) {
      const code = intentCountryFromSlug(countryParam);
      if (code) seed.investor_country = quizKeyForIntentCode(code);
    }
    if (intentParam) {
      const validIntents = ["property", "shares", "savings", "business"];
      if (validIntents.includes(intentParam)) {
        seed.investor_goal_intl = intentParam;
      }
    }

    // Only seed when answers are still empty — don't override saved
    // progress or in-flight user input.
    setAnswers((prev) => (Object.keys(prev).length === 0 ? { ...prev, ...seed } : prev));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    getPlacementWinners("quiz-boost").then((winners) => {
      if (mountedRef.current) setQuizCampaignWinners(winners);
    });
  }, []);

  // Broker display data for the results UI. Scoring no longer happens here —
  // /api/quiz/data returns only sanitised broker rows (no weights, no internal
  // commercial fields). Ranking is computed server-side in /api/quiz/score.
  useEffect(() => {
    fetch("/api/quiz/data")
      .then((r) => {
        if (!r.ok) throw new Error("quiz data fetch failed");
        return r.json() as Promise<{ brokers: Broker[] }>;
      })
      .then(({ brokers: bData }) => {
        if (!mountedRef.current) return;
        if (bData.length > 0) {
          setBrokers(bData);
        } else {
          setFetchError("Failed to load broker data. Using cached results.");
        }
      })
      .catch(() => {
        if (mountedRef.current)
          setFetchError("Failed to load quiz data. Using cached results.");
      });
  }, []);

  // Compute scored results (memoised)
  const scoringAnswers = useMemo(() => toScoringAnswers(answers), [answers]);
  const hasCryptoResult = useMemo(() => results.some(r => r.broker?.is_crypto), [results]);

  // Live stack inputs (for the results screen prop). Same pure builder
  // runScoring uses, so the displayed inputs match what was scored.
  const stackInputs = useMemo(() => computeStackInputs(answers), [answers]);

  // Compute the ranking server-side (/api/quiz/score) so the tuned quiz_weights
  // never reach the browser. Fires once at quiz completion; on any failure it
  // falls back to a local coarse score so a real user is never left without
  // results on this revenue-critical funnel.
  const runScoring = useCallback(async (finalAnswers: UnifiedAnswers): Promise<void> => {
    const sAnswers = toScoringAnswers(finalAnswers);
    const amount = finalAnswers.amount as AmountKey | undefined;
    const goal = finalAnswers.goal;
    const stack = computeStackInputs(finalAnswers);
    try {
      const res = await fetch("/api/quiz/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: sAnswers,
          amount,
          goal,
          stack,
          campaignWinners: quizCampaignWinners.map((w) => ({ broker_slug: w.broker_slug })),
        }),
        // Bound the wait so a hung request falls into the local-score
        // fallback below instead of stranding the user on "analyzing".
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`quiz score ${res.status}`);
      const data = (await res.json()) as {
        results: ScoredResult[];
        stackResults: Partial<Record<"super_fund" | "savings_account" | "robo_advisor", VerticalScoredResult[]>>;
      };
      if (!mountedRef.current) return;
      setResults(data.results ?? []);
      setStackResults(data.stackResults ?? {});
    } catch {
      if (!mountedRef.current) return;
      // Graceful degradation — coarse public fallback weights, scored locally.
      setResults(scoreQuizResults(sAnswers, fallbackScores, brokers, quizCampaignWinners, amount, goal));
      setStackResults(buildLocalStack(finalAnswers, stack, brokers));
      setFetchError("Showing cached results.");
    }
  }, [brokers, quizCampaignWinners]);

  // Track completion + persist results
  useEffect(() => {
    if ((phase === "diy-results" || phase === "advisor-results") && brokers.length > 0) {
      trackEvent('quiz_complete', { answers: scoringAnswers, top_broker: results[0]?.slug || null, country: answers.investor_country ?? null }, '/quiz');
      trackEvent('quiz_completed', { top_match: results[0]?.slug || null, country: answers.investor_country ?? null }, '/quiz');
      phTrack('quiz_completed', {
        quiz_type: phase === 'advisor-results' ? 'advisor_match' : 'diy_broker',
        time_taken_seconds: quizStartedAtRef.current
          ? Math.round((Date.now() - quizStartedAtRef.current) / 1000)
          : 0,
        selected_advisor_type: answers.advisor_type ?? null,
        budget_range: answers.amount ?? null,
        risk_profile: answers.experience ?? null,
        top_match_slug: results[0]?.slug ?? null,
        match_count: results.length,
        country: answers.investor_country ?? null,
      });
      try {
        const topResults = results.slice(0, 5).filter(r => r.broker).map(r => ({
          slug: r.slug, name: r.broker!.name, score: r.total,
          logo_url: r.broker!.logo_url || null, color: r.broker!.color,
          tagline: r.broker!.tagline || null, rating: r.broker!.rating || null,
        }));
        localStorage.setItem('invest-quiz-results', JSON.stringify({
          answers: scoringAnswers, results: topResults, completedAt: new Date().toISOString(),
        }));
        storeQualificationData("quiz", {
          answers: scoringAnswers, top_match: results[0]?.slug || null, results_count: results.length,
        });
      } catch { /* quota exceeded */ }
    }
  }, [phase, brokers.length, results, scoringAnswers, answers.advisor_type, answers.amount, answers.experience, answers.investor_country]);

  /* ─── Handlers ─── */

  // Commit the answers and move to the next question — or, when the flow ends,
  // kick off server-side scoring while the analyzing animation masks the
  // round-trip. Advance only when BOTH the scoring response AND the minimum
  // animation time complete (no empty flash, animation never cut short). Email
  // capture is inline in the results screen (warm capture post-value). Shared by
  // single-select (handleAnswer) and the multi-select needs question.
  const commitAndAdvance = (fromId: QuestionId, newAnswers: UnifiedAnswers) => {
    setAnswers(newAnswers);
    setSelectedKey(null);
    setAnimating(false);

    const track = resolveTrack(newAnswers);
    const nextId = getNextId(fromId, newAnswers);
    const newHistory = [...history, fromId];

    if (nextId === null) {
      const advisor = track === "advisor";
      setHistory(newHistory);
      setPhase(advisor ? "advisor-analyzing" : "analyzing");
      const minDelay = new Promise<void>((resolve) =>
        setTimeout(resolve, advisor ? 2200 : 1800),
      );
      Promise.all([minDelay, runScoring(newAnswers)]).then(() => {
        if (!mountedRef.current) return;
        // Only clear saved progress once results are committed — a refresh
        // during the analyzing window now resumes at the last question
        // instead of wiping everything back to Q1.
        clearProgress();
        setPhase(advisor ? "advisor-results" : "diy-results");
      });
    } else {
      setHistory(newHistory);
      setCurrentId(nextId);
      saveProgress(nextId, newAnswers, newHistory);
      requestAnimationFrame(() => { questionHeadingRef.current?.focus(); });
    }
  };

  const handleAnswer = (key: string) => {
    if (animating) return;
    if (history.length === 0) {
      trackEvent('quiz_start', { first_answer: key }, '/quiz');
      quizStartedAtRef.current = Date.now();
      phTrack('quiz_started', {
        quiz_type: 'advisor_match',
        source_page: typeof window !== 'undefined' ? window.location.pathname : '/quiz',
      });
    }
    trackEvent('quiz_step', { question: currentId, answer: key }, '/quiz');

    setSelectedKey(key);
    setAnimating(true);

    const newAnswers = { ...answers, [currentId]: key };

    setTimeout(() => {
      if (!mountedRef.current) return;
      commitAndAdvance(currentId, newAnswers);
    }, 350);
  };

  // Multi-select "who will you need?" submit. Stores the CSV need-set + the
  // allocated single primary as advisor_type (a clean enum value for the lead
  // column + back-compat), then advances from the advisor_type slot.
  const handleNeedsAnswer = (keys: string[]) => {
    if (animating || keys.length === 0) return;
    const csv = keys.join(",");
    const newAnswers: UnifiedAnswers = { ...answers, needs: csv };
    newAnswers.advisor_type = resolveLeadAdvisorType(newAnswers);
    trackEvent('quiz_step', { question: 'advisor_type', answer: csv }, '/quiz');
    commitAndAdvance("advisor_type", newAnswers);
  };

  const handleBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      setCurrentId(prev);
      // Remove the answer for the question we're going back from
      const newAnswers = { ...answers };
      clearAnswerKey(newAnswers, currentId);
      setAnswers(newAnswers);
      saveProgress(prev, newAnswers, newHistory);
      // Move focus + SR cursor to the new question heading (was only done on
      // forward nav — back left keyboard/SR users stranded on <body>).
      requestAnimationFrame(() => { questionHeadingRef.current?.focus(); });
    }
  };

  // Inline email capture from the results screen — fires post-value (the
  // user has already seen their top match + cross-sell). On success the
  // capture component swaps to its thank-you state; on failure we surface
  // the error and let the user retry. Sends the full unifiedAnswers so the
  // /api/quiz-lead route can persist structured columns and downstream
  // surfaces (drip cron, /best pre-filter) can read goal/amount/etc.
  const handleInlineEmailSubmit = async (email: string, name: string) => {
    setEmailCaptureStatus("loading");
    try {
      const res = await fetch("/api/quiz-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          answers: scoringAnswers,
          unifiedAnswers: answers,
          top_match_slug: results[0]?.slug || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      trackEvent("quiz_lead_capture", { source: "quiz_inline", top_match: results[0]?.slug }, "/quiz");
      trackEvent("pdf_opt_in", { source: "quiz_inline" }, "/quiz");
      setEmailCaptureStatus("submitted");
    } catch {
      setEmailCaptureStatus("error");
    }
  };

  const handleShareResult = async () => {
    const topSlug = results[0]?.slug;
    const base = `${window.location.origin}/quiz`;
    const shareUrl = topSlug ? `${base}?top=${encodeURIComponent(topSlug)}` : base;
    const topBrokerName = results[0]?.broker?.name || "my top platform";
    const shareText = `I got matched on Invest.com.au and ${topBrokerName} ranked highest for my criteria! Try Get Matched:`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "My Get Matched Results", text: shareText, url: shareUrl });
        trackEvent("quiz_share", { method: "native", top_broker: results[0]?.slug }, "/quiz");
        return;
      } catch { /* cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    trackEvent("quiz_share", { method: "clipboard", top_broker: results[0]?.slug }, "/quiz");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRestart = () => {
    clearProgress();
    setPhase("questions");
    setCurrentId("location");
    setAnswers({});
    setHistory([]);
    setShowScoring(false);
  };

  // Generate match reasons for platform results — delegates to the attribute-
  // driven lib function. The signature (string[], Broker) is unchanged so all
  // consumers (QuizResultsScreen / QuizTopMatch) need no updates.
  const getMatchReasons = (userAnswers: string[], broker: Broker): string[] => {
    return getBrokerMatchReasons(
      {
        answers: userAnswers,
        goal: answers.goal,
        experience: answers.experience,
        amount: answers.amount,
        priority: answers.priority,
        property_sub: answers.property_sub,
      },
      broker,
    );
  };

  /* ─── Render ─── */

  if (phase === "analyzing") {
    return <QuizAnalyzingScreen track="diy" />;
  }

  if (phase === "advisor-analyzing") {
    return <QuizAnalyzingScreen track="advisor" />;
  }

  if (phase === "diy-results") {
    return (
      <QuizResultsScreen
        results={results}
        answers={scoringAnswers}
        unifiedAnswers={answers}
        hasCryptoResult={hasCryptoResult}
        copied={copied}
        showScoring={showScoring}
        onSetShowScoring={setShowScoring}
        onShareResult={handleShareResult}
        onRestart={handleRestart}
        getMatchReasons={getMatchReasons}
        onEmailCaptureSubmit={handleInlineEmailSubmit}
        emailCaptureStatus={emailCaptureStatus}
        stackResults={stackResults}
        stackInputs={stackInputs}
      />
    );
  }

  if (phase === "advisor-results") {
    return (
      <AdvisorResultsScreen
        advisorType={resolveLeadAdvisorType(answers)}
        quizAnswers={answers as Record<string, string>}
        platformResults={results}
        onRestart={handleRestart}
        isInternational={isInternational(answers)}
        investorCountry={answers.investor_country}
        visaStatus={answers.visa_status}
        investorGoalIntl={answers.investor_goal_intl}
      />
    );
  }

  // Questions phase
  const current = currentId === "advisor_type"
    ? getDynamicAdvisorTypeQuestion(answers)
    : UNIFIED_QUESTIONS[currentId];
  const questionIndex = history.length; // 0-based
  const totalSteps = getTotalSteps(answers);

  // The advisor_type slot is multi-select on the domestic track (the "who will
  // you need?" needs question); international keeps its filtered single-select.
  const isNeedsQuestion = currentId === "advisor_type" && !isInternational(answers);
  const needsInitial = answers.needs
    ? answers.needs.split(",")
    : (() => {
        const suggested = inferAdvisorType(answers);
        return suggested && suggested !== "not-sure" ? [suggested] : [];
      })();

  // Context banner — shown above the question to set expectation about
  // the path the user just selected (currently only used for the international
  // → advisor-only routing, which is otherwise a surprise).
  const contextBanner = (() => {
    if (currentId === "investor_country" && isInternational(answers)) {
      return {
        tone: "intl" as const,
        title: "Most international investors need an advisor first",
        body: "Cross-border tax, FIRB, and visa rules mean an advisor is usually the right starting point. A few quick questions to find the right specialist.",
      };
    }
    if (currentId === "complexity" && (answers.goal === "help" || answers.mode === "help")) {
      return {
        tone: "info" as const,
        title: "You chose expert help — we’ll tailor the specialist match",
        body: "This route skips platform-only questions so we can recommend the most relevant advisor for your situation.",
      };
    }
    if (currentId === "experience" && answers.mode === "diy") {
      return {
        tone: "info" as const,
        title: "You chose the DIY route",
        body: "We’ll now focus on experience, amount, and priorities to rank platforms for self-directed investing.",
      };
    }
    return null;
  })();

  return (
    <>
      {/* Accessible/SEO heading for the quiz funnel (the screens below are
          visual step UI with no semantic h1). sr-only so the design is unchanged. */}
      <h1 className="sr-only">Investment match quiz</h1>
      {sharedTopSlug && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-800">
          Someone got matched with <strong>{brokers.find((b) => b.slug === sharedTopSlug)?.name ?? sharedTopSlug}</strong> — take the quiz to see your match.
        </div>
      )}
    <QuizQuestionScreen
      step={questionIndex}
      questions={[{ question_text: current.text, options: current.options as { key: string; label: string; sub?: string; emoji?: string }[] }]}
      selectedKey={selectedKey}
      animating={animating}
      fetchError={fetchError}
      resumePrompt={resumePrompt}
      resumeQuestionNumber={resumeQuestionNumber}
      resumeTotalQuestions={resumeTotalQuestions}
      contextBanner={contextBanner}
      questionIndex={questionIndex}
      totalQuestions={totalSteps}
      multiSelect={isNeedsQuestion}
      selectedKeys={needsInitial}
      onMultiAnswer={handleNeedsAnswer}
      onAnswer={handleAnswer}
      onBack={handleBack}
      onJumpTo={(targetIndex) => {
        if (targetIndex < 0 || targetIndex >= history.length) return;
        const targetId = history[targetIndex];
        if (!targetId) return;
        // Truncate history to the target index, snap currentId, drop later answers
        const newHistory = history.slice(0, targetIndex);
        const newAnswers: UnifiedAnswers = { ...answers };
        // Clear all answers from history[targetIndex] onwards (the question they're going back to + everything after)
        for (let i = targetIndex; i < history.length; i++) {
          const k = history[i];
          if (k) clearAnswerKey(newAnswers, k);
        }
        // Also drop the current question's answer if any
        clearAnswerKey(newAnswers, currentId);
        setHistory(newHistory);
        setCurrentId(targetId);
        setAnswers(newAnswers);
        saveProgress(targetId, newAnswers, newHistory);
        trackEvent("quiz_jump_back", { from: currentId, to: targetId, target_index: targetIndex }, "/quiz");
        requestAnimationFrame(() => { questionHeadingRef.current?.focus(); });
      }}
      onResume={() => {
        const saved = loadSavedProgress();
        if (saved) {
          setCurrentId(saved.currentId);
          setAnswers(saved.answers);
          setHistory(saved.history);
        }
        setResumePrompt(false);
        requestAnimationFrame(() => { questionHeadingRef.current?.focus(); });
      }}
      onStartOver={() => { clearProgress(); setResumePrompt(false); handleRestart(); }}
      questionHeadingRef={questionHeadingRef}
    />
    </>
  );
}
