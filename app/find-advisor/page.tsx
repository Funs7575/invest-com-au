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

// ─── Types ─────────────────────────────────────────────────────────────────

type Intent = "buy_property" | "grow_wealth" | "protect_assets" | "business_tax";

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
  specialties: string[];
  fee_description: string | null;
  verified: boolean;
}

interface QuizState {
  step: number;
  intent: Intent | null;
  context: string[];
  state: string;
  postcode: string;
  suburb: string;
  budget: string;
  firstName: string;
  email: string;
  phone: string;
  consent: boolean;
}

// ─── Session persistence helpers ─────────────────────────────────────────────

const STORAGE_KEY = "invest_quiz_match";

interface PersistedMatch {
  matchedAdvisors: MatchedAdvisor[];
  excludeIds: number[];
  leadIds: number[];
  confirmedAdvisorId: number | null;
  quizData: { intent: string; context: string[]; state: string; postcode: string; suburb: string; budget: string; firstName: string; email: string };
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

// ─── Step 1 data ──────────────────────────────────────────────────────────────

const INTENT_OPTIONS = [
  {
    id: "buy_property" as Intent,
    emoji: "\u{1F3E0}",
    title: "Buy Property",
    desc: "Find a mortgage broker, buyer's agent, or refinancing help",
    baseClass: "from-rose-50 to-orange-50 border-rose-200 hover:border-rose-400 hover:shadow-rose-100",
    selClass: "from-rose-50 to-orange-50 border-rose-500 ring-2 ring-rose-200",
  },
  {
    id: "grow_wealth" as Intent,
    emoji: "\u{1F4C8}",
    title: "Grow Wealth",
    desc: "Get a financial planner for investing, super, or retirement",
    baseClass: "from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100",
    selClass: "from-emerald-50 to-teal-50 border-emerald-500 ring-2 ring-emerald-200",
  },
  {
    id: "protect_assets" as Intent,
    emoji: "\u{1F6E1}\uFE0F",
    title: "Protect Assets",
    desc: "Life insurance, income protection, wills & estate planning",
    baseClass: "from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-400 hover:shadow-blue-100",
    selClass: "from-blue-50 to-indigo-50 border-blue-500 ring-2 ring-blue-200",
  },
  {
    id: "business_tax" as Intent,
    emoji: "\u{1F4CA}",
    title: "Tax & SMSF",
    desc: "Self-managed super (SMSF), tax advice, or crypto tax help",
    baseClass: "from-violet-50 to-purple-50 border-violet-200 hover:border-violet-400 hover:shadow-violet-100",
    selClass: "from-violet-50 to-purple-50 border-violet-500 ring-2 ring-violet-200",
  },
];

// ─── Step 2 context config ────────────────────────────────────────────────────

const CONTEXT_CONFIG: Record<
  Intent,
  { title: string; subtitle: string; type: "checkbox" | "radio"; options: { id: string; label: string }[] }
> = {
  buy_property: {
    title: "Tell us about your property plans",
    subtitle: "Select all that apply",
    type: "checkbox",
    options: [
      { id: "first_home", label: "I'm buying my first home" },
      { id: "investment", label: "I'm buying an investment property" },
      { id: "refinance", label: "I'm refinancing my current mortgage" },
      { id: "buyers_agent", label: "I need a buyer's agent to find the right property" },
      { id: "not_sure", label: "I'm not sure yet — I need general guidance" },
    ],
  },
  grow_wealth: {
    title: "Where are you at financially?",
    subtitle: "Choose the option that best describes you",
    type: "radio",
    options: [
      { id: "getting_started", label: "Just getting started (under $10k saved)" },
      { id: "have_savings", label: "I have savings but no investing plan ($10k\u2013$100k)" },
      { id: "optimize", label: "I have investments and want to optimise ($100k+)" },
      { id: "retirement", label: "I'm approaching retirement and need a strategy" },
    ],
  },
  protect_assets: {
    title: "What do you need to protect?",
    subtitle: "Select all that apply",
    type: "checkbox",
    options: [
      { id: "life_insurance", label: "Life insurance (cover for my dependents)" },
      { id: "income_protection", label: "Income protection (if I can't work)" },
      { id: "estate_planning", label: "Estate planning (will, power of attorney)" },
      { id: "aged_care", label: "Aged care planning" },
      { id: "business_succession", label: "Business succession planning" },
    ],
  },
  business_tax: {
    title: "What\u2019s your situation?",
    subtitle: "Choose the option that best describes you",
    type: "radio",
    options: [
      { id: "smsf_setup", label: "I want to set up an SMSF" },
      { id: "smsf_manage", label: "I have an SMSF and need help managing it" },
      { id: "tax_optimization", label: "I need tax optimisation advice" },
      { id: "debt_restructure", label: "I have business debt I want to restructure" },
      { id: "crypto_tax", label: "I need crypto tax help" },
    ],
  },
};

// ─── Step 3 select options ────────────────────────────────────────────────────

const STATES = [
  { value: "", label: "Select your state or territory\u2026", disabled: true },
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
];

const BUDGETS = [
  { value: "", label: "Select a range (optional)\u2026" },
  { value: "under_100k", label: "Under $100k" },
  { value: "100k_500k", label: "$100k \u2013 $500k" },
  { value: "500k_2m", label: "$500k \u2013 $2M" },
  { value: "over_2m", label: "$2M+" },
  { value: "prefer_not_say", label: "Prefer not to say" },
];

function intentToNeed(intent: Intent): string {
  return { buy_property: "mortgage", grow_wealth: "planning", protect_assets: "insurance", business_tax: "smsf" }[intent] ?? "planning";
}

const NEED_TO_INTENT: Record<string, Intent> = {
  mortgage: "buy_property",
  buyers: "buy_property",
  insurance: "protect_assets",
  planning: "grow_wealth",
  tax: "business_tax",
  wealth: "grow_wealth",
  smsf: "business_tax",
  estate: "protect_assets",
  agedcare: "protect_assets",
  property: "buy_property",
  crypto: "business_tax",
};

// ─── Matchmaker bridge ────────────────────────────────────────────────────────
// Maps the /start matchmaker priority answers to find-advisor intents so users
// arriving from the unified funnel (without a ?need= param) are pre-qualified.

const PRIORITY_TO_NEED: Record<string, string> = {
  "mortgage-broker": "mortgage",
  "buyers-agent": "buyers",
  "financial-planner": "planning",
  "smsf-accountant": "smsf",
  "tax-agent": "tax",
  "insurance-broker": "insurance",
  "wealth": "wealth",
};

const GOAL_TO_NEED: Record<string, string> = {
  home: "mortgage",
  property: "property",
  wealth: "wealth",
  crypto: "crypto",
  super: "smsf",
  income: "planning",
};

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FindAdvisorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white py-8 md:py-16"><div className="max-w-xl mx-auto px-4 text-center text-slate-400 text-sm">Loading quiz...</div></div>}>
      <FindAdvisorQuiz />
    </Suspense>
  );
}

function FindAdvisorQuiz() {
  const searchParams = useSearchParams();
  const needParam = searchParams.get("need");
  const prefilledIntent = needParam ? NEED_TO_INTENT[needParam] || null : null;

  // Read sessionStorage once synchronously so all lazy initialisers share the same
  // parsed value — avoids 5 separate JSON.parse calls and, crucially, avoids the
  // two-render flash (step-1 paint → useEffect → step-5 repaint).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const _savedMatch = typeof sessionStorage !== "undefined" ? loadMatchFromStorage() : null;
  const savedMatch = _savedMatch && _savedMatch.matchedAdvisors.length > 0 ? _savedMatch : null;

  // If no explicit ?need= param, check whether the user just came through the
  // /start matchmaker and use that context to pre-fill their intent.
  const matchmakerIntent = !prefilledIntent ? getMatchmakerIntent() : null;
  const initialIntent = prefilledIntent ?? matchmakerIntent ?? null;

  const [quiz, setQuiz] = useState<QuizState>(() => {
    if (savedMatch) {
      return {
        step: 5,
        intent: (savedMatch.quizData.intent as Intent) ?? (initialIntent ?? null),
        context: savedMatch.quizData.context ?? [],
        state: savedMatch.quizData.state ?? "",
        postcode: savedMatch.quizData.postcode ?? "",
        suburb: savedMatch.quizData.suburb ?? "",
        budget: savedMatch.quizData.budget ?? "",
        firstName: savedMatch.quizData.firstName ?? "",
        email: savedMatch.quizData.email ?? "",
        phone: "",
        consent: false,
      };
    }
    return {
      step: initialIntent ? 2 : 1,
      intent: initialIntent,
      context: [], state: "", postcode: "", suburb: "", budget: "",
      firstName: "", email: "", phone: "", consent: false,
    };
  });

  // Handle late searchParams changes (e.g. client-side navigation)
  const [appliedNeed, setAppliedNeed] = useState<string | null>(needParam);
  useEffect(() => {
    if (needParam && needParam !== appliedNeed) {
      const intent = NEED_TO_INTENT[needParam] || null;
      if (intent) {
        setQuiz(prev => ({ ...prev, step: 2, intent, context: [] }));
        setAppliedNeed(needParam);
      }
    }
  }, [needParam, appliedNeed]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(!!savedMatch);
  const [matchedAdvisors, setMatchedAdvisors] = useState<MatchedAdvisor[]>(() => savedMatch?.matchedAdvisors ?? []);
  const [excludeIds, setExcludeIds] = useState<number[]>(() => savedMatch?.excludeIds ?? []);
  const [leadIds, setLeadIds] = useState<number[]>(() => savedMatch?.leadIds ?? []);
  const [confirming, setConfirming] = useState(false);
  const [confirmedAdvisorId, setConfirmedAdvisorId] = useState<number | null>(() => savedMatch?.confirmedAdvisorId ?? null);
  const [noMoreMatches, setNoMoreMatches] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [otpStage, setOtpStage] = useState<"idle" | "sending" | "sent" | "verifying">("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);


  const currentMatch = matchedAdvisors.length > 0 ? matchedAdvisors[matchedAdvisors.length - 1] : null;

  const update = useCallback((updates: Partial<QuizState>) => {
    setQuiz((prev) => ({ ...prev, ...updates }));
  }, []);

  const restart = () => {
    setQuiz({ step: 1, intent: null, context: [], state: "", postcode: "", suburb: "", budget: "", firstName: "", email: "", phone: "", consent: false });
    setErrors({}); setSubmitError(null); setSubmitted(false);
    setMatchedAdvisors([]); setExcludeIds([]); setNoMoreMatches(false);
    clearMatchStorage();
  };

  const handleIntent = (intent: Intent) => {
    update({ intent, step: 2, context: [] });
    setErrors({});
    trackEvent("find_advisor_step1", { intent }, "/find-advisor");
  };

  const toggleContext = (id: string, isRadio: boolean) => {
    setQuiz((prev) => ({
      ...prev,
      context: isRadio ? [id] : prev.context.includes(id)
        ? prev.context.filter((c) => c !== id)
        : [...prev.context, id],
    }));
  };

  const handleStep2Next = () => {
    if (quiz.context.length === 0) { setErrors({ context: "Please select at least one option" }); return; }
    setErrors({});
    update({ step: 3 });
    trackEvent("find_advisor_step2", { context: quiz.context }, "/find-advisor");
  };

  const handleStep3Next = () => {
    if (!quiz.state) { setErrors({ state: "Please enter a postcode or select your state or territory" }); return; }
    setErrors({});
    update({ step: 4 });
  };

  /** Find a matching advisor WITHOUT creating a lead or sending any emails (dry run). */
  const findMatch = async (excludeList: number[] = []) => {
    const res = await fetch("/api/submit-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_type: "advisor",
        user_email: quiz.email.trim(),
        user_name: quiz.firstName.trim(),
        user_phone: quiz.phone.trim() || undefined,
        user_location_state: quiz.state,
        user_postcode: quiz.postcode || undefined,
        user_suburb: quiz.suburb || undefined,
        user_intent: {
          need: intentToNeed(quiz.intent!),
          context: quiz.context,
          budget: quiz.budget,
        },
        source_page: "/find-advisor",
        exclude_advisor_ids: excludeList,
        dry_run: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  };

  /** Confirm a previewed advisor: creates the lead and sends advisor email. */
  const confirmMatch = async (advisorId: number) => {
    const res = await fetch("/api/submit-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lead_type: "advisor",
        user_email: quiz.email.trim(),
        user_name: quiz.firstName.trim(),
        user_phone: quiz.phone.trim() || undefined,
        user_location_state: quiz.state,
        user_postcode: quiz.postcode || undefined,
        user_suburb: quiz.suburb || undefined,
        user_intent: {
          need: intentToNeed(quiz.intent!),
          context: quiz.context,
          budget: quiz.budget,
        },
        source_page: "/find-advisor",
        confirm_advisor_id: advisorId,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  };

  const validateStep4 = () => {
    const errs: Record<string, string> = {};
    if (!quiz.firstName.trim()) errs.firstName = "Please enter your first name";
    if (!quiz.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quiz.email)) errs.email = "Please enter a valid email";
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
      setOtpStage("sent");
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
    // OTP verified — find a match preview (no lead created, no email sent yet)
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
      }
      setSubmitted(true);
      update({ step: 5 });
      trackEvent("find_advisor_complete", { intent: quiz.intent, matched: !!data.matched }, "/find-advisor");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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

  const goBack = () => { setErrors({}); update({ step: quiz.step - 1 }); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white py-8 md:py-16">
      <div className="max-w-xl mx-auto px-4">

        {/* Breadcrumb */}
        <nav className="text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/advisors" className="hover:text-slate-700 transition-colors">Advisors</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">Find an Advisor</span>
        </nav>

        {/* Progress bar */}
        {quiz.step <= 4 && (
          <div className="mb-8">
            <ProgressBar currentStep={quiz.step} totalSteps={4} />
          </div>
        )}

        {/* Step 1 */}
        {quiz.step === 1 && <Step1 onSelect={handleIntent} />}

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
            stateValue={quiz.state}
            postcodeValue={quiz.postcode}
            suburbValue={quiz.suburb}
            budgetValue={quiz.budget}
            onStateChange={(v) => update({ state: v })}
            onPostcodeChange={(postcode, state, suburb) => update({ postcode, state, suburb })}
            onBudgetChange={(v) => update({ budget: v })}
            onNext={handleStep3Next}
            onBack={goBack}
            error={errors.state}
          />
        )}

        {/* Step 4 */}
        {quiz.step === 4 && (
          <Step4
            firstName={quiz.firstName}
            email={quiz.email}
            phone={quiz.phone}
            consent={quiz.consent}
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
          />
        )}

        {/* Step 5: success */}
        {quiz.step === 5 && submitted && (
          <MatchConfirmation
            userEmail={quiz.email}
            userFirstName={quiz.firstName}
            currentMatch={currentMatch}
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
        {quiz.step <= 4 && (
          <p className="text-center text-xs text-slate-400 mt-8 leading-relaxed">
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
        {["ASIC-verified professionals", "100% free to use", "No spam \u2014 ever"].map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {t}
          </span>
        ))}
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
              <span className="text-sm font-medium text-slate-800 leading-relaxed">{opt.label}</span>
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
  stateValue, postcodeValue, suburbValue, budgetValue,
  onStateChange, onPostcodeChange, onBudgetChange, onNext, onBack, error,
}: {
  stateValue: string; postcodeValue: string; suburbValue: string; budgetValue: string;
  onStateChange: (v: string) => void;
  onPostcodeChange: (postcode: string, state: string, suburb: string) => void;
  onBudgetChange: (v: string) => void;
  onNext: () => void; onBack: () => void; error?: string;
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
          onPostcodeChange(pick.postcode, pick.state, pick.locality);
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

  const hasValidLocation = !!stateValue;

  return (
    <Card variant="default" padding="lg">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 leading-tight">Where are you located?</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          We match you with advisors in your area — many also offer remote consultations.
        </p>
      </div>

      <div className="space-y-5">
        {/* Postcode — primary input */}
        <div>
          <label htmlFor="postcode-input" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Postcode <span className="text-slate-400 font-normal">(recommended)</span>
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
                <svg className="w-4 h-4 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
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

        {/* Combined error */}
        {error && !stateValue && !postcodeInput && (
          <p className="text-xs text-red-600 flex items-center gap-1.5 -mt-3" role="alert">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
          </p>
        )}

        {/* Budget */}
        <div>
          <Select
            id="budget-select"
            label="Approximate investable assets or portfolio size"
            options={BUDGETS}
            value={budgetValue}
            onChange={(e) => onBudgetChange(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Optional — helps us match you with advisors experienced at your level
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="ghost" onClick={onBack}>&larr; Back</Button>
        <Button variant="primary" onClick={onNext} disabled={!hasValidLocation} className="flex-1">
          Continue &rarr;
        </Button>
      </div>
    </Card>
  );
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────

function Step4({
  firstName, email, phone, consent, onChange, onSubmit, onBack,
  submitting, errors, submitError,
  otpStage, otpCode, otpError, onOtpCodeChange, onOtpVerify, onOtpResend,
}: {
  firstName: string; email: string; phone: string; consent: boolean;
  onChange: (field: string, value: string | boolean) => void;
  onSubmit: (e: React.FormEvent) => void; onBack: () => void;
  submitting: boolean; errors: Record<string, string>; submitError: string | null;
  otpStage: "idle" | "sending" | "sent" | "verifying";
  otpCode: string; otpError: string | null;
  onOtpCodeChange: (v: string) => void;
  onOtpVerify: () => void;
  onOtpResend: (e: React.SyntheticEvent) => void;
}) {
  const otpActive = otpStage === "sent" || otpStage === "verifying";

  return (
    <Card variant="default" padding="lg">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 leading-tight">
          Almost there — where should we send your match?
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          We&apos;ll connect you with a verified professional in your area within 24 hours.
        </p>
      </div>

      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2.5">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          {submitError}
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Input id="firstName" label="First name" type="text" required placeholder="John"
          value={firstName} onChange={(e) => onChange("firstName", e.target.value)}
          error={errors.firstName} autoComplete="given-name" disabled={otpActive} />

        <Input id="email" label="Email address" type="email" required placeholder="john@example.com"
          value={email} onChange={(e) => onChange("email", e.target.value)}
          hint={otpActive ? `Code sent to ${email}` : "We'll send a verification code here"}
          error={errors.email} autoComplete="email" disabled={otpActive} />

        <Input id="phone" label="Phone number" type="tel" placeholder="04XX XXX XXX"
          value={phone} onChange={(e) => onChange("phone", e.target.value)}
          hint="Optional — advisors may call to arrange a meeting"
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
              <Link href="/privacy" target="_blank" className="text-amber-600 hover:text-amber-700 underline">Privacy Policy</Link>
              {" "}and{" "}
              <Link href="/terms" target="_blank" className="text-amber-600 hover:text-amber-700 underline">Terms of Use</Link>.
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
              {otpStage === "sending" ? "Sending code\u2026" : "Continue \u2192"}
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
            <div>
              <p className="text-sm font-bold text-slate-900">Check your inbox</p>
              <p className="text-xs text-slate-500 mt-0.5">We sent a 6-digit code to <strong>{email}</strong></p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Verification code</label>
              <input
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
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5">
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
              {otpStage === "verifying" || submitting ? "Verifying\u2026" : "Verify & Get Matched \u2192"}
            </Button>

            <p className="text-center text-xs text-slate-400">
              Didn&apos;t get it?{" "}
              <button
                type="button"
                onClick={onOtpResend}
                className="text-amber-600 hover:text-amber-700 font-semibold"
              >
                Resend code
              </button>
              {" "}· Wrong email?{" "}
              <button
                type="button"
                onClick={() => { clearMatchStorage(); onOtpCodeChange(""); window.location.reload(); }}
                className="text-slate-500 hover:text-slate-700 font-semibold"
              >
                Start over
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

function MatchConfirmation({ userEmail, userFirstName, currentMatch, allMatches, onRematch, rematching, noMoreMatches, onRestart, submitError, onConfirm, confirming, confirmedAdvisorId }: {
  userEmail: string; userFirstName: string; currentMatch: MatchedAdvisor | null; allMatches: MatchedAdvisor[];
  onRematch: () => void; rematching: boolean; noMoreMatches: boolean; onRestart: () => void; submitError: string | null;
  onConfirm: (advisor: MatchedAdvisor) => void; confirming: boolean; confirmedAdvisorId: number | null;
}) {
  const isCurrentConfirmed = !!(currentMatch && confirmedAdvisorId === currentMatch.id);
  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Success header */}
      <div className="text-center py-3">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
          {isCurrentConfirmed ? "You\u2019re connected!" : currentMatch ? "We found a match!" : "Request Received!"}
        </h1>
        <p className="text-sm text-slate-500">
          {isCurrentConfirmed
            ? `${currentMatch!.name} has been notified and will be in touch shortly`
            : currentMatch
            ? `${userFirstName}, review this advisor and confirm if you\u2019d like to connect`
            : "We'll match you with a verified professional shortly"}
        </p>
        {allMatches.length > 1 && (
          <p className="text-xs text-amber-600 font-semibold mt-1">
            Match {allMatches.length} of {allMatches.length}{noMoreMatches ? " (all available)" : ""}
          </p>
        )}
      </div>

      {/* Matched advisor card */}
      {currentMatch && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-white shadow-lg">
          {/* Match quality bar */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Icon name="zap" size={14} className="text-white" />
              <span className="text-xs font-bold tracking-wide uppercase">Your Matched Advisor</span>
            </div>
            {currentMatch.verified && (
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5">
                <Icon name="shield-check" size={12} className="text-white" />
                <span className="text-[0.65rem] font-semibold text-white">ASIC Verified</span>
              </div>
            )}
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
                  className="rounded-xl object-cover w-16 h-16 md:w-[72px] md:h-[72px] ring-2 ring-amber-200"
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
                  {currentMatch.rating > 0 && (
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
                      <span className="text-xs text-slate-400">({currentMatch.review_count})</span>
                    </div>
                  )}
                  {currentMatch.location_display && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Icon name="map-pin" size={11} className="text-slate-400" />
                      {currentMatch.location_display}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Specialties */}
            {currentMatch.specialties?.length > 0 && (
              <div className="mb-4">
                <p className="text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider mb-2">Specialties</p>
                <div className="flex flex-wrap gap-1.5">
                  {currentMatch.specialties.slice(0, 5).map((spec) => (
                    <span key={spec} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fee info */}
            {currentMatch.fee_description && (
              <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-start gap-2">
                <Icon name="coins" size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">{currentMatch.fee_description}</p>
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
                  className="flex items-center justify-center gap-2 w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md text-sm"
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Previous Matches</p>
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
                  <p className="text-xs text-slate-500">{typeLabel(advisor.type)}{advisor.location_display ? ` \u2022 ${advisor.location_display}` : ""}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold shrink-0">
                  <span>{advisor.rating}</span>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Rematch button — hidden once user has confirmed an advisor */}
      {currentMatch && !noMoreMatches && !isCurrentConfirmed && (
        <button
          onClick={onRematch}
          disabled={rematching}
          className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-600 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/50 transition-all disabled:opacity-50"
        >
          {rematching ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
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

      {noMoreMatches && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-amber-800 mb-1">You&apos;ve seen all available matches</p>
          <p className="text-xs text-amber-600">We&apos;ve matched you with every advisor available for your criteria. Browse our full directory for more options.</p>
        </div>
      )}

      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center">
          {submitError}
        </div>
      )}

      {/* Next steps */}
      <Card variant="flat" padding="md">
        <h3 className="font-bold text-slate-900 text-sm mb-3.5 flex items-center gap-2">
          <Icon name="clock" size={14} className="text-amber-500" />
          What happens next, {userFirstName}:
        </h3>
        <ol className="space-y-3">
          {(currentMatch
            ? [
                `${currentMatch.name} has been notified of your enquiry`,
                `They'll reach out to you at ${userEmail} within 24 hours`,
                "You'll book a free initial consultation \u2014 no obligation",
              ]
            : [
                "We'll find the best-matched advisor for your situation",
                `They'll reach out to you at ${userEmail} within 24 hours`,
                "You'll book a free initial consultation \u2014 no obligation",
              ]
          ).map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <span className="text-sm text-slate-700 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* Trust signals */}
      <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-2 py-2">
        {[
          { icon: "shield-check", text: "Your details go to one advisor only", color: "text-emerald-500" },
          { icon: "lock", text: "Data encrypted & secure", color: "text-slate-400" },
          { icon: "x-circle", text: "Unsubscribe anytime", color: "text-slate-400" },
        ].map((item) => (
          <span key={item.text} className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name={item.icon} size={13} className={item.color} />
            {item.text}
          </span>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="secondary" href="/advisors" className="flex-1 justify-center">
          Browse All Advisors
        </Button>
        <Button variant="secondary" href="/compare" className="flex-1 justify-center">
          Compare Platforms
        </Button>
      </div>

      <p className="text-center text-xs text-slate-400 leading-relaxed">
        Confirmation sent to <strong className="text-slate-600">{userEmail}</strong>
      </p>

      <div className="text-center">
        <button onClick={onRestart} className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline">
          Start over with a different goal
        </button>
      </div>
    </div>
  );
}
