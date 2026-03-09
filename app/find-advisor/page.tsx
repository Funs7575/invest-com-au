"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { ProfessionalType } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

const STEPS = [
  {
    id: "need",
    question: "What do you need help with?",
    subtitle: "We'll match you with the right type of professional.",
    options: [
      { label: "SMSF Setup & Management", desc: "Set up or manage a self-managed super fund", key: "smsf", type: "smsf_accountant" as ProfessionalType, icon: "building", color: "bg-blue-50 border-blue-200" },
      { label: "Financial Planning", desc: "Retirement, wealth building, or investment strategy", key: "planning", type: "financial_planner" as ProfessionalType, icon: "trending-up", color: "bg-violet-50 border-violet-200" },
      { label: "Property Investment", desc: "Advice on buying investment property", key: "property", type: "property_advisor" as ProfessionalType, icon: "home", color: "bg-emerald-50 border-emerald-200" },
      { label: "Tax Optimisation", desc: "Minimise tax on investments and capital gains", key: "tax", type: "tax_agent" as ProfessionalType, icon: "calculator", color: "bg-amber-50 border-amber-200" },
      { label: "Home Loan / Refinancing", desc: "Find the best mortgage rate for your situation", key: "mortgage", type: "mortgage_broker" as ProfessionalType, icon: "landmark", color: "bg-rose-50 border-rose-200" },
      { label: "Estate Planning", desc: "Protect your assets and plan for the future", key: "estate", type: "estate_planner" as ProfessionalType, icon: "file-text", color: "bg-slate-100 border-slate-200" },
      { label: "Insurance", desc: "Life, TPD, income protection, or trauma cover", key: "insurance", type: "insurance_broker" as ProfessionalType, icon: "shield", color: "bg-sky-50 border-sky-200" },
      { label: "Buyers Agent", desc: "Help finding and negotiating property purchases", key: "buyers", type: "buyers_agent" as ProfessionalType, icon: "search", color: "bg-teal-50 border-teal-200" },
      { label: "Wealth Management", desc: "Portfolio management for high-net-worth investors", key: "wealth", type: "wealth_manager" as ProfessionalType, icon: "briefcase", color: "bg-indigo-50 border-indigo-200" },
      { label: "Aged Care", desc: "Navigate aged care options, costs, and subsidies", key: "agedcare", type: "aged_care_advisor" as ProfessionalType, icon: "heart", color: "bg-pink-50 border-pink-200" },
      { label: "Crypto & Digital Assets", desc: "Crypto portfolio strategy and tax planning", key: "crypto", type: "crypto_advisor" as ProfessionalType, icon: "bitcoin", color: "bg-orange-50 border-orange-200" },
      { label: "Debt Help", desc: "Debt consolidation, budgeting, and financial recovery", key: "debt", type: "debt_counsellor" as ProfessionalType, icon: "credit-card", color: "bg-red-50 border-red-200" },
    ],
  },
  {
    id: "amount",
    question: "What's the value you're looking to manage?",
    subtitle: "This helps us match you with experienced advisors.",
    options: [
      { label: "Under $50,000", key: "small", icon: "coins", tip: "Many advisors offer fixed-fee services at this level" },
      { label: "$50k – $200k", key: "medium", icon: "wallet", tip: "Most common range — plenty of advisor options" },
      { label: "$200k – $500k", key: "large", icon: "trending-up", tip: "You may benefit from ongoing advice arrangements" },
      { label: "Over $500,000", key: "whale", icon: "crown", tip: "At this level, specialised advice is especially valuable" },
      { label: "Not sure yet", key: "unsure", icon: "help-circle", tip: "No problem — advisors can help you work this out" },
    ],
  },
  {
    id: "urgency",
    question: "How soon do you need advice?",
    subtitle: "We'll prioritise advisors who can help in your timeframe.",
    options: [
      { label: "This week", key: "urgent", icon: "zap" },
      { label: "Within a month", key: "soon", icon: "calendar" },
      { label: "Just exploring", key: "exploring", icon: "search" },
    ],
  },
  {
    id: "state",
    question: "Where are you located?",
    subtitle: "We'll show advisors near you — many also work remotely.",
    options: [
      { label: "New South Wales", key: "NSW", icon: "map-pin" },
      { label: "Victoria", key: "VIC", icon: "map-pin" },
      { label: "Queensland", key: "QLD", icon: "map-pin" },
      { label: "Western Australia", key: "WA", icon: "map-pin" },
      { label: "South Australia", key: "SA", icon: "map-pin" },
      { label: "TAS / ACT / NT", key: "other", icon: "map-pin" },
      { label: "Remote / Online", key: "any", icon: "globe" },
    ],
  },
];

const TYPE_SLUG_MAP: Record<ProfessionalType, string> = {
  smsf_accountant: "smsf-accountants", financial_planner: "financial-planners",
  property_advisor: "property-advisors", tax_agent: "tax-agents",
  mortgage_broker: "mortgage-brokers", estate_planner: "estate-planners",
  insurance_broker: "insurance-brokers", buyers_agent: "buyers-agents",
  wealth_manager: "wealth-managers", aged_care_advisor: "aged-care-advisors",
  crypto_advisor: "crypto-advisors", debt_counsellor: "debt-counsellors",
};
const STATE_SLUG_MAP: Record<string, string> = { NSW: "nsw", VIC: "vic", QLD: "qld", WA: "wa", SA: "sa" };

const ADVISOR_TIPS: Record<string, string[]> = {
  smsf_accountant: ["Registered with the Tax Practitioners Board", "Ask about their SMSF audit experience", "Check if they handle investment strategy too"],
  financial_planner: ["Must hold an AFSL or be an authorised representative", "Ask about fee structure upfront — fee-for-service is most transparent", "A Statement of Advice (SOA) is legally required before personal advice"],
  property_advisor: ["Ask for comparable data, not just listings", "Check for developer commission conflicts", "Ask about their track record at your investment level"],
  tax_agent: ["Registered with the TPB — verify their number", "Investment-savvy agents understand CGT, franking credits, and trusts", "Ask if they specialise in investor tax returns"],
  mortgage_broker: ["Paid by lenders, not you — their service is free", "Ask how many lenders they compare", "Check MFAA or FBAA membership"],
  estate_planner: ["More than just a will — covers trusts, powers of attorney, succession", "Review every 3-5 years or after major life events", "Ask about experience with blended families if relevant"],
  insurance_broker: ["Check they compare multiple insurers, not just one", "Ask about their claims support process", "Ensure they're an authorised representative under an AFSL"],
  buyers_agent: ["Ask for recent comparable purchases in your target area", "Check they have no relationship with selling agents", "REBAA membership is a good sign of professionalism"],
  wealth_manager: ["Ask about their investment philosophy and track record", "Understand all fees — management, performance, platform, and entry/exit", "Check they hold a CFP or CFA designation"],
  aged_care_advisor: ["Ask about experience with Centrelink and DVA means testing", "They should explain RAD vs DAP options clearly", "Look for Aged Care Steps or similar specialist accreditation"],
  crypto_advisor: ["Must hold an AFSL to provide crypto investment advice", "Ask how they track cost bases across exchanges and wallets", "Check they understand DeFi, staking, and airdrop tax treatment"],
  debt_counsellor: ["Free counselling is available through the National Debt Helpline (1800 007 007)", "Be wary of 'debt management' companies that charge upfront fees", "Ask about all options including hardship provisions and debt agreements"],
};

export default function FindAdvisorPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedType, setSelectedType] = useState<ProfessionalType | null>(null);
  const [fade, setFade] = useState(false);

  const transition = useCallback((newStep: number) => {
    setFade(true);
    setTimeout(() => { setStep(newStep); setFade(false); }, 180);
  }, []);

  const handleAnswer = useCallback((stepId: string, key: string, type?: ProfessionalType) => {
    setAnswers(prev => ({ ...prev, [stepId]: key }));
    if (stepId === "need" && type) setSelectedType(type);
    if (step < STEPS.length - 1) transition(step + 1);
  }, [step, transition]);

  const isComplete = answers.need && answers.amount && answers.urgency && answers.state;
  const progress = ((step + (isComplete ? 1 : 0)) / STEPS.length) * 100;
  const currentStep = STEPS[step];

  const getResultUrl = () => {
    if (!selectedType) return "/advisors";
    const s = STATE_SLUG_MAP[answers.state];
    return s ? `/advisors/${TYPE_SLUG_MAP[selectedType]}/${s}` : `/advisors/${TYPE_SLUG_MAP[selectedType]}`;
  };
  const getResultLabel = () => {
    if (!selectedType) return "advisors";
    const label = PROFESSIONAL_TYPE_LABELS[selectedType];
    const st = answers.state;
    return (st && st !== "other" && st !== "any") ? `${label}s in ${st}` : `${label}s`;
  };

  return (
    <div className="min-h-[70vh] flex flex-col bg-gradient-to-b from-violet-50/40 to-white">
      <div className="container-custom max-w-xl py-6 md:py-12 flex-1">

        {/* Progress */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[0.6rem] md:text-xs font-semibold text-slate-400">Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}</span>
            <span className="text-[0.6rem] md:text-xs font-bold text-violet-600">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-violet-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {!isComplete ? (
          <div className={`transition-all duration-200 ${fade ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}>
            {step > 0 && (
              <button onClick={() => transition(step - 1)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-3 min-h-[44px]">
                <Icon name="arrow-left" size={14} /> Back
              </button>
            )}

            <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 mb-1">{currentStep.question}</h1>
            <p className="text-xs md:text-sm text-slate-500 mb-5">{currentStep.subtitle}</p>

            <div className="space-y-2">
              {currentStep.options.map((opt) => {
                const sel = answers[currentStep.id] === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleAnswer(currentStep.id, opt.key, "type" in opt ? (opt as { type: ProfessionalType }).type : undefined)}
                    className={`w-full text-left p-3 md:p-3.5 rounded-xl border-2 transition-all active:scale-[0.99] group ${
                      sel ? "border-violet-500 bg-violet-50/70 shadow-sm" : "border-slate-200 hover:border-violet-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        sel ? "bg-violet-100" : (step === 0 && "color" in opt) ? (opt as { color: string }).color.split(" ")[0] : "bg-slate-100 group-hover:bg-violet-50"
                      }`}>
                        <Icon name={opt.icon} size={18} className={sel ? "text-violet-600" : "text-slate-500 group-hover:text-violet-500"} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-slate-800 block">{opt.label}</span>
                        {"desc" in opt && <span className="text-[0.62rem] md:text-xs text-slate-500 block mt-0.5">{(opt as { desc: string }).desc}</span>}
                      </div>
                      {sel ? (
                        <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shrink-0"><Icon name="check" size={12} className="text-white" /></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0 group-hover:border-violet-300" />
                      )}
                    </div>
                    {"tip" in opt && sel && (
                      <div className="mt-2 ml-12 text-[0.58rem] md:text-xs text-violet-600 bg-violet-50 px-2.5 py-1.5 rounded-lg border border-violet-100">
                        {(opt as { tip: string }).tip}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ═══ RESULTS ═══ */
          <div>
            <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-5 md:p-8 text-white text-center mb-5 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_70%)]" />
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <Icon name="check" size={28} className="text-white" />
                </div>
                <h1 className="text-xl md:text-2xl font-extrabold mb-1">Your match: {getResultLabel()}</h1>
                <p className="text-sm text-violet-200">Based on your answers, here&apos;s who can help.</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-sm">
              <h3 className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wide mb-3">Your Profile</h3>
              <div className="space-y-2">
                {STEPS.map((s) => {
                  const a = s.options.find(o => o.key === answers[s.id]);
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon name={a?.icon || "check"} size={13} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.56rem] text-slate-400">{s.question.replace("?", "")}</div>
                        <div className="text-xs font-semibold text-slate-800">{a?.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tips */}
            {selectedType && ADVISOR_TIPS[selectedType] && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-5">
                <h3 className="text-xs font-bold text-violet-700 mb-2 flex items-center gap-1.5">
                  <Icon name="lightbulb" size={14} /> Tips for choosing a {PROFESSIONAL_TYPE_LABELS[selectedType]}
                </h3>
                <ul className="space-y-1.5">
                  {ADVISOR_TIPS[selectedType].map((tip, i) => (
                    <li key={i} className="text-xs text-violet-600 flex items-start gap-2"><span className="text-violet-400 mt-0.5 shrink-0">•</span>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            <Link href={getResultUrl()} className="block w-full px-6 py-3.5 bg-violet-600 text-white font-bold text-sm rounded-xl hover:bg-violet-700 transition-all text-center shadow-lg shadow-violet-600/20 active:scale-[0.98]">
              Browse {getResultLabel()} →
            </Link>
            <button onClick={() => { setStep(0); setAnswers({}); setSelectedType(null); }} className="block mx-auto mt-3 text-xs text-slate-500 hover:text-slate-700 font-semibold">Start over</button>
          </div>
        )}
      </div>
      <div className="text-center px-4 pb-4">
        <p className="text-[0.56rem] md:text-xs text-slate-400">This is not financial advice. We help you find the right type of professional — the choice is yours.</p>
      </div>
    </div>
  );
}
