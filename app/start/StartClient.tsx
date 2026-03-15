"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { trackEvent } from "@/lib/tracking";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

/* ─── Types ─── */
type Step = 0 | 1 | 2 | 3 | 4;
type GoalKey = "start" | "switch" | "wealth" | "income" | "crypto" | "super" | "property" | "help" | "home";
type ModeKey = "diy" | "help" | "unsure";
type ComplexityKey = "simple" | "moderate" | "complex";
type AmountKey = "small" | "medium" | "large" | "xlarge";
type PriorityKey = string;

interface Answers {
  goal?: GoalKey;
  mode?: ModeKey;
  complexity?: ComplexityKey;
  amount?: AmountKey;
  priority?: PriorityKey;
}

type RouteType = "diy" | "advisor" | "both" | "guide";

interface RouteResult {
  type: RouteType;
  headline: string;
  explanation: string[];
  actions: { label: string; href: string; primary?: boolean; icon: string }[];
  guides: { label: string; href: string }[];
}

/* ─── Question Config ─── */
const GOALS: { key: GoalKey; label: string; icon: string; sub: string }[] = [
  { key: "start", label: "Start investing", icon: "rocket", sub: "I'm new and want to get going" },
  { key: "home", label: "Buy a home / Get a home loan", icon: "landmark", sub: "First home, refinancing, or investment loan" },
  { key: "switch", label: "Switch platforms", icon: "arrow-right-left", sub: "Find a better / cheaper option" },
  { key: "wealth", label: "Build long-term wealth", icon: "trending-up", sub: "ETFs, shares, or diversified growth" },
  { key: "income", label: "Earn income / dividends", icon: "coins", sub: "Regular income from investments" },
  { key: "crypto", label: "Buy crypto", icon: "bitcoin", sub: "Bitcoin, Ethereum, altcoins" },
  { key: "super", label: "Super / SMSF", icon: "building", sub: "Optimise retirement savings" },
  { key: "property", label: "Property investing", icon: "home", sub: "Direct, REITs, or through super" },
  { key: "help", label: "Get expert help", icon: "user-check", sub: "I want a professional advisor" },
];

const MODES: { key: ModeKey; label: string; icon: string; sub: string }[] = [
  { key: "diy", label: "Do it myself", icon: "compass", sub: "I want to choose my own platform and investments" },
  { key: "help", label: "Get expert help", icon: "users", sub: "I'd like professional guidance" },
  { key: "unsure", label: "I'm not sure yet", icon: "help-circle", sub: "Show me both options" },
];

const COMPLEXITY: { key: ComplexityKey; label: string; icon: string; sub: string }[] = [
  { key: "simple", label: "Simple", icon: "circle", sub: "Just getting started, straightforward situation" },
  { key: "moderate", label: "Moderate", icon: "layers", sub: "Some assets, want to make good decisions" },
  { key: "complex", label: "Complex", icon: "git-branch", sub: "Tax, SMSF, property, business, or multiple goals" },
];

const AMOUNTS: { key: AmountKey; label: string; sub: string }[] = [
  { key: "small", label: "Under $10,000", sub: "Starting small" },
  { key: "medium", label: "$10,000 – $100,000", sub: "Building a portfolio" },
  { key: "large", label: "$100,000 – $500,000", sub: "Significant savings" },
  { key: "xlarge", label: "$500,000+", sub: "Major wealth decisions" },
];

/* ─── Dynamic priority options based on answers ─── */
function getPriorityOptions(answers: Answers): { key: PriorityKey; label: string; icon: string }[] {
  if (answers.goal === "home" || answers.goal === "property") {
    // Property/home loan goals → mortgage broker and buyer's agent first
    return [
      { key: "mortgage-broker", label: "Mortgage broker", icon: "home" },
      { key: "buyers-agent", label: "Buyer's agent", icon: "search" },
      { key: "financial-planner", label: "Financial planner", icon: "briefcase" },
      { key: "tax-agent", label: "Tax agent", icon: "file-text" },
      { key: "not-sure", label: "I'm not sure what I need", icon: "help-circle" },
    ];
  }
  if (answers.mode === "help" || answers.goal === "help") {
    // General help → revenue-ranked order
    return [
      { key: "mortgage-broker", label: "Mortgage broker", icon: "home" },
      { key: "buyers-agent", label: "Buyer's agent", icon: "search" },
      { key: "financial-planner", label: "Financial planner", icon: "briefcase" },
      { key: "smsf-accountant", label: "SMSF accountant", icon: "calculator" },
      { key: "tax-agent", label: "Tax agent", icon: "file-text" },
      { key: "not-sure", label: "I'm not sure what I need", icon: "help-circle" },
    ];
  }
  // DIY priorities
  const opts: { key: PriorityKey; label: string; icon: string }[] = [
    { key: "lowest-fees", label: "Lowest fees", icon: "dollar-sign" },
    { key: "ease-of-use", label: "Ease of use", icon: "smartphone" },
    { key: "safety", label: "Safety (CHESS)", icon: "shield" },
  ];
  if (answers.goal === "crypto") {
    opts.push({ key: "coin-range", label: "Coin range & staking", icon: "layers" });
  } else if (answers.goal === "income") {
    opts.push({ key: "dividends", label: "Dividend features", icon: "coins" });
  } else if (answers.goal === "super") {
    opts.push({ key: "super-options", label: "Investment options", icon: "bar-chart" });
  } else {
    opts.push({ key: "research-tools", label: "Research & tools", icon: "bar-chart" });
  }
  opts.push({ key: "best-for-etfs", label: "Best for ETFs", icon: "trending-up" });
  return opts;
}

/* ─── Routing logic ─── */
function computeRoute(answers: Answers): RouteResult {
  const { goal, mode, complexity, amount, priority } = answers;

  // Advisor-first route
  if (mode === "help" || goal === "help" || complexity === "complex") {
    const advisorType = priority === "financial-planner" ? "financial-planners"
      : priority === "smsf-accountant" ? "smsf-accountants"
      : priority === "tax-agent" ? "tax-agents"
      : priority === "mortgage-broker" ? "mortgage-brokers"
      : priority === "buyers-agent" ? "buyers-agents"
      : "financial-planners";

    const advisorLabel = priority === "financial-planner" ? "financial planner"
      : priority === "smsf-accountant" ? "SMSF accountant"
      : priority === "tax-agent" ? "tax agent"
      : priority === "mortgage-broker" ? "mortgage broker"
      : priority === "buyers-agent" ? "buyer's agent"
      : "financial advisor";

    return {
      type: "advisor",
      headline: `Talk to a verified ${advisorLabel}`,
      explanation: [
        complexity === "complex"
          ? "Your situation involves enough complexity that professional advice is likely to save you more than it costs."
          : "You've indicated you'd like professional guidance — that's a smart move.",
        amount === "xlarge" || amount === "large"
          ? "With your investment size, the right advice can make a significant difference to your outcomes."
          : "A good advisor will help you avoid costly mistakes early on.",
        "All advisors on Invest.com.au are ASIC-registered and independently verified.",
      ],
      actions: [
        { label: `Find ${advisorLabel}s`, href: `/find-advisor`, primary: true, icon: "users" },
        { label: "Compare platforms too", href: "/compare", icon: "bar-chart" },
      ],
      guides: [
        { label: `How to choose a ${advisorLabel}`, href: `/advisor-guides/how-to-choose-${advisorType.replace(/s$/, "")}` },
        { label: "What does advice cost?", href: "/article/financial-advisor-cost-australia" },
        { label: "Red flags to watch for", href: "/article/financial-advisor-red-flags" },
      ],
    };
  }

  // Guide-first route (unsure + simple + small)
  if (mode === "unsure" && complexity === "simple" && amount === "small") {
    return {
      type: "guide",
      headline: "Start with the basics — then decide",
      explanation: [
        "You're early in your journey, which is a great place to be.",
        "We recommend reading a quick guide before choosing a platform or advisor.",
        "Once you're ready, our comparison tools will help you find the right fit.",
      ],
      actions: [
        { label: "How to start investing", href: "/how-to/start-investing", primary: true, icon: "book-open" },
        { label: "Compare beginner platforms", href: "/best/beginners", icon: "bar-chart" },
      ],
      guides: [
        { label: "ETF investing for beginners", href: "/how-to/invest-in-etfs-for-beginners" },
        { label: "How much should I invest?", href: "/article/salary-vs-investing" },
        { label: "Take the platform quiz", href: "/quiz" },
      ],
    };
  }

  // Both route (unsure + moderate/complex or unsure + large amounts)
  if (mode === "unsure") {
    return {
      type: "both",
      headline: "Here are your best options — DIY and expert",
      explanation: [
        "Based on your answers, you have two good paths.",
        "DIY suits you if your situation is straightforward and you're comfortable making decisions.",
        "An advisor suits you if you want professional guidance on tax, super, or structuring.",
      ],
      actions: [
        { label: "Compare platforms", href: goal === "crypto" ? "/compare?filter=crypto" : goal === "super" ? "/compare?filter=super" : goal === "income" ? "/compare?filter=shares" : "/compare", primary: true, icon: "bar-chart" },
        { label: "Find an advisor", href: "/find-advisor", icon: "users" },
      ],
      guides: [
        { label: "Do I need a financial planner?", href: "/article/do-i-need-financial-planner" },
        { label: "Platform comparison", href: "/compare" },
        { label: "Fee calculators", href: "/calculators" },
      ],
    };
  }

  // DIY platform route
  const filterMap: Record<string, string> = {
    start: "", wealth: "", income: "shares", switch: "",
    crypto: "crypto", super: "super", property: "property", help: "",
  };
  const filter = filterMap[goal || ""] || "";
  const compareHref = filter ? `/compare?filter=${filter}` : "/compare";

  const bestPageMap: Record<string, string> = {
    start: "/best/beginners", wealth: "/best/etf-investing", income: "/best/dividend-investing",
    switch: "/switching-calculator", crypto: "/best/crypto", super: "/best/super-funds",
    property: "/compare?filter=property", help: "/find-advisor",
    home: "/advisors/mortgage-brokers",
  };
  const bestHref = bestPageMap[goal || ""] || "/best/beginners";

  const guideMap: Record<string, { label: string; href: string }[]> = {
    start: [
      { label: "How to buy your first shares", href: "/how-to/buy-shares" },
      { label: "ETF investing for beginners", href: "/how-to/invest-in-etfs-for-beginners" },
      { label: "What is an ETF?", href: "/article/what-is-an-etf" },
    ],
    wealth: [
      { label: "Build an ETF portfolio", href: "/article/etf-portfolio-australia" },
      { label: "Dollar-cost averaging", href: "/article/dollar-cost-averaging" },
      { label: "Best ETFs on the ASX", href: "/article/best-asx-etfs-2026" },
    ],
    income: [
      { label: "Dividend investing guide", href: "/how-to/dividend-investing-australia" },
      { label: "Best dividend stocks", href: "/article/best-asx-dividend-stocks" },
      { label: "Franking credits explained", href: "/article/franking-credits-explained" },
    ],
    switch: [
      { label: "Transfer shares between brokers", href: "/how-to/transfer-shares-between-brokers" },
      { label: "Switching calculator", href: "/switching-calculator" },
      { label: "CHESS sponsorship explained", href: "/article/chess-sponsorship-explained" },
    ],
    crypto: [
      { label: "How to buy Bitcoin", href: "/how-to/buy-bitcoin" },
      { label: "Crypto tax in Australia", href: "/article/crypto-tax-australia" },
      { label: "Best crypto wallets", href: "/article/best-crypto-wallets-australia" },
    ],
    super: [
      { label: "Compare super funds", href: "/how-to/compare-super-funds" },
      { label: "Salary sacrifice into super", href: "/how-to/salary-sacrifice-super" },
      { label: "SMSF pros and cons", href: "/article/self-managed-super-fund-pros-cons" },
    ],
    property: [
      { label: "Property vs shares", href: "/article/property-vs-shares-australia" },
      { label: "First home buyer guide", href: "/article/first-home-buyer-investing" },
      { label: "Negative gearing explained", href: "/article/negative-gearing-explained" },
    ],
  };

  return {
    type: "diy",
    headline: priority === "lowest-fees" ? "Here are the lowest-fee platforms for you"
      : priority === "safety" ? "Here are the safest CHESS-sponsored platforms"
      : priority === "ease-of-use" ? "Here are the simplest platforms to get started"
      : "Here are your best platform options",
    explanation: [
      "Based on your answers, a DIY approach is a great fit.",
      amount === "small" ? "Starting small is fine — many top platforms have no minimum." : "Your investment size means fees will have a meaningful impact on returns.",
      "We recommend comparing 2-3 options before opening an account.",
    ],
    actions: [
      { label: "See top picks", href: bestHref, primary: true, icon: "award" },
      { label: "Full comparison", href: compareHref, icon: "bar-chart" },
      { label: "Fee calculator", href: "/calculators", icon: "calculator" },
    ],
    guides: guideMap[goal || "start"] || guideMap.start,
  };
}

/* ─── Component ─── */
export default function StartClient() {
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showResult, setShowResult] = useState(false);

  const progress = showResult ? 100 : ((step) / 5) * 100;

  const handleSelect = useCallback((key: string, value: string) => {
    const next = { ...answers, [key]: value };
    setAnswers(next);

    // Auto-advance: if goal is "help", skip mode step (force mode=help)
    if (key === "goal" && value === "help") {
      setAnswers({ ...next, mode: "help" });
      setStep(2 as Step); // skip to complexity
      return;
    }

    if (step < 4) {
      setStep((step + 1) as Step);
    } else {
      // Last step — show results
      trackEvent("matchmaker_complete", { ...next, [key]: value });
      setShowResult(true);
    }
  }, [answers, step]);

  const goBack = () => {
    if (showResult) { setShowResult(false); return; }
    if (step > 0) setStep((step - 1) as Step);
  };

  const result = showResult ? computeRoute(answers) : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-12">
        {/* Progress bar */}
        <div className="mb-6 md:mb-10">
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            {step > 0 || showResult ? (
              <button onClick={goBack} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <Icon name="chevron-left" size={14} /> Back
              </button>
            ) : <span />}
            <span className="text-xs text-slate-400">
              {showResult ? "Your results" : `Step ${step + 1} of 5`}
            </span>
          </div>
        </div>

        {/* ─── QUESTIONS ─── */}
        {!showResult && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {step === 0 && (
              <QuestionStep
                title="What are you trying to do?"
                subtitle="Pick the one that best describes your goal right now."
                options={GOALS.map(g => ({ key: g.key, label: g.label, sub: g.sub, icon: g.icon }))}
                onSelect={(k) => handleSelect("goal", k)}
                selected={answers.goal}
              />
            )}
            {step === 1 && (
              <QuestionStep
                title="Do you want to do this yourself or get help?"
                subtitle="There's no wrong answer — we'll show you options either way."
                options={MODES.map(m => ({ key: m.key, label: m.label, sub: m.sub, icon: m.icon }))}
                onSelect={(k) => handleSelect("mode", k)}
                selected={answers.mode}
              />
            )}
            {step === 2 && (
              <QuestionStep
                title="How complex is your situation?"
                subtitle="This helps us recommend the right level of support."
                options={COMPLEXITY.map(c => ({ key: c.key, label: c.label, sub: c.sub, icon: c.icon }))}
                onSelect={(k) => handleSelect("complexity", k)}
                selected={answers.complexity}
              />
            )}
            {step === 3 && (
              <QuestionStep
                title="How much are you looking to invest?"
                subtitle="This affects which platforms and advisors fit best."
                options={AMOUNTS.map(a => ({ key: a.key, label: a.label, sub: a.sub, icon: "wallet" }))}
                onSelect={(k) => handleSelect("amount", k)}
                selected={answers.amount}
              />
            )}
            {step === 4 && (
              <QuestionStep
                title={answers.mode === "help" || answers.goal === "help" ? "What kind of expert are you looking for?" : "What matters most right now?"}
                subtitle="Pick your top priority — we'll use this to personalise your results."
                options={getPriorityOptions(answers).map(p => ({ key: p.key, label: p.label, sub: "", icon: p.icon }))}
                onSelect={(k) => handleSelect("priority", k)}
                selected={answers.priority}
              />
            )}
          </div>
        )}

        {/* ─── RESULTS ─── */}
        {showResult && result && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Result type badge */}
            <div className="text-center mb-6">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                result.type === "advisor" ? "bg-amber-100 text-amber-800"
                : result.type === "both" ? "bg-violet-100 text-violet-800"
                : result.type === "guide" ? "bg-blue-100 text-blue-800"
                : "bg-emerald-100 text-emerald-800"
              }`}>
                <Icon name={result.type === "advisor" ? "users" : result.type === "guide" ? "book-open" : "trending-up"} size={14} />
                {result.type === "advisor" ? "Expert help recommended"
                  : result.type === "both" ? "Two paths to consider"
                  : result.type === "guide" ? "Start with a guide"
                  : "DIY platform match"}
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 text-center mb-4 leading-tight">
              {result.headline}
            </h1>

            {/* Explanation */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 mb-6 space-y-2">
              {result.explanation.map((line, i) => (
                <p key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <Icon name="check" size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  {line}
                </p>
              ))}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {result.actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm transition-all ${
                    action.primary
                      ? "bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.02] shadow-lg"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <Icon name={action.icon} size={18} />
                  {action.label}
                </Link>
              ))}
            </div>

            {/* Related guides */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mb-6">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Helpful reading for your situation</h3>
              <div className="space-y-2">
                {result.guides.map((guide) => (
                  <Link
                    key={guide.href}
                    href={guide.href}
                    className="flex items-center gap-2 text-sm text-slate-600 hover:text-violet-700 transition-colors"
                  >
                    <Icon name="book-open" size={14} className="text-slate-400" />
                    {guide.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Start over */}
            <div className="text-center">
              <button
                onClick={() => { setAnswers({}); setStep(0); setShowResult(false); }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Start over
              </button>
            </div>

            {/* Compliance */}
            <p className="text-[0.6rem] text-slate-400 text-center mt-6 leading-relaxed max-w-lg mx-auto">
              {GENERAL_ADVICE_WARNING} This tool provides general information only and is not personal financial advice.
              Results are based on the answers you selected.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Question Step Component ─── */
function QuestionStep({
  title,
  subtitle,
  options,
  onSelect,
  selected,
}: {
  title: string;
  subtitle: string;
  options: { key: string; label: string; sub: string; icon: string }[];
  onSelect: (key: string) => void;
  selected?: string;
}) {
  return (
    <div>
      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1 leading-tight">{title}</h2>
      <p className="text-sm text-slate-500 mb-5">{subtitle}</p>
      <div className="space-y-2.5">
        {options.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
              selected === opt.key
                ? "bg-violet-50 border-violet-400 ring-2 ring-violet-200"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              selected === opt.key ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              <Icon name={opt.icon} size={20} />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900">{opt.label}</span>
              {opt.sub && <p className="text-xs text-slate-500 mt-0.5">{opt.sub}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
