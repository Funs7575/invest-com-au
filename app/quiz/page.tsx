"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Broker } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";
import { storeQualificationData } from "@/lib/qualification-store";
import { getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";
import { scoreQuizResults, type WeightKey, type QuizWeights, type AmountKey } from "@/lib/quiz-scoring";

import QuizQuestionScreen from "./_components/QuizQuestionScreen";
import QuizAnalyzingScreen from "./_components/QuizAnalyzingScreen";
import QuizResultsScreen from "./_components/QuizResultsScreen";
import QuizEmailGate from "./_components/QuizEmailGate";
import AdvisorResultsScreen from "./_components/AdvisorResultsScreen";

/* ─── Types ─── */
type QuestionId = "location" | "goal" | "mode" | "experience" | "complexity" | "amount" | "priority" | "advisor_type" | "property_sub" | "investor_country" | "visa_status" | "investor_goal_intl";
type QuizTrack = "diy" | "advisor" | "international";
type Phase = "questions" | "email-gate" | "analyzing" | "advisor-analyzing" | "diy-results" | "advisor-results";

interface UnifiedAnswers {
  location?: string;
  goal?: string;
  mode?: string;
  experience?: string;
  complexity?: string;
  amount?: string;
  priority?: string;
  advisor_type?: string;
  property_sub?: string;
  investor_country?: string;
  visa_status?: string;
  investor_goal_intl?: string;
}

interface QuizWeight {
  broker_slug: string;
  beginner_weight: number;
  low_fee_weight: number;
  us_shares_weight: number;
  smsf_weight: number;
  crypto_weight: number;
  advanced_weight: number;
  property_weight: number;
  robo_weight: number;
}

/* ─── Unified question definitions ─── */
const UNIFIED_QUESTIONS: Record<QuestionId, { text: string; options: { key: string; label: string; sub?: string; emoji?: string }[] }> = {
  location: {
    text: "Where are you based?",
    options: [
      { key: "australia",     label: "I live in Australia",              sub: "Australian resident or citizen",              emoji: "🇦🇺" },
      { key: "international", label: "I'm outside Australia",            sub: "I'm based overseas and investing in Australia", emoji: "🌏" },
      { key: "expat",         label: "Australian expat living abroad",   sub: "I'm an Aussie living overseas",               emoji: "✈️" },
    ],
  },
  investor_country: {
    text: "Which country are you based in?",
    options: [
      { key: "singapore",    label: "Singapore",     emoji: "🇸🇬" },
      { key: "hong_kong",    label: "Hong Kong",     emoji: "🇭🇰" },
      { key: "china",        label: "China",         emoji: "🇨🇳" },
      { key: "india",        label: "India",         emoji: "🇮🇳" },
      { key: "uae",          label: "UAE / Middle East", emoji: "🇦🇪" },
      { key: "uk",           label: "United Kingdom", emoji: "🇬🇧" },
      { key: "usa",          label: "United States", emoji: "🇺🇸" },
      { key: "malaysia",     label: "Malaysia",      emoji: "🇲🇾" },
      { key: "new_zealand",  label: "New Zealand",   emoji: "🇳🇿" },
      { key: "other",        label: "Other country", emoji: "🌍" },
    ],
  },
  visa_status: {
    text: "What is your relationship with Australia?",
    options: [
      { key: "non_resident",    label: "Non-resident / no Australian ties", sub: "Never lived in Australia, no visa",                emoji: "🌐" },
      { key: "temp_visa",       label: "Temporary visa holder",             sub: "457, 482, student, working holiday visa",         emoji: "📋" },
      { key: "new_pr",          label: "New permanent resident",            sub: "Recently got PR, not yet a citizen",              emoji: "🏡" },
      { key: "au_expat",        label: "Australian expat",                  sub: "Australian citizen or PR living abroad",          emoji: "✈️" },
    ],
  },
  investor_goal_intl: {
    text: "What are you looking to do in Australia?",
    options: [
      { key: "property",  label: "Buy property",            sub: "Residential or investment property",          emoji: "🏠" },
      { key: "shares",    label: "Invest in ASX shares",    sub: "Stocks, ETFs, or managed funds",              emoji: "📈" },
      { key: "savings",   label: "Park money in AUD",       sub: "High-interest savings or term deposits",      emoji: "💰" },
      { key: "business",  label: "Set up a business",       sub: "Company registration, structuring",           emoji: "🏢" },
    ],
  },
  goal: {
    text: "What are you trying to do?",
    options: [
      { key: "grow",     label: "Start investing / Long-term growth",  sub: "ETFs, shares, or building wealth over time",       emoji: "📈" },
      { key: "income",   label: "Earn income / dividends",             sub: "Regular income from investments",                  emoji: "💰" },
      { key: "crypto",   label: "Buy crypto",                          sub: "Bitcoin, Ethereum, altcoins",                      emoji: "₿" },
      { key: "trade",    label: "Active trading",                      sub: "Frequent trades, CFDs, or short-term strategies",  emoji: "⚡" },
      { key: "automate", label: "Hands-off / automated investing",     sub: "Set and forget, robo-advisors",                    emoji: "🤖" },
      { key: "super",    label: "Retirement / Super / SMSF",           sub: "Optimise my superannuation",                       emoji: "🏦" },
      { key: "property", label: "Property investing",                  sub: "Physical property, REITs, or through super",       emoji: "🏠" },
      { key: "home",     label: "Buy a home or get a loan",            sub: "First home, refinance, or investment loan",        emoji: "🔑" },
      { key: "help",     label: "Get expert help",                     sub: "I'd like professional guidance",                   emoji: "🤝" },
    ],
  },
  mode: {
    text: "Do you want to do this yourself or get expert help?",
    options: [
      { key: "diy", label: "Do it myself", sub: "I'll choose my own platform and investments" },
      { key: "help", label: "Get expert help", sub: "I'd like professional guidance" },
      { key: "unsure", label: "I'm not sure yet", sub: "Show me both options" },
    ],
  },
  experience: {
    text: "How experienced are you with investing?",
    options: [
      { key: "beginner", label: "Complete beginner", sub: "Just getting started" },
      { key: "intermediate", label: "Some experience", sub: "I've invested before but want to improve" },
      { key: "pro", label: "Advanced / professional", sub: "I know what I'm doing" },
    ],
  },
  complexity: {
    text: "How complex is your situation?",
    options: [
      { key: "simple", label: "Simple", sub: "Just getting started, straightforward situation" },
      { key: "moderate", label: "Moderate", sub: "Some assets, want to make good decisions" },
      { key: "complex", label: "Complex", sub: "Tax, SMSF, property, business, or multiple goals" },
    ],
  },
  amount: {
    text: "How much are you looking to invest?",
    options: [
      { key: "small", label: "Under $10,000", sub: "Starting small" },
      { key: "medium", label: "$10,000 – $100,000", sub: "Building a portfolio" },
      { key: "large", label: "$100,000 – $500,000", sub: "Significant savings" },
      { key: "whale", label: "$500,000+", sub: "Major wealth decisions" },
    ],
  },
  priority: {
    text: "What matters most to you?",
    options: [
      { key: "fees", label: "Lowest fees", sub: "Minimise brokerage and ongoing costs" },
      { key: "safety", label: "Safety (CHESS sponsored)", sub: "Shares held directly in your name" },
      { key: "tools", label: "Best tools & research", sub: "Advanced charting, analysis, screeners" },
      { key: "simple", label: "Simplicity / set & forget", sub: "Easy, automated, and stress-free" },
    ],
  },
  advisor_type: {
    text: "What type of expert are you looking for?",
    options: [
      { key: "mortgage-broker",   label: "Mortgage broker",           sub: "Home loans, refinancing, investment loans",     emoji: "🏠" },
      { key: "buyers-agent",      label: "Buyer's agent",             sub: "Find and negotiate property purchases",         emoji: "🔍" },
      { key: "financial-planner", label: "Financial planner",         sub: "Investment strategy, tax, retirement planning", emoji: "📊" },
      { key: "smsf-accountant",   label: "SMSF accountant",           sub: "Set up and manage a self-managed super fund",   emoji: "🏦" },
      { key: "tax-agent",         label: "Tax agent",                 sub: "Tax returns, crypto CGT, deductions",           emoji: "📋" },
      { key: "not-sure",          label: "I'm not sure what I need",  sub: "Help me figure out the right expert",           emoji: "🤔" },
    ],
  },
  property_sub: {
    text: "How do you want to invest in property?",
    options: [
      { key: "physical", label: "Buy physical property", sub: "Direct ownership — house, apartment, or investment property" },
      { key: "property-reit", label: "Invest in REITs / fractional property", sub: "Property funds, BrickX, or listed property trusts" },
      { key: "property-super", label: "Use super for property (SMSF)", sub: "Self-managed super fund property strategy" },
    ],
  },
};

/* ─── Navigation logic ─── */
function isInternational(a: UnifiedAnswers): boolean {
  return a.location === "international" || a.location === "expat";
}

function resolveTrack(a: UnifiedAnswers): QuizTrack {
  if (isInternational(a)) return "international";
  if (a.goal === "help" || a.goal === "home") return "advisor";
  if (a.mode === "help") return "advisor";
  if (a.property_sub === "physical") return "advisor";
  return "diy";
}

function getNextId(id: QuestionId, a: UnifiedAnswers): QuestionId | null {
  const track = resolveTrack(a);

  // International track
  if (track === "international") {
    switch (id) {
      case "location":      return "investor_country";
      case "investor_country": return "visa_status";
      case "visa_status":   return "investor_goal_intl";
      case "investor_goal_intl": return "amount";
      case "amount":        return "advisor_type";
      case "advisor_type":  return null;
      // These shouldn't be hit but handle defensively
      case "goal": case "mode": case "experience": case "complexity":
      case "priority": case "property_sub": return null;
    }
  }

  // Domestic track
  switch (id) {
    case "location":
      return "goal";
    case "goal":
      return (a.goal === "help" || a.goal === "home") ? "complexity" : "mode";
    case "mode":
      return track === "advisor" ? "complexity" : "experience";
    case "experience":
    case "complexity":
      return "amount";
    case "amount":
      return track === "advisor" ? "advisor_type" : "priority";
    case "priority":
    case "advisor_type":
      return a.goal === "property" ? "property_sub" : null;
    case "property_sub":
      return null;
    // International-only questions that shouldn't appear on domestic track
    case "investor_country":
    case "visa_status":
    case "investor_goal_intl":
      return null;
  }
}

function getTotalSteps(a: UnifiedAnswers): number {
  if (isInternational(a)) return 6; // location + country + visa + goal + amount + advisor_type
  const skipMode = a.goal === "help" || a.goal === "home";
  const hasPropertySub = a.goal === "property";
  return 1 + (skipMode ? 4 : 5) + (hasPropertySub ? 1 : 0); // +1 for location
}

function inferAdvisorType(a: UnifiedAnswers): string {
  if (a.advisor_type && a.advisor_type !== "not-sure") return a.advisor_type;
  // International track
  if (isInternational(a)) {
    if (a.investor_goal_intl === "property") return "buyers-agent";
    if (a.investor_goal_intl === "shares") return "tax-agent";
    if (a.investor_goal_intl === "savings" || a.investor_goal_intl === "business") return "financial-planner";
    return "tax-agent";
  }
  // Domestic track
  if (a.property_sub === "physical") return "buyers-agent";
  if (a.goal === "home") return "mortgage-broker";
  if (a.goal === "property") return "buyers-agent";
  if (a.goal === "super") return "smsf-accountant";
  if (a.goal === "crypto") return "tax-agent";
  if (a.amount === "large" || a.amount === "whale") return "financial-planner";
  return a.advisor_type || "financial-planner";
}

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
    sub: item.sub ? `${item.sub} · Recommended for you` : "Recommended for you",
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

  // Home goal: mortgage broker is the only logical answer
  if (a.goal === "home") {
    const opts = allOptions.filter(o => o.key === "mortgage-broker" || o.key === "not-sure");
    return { text: baseText, options: opts };
  }

  // All other domestic cases: reorder to put inferred type first
  return { text: baseText, options: sortByInferred(allOptions, inferred) };
}

// Convert unified answers to a flat string array for the platform scoring engine
// Format: [goal, experience, amount, priority, property_sub?]
// — index 0 = goal (interest), index 1 = experience, index 2 = amount (multiplier), index 3 = priority
function toScoringAnswers(a: UnifiedAnswers): string[] {
  return [
    a.goal,
    a.experience,
    a.amount,
    a.priority,
    a.property_sub,
  ].filter(Boolean) as string[];
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

const QUIZ_STORAGE_KEY = "invest-quiz-v2-progress";

function loadSavedProgress(): { currentId: QuestionId; answers: UnifiedAnswers; history: QuestionId[] } | null {
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.currentId && parsed.answers && Array.isArray(parsed.history)) {
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function saveProgress(currentId: QuestionId, answers: UnifiedAnswers, history: QuestionId[]) {
  try {
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ currentId, answers, history }));
  } catch { /* quota exceeded */ }
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

  // Email gate state
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "error">("idle");

  // Results UI state
  const [copied, setCopied] = useState(false);
  const [showScoring, setShowScoring] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Data
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [weights, setWeights] = useState<Record<string, QuizWeights>>(fallbackScores);
  const [quizCampaignWinners, setQuizCampaignWinners] = useState<PlacementWinner[]>([]);

  const mountedRef = useRef(true);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);

  // Restore saved progress on mount
  useEffect(() => {
    const saved = loadSavedProgress();
    if (saved && saved.history.length > 0) {
      setResumePrompt(true);
    }
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

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('brokers').select('*').eq('status', 'active').order('rating', { ascending: false }),
      supabase.from('quiz_weights').select('*'),
    ]).then(([brokerRes, weightsRes]) => {
      if (!mountedRef.current) return;
      if (brokerRes.error) {
        setFetchError("Failed to load broker data. Using cached results.");
      } else if (brokerRes.data) {
        setBrokers(brokerRes.data);
      }
      if (weightsRes.data && weightsRes.data.length > 0) {
        const w: Record<string, QuizWeights> = {};
        weightsRes.data.forEach((row: QuizWeight) => {
          w[row.broker_slug] = {
            beginner: row.beginner_weight || 0,
            low_fee: row.low_fee_weight || 0,
            us_shares: row.us_shares_weight || 0,
            smsf: row.smsf_weight || 0,
            crypto: row.crypto_weight || 0,
            advanced: row.advanced_weight || 0,
            property: row.property_weight || 0,
            robo: row.robo_weight || 0,
          };
        });
        setWeights(w);
      }
    }).catch(() => {
      if (mountedRef.current) setFetchError("Failed to load quiz data. Using cached results.");
    });
  }, []);

  // Compute scored results (memoised)
  const scoringAnswers = useMemo(() => toScoringAnswers(answers), [answers]);
  const results = useMemo(() => {
    return scoreQuizResults(scoringAnswers, weights, brokers, quizCampaignWinners, answers.amount as AmountKey | undefined);
  }, [scoringAnswers, weights, brokers, quizCampaignWinners, answers.amount]);

  const hasCryptoResult = useMemo(() => results.some(r => r.broker?.is_crypto), [results]);

  // Track completion + persist results
  useEffect(() => {
    if ((phase === "diy-results" || phase === "advisor-results") && brokers.length > 0) {
      trackEvent('quiz_complete', { answers: scoringAnswers, top_broker: results[0]?.slug || null }, '/quiz');
      trackEvent('quiz_completed', { top_match: results[0]?.slug || null }, '/quiz');
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
  }, [phase, brokers.length, results, scoringAnswers]);

  /* ─── Handlers ─── */

  const handleAnswer = (key: string) => {
    if (animating) return;
    if (history.length === 0) {
      trackEvent('quiz_start', { first_answer: key }, '/quiz');
    }
    trackEvent('quiz_step', { question: currentId, answer: key }, '/quiz');

    setSelectedKey(key);
    setAnimating(true);

    const newAnswers = { ...answers, [currentId]: key };

    setTimeout(() => {
      if (!mountedRef.current) return;
      setAnswers(newAnswers);
      setSelectedKey(null);
      setAnimating(false);

      const track = resolveTrack(newAnswers);
      const nextId = getNextId(currentId, newAnswers);

      const newHistory = [...history, currentId];

      if (nextId === null) {
        // Last question answered
        clearProgress();
        if (track === "advisor") {
          // Advisor track — brief analyzing moment then advisor results
          setHistory(newHistory);
          setPhase("advisor-analyzing");
          setTimeout(() => {
            if (!mountedRef.current) return;
            setPhase("advisor-results");
          }, 2200);
        } else {
          // DIY track — show email gate first
          setHistory(newHistory);
          setPhase("email-gate");
        }
      } else {
        setHistory(newHistory);
        setCurrentId(nextId);
        saveProgress(nextId, newAnswers, newHistory);
        requestAnimationFrame(() => { questionHeadingRef.current?.focus(); });
      }
    }, 350);
  };

  const handleBack = () => {
    if (phase === "email-gate") {
      setPhase("questions");
      return;
    }
    if (history.length > 0) {
      const prev = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      setCurrentId(prev);
      // Remove the answer for the question we're going back from
      const newAnswers = { ...answers };
      delete newAnswers[currentId as keyof UnifiedAnswers];
      setAnswers(newAnswers);
      saveProgress(prev, newAnswers, newHistory);
    }
  };

  const handleEmailGateSubmit = async (email: string, name: string) => {
    setEmailStatus("loading");
    try {
      const res = await fetch("/api/quiz-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          answers: scoringAnswers,
          top_match_slug: results[0]?.slug || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      trackEvent("quiz_lead_capture", { source: "quiz", top_match: results[0]?.slug }, "/quiz");
      trackEvent("pdf_opt_in", { source: "quiz" }, "/quiz");
      setEmailStatus("idle");
    } catch {
      setEmailStatus("error");
    }
    // Always proceed to results regardless of email submission success/failure
    setPhase("analyzing");
    setTimeout(() => {
      if (!mountedRef.current) return;
      setPhase("diy-results");
    }, 1800);
  };

  const handleEmailGateSkip = () => {
    setPhase("analyzing");
    setTimeout(() => {
      if (!mountedRef.current) return;
      setPhase("diy-results");
    }, 1800);
  };

  const handleShareResult = async () => {
    const shareUrl = window.location.href;
    const topBrokerName = results[0]?.broker?.name || "my top platform";
    const shareText = `I filtered platforms on Invest.com.au and ${topBrokerName} ranked highest for my criteria! Try the filter tool:`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "My Platform Filter Results", text: shareText, url: shareUrl });
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

  // Generate match reasons for platform results
  const getMatchReasons = (userAnswers: string[], broker: Broker): string[] => {
    const reasons: string[] = [];
    const pt = broker.platform_type;
    if (pt === 'robo_advisor') {
      reasons.push('Automated portfolio management — hands-off investing');
      if (userAnswers.includes('beginner') || userAnswers.includes('simple') || userAnswers.includes('automate'))
        reasons.push('Perfect for investors who want a set-and-forget approach');
    } else if (pt === 'research_tool') {
      reasons.push('Powerful analysis tools to research before you invest');
      if (userAnswers.includes('tools') || userAnswers.includes('pro'))
        reasons.push('Advanced charting, screening, and data analytics');
    } else if (pt === 'super_fund') {
      reasons.push('Superannuation fund — grow your retirement savings');
      if (userAnswers.includes('super') || userAnswers.includes('grow'))
        reasons.push('Strong long-term performance track record');
    } else if (pt === 'property_platform') {
      reasons.push('Property investing without buying a whole house');
      if (userAnswers.some(a => a.startsWith('property')))
        reasons.push('Fractional property ownership with rental income');
    } else if (pt === 'cfd_forex') {
      reasons.push('Access to leveraged trading across multiple markets');
      if (userAnswers.includes('pro'))
        reasons.push('Advanced tools for experienced active traders');
    } else if (pt === 'crypto_exchange' || broker.is_crypto) {
      reasons.push('Regulated Australian crypto exchange');
      if (userAnswers.includes('crypto'))
        reasons.push('Wide range of cryptocurrencies available');
    } else {
      if (userAnswers.includes('fees') || userAnswers.includes('income'))
        reasons.push(`Low brokerage fees (${broker.asx_fee || 'competitive rates'})`);
      if (userAnswers.includes('safety') && broker.chess_sponsored)
        reasons.push('CHESS sponsorship — your shares are held in your name');
      if (userAnswers.includes('tools') || userAnswers.includes('pro'))
        reasons.push('Advanced charting and research tools');
      if (broker.smsf_support && (userAnswers.includes('super') || userAnswers.includes('grow')))
        reasons.push('Supports SMSF accounts for tax-effective investing');
    }
    if (userAnswers.includes('beginner') || userAnswers.includes('simple') || userAnswers.includes('automate'))
      if (!reasons.some(r => r.includes('beginner') || r.includes('hands-off') || r.includes('set-and-forget')))
        reasons.push('Simple, beginner-friendly platform and interface');
    if (userAnswers.includes('large') || userAnswers.includes('whale'))
      if (pt === 'share_broker' || !pt)
        reasons.push('Competitive international fees for larger portfolios');
    if (broker.rating && broker.rating >= 4.5)
      reasons.push(`Highly rated (${broker.rating}/5) by our editorial team`);
    if (!reasons.length) reasons.push('Strong overall score across your selected criteria');
    return reasons.slice(0, 4);
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
        hasCryptoResult={hasCryptoResult}
        emailGate={false}
        gateEmail=""
        gateStatus="idle"
        copied={copied}
        showScoring={showScoring}
        onSetShowScoring={setShowScoring}
        onGateEmailChange={() => {}}
        onGateSubmit={() => {}}
        onEmailGateSent={() => {}}
        onGateConsentSet={() => {}}
        onShareResult={handleShareResult}
        onRestart={handleRestart}
        getMatchReasons={getMatchReasons}
      />
    );
  }

  if (phase === "advisor-results") {
    return (
      <AdvisorResultsScreen
        advisorType={inferAdvisorType(answers)}
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

  if (phase === "email-gate") {
    return (
      <QuizEmailGate
        onSubmit={handleEmailGateSubmit}
        onSkip={handleEmailGateSkip}
        status={emailStatus}
      />
    );
  }

  // Questions phase
  const current = currentId === "advisor_type"
    ? getDynamicAdvisorTypeQuestion(answers)
    : UNIFIED_QUESTIONS[currentId];
  const questionIndex = history.length; // 0-based
  const totalSteps = getTotalSteps(answers);

  return (
    <QuizQuestionScreen
      step={questionIndex}
      questions={[{ question_text: current.text, options: current.options as { key: string; label: string; sub?: string; emoji?: string }[] }]}
      selectedKey={selectedKey}
      animating={animating}
      fetchError={fetchError}
      resumePrompt={resumePrompt}
      questionIndex={questionIndex}
      totalQuestions={totalSteps}
      onAnswer={handleAnswer}
      onBack={handleBack}
      onResume={() => {
        const saved = loadSavedProgress();
        if (saved) {
          setCurrentId(saved.currentId);
          setAnswers(saved.answers);
          setHistory(saved.history);
        }
        setResumePrompt(false);
      }}
      onStartOver={() => { clearProgress(); setResumePrompt(false); handleRestart(); }}
      questionHeadingRef={questionHeadingRef}
    />
  );
}
