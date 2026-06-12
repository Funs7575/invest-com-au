"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/tracking";
import Icon from "@/components/Icon";
import type { ThreadAnswers } from "./ThreadCardsStrip";

type ActionKind = "calc" | "advisor" | "pillar" | "post-job" | "compare-3";

interface NextBestAction {
  kind: ActionKind;
  href: string;
  title: string;
  body: string;
  icon: string;
  /** Higher = surfaced first */
  priority: number;
}

interface Props {
  answers: ThreadAnswers;
  topSlugs: string[];
  /** When the quiz signals complexity or whale-tier amount, surface /quotes/post */
  showPostJobFallback?: boolean;
}

function buildActions(
  a: ThreadAnswers,
  topSlugs: string[],
  showPostJobFallback: boolean,
): NextBestAction[] {
  const actions: NextBestAction[] = [];
  const goal = a.goal;
  const amount = a.amount;
  const complexity = a.complexity;
  const isHighValue = amount === "large" || amount === "whale";
  const isComplex = complexity === "complex";
  const propSub = a.property_sub;

  // ─── SUPER / RETIREMENT ─────────────────────────────────────────────
  if (goal === "super" || propSub === "property-super") {
    actions.push({
      kind: "calc",
      href: "/retirement-calculator",
      title: "Calculate your retirement number",
      body: "See what your super becomes by retirement — and what you'd need to retire comfortably.",
      icon: "calculator",
      priority: 90,
    });
    actions.push({
      kind: "calc",
      href: "/smsf-calculator",
      title: "Is an SMSF worth it?",
      body: "Run the numbers — SMSFs make sense above a certain balance, but not always.",
      icon: "calculator",
      priority: 85,
    });
    actions.push({
      kind: "advisor",
      href: "/advisors/smsf-accountants",
      title: "Find an SMSF accountant",
      body: "Setup, compliance, and annual audits. Most setups cost $1,500–$3,000.",
      icon: "users",
      priority: 80,
    });
    actions.push({
      kind: "pillar",
      href: "/super",
      title: "Browse the super hub",
      body: "Funds, performance, fees, and SMSF guides — all in one place.",
      icon: "shield",
      priority: 60,
    });
  }

  // ─── PROPERTY ────────────────────────────────────────────────────────
  if (goal === "property" || propSub === "physical") {
    actions.push({
      kind: "advisor",
      href: "/advisors/mortgage-brokers",
      title: "Talk to a mortgage broker",
      body: "Compares 30+ lenders to find your best rate — free, paid by the lender.",
      icon: "home",
      priority: 92,
    });
    actions.push({
      kind: "calc",
      href: "/property-yield-calculator",
      title: "Property yield calculator",
      body: "Work out gross & net rental yield before you commit.",
      icon: "calculator",
      priority: 78,
    });
    actions.push({
      kind: "calc",
      href: "/property-vs-shares-calculator",
      title: "Property vs shares — which wins?",
      body: "Compare expected returns side-by-side over your investment horizon.",
      icon: "calculator",
      priority: 70,
    });
    actions.push({
      kind: "pillar",
      href: "/property",
      title: "Browse the property hub",
      body: "Buyer's agents, mortgage brokers, REITs, and fractional platforms.",
      icon: "home",
      priority: 55,
    });
  }

  // ─── CRYPTO ──────────────────────────────────────────────────────────
  if (goal === "crypto") {
    actions.push({
      kind: "advisor",
      href: "/advisors/tax-agents",
      title: "Get a crypto-savvy tax agent",
      body: "DeFi, staking, and CGT add up fast. A specialist usually saves more than their fee.",
      icon: "file-text",
      priority: 88,
    });
    actions.push({
      kind: "calc",
      href: "/cgt-calculator",
      title: "Capital gains tax calculator",
      body: "Estimate your tax on crypto / share gains before you sell.",
      icon: "calculator",
      priority: 75,
    });
    actions.push({
      kind: "pillar",
      href: "/crypto",
      title: "Browse the crypto hub",
      body: "Exchanges, security, tax, and beginner guides.",
      icon: "trending-up",
      priority: 55,
    });
  }

  // ─── HOME LOAN ───────────────────────────────────────────────────────
  if (goal === "home") {
    actions.push({
      kind: "calc",
      href: "/mortgage-calculator",
      title: "Mortgage repayment calculator",
      body: "Work out repayments, interest, and total cost across loan terms.",
      icon: "calculator",
      priority: 90,
    });
  }

  // ─── ACTIVE TRADER ───────────────────────────────────────────────────
  if (goal === "trade") {
    actions.push({
      kind: "calc",
      href: "/trade-cost-calculator",
      title: "Trade cost calculator",
      body: "Brokerage + spread + slippage — see what each round-trip really costs.",
      icon: "calculator",
      priority: 78,
    });
    actions.push({
      kind: "pillar",
      href: "/cfd",
      title: "Compare CFD / forex platforms",
      body: "Spreads, leverage, regulation — for active traders.",
      icon: "trending-up",
      priority: 60,
    });
  }

  // ─── INCOME / DIVIDENDS ──────────────────────────────────────────────
  if (goal === "income") {
    actions.push({
      kind: "calc",
      href: "/franking-credits-calculator",
      title: "Franking credits calculator",
      body: "See the after-tax value of fully-franked Aussie dividends at your rate.",
      icon: "calculator",
      priority: 75,
    });
    actions.push({
      kind: "calc",
      href: "/dividend-reinvestment-calculator",
      title: "Dividend reinvestment (DRIP) calculator",
      body: "Project how compounding dividends grow your portfolio.",
      icon: "calculator",
      priority: 70,
    });
  }

  // ─── BEGINNER / GROW ─────────────────────────────────────────────────
  if (goal === "grow") {
    actions.push({
      kind: "calc",
      href: "/compound-interest-calculator",
      title: "Compound interest calculator",
      body: "See how regular contributions grow over decades — the magic of time.",
      icon: "calculator",
      priority: 70,
    });
    actions.push({
      kind: "pillar",
      href: "/share-trading",
      title: "Browse the share-trading hub",
      body: "Brokers, ETFs, beginner guides, and how to start.",
      icon: "trending-up",
      priority: 50,
    });
  }

  // ─── SAVINGS-FIRST ───────────────────────────────────────────────────
  if (amount === "small") {
    actions.push({
      kind: "calc",
      href: "/savings-calculator",
      title: "Savings calculator",
      body: "Build your starting capital faster — see what regular deposits compound to.",
      icon: "calculator",
      priority: 60,
    });
  }

  // ─── HIGH VALUE / WHALE ──────────────────────────────────────────────
  if (isHighValue) {
    actions.push({
      kind: "advisor",
      href: "/advisors/financial-planners",
      title: "One-off plan from a financial planner",
      body: "At $100k+, a $2,500–$5,500 plan typically pays for itself in tax & structure.",
      icon: "briefcase",
      priority: 95,
    });
  }

  // ─── COMPLEX SITUATIONS ──────────────────────────────────────────────
  if (isComplex) {
    actions.push({
      kind: "advisor",
      href: "/advisors/financial-planners",
      title: "Get a holistic financial plan",
      body: "Tax, SMSF, business, and multi-goal situations need a planner — not just a broker.",
      icon: "briefcase",
      priority: 88,
    });
  }

  // ─── UNIVERSAL: COMPARE TOP 3 ────────────────────────────────────────
  if (topSlugs.length >= 2) {
    const ids = topSlugs.slice(0, 3).join(",");
    actions.push({
      kind: "compare-3",
      href: `/compare?ids=${encodeURIComponent(ids)}`,
      title: "Compare your top picks side-by-side",
      body: "See your top matches in one table — fees, features, safety.",
      icon: "bar-chart",
      priority: 65,
    });
  }

  // ─── POST-A-JOB FALLBACK ─────────────────────────────────────────────
  if (showPostJobFallback) {
    actions.push({
      kind: "post-job",
      href: "/quotes/post?context=quiz",
      title: "Still stuck? Post your situation",
      body: "Describe what you need — verified professionals reply with quotes. No obligation.",
      icon: "message-circle",
      priority: 50,
    });
  }

  // De-duplicate by href, then sort by priority desc, cap at 6
  const seen = new Set<string>();
  const unique = actions.filter((a) => {
    if (seen.has(a.href)) return false;
    seen.add(a.href);
    return true;
  });
  return unique.sort((a, b) => b.priority - a.priority).slice(0, 6);
}

export default function QuizNextBestActions({ answers, topSlugs, showPostJobFallback = false }: Props) {
  const actions = buildActions(answers, topSlugs, showPostJobFallback);
  if (actions.length === 0) return null;

  return (
    <div className="mb-4 md:mb-6 result-card-in result-card-in-delay-3">
      <div className="flex items-center gap-2 mb-2 md:mb-3">
        <Icon name="zap" size={14} className="text-amber-500" />
        <h3 className="text-[0.69rem] md:text-sm font-bold text-slate-700 uppercase tracking-wide">
          Your next best moves
        </h3>
      </div>
      <p className="text-[0.65rem] md:text-xs text-slate-500 mb-3">
        Picked from your answers — calculators, specialists, and topic hubs that go further than a single platform pick.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            onClick={() => trackEvent("quiz_next_best_action", { kind: a.kind, href: a.href }, "/quiz")}
            className="group bg-white border border-slate-200 rounded-lg md:rounded-xl p-3 md:p-3.5 flex items-start gap-2.5 hover:border-amber-400 hover:bg-amber-50/40 transition-colors"
          >
            <div
              className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center shrink-0 ${
                a.kind === "advisor"
                  ? "bg-amber-100 text-amber-600"
                  : a.kind === "calc"
                  ? "bg-blue-50 text-blue-600"
                  : a.kind === "pillar"
                  ? "bg-emerald-50 text-emerald-600"
                  : a.kind === "post-job"
                  ? "bg-violet-50 text-violet-600"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Icon name={a.icon} size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.69rem] md:text-sm font-bold text-slate-900 leading-tight mb-0.5 group-hover:text-amber-700 transition-colors">
                {a.title}
              </p>
              <p className="text-[0.62rem] md:text-xs text-slate-500 leading-snug">{a.body}</p>
            </div>
            <svg
              className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-1 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
