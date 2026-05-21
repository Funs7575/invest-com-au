"use client";

/**
 * Family-office "Do I need a family office?" diagnostic.
 *
 * Factual, general-information only — not personal financial advice.
 * Collects net-worth band, complexity signals, and primary goal,
 * then routes to a recommended next step (specialist referral form or
 * directory browse). Reuses the quiz question-card visual pattern.
 *
 * No billing, no money handling, no escalation beyond the existing
 * /api/advisor-lead endpoint.
 */

import { useState } from "react";
import { trackEvent } from "@/lib/tracking";
import FamilyOfficeReferralForm from "./FamilyOfficeReferralForm";

/* ─── Types ─── */

type StepId = "wealth" | "complexity" | "goal" | "result";

interface Answers {
  wealth?: string;
  complexity?: string;
  goal?: string;
}

/* ─── Question definitions ─── */

const STEPS: Record<
  Exclude<StepId, "result">,
  {
    question: string;
    sub?: string;
    options: { key: string; label: string; sub?: string }[];
  }
> = {
  wealth: {
    question: "What is your approximate investable net worth?",
    sub: "Investable assets — not including your primary residence.",
    options: [
      { key: "under_1m",  label: "Under $1 million",    sub: "Typically managed via a financial planner or DIY platform" },
      { key: "1m_5m",     label: "$1 million – $5 million",  sub: "High-net-worth: financial planner + tax structure usually sufficient" },
      { key: "5m_20m",    label: "$5 million – $20 million", sub: "Ultra-high-net-worth: single-family office or multi-family office" },
      { key: "20m_plus",  label: "$20 million +",             sub: "Dedicated single-family office likely cost-effective at this scale" },
    ],
  },
  complexity: {
    question: "How would you describe your financial situation?",
    options: [
      { key: "simple",     label: "Simple",      sub: "One or two asset classes, straightforward tax" },
      { key: "moderate",   label: "Moderate",    sub: "Multiple assets, SMSF, trust, or business interests" },
      { key: "complex",    label: "Complex",     sub: "Multi-entity structures, offshore assets, business sale, philanthropy" },
      { key: "very_complex", label: "Very complex", sub: "Multiple generations, international assets, succession, governance" },
    ],
  },
  goal: {
    question: "What is your primary objective right now?",
    options: [
      { key: "consolidate",   label: "Consolidate and simplify",        sub: "Bring fragmented assets under one coordinated view" },
      { key: "grow",          label: "Long-term wealth growth",          sub: "Institutional-style investment strategy with governance" },
      { key: "protect",       label: "Protect and transfer wealth",      sub: "Estate planning, succession, trusts, philanthropy" },
      { key: "liquidity",     label: "Manage a liquidity event",         sub: "Business sale, inheritance, or large windfall — need a plan" },
      { key: "just_exploring", label: "Just exploring options",          sub: "I want to understand whether a family office makes sense" },
    ],
  },
};

const ORDER: Exclude<StepId, "result">[] = ["wealth", "complexity", "goal"];

/* ─── Outcome logic ─── */

type Outcome = "financial_planner" | "multi_family_office" | "single_family_office" | "explore";

function resolveOutcome(a: Answers): Outcome {
  if (a.wealth === "20m_plus") return "single_family_office";
  if (a.wealth === "5m_20m" && (a.complexity === "complex" || a.complexity === "very_complex")) {
    return "multi_family_office";
  }
  if (a.wealth === "5m_20m") return "multi_family_office";
  if (a.wealth === "1m_5m" && a.complexity === "very_complex") return "multi_family_office";
  if (a.goal === "just_exploring") return "explore";
  return "financial_planner";
}

const OUTCOME_COPY: Record<
  Outcome,
  { headline: string; body: string; cta: string; advisorType: string; tone: "amber" | "blue" | "slate" }
> = {
  single_family_office: {
    headline: "A dedicated single-family office is likely the right structure",
    body: "At your wealth level, the cost of establishing a single-family office — typically $1M–$3M per year in operating costs — is often justified by the tax, governance, and investment advantages. You should speak with a family-office advisory firm to assess set-up costs, structures, and trustee arrangements.",
    cta: "Connect with a family-office specialist",
    advisorType: "family-office-specialist",
    tone: "blue",
  },
  multi_family_office: {
    headline: "A multi-family office (MFO) is the most likely fit",
    body: "Multi-family offices serve multiple client families under a shared structure, giving you institutional investment access, consolidated reporting, and holistic wealth advisory without the cost of going solo. MFOs in Australia typically require $5M+ in investable assets.",
    cta: "Find MFO specialists",
    advisorType: "family-office-specialist",
    tone: "blue",
  },
  financial_planner: {
    headline: "A financial planner is the right starting point",
    body: "Based on your current wealth band, a family office is unlikely to be cost-effective. A licensed financial planner with a strong tax accountant is typically the best structure at this level. As your wealth grows, revisiting family-office options makes sense.",
    cta: "Find a financial planner",
    advisorType: "financial-planner",
    tone: "amber",
  },
  explore: {
    headline: "Useful to explore before you decide",
    body: "Family offices vary widely — from lightweight multi-family offices that charge AUM-based fees, to bespoke single-family offices with dedicated CIOs, legal counsel, and philanthropy staff. Speaking with a specialist helps you understand what you'd actually get and at what cost before committing.",
    cta: "Speak with a family-office specialist",
    advisorType: "family-office-specialist",
    tone: "slate",
  },
};

/* ─── Component ─── */

export default function FamilyOfficeDiagnostic() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [phase, setPhase] = useState<"questions" | "result">("questions");
  const [showReferral, setShowReferral] = useState(false);
  const [referralDone, setReferralDone] = useState(false);

  const currentStepId = ORDER[stepIndex];
  const currentStep = currentStepId ? STEPS[currentStepId] : null;
  const totalSteps = ORDER.length;

  const handleAnswer = (key: string) => {
    if (animating) return;
    setSelected(key);
    setAnimating(true);

    const newAnswers = { ...answers, [currentStepId ?? "wealth"]: key };

    setTimeout(() => {
      setAnswers(newAnswers);
      setSelected(null);
      setAnimating(false);

      if (stepIndex + 1 >= ORDER.length) {
        trackEvent("family_office_diagnostic_complete", newAnswers, "/family-office");
        setPhase("result");
      } else {
        setStepIndex((i) => i + 1);
      }
    }, 300);
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
    }
  };

  const handleRestart = () => {
    setStepIndex(0);
    setAnswers({});
    setPhase("questions");
    setShowReferral(false);
    setReferralDone(false);
  };

  /* ─── Result screen ─── */
  if (phase === "result") {
    const outcome = resolveOutcome(answers);
    const copy = OUTCOME_COPY[outcome];

    const borderColor =
      copy.tone === "blue" ? "border-blue-200" :
      copy.tone === "amber" ? "border-amber-200" :
      "border-slate-200";

    const bgColor =
      copy.tone === "blue" ? "bg-blue-50" :
      copy.tone === "amber" ? "bg-amber-50" :
      "bg-slate-50";

    const headingColor =
      copy.tone === "blue" ? "text-blue-900" :
      copy.tone === "amber" ? "text-amber-900" :
      "text-slate-900";

    const ctaBg =
      copy.tone === "blue" ? "bg-blue-600 hover:bg-blue-700" :
      copy.tone === "amber" ? "bg-amber-500 hover:bg-amber-600" :
      "bg-slate-700 hover:bg-slate-800";

    if (referralDone) {
      return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 md:p-8 text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-extrabold text-emerald-900 mb-2">Enquiry sent</h3>
          <p className="text-sm text-emerald-700 mb-4 max-w-md mx-auto">
            A family-office specialist will be in touch within 1–2 business days. There is no obligation to proceed.
          </p>
          <button
            onClick={handleRestart}
            className="text-xs text-emerald-600 hover:text-emerald-800 underline-offset-2 hover:underline"
          >
            Start the diagnostic again
          </button>
        </div>
      );
    }

    return (
      <div className={`rounded-2xl border ${borderColor} ${bgColor} p-5 md:p-7`}>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Your result</p>
        <h3 className={`text-base md:text-lg font-extrabold ${headingColor} mb-3`}>
          {copy.headline}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-5">
          {copy.body}
        </p>

        {!showReferral ? (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                trackEvent("family_office_referral_open", { outcome, advisor_type: copy.advisorType }, "/family-office");
                setShowReferral(true);
              }}
              className={`px-5 py-2.5 text-white text-sm font-bold rounded-lg transition-colors ${ctaBg}`}
            >
              {copy.cta}
            </button>
            <button
              onClick={handleRestart}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-white transition-colors"
            >
              Restart
            </button>
          </div>
        ) : (
          <FamilyOfficeReferralForm
            advisorType={copy.advisorType}
            diagnosticAnswers={answers}
            onSuccess={() => setReferralDone(true)}
            onCancel={() => setShowReferral(false)}
          />
        )}
      </div>
    );
  }

  /* ─── Questions phase ─── */
  if (!currentStep) return null;

  const pct = Math.round(((stepIndex + 1) / totalSteps) * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-7">
      {/* Progress */}
      <div className="mb-5">
        <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5">
          <span>Question {stepIndex + 1} of {totalSteps}</span>
          <span className="font-semibold text-amber-600">{pct}%</span>
        </div>
        <div
          className="h-1.5 bg-slate-100 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          aria-label={`Question ${stepIndex + 1} of ${totalSteps}`}
        >
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Back button */}
      {stepIndex > 0 && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-3 min-h-10 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      {/* Question */}
      <h3 className="text-base md:text-lg font-extrabold text-slate-900 mb-1">
        {currentStep.question}
      </h3>
      {currentStep.sub && (
        <p className="text-xs text-slate-500 mb-4">{currentStep.sub}</p>
      )}

      {/* Options */}
      <div className="space-y-2.5" role="radiogroup" aria-label={currentStep.question}>
        {currentStep.options.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => handleAnswer(opt.key)}
              disabled={animating}
              role="radio"
              aria-checked={isSelected}
              aria-label={opt.label}
              className={`w-full text-left border rounded-xl px-4 py-3.5 min-h-12 transition-all font-medium text-sm ${
                isSelected
                  ? "border-amber-500 bg-amber-50/80 scale-[0.985] shadow-sm"
                  : "border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 bg-white"
              } ${animating && !isSelected ? "opacity-40" : ""}`}
            >
              <span className="flex items-start gap-3">
                {isSelected && (
                  <svg
                    className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {!isSelected && (
                  <span className="w-4 h-4 shrink-0 mt-0.5 rounded-full border-2 border-slate-300" aria-hidden="true" />
                )}
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-slate-900">{opt.label}</span>
                  {opt.sub && (
                    <span className="block text-xs text-slate-500 font-normal mt-0.5 leading-relaxed">
                      {opt.sub}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
