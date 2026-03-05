"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { ProfessionalType } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

const QUESTIONS = [
  {
    id: "need",
    question: "What do you need help with?",
    options: [
      { label: "SMSF setup or management", key: "smsf", type: "smsf_accountant" as ProfessionalType, icon: "building" },
      { label: "Financial planning or retirement", key: "planning", type: "financial_planner" as ProfessionalType, icon: "trending-up" },
      { label: "Property investment advice", key: "property", type: "property_advisor" as ProfessionalType, icon: "home" },
      { label: "Tax optimisation for investments", key: "tax", type: "tax_agent" as ProfessionalType, icon: "calculator" },
      { label: "Home loan or refinancing", key: "mortgage", type: "mortgage_broker" as ProfessionalType, icon: "landmark" },
      { label: "Estate planning or wills", key: "estate", type: "estate_planner" as ProfessionalType, icon: "file-text" },
    ],
  },
  {
    id: "amount",
    question: "How much are you looking to invest or manage?",
    options: [
      { label: "Under $50,000", key: "small" },
      { label: "$50,000 – $200,000", key: "medium" },
      { label: "$200,000 – $500,000", key: "large" },
      { label: "Over $500,000", key: "whale" },
      { label: "Not sure yet", key: "unsure" },
    ],
  },
  {
    id: "state",
    question: "Where are you located?",
    options: [
      { label: "New South Wales", key: "NSW" },
      { label: "Victoria", key: "VIC" },
      { label: "Queensland", key: "QLD" },
      { label: "Western Australia", key: "WA" },
      { label: "South Australia", key: "SA" },
      { label: "Tasmania / ACT / NT", key: "other" },
      { label: "Remote / Online only", key: "any" },
    ],
  },
];

const TYPE_SLUG_MAP: Record<ProfessionalType, string> = {
  smsf_accountant: "smsf-accountants",
  financial_planner: "financial-planners",
  property_advisor: "property-advisors",
  tax_agent: "tax-agents",
  mortgage_broker: "mortgage-brokers",
  estate_planner: "estate-planners",
};

const STATE_SLUG_MAP: Record<string, string> = {
  NSW: "nsw", VIC: "vic", QLD: "qld", WA: "wa", SA: "sa",
};

export default function FindAdvisorPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<ProfessionalType | null>(null);

  const handleAnswer = (key: string, type?: ProfessionalType) => {
    const newAnswers = [...answers];
    newAnswers[step] = key;
    setAnswers(newAnswers);
    if (step === 0 && type) setSelectedType(type);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    }
  };

  const isComplete = answers.length === QUESTIONS.length && answers[QUESTIONS.length - 1];

  // Build the result URL
  const getResultUrl = () => {
    if (!selectedType) return "/advisors";
    const typeSlug = TYPE_SLUG_MAP[selectedType];
    const stateSlug = STATE_SLUG_MAP[answers[2]];
    if (stateSlug) return `/advisors/${typeSlug}/${stateSlug}`;
    return `/advisors/${typeSlug}`;
  };

  const getResultLabel = () => {
    if (!selectedType) return "advisors";
    const label = PROFESSIONAL_TYPE_LABELS[selectedType];
    const state = answers[2];
    if (state && state !== "other" && state !== "any") return `${label}s in ${state}`;
    return `${label}s`;
  };

  return (
    <div className="min-h-[70vh] flex flex-col">
      <div className="container-custom max-w-xl py-6 md:py-12 flex-1">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 md:mb-8">
          {QUESTIONS.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i <= step ? "bg-slate-900" : "bg-slate-200"}`} />
          ))}
        </div>

        {!isComplete ? (
          <>
            {/* Back button */}
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-4 min-h-[44px] transition-colors"
              >
                <Icon name="arrow-left" size={14} /> Back
              </button>
            )}

            {/* Question */}
            <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 mb-2 md:mb-4">
              {QUESTIONS[step].question}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mb-6 md:mb-8">
              {step === 0 ? "We'll match you with the right type of professional." :
               step === 1 ? "This helps us find advisors experienced with your situation." :
               "We'll prioritise advisors in your area."}
            </p>

            {/* Options */}
            <div className="space-y-2 md:space-y-3">
              {QUESTIONS[step].options.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleAnswer(opt.key, "type" in opt ? (opt as { type: ProfessionalType }).type : undefined)}
                  className={`w-full text-left p-3.5 md:p-4 rounded-xl border-2 transition-all active:scale-[0.99] ${
                    answers[step] === opt.key
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:border-slate-400 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {"icon" in opt && (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon name={(opt as { icon: string }).icon} size={18} className="text-slate-600" />
                      </div>
                    )}
                    <span className="text-sm md:text-base font-semibold text-slate-800">{opt.label}</span>
                    {answers[step] === opt.key && (
                      <Icon name="check" size={18} className="text-slate-900 ml-auto shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Results */
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Icon name="check" size={32} className="text-emerald-600" />
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
              We recommend browsing {getResultLabel()}
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              Based on your answers, here&apos;s the best type of professional for your situation.
              {answers[1] === "whale" && " At your investment level, professional advice is especially valuable."}
            </p>

            {/* Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Need</span>
                  <span className="font-semibold text-slate-800">{QUESTIONS[0].options.find(o => o.key === answers[0])?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-800">{QUESTIONS[1].options.find(o => o.key === answers[1])?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location</span>
                  <span className="font-semibold text-slate-800">{QUESTIONS[2].options.find(o => o.key === answers[2])?.label}</span>
                </div>
              </div>
            </div>

            <Link
              href={getResultUrl()}
              className="inline-block w-full px-6 py-3.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 transition-colors active:scale-[0.98]"
            >
              Browse {getResultLabel()} →
            </Link>

            <button
              onClick={() => { setStep(0); setAnswers([]); setSelectedType(null); }}
              className="block mx-auto mt-3 text-xs text-slate-500 hover:text-slate-700 font-semibold transition-colors"
            >
              Start over
            </button>
          </div>
        )}
      </div>

      {/* Compliance */}
      <div className="text-center px-4 pb-4">
        <p className="text-[0.56rem] md:text-xs text-slate-400">
          This is not financial advice. We help you find the right type of professional — the choice is yours.
        </p>
      </div>
    </div>
  );
}
