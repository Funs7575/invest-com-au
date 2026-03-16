"use client";

import { useState, useCallback } from "react";
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
  budget: string;
  firstName: string;
  email: string;
  phone: string;
  consent: boolean;
}

// ─── Step 1 data ──────────────────────────────────────────────────────────────

const INTENT_OPTIONS = [
  {
    id: "buy_property" as Intent,
    emoji: "🏠",
    title: "Buy Property",
    desc: "Purchase a home or investment property",
    baseClass: "from-rose-50 to-orange-50 border-rose-200 hover:border-rose-400 hover:shadow-rose-100",
    selClass: "from-rose-50 to-orange-50 border-rose-500 ring-2 ring-rose-200",
  },
  {
    id: "grow_wealth" as Intent,
    emoji: "📈",
    title: "Grow Wealth",
    desc: "Build long-term financial security",
    baseClass: "from-emerald-50 to-teal-50 border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100",
    selClass: "from-emerald-50 to-teal-50 border-emerald-500 ring-2 ring-emerald-200",
  },
  {
    id: "protect_assets" as Intent,
    emoji: "🛡️",
    title: "Protect Assets",
    desc: "Insurance, estate planning & succession",
    baseClass: "from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-400 hover:shadow-blue-100",
    selClass: "from-blue-50 to-indigo-50 border-blue-500 ring-2 ring-blue-200",
  },
  {
    id: "business_tax" as Intent,
    emoji: "📊",
    title: "Business / Tax",
    desc: "SMSF setup, tax strategy & debt",
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
      { id: "have_savings", label: "I have savings but no investing plan ($10k–$100k)" },
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
    title: "What's your situation?",
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
  { value: "", label: "Select your state or territory…", disabled: true },
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
  { value: "", label: "Select a range (optional)…" },
  { value: "under_100k", label: "Under $100k — just getting started" },
  { value: "100k_500k", label: "$100k – $500k — building wealth" },
  { value: "500k_2m", label: "$500k – $2M — established investor" },
  { value: "over_2m", label: "$2M+ — high net worth" },
  { value: "prefer_not_say", label: "Prefer not to say" },
];

function intentToNeed(intent: Intent): string {
  return { buy_property: "mortgage", grow_wealth: "planning", protect_assets: "insurance", business_tax: "smsf" }[intent] ?? "planning";
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FindAdvisorPage() {
  const [quiz, setQuiz] = useState<QuizState>({
    step: 1, intent: null, context: [], state: "", budget: "",
    firstName: "", email: "", phone: "", consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [matchedAdvisor, setMatchedAdvisor] = useState<MatchedAdvisor | null>(null);

  const update = useCallback((updates: Partial<QuizState>) => {
    setQuiz((prev) => ({ ...prev, ...updates }));
  }, []);

  const restart = () => {
    setQuiz({ step: 1, intent: null, context: [], state: "", budget: "", firstName: "", email: "", phone: "", consent: false });
    setErrors({}); setSubmitError(null); setSubmitted(false); setMatchedAdvisor(null);
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
    if (!quiz.state) { setErrors({ state: "Please select your state or territory" }); return; }
    setErrors({});
    update({ step: 4 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!quiz.firstName.trim()) errs.firstName = "Please enter your first name";
    if (!quiz.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(quiz.email)) errs.email = "Please enter a valid email";
    if (!quiz.consent) errs.consent = "You must agree to our Privacy Policy and Terms";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    setSubmitError(null);
    setErrors({});

    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_type: "advisor",
          user_email: quiz.email.trim(),
          user_name: quiz.firstName.trim(),
          user_phone: quiz.phone.trim() || undefined,
          user_location_state: quiz.state,
          user_intent: {
            need: intentToNeed(quiz.intent!),
            context: quiz.context,
            budget: quiz.budget,
          },
          source_page: "/find-advisor",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Something went wrong."); return; }
      if (data.matched) setMatchedAdvisor(data.matched);
      setSubmitted(true);
      update({ step: 5 });
      trackEvent("find_advisor_complete", { intent: quiz.intent, matched: !!data.matched }, "/find-advisor");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
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
            budgetValue={quiz.budget}
            onStateChange={(v) => update({ state: v })}
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
            onSubmit={handleSubmit}
            onBack={goBack}
            submitting={submitting}
            errors={errors}
            submitError={submitError}
          />
        )}

        {/* Step 5: success */}
        {quiz.step === 5 && submitted && (
          <MatchConfirmation
            userEmail={quiz.email}
            userFirstName={quiz.firstName}
            matchedAdvisor={matchedAdvisor}
            onRestart={restart}
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
        {["ASIC-verified professionals", "100% free to use", "No spam — ever"].map((t) => (
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
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button variant="primary" onClick={onNext} disabled={selections.length === 0} className="flex-1">
          Continue →
        </Button>
      </div>
    </Card>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────

function Step3({
  stateValue, budgetValue, onStateChange, onBudgetChange, onNext, onBack, error,
}: {
  stateValue: string; budgetValue: string;
  onStateChange: (v: string) => void; onBudgetChange: (v: string) => void;
  onNext: () => void; onBack: () => void; error?: string;
}) {
  return (
    <Card variant="default" padding="lg">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2 leading-tight">Where are you located?</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          We match you with advisors in your area — many also offer remote consultations.
        </p>
      </div>

      <div className="space-y-6">
        <Select
          id="state-select"
          label="State or Territory"
          required
          options={STATES}
          value={stateValue}
          onChange={(e) => onStateChange(e.target.value)}
          error={error}
        />
        <div>
          <Select
            id="budget-select"
            label="What's your situation worth?"
            options={BUDGETS}
            value={budgetValue}
            onChange={(e) => onBudgetChange(e.target.value)}
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Optional — helps us match advisors experienced at your level
          </p>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Button variant="primary" onClick={onNext} disabled={!stateValue} className="flex-1">
          Continue →
        </Button>
      </div>
    </Card>
  );
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────

function Step4({
  firstName, email, phone, consent, onChange, onSubmit, onBack,
  submitting, errors, submitError,
}: {
  firstName: string; email: string; phone: string; consent: boolean;
  onChange: (field: string, value: string | boolean) => void;
  onSubmit: (e: React.FormEvent) => void; onBack: () => void;
  submitting: boolean; errors: Record<string, string>; submitError: string | null;
}) {
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
          error={errors.firstName} autoComplete="given-name" />

        <Input id="email" label="Email address" type="email" required placeholder="john@example.com"
          value={email} onChange={(e) => onChange("email", e.target.value)}
          hint="We'll send your match details here"
          error={errors.email} autoComplete="email" />

        <Input id="phone" label="Phone number" type="tel" placeholder="04XX XXX XXX"
          value={phone} onChange={(e) => onChange("phone", e.target.value)}
          hint="Optional — advisors may call to arrange a meeting"
          autoComplete="tel" />

        {/* Consent */}
        <div className="space-y-1.5">
          <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox" checked={consent}
              onChange={(e) => onChange("consent", e.target.checked)}
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

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onBack} disabled={submitting}>← Back</Button>
          <Button type="submit" variant="primary" loading={submitting} disabled={submitting} className="flex-1">
            {submitting ? "Finding your match…" : "Get Matched Free →"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Match Confirmation ───────────────────────────────────────────────────────

function typeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function MatchConfirmation({ userEmail, userFirstName, matchedAdvisor, onRestart }: {
  userEmail: string; userFirstName: string; matchedAdvisor: MatchedAdvisor | null; onRestart: () => void;
}) {
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
          {matchedAdvisor ? "You've been matched!" : "Request Received!"}
        </h1>
        <p className="text-sm text-slate-500">
          {matchedAdvisor
            ? `Great news ${userFirstName} — we found the perfect advisor for you`
            : "We'll match you with a verified professional shortly"}
        </p>
      </div>

      {/* Matched advisor card */}
      {matchedAdvisor && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-white shadow-lg">
          {/* Match quality bar */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Icon name="zap" size={14} className="text-white" />
              <span className="text-xs font-bold tracking-wide uppercase">Your Matched Advisor</span>
            </div>
            {matchedAdvisor.verified && (
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
                  src={matchedAdvisor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedAdvisor.name)}&size=160&background=f59e0b&color=fff&bold=true`}
                  alt={matchedAdvisor.name}
                  width={72}
                  height={72}
                  className="rounded-xl object-cover w-16 h-16 md:w-[72px] md:h-[72px] ring-2 ring-amber-200"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg md:text-xl font-extrabold text-slate-900 leading-tight">{matchedAdvisor.name}</h2>
                <p className="text-sm font-semibold text-amber-600 mt-0.5">{typeLabel(matchedAdvisor.type)}</p>
                {matchedAdvisor.firm_name && (
                  <p className="text-xs text-slate-500 mt-0.5">{matchedAdvisor.firm_name}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {matchedAdvisor.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            className={`w-3.5 h-3.5 ${i < Math.round(matchedAdvisor.rating) ? "text-amber-400" : "text-slate-200"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-700">{matchedAdvisor.rating}</span>
                      <span className="text-xs text-slate-400">({matchedAdvisor.review_count})</span>
                    </div>
                  )}
                  {matchedAdvisor.location_display && (
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Icon name="map-pin" size={11} className="text-slate-400" />
                      {matchedAdvisor.location_display}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Specialties */}
            {matchedAdvisor.specialties?.length > 0 && (
              <div className="mb-4">
                <p className="text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider mb-2">Specialties</p>
                <div className="flex flex-wrap gap-1.5">
                  {matchedAdvisor.specialties.slice(0, 5).map((spec) => (
                    <span key={spec} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fee info */}
            {matchedAdvisor.fee_description && (
              <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-start gap-2">
                <Icon name="coins" size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">{matchedAdvisor.fee_description}</p>
              </div>
            )}

            {/* CTA */}
            <Link
              href={`/advisor/${matchedAdvisor.slug}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-sm hover:shadow-md text-sm"
            >
              View Full Profile
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      )}

      {/* Next steps */}
      <Card variant="flat" padding="md">
        <h3 className="font-bold text-slate-900 text-sm mb-3.5 flex items-center gap-2">
          <Icon name="clock" size={14} className="text-amber-500" />
          What happens next, {userFirstName}:
        </h3>
        <ol className="space-y-3">
          {(matchedAdvisor
            ? [
                `${matchedAdvisor.name} has been notified of your enquiry`,
                `They'll reach out to you at ${userEmail} within 24 hours`,
                "You'll book a free initial consultation — no obligation",
              ]
            : [
                "We'll find the best-matched advisor for your situation",
                `They'll reach out to you at ${userEmail} within 24 hours`,
                "You'll book a free initial consultation — no obligation",
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
