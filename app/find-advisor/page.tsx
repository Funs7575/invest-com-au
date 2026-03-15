"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { trackEvent } from "@/lib/tracking";

// ─── Types ─────────────────────────────────────────────────────────────────

type Intent = "buy_property" | "grow_wealth" | "protect_assets" | "business_tax";

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

interface MatchedAdvisor {
  id: number;
  name: string;
  firmName?: string | null;
  typeLabel: string;
  location: string;
  slug: string;
  photoUrl?: string | null;
  rating?: number | null;
  reviewCount: number;
  freeConsultation: boolean;
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
  return { buy_property: "mortgage", grow_wealth: "planning", protect_assets: "insurance", business_tax: "smsf" }[intent];
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
  const [matched, setMatched] = useState<MatchedAdvisor | null>(null);
  const [noMatch, setNoMatch] = useState(false);

  const update = useCallback((updates: Partial<QuizState>) => {
    setQuiz((prev) => ({ ...prev, ...updates }));
  }, []);

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
          need: intentToNeed(quiz.intent!),
          amount: quiz.budget,
          state: quiz.state,
          firstName: quiz.firstName.trim(),
          email: quiz.email.trim(),
          phone: quiz.phone.trim() || undefined,
          consent: true,
          qualificationData: {
            source: "find_advisor",
            data: { intent: quiz.intent, context: quiz.context, state: quiz.state, budget: quiz.budget },
          },
        }),
      });
      const data = await res.json();
      if (res.status === 404) { setNoMatch(true); update({ step: 5 }); return; }
      if (!res.ok) { setSubmitError(data.error || "Something went wrong."); return; }
      setMatched(data.advisor);
      update({ step: 5 });
      trackEvent("find_advisor_complete", { intent: quiz.intent }, "/find-advisor");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => { setErrors({}); update({ step: quiz.step - 1 }); };
  const restart = () => {
    setQuiz({ step: 1, intent: null, context: [], state: "", budget: "", firstName: "", email: "", phone: "", consent: false });
    setErrors({}); setSubmitError(null); setMatched(null); setNoMatch(false);
  };

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
        {quiz.step === 5 && matched && (
          <MatchConfirmation advisor={matched} userEmail={quiz.email} onRestart={restart} />
        )}

        {/* Step 5: no match */}
        {quiz.step === 5 && noMatch && !matched && (
          <NoMatchFallback intent={quiz.intent} userState={quiz.state} onRestart={restart} />
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

function MatchConfirmation({ advisor, userEmail, onRestart }: {
  advisor: MatchedAdvisor; userEmail: string; onRestart: () => void;
}) {
  const initials = advisor.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <div className="space-y-5">
      {/* Success header */}
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1.5">Match Found!</h1>
        <p className="text-sm text-slate-500">We&apos;ve connected you with a verified professional</p>
      </div>

      {/* Advisor card */}
      <Card variant="default" padding="md">
        <div className="flex items-start gap-4">
          {advisor.photoUrl ? (
            <Image src={advisor.photoUrl} alt={advisor.name} width={64} height={64} className="w-16 h-16 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-amber-100 flex items-center justify-center text-xl font-extrabold text-amber-700 shrink-0" aria-hidden="true">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <Badge variant="success" size="sm">✓ Verified</Badge>
              {advisor.freeConsultation && <Badge variant="gold" size="sm">Free consult</Badge>}
            </div>
            <h2 className="text-base font-extrabold text-slate-900 leading-snug">{advisor.name}</h2>
            {advisor.firmName && <p className="text-xs text-slate-500 mt-0.5">{advisor.firmName}</p>}
            <p className="text-sm text-slate-600 mt-0.5">{advisor.typeLabel} · {advisor.location}</p>
            {advisor.rating && (
              <p className="text-xs text-amber-600 font-semibold mt-1">★ {advisor.rating}/5 · {advisor.reviewCount} reviews</p>
            )}
          </div>
        </div>
      </Card>

      {/* Next steps */}
      <Card variant="flat" padding="md">
        <h3 className="font-bold text-slate-900 text-sm mb-4">What happens next:</h3>
        <ol className="space-y-3">
          {[
            `${advisor.name.split(" ")[0]} will email you at ${userEmail} within 24 hours`,
            "You'll book a free initial consultation",
            "They'll give you a personalised plan — no obligation to proceed",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <span className="text-sm text-slate-700 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="primary" href={`/advisor/${advisor.slug}`} className="flex-1 justify-center">
          View Full Profile →
        </Button>
        <Button variant="secondary" href="/advisors" className="flex-1 justify-center">
          Browse Other Advisors
        </Button>
      </div>

      <p className="text-center text-xs text-slate-400 leading-relaxed">
        Check your inbox at <strong className="text-slate-600">{userEmail}</strong> for confirmation and next steps.
      </p>

      <div className="text-center">
        <button onClick={onRestart} className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline">
          Start over
        </button>
      </div>
    </div>
  );
}

// ─── No Match Fallback ────────────────────────────────────────────────────────

function NoMatchFallback({ intent, userState, onRestart }: {
  intent: Intent | null; userState: string; onRestart: () => void;
}) {
  const intentLabel = INTENT_OPTIONS.find((o) => o.id === intent)?.title ?? "advisor";
  return (
    <Card variant="default" padding="lg" className="text-center">
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-2">We&apos;re expanding in {userState}</h2>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        We don&apos;t have a verified {intentLabel.toLowerCase()} in your area yet, but our network is growing fast. Browse all Australia-wide advisors or try different criteria.
      </p>
      <div className="flex flex-col gap-3">
        <Button variant="primary" href="/advisors" className="justify-center">Browse All Advisors</Button>
        <Button variant="secondary" onClick={onRestart} className="justify-center">Try Again</Button>
      </div>
    </Card>
  );
}
