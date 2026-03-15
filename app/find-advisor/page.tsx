"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";
import type { ProfessionalType } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";
import { storeQualificationData } from "@/lib/qualification-store";

const STEPS = [
  {
    id: "need",
    question: "What do you need help with?",
    subtitle: "We'll match you with the right type of professional.",
    options: [
      { label: "Home Loan / Refinancing", desc: "Find the best mortgage rate for your situation", key: "mortgage", type: "mortgage_broker" as ProfessionalType, icon: "landmark", color: "bg-rose-50 border-rose-200" },
      { label: "Buyers Agent", desc: "Help finding and negotiating property purchases", key: "buyers", type: "buyers_agent" as ProfessionalType, icon: "search", color: "bg-teal-50 border-teal-200" },
      { label: "Financial Planning", desc: "Retirement, wealth building, or investment strategy", key: "planning", type: "financial_planner" as ProfessionalType, icon: "trending-up", color: "bg-violet-50 border-violet-200" },
      { label: "Insurance", desc: "Life, TPD, income protection, or business cover", key: "insurance", type: "insurance_broker" as ProfessionalType, icon: "shield", color: "bg-sky-50 border-sky-200" },
      { label: "SMSF Setup & Management", desc: "Set up or manage a self-managed super fund", key: "smsf", type: "smsf_accountant" as ProfessionalType, icon: "building", color: "bg-blue-50 border-blue-200" },
      { label: "Tax Optimisation", desc: "Minimise tax on investments and capital gains", key: "tax", type: "tax_agent" as ProfessionalType, icon: "calculator", color: "bg-amber-50 border-amber-200" },
      { label: "Wealth Management", desc: "Portfolio management for high-net-worth investors", key: "wealth", type: "wealth_manager" as ProfessionalType, icon: "briefcase", color: "bg-indigo-50 border-indigo-200" },
      { label: "Estate Planning", desc: "Protect your assets and plan for the future", key: "estate", type: "estate_planner" as ProfessionalType, icon: "file-text", color: "bg-slate-100 border-slate-200" },
      { label: "Property Investment", desc: "Advice on buying investment property", key: "property", type: "property_advisor" as ProfessionalType, icon: "home", color: "bg-emerald-50 border-emerald-200" },
      { label: "Real Estate Agent", desc: "Selling or listing your property", key: "realestate", type: "real_estate_agent" as ProfessionalType, icon: "map-pin", color: "bg-lime-50 border-lime-200" },
      { label: "Crypto & Digital Assets", desc: "Crypto portfolio strategy and tax planning", key: "crypto", type: "crypto_advisor" as ProfessionalType, icon: "bitcoin", color: "bg-orange-50 border-orange-200" },
      { label: "Aged Care", desc: "Navigate aged care options, costs, and subsidies", key: "agedcare", type: "aged_care_advisor" as ProfessionalType, icon: "heart", color: "bg-pink-50 border-pink-200" },
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
  real_estate_agent: "real-estate-agents", wealth_manager: "wealth-managers",
  aged_care_advisor: "aged-care-advisors",
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
  real_estate_agent: ["Check their recent sales history in your area", "Ask about their marketing strategy and reach", "Compare commission rates — typically 1.5–2.5% in Australia"],
  wealth_manager: ["Ask about their investment philosophy and track record", "Understand all fees — management, performance, platform, and entry/exit", "Check they hold a CFP or CFA designation"],
  aged_care_advisor: ["Ask about experience with Centrelink and DVA means testing", "They should explain RAD vs DAP options clearly", "Look for Aged Care Steps or similar specialist accreditation"],
  crypto_advisor: ["Must hold an AFSL to provide crypto investment advice", "Ask how they track cost bases across exchanges and wallets", "Check they understand DeFi, staking, and airdrop tax treatment"],
  debt_counsellor: ["Free counselling is available through the National Debt Helpline (1800 007 007)", "Be wary of 'debt management' companies that charge upfront fees", "Ask about all options including hardship provisions and debt agreements"],
};

export default function FindAdvisorPage() {
  const searchParams = useSearchParams();
  const needParam = searchParams.get("need");

  // Check if the need param matches a valid option key
  const prefilledNeed = useMemo(() => {
    if (!needParam) return null;
    const match = STEPS[0].options.find((o) => o.key === needParam);
    return match && "type" in match ? { key: match.key, type: (match as { type: ProfessionalType }).type } : null;
  }, [needParam]);

  const [step, setStep] = useState(prefilledNeed ? 1 : 0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    prefilledNeed ? { need: prefilledNeed.key } : {}
  );
  const [selectedType, setSelectedType] = useState<ProfessionalType | null>(
    prefilledNeed ? prefilledNeed.type : null
  );
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

        {/* Breadcrumb */}
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/advisors" className="hover:text-slate-900">Advisors</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Find an Advisor</span>
        </nav>

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
          /* ═══ RESULTS — fetch & show matched advisors ═══ */
          <FindAdvisorResults
            selectedType={selectedType}
            answers={answers}
            getResultUrl={getResultUrl}
            getResultLabel={getResultLabel}
            onRestart={() => { setStep(0); setAnswers({}); setSelectedType(null); }}
          />
        )}
      </div>
      <div className="text-center px-4 pb-4">
        <p className="text-[0.56rem] md:text-xs text-slate-400">This is not financial advice. We help you find the right type of professional — the choice is yours.</p>
      </div>
    </div>
  );
}

/* ─── Results component with live advisor fetch ─── */

interface MatchedAdvisor {
  id: number;
  slug: string;
  name: string;
  firm_name?: string;
  type: string;
  location_display?: string;
  location_state?: string;
  photo_url?: string;
  rating: number;
  review_count: number;
  fee_description?: string;
  specialties: string[];
  verified: boolean;
  offer_text?: string;
  offer_active?: boolean;
  initial_consultation_free?: boolean;
  avg_response_minutes?: number | null;
}

interface MatchedResult {
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

function FindAdvisorResults({ selectedType, answers, getResultUrl, getResultLabel, onRestart }: {
  selectedType: ProfessionalType | null;
  answers: Record<string, string>;
  getResultUrl: () => string;
  getResultLabel: () => string;
  onRestart: () => void;
}) {
  const [matched, setMatched] = useState<MatchedAdvisor[]>([]);
  const [loading, setLoading] = useState(true);

  // Lead capture form state
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadFirstName, setLeadFirstName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadConsent, setLeadConsent] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadErrors, setLeadErrors] = useState<Record<string, string>>({});
  const [leadResult, setLeadResult] = useState<MatchedResult | null>(null);
  const [leadError, setLeadError] = useState<string | null>(null);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!leadFirstName.trim()) errors.firstName = "Please enter your first name";
    if (!leadEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail)) errors.email = "Please enter a valid email";
    if (!leadConsent) errors.consent = "You must agree to the Privacy Policy";
    if (Object.keys(errors).length > 0) { setLeadErrors(errors); return; }

    setLeadSubmitting(true);
    setLeadError(null);
    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          need: answers.need,
          amount: answers.amount,
          urgency: answers.urgency,
          state: answers.state,
          firstName: leadFirstName.trim(),
          email: leadEmail.trim(),
          phone: leadPhone.trim() || undefined,
          consent: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLeadError(data.error || "Something went wrong. Please try again.");
      } else {
        setLeadResult(data.advisor);
      }
    } catch {
      setLeadError("Network error. Please try again.");
    } finally {
      setLeadSubmitting(false);
    }
  };

  useEffect(() => {
    if (!selectedType) return;
    setLoading(true);
    const params = new URLSearchParams({
      type: selectedType,
      limit: "6",
      sort: "relevance",
      verified: "true",
    });
    if (answers.state && answers.state !== "other" && answers.state !== "any") {
      params.set("state", answers.state);
    }
    fetch(`/api/advisor-search?${params}`)
      .then(r => r.json())
      .then(data => {
        setMatched(data.advisors || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    trackEvent("find_advisor_complete", {
      type: selectedType,
      amount: answers.amount,
      urgency: answers.urgency,
      state: answers.state,
    }, "/find-advisor");

    // Store qualification data for lead enrichment
    storeQualificationData("find_advisor", {
      advisor_type: selectedType,
      need: answers.need,
      amount: answers.amount,
      urgency: answers.urgency,
      state: answers.state,
    });
  }, [selectedType, answers]);

  const tips = selectedType && ADVISOR_TIPS[selectedType] ? ADVISOR_TIPS[selectedType] : [];
  const typeLabel = selectedType ? PROFESSIONAL_TYPE_LABELS[selectedType] : "Advisor";

  return (
    <div>
      {/* Hero result */}
      <div className="bg-gradient-to-br from-violet-600 to-violet-800 rounded-2xl p-5 md:p-8 text-white text-center mb-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_70%)]" />
        <div className="relative">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Icon name="check" size={28} className="text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold mb-1">
            {matched.length > 0 ? `${matched.length} ${getResultLabel()} found` : `Your match: ${getResultLabel()}`}
          </h1>
          <p className="text-sm text-violet-200">Based on your answers, here&apos;s who can help.</p>
        </div>
      </div>

      {/* Matched advisor cards */}
      {loading ? (
        <div className="space-y-3 mb-5">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-14 h-14 bg-slate-200 rounded-xl shrink-0" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                  <div className="h-3 w-24 bg-slate-100 rounded mb-1" />
                  <div className="h-3 w-48 bg-slate-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : matched.length > 0 ? (
        <div className="space-y-3 mb-5">
          {matched.slice(0, 3).map((advisor, i) => (
            <Link
              key={advisor.id}
              href={`/advisor/${advisor.slug}`}
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-violet-300 hover:shadow-md transition-all group"
            >
              <div className="flex gap-3">
                {/* Photo */}
                <div className="shrink-0">
                  {advisor.photo_url ? (
                    <Image src={advisor.photo_url} alt={advisor.name} width={56} height={56} className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-violet-100 flex items-center justify-center text-lg font-bold text-violet-600">
                      {advisor.name.split(" ").map(n => n[0]).join("")}
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {i === 0 && <span className="text-[0.56rem] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Top Match</span>}
                    {advisor.verified && <span className="text-[0.56rem] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Verified</span>}
                    {advisor.avg_response_minutes != null && advisor.avg_response_minutes <= 120 && (
                      <span className="text-[0.56rem] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded flex items-center gap-0.5"><Icon name="zap" size={9} />Fast</span>
                    )}
                    {advisor.initial_consultation_free && <span className="text-[0.56rem] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">Free Consult</span>}
                  </div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-violet-700 transition-colors truncate">{advisor.name}</p>
                  {advisor.firm_name && <p className="text-xs text-slate-500 truncate">{advisor.firm_name}</p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {advisor.rating > 0 && (
                      <span className="text-xs text-amber-600 font-semibold">★ {advisor.rating}/5</span>
                    )}
                    {advisor.review_count > 0 && (
                      <span className="text-[0.62rem] text-slate-400">({advisor.review_count} reviews)</span>
                    )}
                    {advisor.location_display && (
                      <span className="text-[0.62rem] text-slate-400 flex items-center gap-0.5"><Icon name="map-pin" size={10} />{advisor.location_display}</span>
                    )}
                  </div>
                  {advisor.fee_description && (
                    <p className="text-[0.62rem] text-slate-500 mt-1 line-clamp-1">{advisor.fee_description}</p>
                  )}
                </div>
                {/* Arrow */}
                <div className="shrink-0 flex items-center">
                  <Icon name="chevron-right" size={18} className="text-slate-300 group-hover:text-violet-500 transition-colors" />
                </div>
              </div>
              {advisor.offer_active && advisor.offer_text && (
                <div className="mt-2 px-3 py-1.5 bg-violet-50 border border-violet-100 rounded-lg text-[0.62rem] text-violet-700 flex items-center gap-1.5">
                  <Icon name="tag" size={12} className="text-violet-500" />
                  {advisor.offer_text}
                </div>
              )}
            </Link>
          ))}
          {matched.length > 3 && (
            <Link
              href={getResultUrl()}
              className="block text-center py-3 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
            >
              View all {matched.length} {getResultLabel()} →
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center mb-5">
          <Icon name="search" size={24} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600 mb-1">No advisors found matching your exact criteria.</p>
          <p className="text-xs text-slate-400">Try browsing all {typeLabel}s across Australia.</p>
        </div>
      )}

      {/* Lead Capture / Match Confirmation */}
      {leadResult ? (
        /* ── Match Confirmed ── */
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 mb-5">
          <div className="text-center mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <Icon name="check-circle" size={24} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 mb-1">You&apos;re matched!</h2>
            <p className="text-xs text-slate-500">Check your inbox — confirmation email sent</p>
          </div>
          <div className="bg-white rounded-xl p-4 mb-4 border border-emerald-100 flex gap-3 items-start">
            {leadResult.photoUrl ? (
              <Image src={leadResult.photoUrl} alt={leadResult.name} width={48} height={48} className="w-12 h-12 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center text-base font-bold text-violet-600 shrink-0">
                {leadResult.name.split(" ").map((n: string) => n[0]).join("")}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">{leadResult.name}</p>
              {leadResult.firmName && <p className="text-xs text-slate-500 truncate">{leadResult.firmName}</p>}
              <p className="text-xs text-slate-500">{leadResult.typeLabel} · {leadResult.location}</p>
              {leadResult.rating && (
                <p className="text-xs text-amber-600 font-semibold mt-0.5">★ {leadResult.rating}/5 ({leadResult.reviewCount} reviews)</p>
              )}
              {leadResult.freeConsultation && (
                <span className="inline-block text-[0.6rem] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded mt-1">Free consultation</span>
              )}
            </div>
          </div>
          <ol className="space-y-2 mb-4">
            {["They'll email you within 24 hours", "Book a free 30-minute call", "Get a personalised plan — no obligation"].map((step, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-slate-700">
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[0.6rem] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <Link href={`/advisor/${leadResult.slug}`} className="block w-full text-center py-3 text-sm font-bold text-violet-600 hover:text-violet-800 border border-violet-200 rounded-xl transition-colors">
            View {leadResult.name.split(" ")[0]}&apos;s full profile →
          </Link>
        </div>
      ) : showLeadForm ? (
        /* ── Contact Form ── */
        <div className="bg-white border border-violet-200 rounded-2xl p-5 mb-5 shadow-sm">
          <h2 className="text-base font-extrabold text-slate-900 mb-1">Get matched instantly</h2>
          <p className="text-xs text-slate-500 mb-4">We&apos;ll connect you with a verified {PROFESSIONAL_TYPE_LABELS[selectedType!] || "advisor"} — free</p>
          {leadError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{leadError}</div>
          )}
          <form onSubmit={handleLeadSubmit} noValidate className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">First name</label>
              <input
                type="text"
                value={leadFirstName}
                onChange={e => setLeadFirstName(e.target.value)}
                placeholder="John"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${leadErrors.firstName ? "border-red-400 bg-red-50" : "border-slate-200 focus:border-violet-400"}`}
              />
              {leadErrors.firstName && <p className="mt-1 text-[0.65rem] text-red-600">{leadErrors.firstName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email address</label>
              <input
                type="email"
                value={leadEmail}
                onChange={e => setLeadEmail(e.target.value)}
                placeholder="john@example.com"
                className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none transition-colors ${leadErrors.email ? "border-red-400 bg-red-50" : "border-slate-200 focus:border-violet-400"}`}
              />
              {leadErrors.email && <p className="mt-1 text-[0.65rem] text-red-600">{leadErrors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="tel"
                value={leadPhone}
                onChange={e => setLeadPhone(e.target.value)}
                placeholder="04XX XXX XXX"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-violet-400 transition-colors"
              />
            </div>
            <label className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={leadConsent}
                onChange={e => setLeadConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-400"
              />
              <span className="text-[0.68rem] text-slate-600 leading-relaxed">
                I agree to Invest.com.au&apos;s{" "}
                <Link href="/privacy" target="_blank" className="text-violet-600 underline">Privacy Policy</Link> and{" "}
                <Link href="/terms" target="_blank" className="text-violet-600 underline">Terms</Link>. Your details go to ONE advisor only — no spam.
              </span>
            </label>
            {leadErrors.consent && <p className="text-[0.65rem] text-red-600">{leadErrors.consent}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowLeadForm(false)} className="px-4 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={leadSubmitting} className="flex-1 py-2.5 bg-violet-600 text-white font-bold text-sm rounded-lg hover:bg-violet-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {leadSubmitting ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Matching...</>
                ) : "Get Matched Free →"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ── Get Matched CTA ── */
        <button
          onClick={() => setShowLeadForm(true)}
          className="block w-full px-6 py-3.5 bg-violet-600 text-white font-bold text-sm rounded-xl hover:bg-violet-700 transition-all text-center shadow-lg shadow-violet-600/20 active:scale-[0.98] mb-3"
        >
          ✓ Get Matched Free — let us connect you
        </button>
      )}

      {/* Browse CTA (secondary) */}
      {!leadResult && (
        <Link href={getResultUrl()} className={`block w-full px-6 py-3 text-sm rounded-xl text-center transition-all active:scale-[0.98] mb-4 ${showLeadForm ? "bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold" : "border border-slate-200 text-slate-600 hover:border-slate-300 font-semibold"}`}>
          Browse all {getResultLabel()} →
        </Link>
      )}

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
      {tips.length > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-5">
          <h3 className="text-xs font-bold text-violet-700 mb-2 flex items-center gap-1.5">
            <Icon name="lightbulb" size={14} /> Tips for choosing a {typeLabel}
          </h3>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="text-xs text-violet-600 flex items-start gap-2"><span className="text-violet-400 mt-0.5 shrink-0">•</span>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onRestart} className="block mx-auto mt-3 text-xs text-slate-500 hover:text-slate-700 font-semibold">Start over</button>
    </div>
  );
}
