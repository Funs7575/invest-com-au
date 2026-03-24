"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Broker } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";
import { storeQualificationData } from "@/lib/qualification-store";
import { getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";
import { scoreQuizResults, type WeightKey, type QuizWeights } from "@/lib/quiz-scoring";

import QuizQuestionScreen from "./_components/QuizQuestionScreen";
import QuizAnalyzingScreen from "./_components/QuizAnalyzingScreen";
import QuizResultsScreen from "./_components/QuizResultsScreen";

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

// Fallback questions if DB fetch fails
const fallbackQuestions = [
  { question_text: "What is your main investing goal?", options: [
    { label: "Long-Term Growth", key: "grow" },
    { label: "Buy Crypto", key: "crypto" },
    { label: "Active Trading", key: "trade" },
    { label: "Hands-Off / Automated", key: "automate" },
    { label: "Retirement / Super", key: "super" },
    { label: "Property", key: "property" },
  ] },
  { question_text: "How experienced are you with investing?", options: [
    { label: "Complete Beginner", key: "beginner" },
    { label: "Some Experience", key: "intermediate" },
    { label: "Advanced / Professional", key: "pro" },
  ] },
  { question_text: "How much are you looking to invest?", options: [
    { label: "Under $5,000", key: "small" },
    { label: "$5,000 - $50,000", key: "medium" },
    { label: "$50,000 - $100,000", key: "large" },
    { label: "$100,000+", key: "whale" },
  ] },
  { question_text: "What matters most to you?", options: [
    { label: "Lowest Fees", key: "fees" },
    { label: "Safety (CHESS)", key: "safety" },
    { label: "Best Tools & Research", key: "tools" },
    { label: "Simplicity / Set & Forget", key: "simple" },
  ] },
];

// Fallback scoring weights — researched from actual platform features & fees
// Scale: 0 (irrelevant) to 10 (best-in-class for this category)
// beginner: ease of use, educational resources, simple UX
// low_fee: competitive pricing for typical retail investor ($1k-$10k trades)
// us_shares: US market access, low FX fees, fractional shares
// smsf: SMSF support, CHESS sponsorship, safety/regulation
// crypto: crypto range, staking, AUSTRAC registration
// advanced: pro tools, charting, options, APIs, market depth
// property: property/REIT exposure, fractional property
// robo: automated investing, hands-off portfolio management
const fallbackScores: Record<string, Record<WeightKey, number>> = {
  // ── Share brokers ──
  // Interactive Brokers: $6/0.08% ASX, $0.005/share US, 0.002% FX, CHESS, SMSF, 170+ markets
  "interactive-brokers": { beginner: 3, low_fee: 7, us_shares: 10, smsf: 8, crypto: 0, advanced: 10, property: 0, robo: 0 },
  // CMC Markets: $0 first trade/day <$1k, $0 US, 0.6% FX, CHESS, good tools
  "cmc-markets": { beginner: 7, low_fee: 9, us_shares: 8, smsf: 5, crypto: 0, advanced: 7, property: 0, robo: 0 },
  // Stake: $3 ASX, US$3 US, 0.7% FX, CHESS, clean mobile app
  "stake": { beginner: 8, low_fee: 8, us_shares: 9, smsf: 3, crypto: 0, advanced: 4, property: 0, robo: 0 },
  // Moomoo: $0 ASX promo / $3 standard, $0 US, 0.35% FX, not CHESS, interest on cash
  "moomoo": { beginner: 7, low_fee: 9, us_shares: 9, smsf: 2, crypto: 0, advanced: 7, property: 0, robo: 0 },
  // SelfWealth: $9.50 flat, CHESS, SMSF, HK market access
  "selfwealth": { beginner: 6, low_fee: 6, us_shares: 6, smsf: 8, crypto: 0, advanced: 4, property: 0, robo: 0 },
  // CommSec: $5-$29.95, CBA integration, CHESS, trusted brand, high fees
  "commsec": { beginner: 9, low_fee: 2, us_shares: 4, smsf: 7, crypto: 0, advanced: 5, property: 0, robo: 0 },
  // Superhero: $2/$0.01% ASX, not CHESS (custodial), US access
  "superhero": { beginner: 8, low_fee: 9, us_shares: 7, smsf: 3, crypto: 3, advanced: 3, property: 0, robo: 0 },
  // Tiger Brokers: $3 ASX CHESS, competitive US, good tools
  "tiger-brokers": { beginner: 5, low_fee: 8, us_shares: 8, smsf: 3, crypto: 0, advanced: 7, property: 0, robo: 0 },
  // IG: $0 US, $5 ASX, advanced platform, CFDs available
  "ig": { beginner: 4, low_fee: 6, us_shares: 8, smsf: 5, crypto: 0, advanced: 8, property: 0, robo: 0 },
  // Saxo: tiered pricing, wide global access, professional tools
  "saxo": { beginner: 3, low_fee: 5, us_shares: 8, smsf: 5, crypto: 0, advanced: 9, property: 0, robo: 0 },
  // NABtrade: bank-backed, CHESS, higher fees, trusted
  "nabtrade": { beginner: 7, low_fee: 3, us_shares: 4, smsf: 7, crypto: 0, advanced: 4, property: 0, robo: 0 },
  // ANZ Share Investing: bank-backed, higher fees
  "anz-share-investing": { beginner: 6, low_fee: 2, us_shares: 3, smsf: 6, crypto: 0, advanced: 3, property: 0, robo: 0 },
  // Webull: $0 ASX CHESS, $0 US, interest on cash, newer entrant
  "webull": { beginner: 7, low_fee: 10, us_shares: 9, smsf: 3, crypto: 3, advanced: 6, property: 0, robo: 0 },

  // ── Crypto exchanges ──
  // Swyftx: 0.6% spread, 300+ coins, AUSTRAC, beginner-friendly
  "swyftx": { beginner: 8, low_fee: 6, us_shares: 0, smsf: 2, crypto: 9, advanced: 5, property: 0, robo: 0 },
  // CoinSpot: 1% instant buy / 0.1% market, 400+ coins, AUSTRAC, very easy
  "coinspot": { beginner: 10, low_fee: 4, us_shares: 0, smsf: 2, crypto: 9, advanced: 2, property: 0, robo: 0 },
  // Binance: lowest fees globally, 600+ coins, advanced tools
  "binance": { beginner: 3, low_fee: 10, us_shares: 0, smsf: 0, crypto: 10, advanced: 9, property: 0, robo: 0 },
  // Kraken: strong security, proof of reserves, staking, mid fees
  "kraken": { beginner: 4, low_fee: 7, us_shares: 0, smsf: 0, crypto: 9, advanced: 8, property: 0, robo: 0 },
  // BTC Markets: Australian, AUSTRAC, SMSF support, moderate fees
  "btc-markets": { beginner: 5, low_fee: 5, us_shares: 0, smsf: 5, crypto: 8, advanced: 5, property: 0, robo: 0 },
  // Coinstash: Australian, beginner-focused, limited coins
  "coinstash": { beginner: 8, low_fee: 6, us_shares: 0, smsf: 2, crypto: 6, advanced: 2, property: 0, robo: 0 },
  // Independent Reserve: AUSTRAC, SMSF, institutional-grade
  "independent-reserve": { beginner: 4, low_fee: 6, us_shares: 0, smsf: 6, crypto: 8, advanced: 6, property: 0, robo: 0 },

  // ── Robo-advisors ──
  // Stockspot: oldest AU robo, 0.4-0.66% fee, CHESS/HIN, gold allocation, $2k min
  "stockspot": { beginner: 9, low_fee: 6, us_shares: 3, smsf: 5, crypto: 0, advanced: 2, property: 2, robo: 10 },
  // Raiz: micro-investing, round-ups, 0.275%/$5.50mo, managed fund (no CHESS)
  "raiz": { beginner: 10, low_fee: 7, us_shares: 2, smsf: 2, crypto: 2, advanced: 1, property: 2, robo: 9 },
  // Spaceship: $0 fee under $5k, growth-focused, no CHESS, modern app
  "spaceship": { beginner: 9, low_fee: 9, us_shares: 4, smsf: 1, crypto: 0, advanced: 1, property: 0, robo: 8 },
  // SixPark: similar to Stockspot, CHESS/HIN, property REIT allocation
  "sixpark": { beginner: 8, low_fee: 6, us_shares: 3, smsf: 6, crypto: 0, advanced: 2, property: 3, robo: 9 },
  // Pearler: $6.50 brokerage, auto-invest, long-term focus, CHESS
  "pearler": { beginner: 7, low_fee: 6, us_shares: 5, smsf: 4, crypto: 0, advanced: 3, property: 0, robo: 7 },
  // Vanguard Personal Investor: low ETF fees, $0 brokerage on Vanguard ETFs, trusted brand
  "vanguard-personal-investor": { beginner: 7, low_fee: 8, us_shares: 3, smsf: 4, crypto: 0, advanced: 2, property: 2, robo: 6 },

  // ── Super funds ──
  // AustralianSuper: largest fund, low fees, strong performance, MySuper
  "australian-super": { beginner: 8, low_fee: 8, us_shares: 2, smsf: 0, crypto: 0, advanced: 2, property: 4, robo: 7 },
  // Hostplus: low fees, strong long-term returns, industry fund
  "hostplus": { beginner: 7, low_fee: 9, us_shares: 2, smsf: 0, crypto: 0, advanced: 2, property: 3, robo: 6 },
  // Rest Super: younger demographic, app-focused, moderate fees
  "rest-super": { beginner: 7, low_fee: 6, us_shares: 1, smsf: 0, crypto: 0, advanced: 1, property: 2, robo: 6 },
  // Aware Super: merged fund, competitive fees, ESG options
  "aware-super": { beginner: 6, low_fee: 7, us_shares: 1, smsf: 0, crypto: 0, advanced: 2, property: 3, robo: 5 },
  // Spaceship Super: growth-focused super, tech-heavy, younger audience
  "spaceship-super": { beginner: 9, low_fee: 7, us_shares: 3, smsf: 0, crypto: 0, advanced: 1, property: 0, robo: 8 },

  // ── Property platforms ──
  // BrickX: fractional property, $250 min, rental income, liquid
  "brickx": { beginner: 7, low_fee: 5, us_shares: 0, smsf: 3, crypto: 0, advanced: 2, property: 10, robo: 4 },
  // DomaCom: fractional property, crowdfunding model, higher min
  "domacom": { beginner: 3, low_fee: 4, us_shares: 0, smsf: 4, crypto: 0, advanced: 4, property: 9, robo: 2 },
  // VentureCrowd: property + venture capital, accredited investors
  "venturecrowd": { beginner: 2, low_fee: 3, us_shares: 0, smsf: 3, crypto: 0, advanced: 5, property: 8, robo: 1 },

  // ── Research tools ──
  // Simply Wall St: visual stock analysis, snowflake charts, freemium
  "simply-wall-st": { beginner: 7, low_fee: 5, us_shares: 7, smsf: 2, crypto: 0, advanced: 8, property: 0, robo: 0 },
  // TradingView: best-in-class charting, social, freemium
  "tradingview": { beginner: 3, low_fee: 5, us_shares: 6, smsf: 1, crypto: 4, advanced: 10, property: 0, robo: 0 },
  // Market Index: free ASX data, news, simple portfolio tracker
  "market-index": { beginner: 8, low_fee: 8, us_shares: 3, smsf: 2, crypto: 0, advanced: 5, property: 0, robo: 0 },

  // ── CFD & Forex ──
  // Pepperstone: tight spreads, MT4/MT5, ASIC regulated, pro tools
  "pepperstone": { beginner: 3, low_fee: 7, us_shares: 3, smsf: 0, crypto: 3, advanced: 9, property: 0, robo: 0 },
  // CMC Markets CFDs: wide range, good platform, ASIC
  "cmc-markets-cfds": { beginner: 4, low_fee: 6, us_shares: 3, smsf: 0, crypto: 2, advanced: 8, property: 0, robo: 0 },
  // IC Markets: raw spreads, ECN, popular with scalpers
  "ic-markets": { beginner: 2, low_fee: 8, us_shares: 2, smsf: 0, crypto: 2, advanced: 10, property: 0, robo: 0 },
  // FP Markets: IRESS + MT4/5, ASIC, competitive spreads
  "fp-markets": { beginner: 3, low_fee: 7, us_shares: 3, smsf: 0, crypto: 2, advanced: 8, property: 0, robo: 0 },
};

const QUIZ_STORAGE_KEY = "invest-quiz-progress";

function loadSavedProgress(): { step: number; answers: string[] } | null {
  try {
    const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.step === "number" && Array.isArray(parsed.answers)) {
      return parsed;
    }
  } catch { /* ignore corrupt data */ }
  return null;
}

function saveProgress(step: number, answers: string[]) {
  try {
    localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ step, answers }));
  } catch { /* quota exceeded etc */ }
}

function clearProgress() {
  try {
    localStorage.removeItem(QUIZ_STORAGE_KEY);
  } catch { /* ignore */ }
}

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [questions, setQuestions] = useState(fallbackQuestions);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [weights, setWeights] = useState<Record<string, QuizWeights>>(fallbackScores);
  const [copied, setCopied] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [emailGate, setEmailGate] = useState(false);
  const [gateEmail, setGateEmail] = useState("");
  const [gateName, setGateName] = useState("");
  const [gateConsent, setGateConsent] = useState(false);
  const [gateStatus, setGateStatus] = useState<"idle" | "loading" | "error">("idle");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [quizCampaignWinners, setQuizCampaignWinners] = useState<PlacementWinner[]>([]);
  const [resumePrompt, setResumePrompt] = useState(false);
  const mountedRef = useRef(true);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);

  // Restore saved progress on mount
  useEffect(() => {
    const saved = loadSavedProgress();
    if (saved && saved.step > 0 && saved.step < fallbackQuestions.length) {
      setResumePrompt(true);
    }
  }, []);

  // Cleanup ref for unmount protection (P0 #4)
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch marketplace campaign winners for quiz-boost placement
  useEffect(() => {
    getPlacementWinners("quiz-boost").then((winners) => {
      if (mountedRef.current) setQuizCampaignWinners(winners);
    });
  }, []);

  // Parallelised Supabase queries with error handling (P0 #3, P1 #10)
  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      supabase.from('brokers').select('*').eq('status', 'active').order('rating', { ascending: false }),
      supabase.from('quiz_questions').select('*').eq('active', true).order('order_index'),
      supabase.from('quiz_weights').select('*'),
    ]).then(([brokerRes, questionsRes, weightsRes]) => {
      if (!mountedRef.current) return;

      if (brokerRes.error) {
        setFetchError("Failed to load broker data. Using cached results.");
      } else if (brokerRes.data) {
        setBrokers(brokerRes.data);
      }

      if (questionsRes.data && questionsRes.data.length > 0) {
        setQuestions(questionsRes.data);
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
      if (mountedRef.current) {
        setFetchError("Failed to load quiz data. Using cached results.");
      }
    });
  }, []);

  const handleAnswer = (key: string) => {
    if (animating) return;
    if (step === 0) {
      trackEvent('quiz_start', { first_answer: key }, '/quiz');
    }
    // Track each step for funnel analysis
    trackEvent('quiz_step', { step: step + 1, total_steps: questions.length, answer: key }, '/quiz');
    // Show selected confirmation then advance
    setSelectedKey(key);
    setAnimating(true);
    const newAnswers = [...answers, key];
    const isFinal = step + 1 >= questions.length;

    setTimeout(() => {
      if (!mountedRef.current) return; // P0 #4: prevent state update after unmount
      setAnswers(newAnswers);
      setSelectedKey(null);
      if (isFinal) {
        // Clear saved progress — quiz is complete
        clearProgress();
        // Show "Analyzing" transition, then go straight to results
        setRevealing(true);
        setAnimating(false);
        setTimeout(() => {
          if (!mountedRef.current) return;
          setRevealing(false);
          setStep(step + 1);
        }, 1800);
      } else {
        const nextStep = step + 1;
        setStep(nextStep);
        setAnimating(false);
        // Save progress to localStorage
        saveProgress(nextStep, newAnswers);
        // P1 #8: Focus management — move focus to next question heading
        requestAnimationFrame(() => {
          questionHeadingRef.current?.focus();
        });
      }
    }, 350);
  };

  const handleShareResult = async () => {
    const shareUrl = window.location.href;
    const topBrokerName = results[0]?.broker?.name || "my top platform";
    const shareText = `I just found ${topBrokerName} as my best platform match on Invest.com.au! Take the quiz:`;

    // Try Web Share API first (mobile-native sharing)
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "My Platform Match", text: shareText, url: shareUrl });
        trackEvent("quiz_share", { method: "native", top_broker: results[0]?.slug }, "/quiz");
        return;
      } catch {
        // User cancelled or API failed — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    trackEvent("quiz_share", { method: "clipboard", top_broker: results[0]?.slug }, "/quiz");
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate personalized match reasons based on user answers and broker strengths
  const getMatchReasons = (userAnswers: string[], broker: Broker): string[] => {
    const reasons: string[] = [];
    const pt = broker.platform_type;

    // Platform-type specific reasons
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
      if (userAnswers.includes('property'))
        reasons.push('Fractional property ownership with rental income');
      if (userAnswers.includes('income'))
        reasons.push('Rental income and property returns');
    } else if (pt === 'cfd_forex') {
      reasons.push('Access to leveraged trading across multiple markets');
      if (userAnswers.includes('pro'))
        reasons.push('Advanced tools for experienced active traders');
    } else if (pt === 'crypto_exchange' || broker.is_crypto) {
      reasons.push('Regulated Australian crypto exchange');
      if (userAnswers.includes('crypto'))
        reasons.push('Wide range of cryptocurrencies available');
    } else {
      // share_broker (default)
      if (userAnswers.includes('fees') || userAnswers.includes('income'))
        reasons.push(`Low brokerage fees (${broker.asx_fee || 'competitive rates'})`);
      if (userAnswers.includes('safety') && broker.chess_sponsored)
        reasons.push('CHESS sponsorship — your shares are held in your name');
      if (userAnswers.includes('tools') || userAnswers.includes('pro'))
        reasons.push('Advanced charting and research tools');
      if (broker.smsf_support && (userAnswers.includes('super') || userAnswers.includes('grow')))
        reasons.push('Supports SMSF accounts for tax-effective investing');
    }

    // Universal reasons
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

  const [showScoring, setShowScoring] = useState(false);

  // P1 #5: Memoize results to avoid recalculating on every render
  // Extract the amount answer (Q3, answers[2]) and pass it as a multiplier so
  // portfolio size scales scores without double-counting against category weights.
  const results = useMemo(() => {
    const amountAnswer = answers[2] as import("@/lib/quiz-scoring").AmountKey | undefined;
    return scoreQuizResults(answers, weights, brokers, quizCampaignWinners, amountAnswer);
  }, [answers, weights, brokers, quizCampaignWinners]);

  // Check if any result is a crypto broker (for crypto warning)
  const hasCryptoResult = useMemo(
    () => results.some(r => r.broker?.is_crypto),
    [results]
  );

  // Track quiz completion when user reaches results + persist for PersonalizedRecommendations
  useEffect(() => {
    if (step >= questions.length && step > 0 && brokers.length > 0) {
      trackEvent('quiz_complete', {
        answers,
        top_broker: results[0]?.slug || null,
        results_count: results.length,
      }, '/quiz');
      trackEvent('quiz_completed', {
        top_match: results[0]?.slug || null,
        results_count: results.length,
      }, '/quiz');
      // Persist top results so other pages can show personalized recommendations
      try {
        const topResults = results.slice(0, 5).filter(r => r.broker).map(r => ({
          slug: r.slug,
          name: r.broker!.name,
          score: r.total,
          logo_url: r.broker!.logo_url || null,
          color: r.broker!.color,
          tagline: r.broker!.tagline || null,
          rating: r.broker!.rating || null,
        }));
        localStorage.setItem('invest-quiz-results', JSON.stringify({
          answers,
          results: topResults,
          completedAt: new Date().toISOString(),
        }));

        // Store qualification data for lead enrichment
        storeQualificationData("quiz", {
          answers,
          top_match: results[0]?.slug || null,
          results_count: results.length,
          question_labels: questions.map(q => q.question_text),
        });
      } catch { /* quota exceeded */ }
    }
  }, [step, questions.length, brokers.length, results, answers]);

  // Email gate submit handler
  const handleGateSubmit = async () => {
    if (!gateEmail || !gateEmail.includes("@") || !gateConsent) return;
    setGateStatus("loading");
    try {
      const res = await fetch("/api/quiz-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: gateEmail,
          name: gateName || undefined,
          answers,
          top_match_slug: results[0]?.slug || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      trackEvent("quiz_lead_capture", { source: "quiz", answers, top_match: results[0]?.slug }, "/quiz");
      trackEvent("pdf_opt_in", { source: "quiz" }, "/quiz");
    } catch {
      // P0 #2: Set error state so user sees feedback
      setGateStatus("error");
      return; // Stay on gate so user can retry
    }
    setGateStatus("idle");
    setEmailGate(false);
    setStep(step + 1);
  };

  const handleGateSkip = () => {
    setGateStatus("idle");
    setEmailGate(false);
    setStep(step + 1);
  };

  // Email gate no longer blocks results — email capture moved below results

  // Results screen
  if (step >= questions.length) {
    return (
      <QuizResultsScreen
        results={results}
        answers={answers}
        hasCryptoResult={hasCryptoResult}
        emailGate={emailGate}
        gateEmail={gateEmail}
        gateStatus={gateStatus}
        copied={copied}
        showScoring={showScoring}
        onSetShowScoring={setShowScoring}
        onGateEmailChange={setGateEmail}
        onGateSubmit={handleGateSubmit}
        onEmailGateSent={() => setEmailGate(true)}
        onGateConsentSet={() => setGateConsent(true)}
        onShareResult={handleShareResult}
        onRestart={() => { clearProgress(); setStep(0); setAnswers([]); }}
        getMatchReasons={getMatchReasons}
      />
    );
  }

  // Analyzing transition screen
  if (revealing) {
    return <QuizAnalyzingScreen />;
  }

  // Question screen
  return (
    <QuizQuestionScreen
      step={step}
      questions={questions}
      selectedKey={selectedKey}
      animating={animating}
      fetchError={fetchError}
      resumePrompt={resumePrompt}
      onAnswer={handleAnswer}
      onBack={() => {
        const prevStep = step - 1;
        const prevAnswers = answers.slice(0, -1);
        setStep(prevStep);
        setAnswers(prevAnswers);
        saveProgress(prevStep, prevAnswers);
      }}
      onResume={() => {
        const saved = loadSavedProgress();
        if (saved) {
          setStep(saved.step);
          setAnswers(saved.answers);
        }
        setResumePrompt(false);
      }}
      onStartOver={() => { clearProgress(); setResumePrompt(false); }}
      questionHeadingRef={questionHeadingRef}
    />
  );
}
