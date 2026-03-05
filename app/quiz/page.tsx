"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Broker } from "@/lib/types";
import { trackClick, trackEvent, getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE_SHORT, CRYPTO_WARNING, SPONSORED_DISCLOSURE_SHORT } from "@/lib/compliance";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import RiskWarningInline from "@/components/RiskWarningInline";
import Icon from "@/components/Icon";
import { isSponsored, getPlacementWinners, type PlacementWinner } from "@/lib/sponsorship";
import { scoreQuizResults, type WeightKey, type QuizWeights } from "@/lib/quiz-scoring";
import SponsorBadge from "@/components/SponsorBadge";
import CohortInsights from "@/components/CohortInsights";
import ProUpsellBanner from "@/components/ProUpsellBanner";
import AdvisorPrompt from "@/components/AdvisorPrompt";

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
  const results = useMemo(() => {
    return scoreQuizResults(answers, weights, brokers, quizCampaignWinners);
  }, [answers, weights, brokers, quizCampaignWinners]);

  // Check if any result is a crypto broker (for crypto warning)
  const hasCryptoResult = useMemo(
    () => results.some(r => r.broker?.is_crypto),
    [results]
  );

  // Track quiz completion when user reaches results
  useEffect(() => {
    if (step >= questions.length && step > 0 && brokers.length > 0) {
      trackEvent('quiz_complete', {
        answers,
        top_broker: results[0]?.slug || null,
        results_count: results.length,
      }, '/quiz');
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
    const topMatch = results[0];
    const runnerUps = results.slice(1);
    const allResults = results.filter(r => r.broker);

    // Edge case: no platforms matched (data fetch failed or empty DB)
    if (allResults.length === 0) {
      return (
        <div className="pt-5 pb-8 md:py-12">
          <div className="container-custom max-w-2xl mx-auto text-center">
            <Icon name="alert-triangle" size={48} className="text-amber-500 mx-auto mb-4" />
            <h1 className="text-xl md:text-2xl font-extrabold mb-2">No Results Found</h1>
            <p className="text-sm text-slate-600 mb-6">
              We couldn&apos;t find platforms matching your criteria right now. This may be a temporary issue.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => { setStep(0); setAnswers([]); }}
                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Retake Quiz
              </button>
              <a
                href="/compare"
                className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Browse All Platforms
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="pt-5 pb-8 md:py-12">
        <div className="container-custom max-w-2xl mx-auto">
          <div className="text-center mb-4 md:mb-8 result-card-in">
            {/* Confetti burst + emoji */}
            <div className="relative h-14 md:h-20 mb-1 md:mb-2" aria-hidden="true">
              <div className="confetti-container confetti-active">
                {Array.from({ length: 24 }).map((_, i) => (
                  <span key={i} className="confetti-particle" style={{
                    '--confetti-x': `${-60 + Math.random() * 120}px`,
                    '--confetti-delay': `${i * 0.04}s`,
                    '--confetti-fall': `${50 + Math.random() * 50}px`,
                    '--confetti-rotate': `${Math.random() * 720 - 360}deg`,
                    '--confetti-color': ['#15803d','#f59e0b','#fbbf24','#16a34a','#ef4444','#6366f1'][i % 6],
                    left: `${8 + (i / 24) * 84}%`,
                  } as React.CSSProperties} />
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon name="trophy" size={36} className="celebrate-emoji text-amber-500 md:hidden" />
                <Icon name="trophy" size={56} className="celebrate-emoji text-amber-500 hidden md:block" />
              </div>
            </div>
            <h1 className="text-xl md:text-3xl font-extrabold mb-1 md:mb-2">Your Shortlist</h1>
            <p className="text-[0.69rem] md:text-base text-slate-600">Platforms that scored highest on your criteria.</p>
            <div className="flex items-center justify-center gap-2 md:gap-3 mt-2 md:mt-3 text-[0.62rem] md:text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                ASIC-regulated
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Based on your answers
              </span>
            </div>
          </div>

          {/* General Advice Warning — collapsed on mobile, visible on desktop */}
          <div className="hidden md:block bg-slate-50 border border-slate-200 rounded-lg p-2.5 md:p-4 mb-3 md:mb-6">
            <p className="text-[0.62rem] md:text-xs text-slate-500 leading-relaxed">
              <strong>General Advice Warning:</strong> {GENERAL_ADVICE_WARNING} {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>
          <div className="md:hidden mb-3">
            <details className="bg-slate-50 border border-slate-200 rounded-lg">
              <summary className="px-2.5 py-2 text-[0.62rem] text-slate-500 font-medium cursor-pointer flex items-center gap-1">
                <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                General advice only — not a personal recommendation.
              </summary>
              <p className="px-2.5 pb-2.5 text-[0.62rem] text-slate-500 leading-relaxed">
                {GENERAL_ADVICE_WARNING} {ADVERTISER_DISCLOSURE_SHORT}
              </p>
            </details>
          </div>

          {/* Sponsored broker disclosure — collapsed on mobile */}
          {allResults.some(r => r.broker && isSponsored(r.broker)) && (
            <>
              <div className="hidden md:block bg-blue-50 border border-blue-200 rounded-lg p-2.5 md:p-3 mb-3 md:mb-6">
                <p className="text-[0.62rem] md:text-xs text-blue-700 leading-relaxed">
                  <strong>Sponsor Disclosure:</strong> Sponsored partners may receive a minor position boost if they already score in the top 5. {SPONSORED_DISCLOSURE_SHORT}
                </p>
              </div>
              <div className="md:hidden mb-3">
                <details className="bg-blue-50 border border-blue-200 rounded-lg">
                  <summary className="px-2.5 py-2 text-[0.62rem] text-blue-600 font-medium cursor-pointer">
                    Includes sponsored results · Details
                  </summary>
                  <p className="px-2.5 pb-2.5 text-[0.62rem] text-blue-700 leading-relaxed">
                    Sponsored partners may receive a minor position boost if they already score in the top 5. {SPONSORED_DISCLOSURE_SHORT}
                  </p>
                </details>
              </div>
            </>
          )}

          {/* Top Match */}
          {topMatch?.broker && (
            <div
              className="border-2 rounded-xl p-4 md:p-8 mb-3 md:mb-6 relative overflow-hidden result-card-in result-card-in-delay-1 shine-effect"
              style={{
                borderColor: topMatch.broker.color || '#f59e0b',
                background: `linear-gradient(135deg, ${topMatch.broker.color}08 0%, ${topMatch.broker.color}15 100%)`,
              }}
            >
              {/* Accent bar */}
              <div
                className="absolute top-0 left-0 w-full h-1"
                style={{ background: topMatch.broker.color || '#f59e0b' }}
              />
              {/* Background glow */}
              <div
                className="absolute inset-0 pointer-events-none top-card-glow"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${topMatch.broker.color || '#f59e0b'}20 0%, transparent 70%)` }}
                aria-hidden="true"
              />
              <div
                className="text-[0.56rem] md:text-[0.69rem] uppercase font-extrabold tracking-wider mb-2.5 md:mb-4 inline-block px-2 py-1 md:px-3 md:py-1.5 rounded-full badge-pulse"
                style={{
                  color: topMatch.broker.color || '#b45309',
                  background: `${topMatch.broker.color || '#f59e0b'}20`,
                  '--badge-glow': `${topMatch.broker.color || '#f59e0b'}40`,
                } as React.CSSProperties}
              >
                <Icon name="trophy" size={12} className="inline -mt-0.5 md:hidden" />
                <Icon name="trophy" size={14} className="inline -mt-0.5 hidden md:inline" /> #1 on Your Shortlist
              </div>
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                <div
                  className="w-11 h-11 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-lg md:text-2xl font-bold shrink-0"
                  style={{ background: `${topMatch.broker.color}20`, color: topMatch.broker.color }}
                >
                  {topMatch.broker.icon || topMatch.broker.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                    <h2 className="text-xl md:text-3xl font-extrabold">{topMatch.broker.name}</h2>
                    {isSponsored(topMatch.broker) && <SponsorBadge broker={topMatch.broker} />}
                  </div>
                  <div className="text-xs md:text-sm text-amber">{renderStars(topMatch.broker.rating || 0)} <span className="text-slate-500">{topMatch.broker.rating}/5</span></div>
                </div>
              </div>
              <p className="text-[0.69rem] md:text-base text-slate-600 mb-3 md:mb-4 hidden md:block">{topMatch.broker.tagline}</p>

              {/* Why this broker? */}
              <div className="bg-white/60 rounded-lg p-2.5 md:p-3 mb-3 md:mb-4">
                <p className="text-[0.56rem] md:text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 md:mb-1.5">
                  Why {topMatch.broker.name}?
                </p>
                <ul className="space-y-0.5 md:space-y-1">
                  {getMatchReasons(answers, topMatch.broker).map((reason, i) => (
                    <li key={i} className="text-[0.69rem] md:text-sm text-slate-700 flex items-start gap-1.5 md:gap-2">
                      <span className="text-emerald-600 shrink-0">✓</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-1.5 md:gap-3 text-[0.62rem] md:text-xs text-slate-500 mb-3 md:mb-5">
                {(!topMatch.broker.platform_type || topMatch.broker.platform_type === 'share_broker') && (
                  <>
                    <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">ASX: {topMatch.broker.asx_fee}</span>
                    <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">CHESS: {topMatch.broker.chess_sponsored ? 'Yes' : 'No'}</span>
                    <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">SMSF: {topMatch.broker.smsf_support ? 'Yes' : 'No'}</span>
                  </>
                )}
                {topMatch.broker.platform_type === 'crypto_exchange' && (
                  <>
                    <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">AUSTRAC Registered</span>
                    <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Crypto Exchange</span>
                  </>
                )}
                {topMatch.broker.platform_type === 'robo_advisor' && (
                  <>
                    <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Automated Investing</span>
                    <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Managed Portfolio</span>
                  </>
                )}
                {topMatch.broker.platform_type === 'research_tool' && (
                  <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Research & Analysis</span>
                )}
                {topMatch.broker.platform_type === 'super_fund' && (
                  <>
                    <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Superannuation</span>
                    <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">APRA Regulated</span>
                  </>
                )}
                {topMatch.broker.platform_type === 'property_platform' && (
                  <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Property Investing</span>
                )}
                {topMatch.broker.platform_type === 'cfd_forex' && (
                  <>
                    <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">CFD & Forex</span>
                    <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Leveraged Trading</span>
                  </>
                )}
                <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Rating: {topMatch.broker.rating}/5</span>
              </div>
              <a
                href={getAffiliateLink(topMatch.broker)}
                target="_blank"
                rel={AFFILIATE_REL}
                onClick={() => trackClick(topMatch.broker!.slug, topMatch.broker!.name, 'quiz-result-1', '/quiz', 'quiz')}
                className="block w-full text-center px-5 py-3 md:px-6 md:py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-all text-sm md:text-lg shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                {getBenefitCta(topMatch.broker, 'quiz')}
              </a>
              <RiskWarningInline />
              {topMatch.broker.deal && topMatch.broker.deal_text && (
                <div className="mt-2 md:mt-3 text-center">
                  <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-amber-50 border border-amber-200 rounded-full text-[0.62rem] md:text-xs font-semibold text-amber-700">
                    <Icon name="flame" size={12} className="inline text-amber-500 md:hidden" />
                    <Icon name="flame" size={14} className="inline text-amber-500 hidden md:inline" /> {topMatch.broker.deal_text}
                    {topMatch.broker.deal_expiry && (
                      <span className="text-[0.56rem] md:text-[0.69rem] text-amber-500 font-normal ml-0.5 md:ml-1">
                        (expires {new Date(topMatch.broker.deal_expiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick Comparison Table */}
          {allResults.length > 1 && (() => {
            // Determine if results are mostly share brokers for column selection
            const hasShareBrokers = allResults.some(r => r.broker && (!r.broker.platform_type || r.broker.platform_type === 'share_broker'));
            const showShareCols = hasShareBrokers || allResults.every(r => !r.broker?.platform_type);

            return (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-3 md:mb-6 result-card-in result-card-in-delay-2">
              <div className="px-3 py-2 md:px-4 md:py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs md:text-sm font-bold text-slate-700">Quick Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th scope="col" className="px-2.5 md:px-4 py-1.5 md:py-2 text-left text-[0.62rem] md:text-xs text-slate-500 font-medium">Platform</th>
                      <th scope="col" className="px-2 md:px-3 py-1.5 md:py-2 text-center text-[0.62rem] md:text-xs text-slate-500 font-medium">Type</th>
                      {showShareCols && (
                        <th scope="col" className="px-2 md:px-3 py-1.5 md:py-2 text-center text-[0.62rem] md:text-xs text-slate-500 font-medium hidden md:table-cell">ASX Fee</th>
                      )}
                      <th scope="col" className="px-2 md:px-3 py-1.5 md:py-2 text-center text-[0.62rem] md:text-xs text-slate-500 font-medium">Rating</th>
                      <th scope="col" className="px-2 md:px-3 py-1.5 md:py-2 text-center text-[0.62rem] md:text-xs text-slate-500 font-medium"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allResults.map((r, i) => r.broker && (
                      <tr key={r.slug} className={`border-b border-slate-50 ${i === 0 ? 'bg-emerald-50/30' : ''}`}>
                        <td className="px-2.5 md:px-4 py-2 md:py-2.5">
                          <div className="flex items-center gap-1.5 md:gap-2">
                            <div
                              className="w-5 h-5 md:w-6 md:h-6 rounded flex items-center justify-center text-[0.5rem] md:text-[0.69rem] font-bold shrink-0"
                              style={{ background: `${r.broker.color}20`, color: r.broker.color }}
                            >
                              {r.broker.icon || r.broker.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-[0.69rem] md:text-xs">{r.broker.name}</span>
                            {i === 0 && <span className="text-[0.45rem] md:text-[0.5rem] px-1 py-px md:px-1.5 md:py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold">TOP</span>}
                          </div>
                        </td>
                        <td className="px-2 md:px-3 py-2 md:py-2.5 text-center text-[0.56rem] md:text-[0.65rem]">
                          <span className="px-1 py-0.5 rounded bg-slate-100 text-slate-600">
                            {r.broker.platform_type === 'crypto_exchange' ? 'Crypto'
                              : r.broker.platform_type === 'robo_advisor' ? 'Robo'
                              : r.broker.platform_type === 'research_tool' ? 'Research'
                              : r.broker.platform_type === 'super_fund' ? 'Super'
                              : r.broker.platform_type === 'property_platform' ? 'Property'
                              : r.broker.platform_type === 'cfd_forex' ? 'CFD/FX'
                              : 'Shares'}
                          </span>
                        </td>
                        {showShareCols && (
                          <td className="px-2 md:px-3 py-2 md:py-2.5 text-center text-[0.62rem] md:text-xs hidden md:table-cell">
                            {(!r.broker.platform_type || r.broker.platform_type === 'share_broker') ? (r.broker.asx_fee || 'N/A') : '—'}
                          </td>
                        )}
                        <td className="px-2 md:px-3 py-2 md:py-2.5 text-center text-[0.62rem] md:text-xs font-semibold">{r.broker.rating}/5</td>
                        <td className="px-2 md:px-3 py-2 md:py-2.5 text-center">
                          <a
                            href={getAffiliateLink(r.broker)}
                            target="_blank"
                            rel={AFFILIATE_REL}
                            onClick={() => trackClick(r.broker!.slug, r.broker!.name, `quiz-compare-${i + 1}`, '/quiz', 'quiz')}
                            className="inline-block px-2 py-1 md:px-3 md:py-1.5 bg-amber-600 text-white text-[0.62rem] md:text-xs font-semibold rounded-md hover:bg-amber-700 transition-colors"
                          >
                            Visit →
                          </a>
                          <RiskWarningInline />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })()}

          {/* Cohort Insights — "People Like Me" */}
          {answers.length >= 3 && (
            <div className="mb-3 md:mb-6 result-card-in result-card-in-delay-3">
              <CohortInsights
                experience={(() => {
                  const expMap: Record<string, string> = { beginner: "beginner", intermediate: "intermediate", pro: "pro" };
                  return expMap[answers[1]] || "beginner";
                })()}
                range={(() => {
                  const rangeMap: Record<string, string> = { small: "small", medium: "medium", large: "large", whale: "whale" };
                  return rangeMap[answers[2]] || "medium";
                })()}
                interest={(() => {
                  const intMap: Record<string, string> = { crypto: "crypto", trade: "trade", income: "income", grow: "grow" };
                  return intMap[answers[0]] || undefined;
                })()}
              />
            </div>
          )}

          {/* Scoring Transparency */}
          <div className="mb-3 md:mb-6 result-card-in result-card-in-delay-3">
            <button
              onClick={() => setShowScoring(!showScoring)}
              className="w-full flex items-center justify-between px-3 py-2.5 md:px-4 md:py-3 bg-slate-50 border border-slate-200 rounded-lg text-xs md:text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <span className="flex items-center gap-1.5 md:gap-2 font-medium">
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                How we scored your results
              </span>
              <svg className={`w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 transition-transform ${showScoring ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showScoring && (
              <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 md:p-4 text-[0.69rem] md:text-xs text-slate-600 space-y-2 md:space-y-3">
                <p>Each platform has pre-set scores across six categories (beginner-friendliness, low fees, US shares, SMSF, crypto, advanced features). Your quiz answers determine which categories matter most:</p>
                <div className="flex flex-wrap gap-1.5">
                  {answers.map((key, i) => {
                    const keyMap: Record<string, string> = {
                      crypto: 'Crypto', trade: 'Advanced', income: 'Low Fees', grow: 'Beginner',
                      property: 'Property', super: 'SMSF/Super', automate: 'Robo-Advisor',
                      beginner: 'Beginner', intermediate: 'Low Fees', pro: 'Advanced',
                      small: 'Beginner', medium: 'Low Fees', large: 'SMSF/Super', whale: 'Advanced',
                      fees: 'Low Fees', safety: 'SMSF/Safety', tools: 'Advanced', simple: 'Robo-Advisor', handsfree: 'Robo-Advisor',
                    };
                    return (
                      <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-full text-[0.69rem] font-medium">
                        Your answer → <strong>{keyMap[key] || key}</strong>
                      </span>
                    );
                  })}
                </div>
                <div className="space-y-1.5">
                  {allResults.map((r, i) => {
                    const maxScore = allResults[0]?.total || 1;
                    const pct = Math.round((r.total / maxScore) * 100);
                    return (
                      <div key={r.slug} className="flex items-center gap-2">
                        <span className="w-24 truncate font-medium text-slate-700">
                          {i === 0 && <><Icon name="trophy" size={12} className="inline -mt-0.5 mr-0.5" /> </>}{r.broker?.name}
                        </span>
                        <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: i === 0 ? '#10b981' : '#94a3b8',
                            }}
                          />
                        </div>
                        <span className="text-[0.69rem] text-slate-500 w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400">Scores are editorially set and weighted by your answers. Sponsored partners may receive a minor position boost if they already score in the top 5.</p>
              </div>
            )}
          </div>

          {/* Quick versus links — compare top picks head-to-head */}
          {topMatch?.broker && runnerUps.length > 0 && runnerUps[0]?.broker && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6 result-card-in result-card-in-delay-3">
              <p className="text-[0.62rem] md:text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Compare your top picks</p>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {runnerUps.slice(0, 3).map((r) => r.broker && topMatch.broker && (
                  <Link
                    key={r.slug}
                    href={`/versus/${topMatch.slug}-vs-${r.slug}`}
                    className="px-2.5 py-1.5 md:px-3 md:py-2 text-[0.65rem] md:text-xs font-semibold border border-slate-200 rounded-lg bg-white hover:border-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]"
                  >
                    {topMatch.broker.name} vs {r.broker.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Advisor prompt — contextual for high-value investors or SMSF */}
          {(answers.includes('large') || answers.includes('whale') || answers.includes('super') || answers.includes('smsf') || answers.includes('property')) && (
            <div className="mb-4 md:mb-6 result-card-in result-card-in-delay-3">
              <AdvisorPrompt
                context={answers.includes('super') || answers.includes('smsf') ? "smsf" : answers.includes('property') ? "property" : "high-value"}
              />
            </div>
          )}

          {/* Runner Ups */}
          {runnerUps.length > 0 && (
            <>
              <h3 className="text-[0.69rem] md:text-sm font-bold text-slate-500 uppercase tracking-wide mb-2 md:mb-3 result-card-in result-card-in-delay-3">Also Worth Considering</h3>
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-8">
                {runnerUps.map((r, i) => r.broker && (
                  <div
                    key={r.slug}
                    className={`border border-slate-200 rounded-lg md:rounded-xl p-3 md:p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg result-card-in result-card-in-delay-${i + 4}`}
                    style={{ borderLeftWidth: '3px', borderLeftColor: r.broker.color || '#e2e8f0' }}
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      {/* Rank badge */}
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-100 text-slate-500 text-[0.62rem] md:text-xs font-bold flex items-center justify-center shrink-0">
                        #{i + 2}
                      </div>
                      <div
                        className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold shrink-0"
                        style={{ background: `${r.broker.color}20`, color: r.broker.color }}
                      >
                        {r.broker.icon || r.broker.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
                          <h3 className="font-bold text-xs md:text-sm">{r.broker.name}</h3>
                          {isSponsored(r.broker) && <SponsorBadge broker={r.broker} />}
                        </div>
                        <div className="text-[0.62rem] md:text-xs text-slate-500">
                          {(r.broker.platform_type === 'share_broker' || r.broker.platform_type === 'cfd_forex')
                            ? `${r.broker.asx_fee || 'N/A'} · ${r.broker.chess_sponsored ? 'CHESS' : 'Custodial'} · ${r.broker.rating}/5`
                            : `${r.broker.rating}/5`}
                        </div>
                      </div>
                      <a
                        href={getAffiliateLink(r.broker)}
                        target="_blank"
                        rel={AFFILIATE_REL}
                        onClick={() => trackClick(r.broker!.slug, r.broker!.name, `quiz-result-${i + 2}`, '/quiz', 'quiz')}
                        className="hidden sm:inline-flex shrink-0 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                      >
                        {getBenefitCta(r.broker, 'quiz')}
                      </a>
                    </div>
                    <a
                      href={getAffiliateLink(r.broker)}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      onClick={() => trackClick(r.broker!.slug, r.broker!.name, `quiz-result-${i + 2}`, '/quiz', 'quiz')}
                      className="sm:hidden block w-full text-center mt-2 px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      {getBenefitCta(r.broker, 'quiz')}
                    </a>
                    <RiskWarningInline />
                    {/* Match reasons for runner-ups too */}
                    <div className="mt-1.5 md:mt-2 flex flex-wrap gap-1 md:gap-1.5">
                      {getMatchReasons(answers, r.broker).slice(0, 2).map((reason, ri) => (
                        <span key={ri} className="text-[0.56rem] md:text-[0.69rem] px-1.5 md:px-2 py-px md:py-0.5 bg-slate-50 text-slate-500 rounded-full">
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                    {r.broker.deal && r.broker.deal_text && (
                      <div className="mt-1.5 md:mt-2">
                        <span className="inline-flex items-center gap-1 px-1.5 md:px-2 py-px md:py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[0.56rem] md:text-[0.69rem] font-semibold text-amber-700">
                          <Icon name="flame" size={10} className="inline text-amber-500" /> {r.broker.deal_text}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* P1 #7: Crypto warning when results include a crypto broker */}
          {hasCryptoResult && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 md:p-3 mb-3 md:mb-4">
              <p className="text-[0.62rem] md:text-xs text-amber-700 leading-relaxed">
                <strong>Crypto Warning:</strong> {CRYPTO_WARNING}
              </p>
            </div>
          )}

          {/* Email capture — non-blocking, below results */}
          {!emailGate && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 md:p-5 mb-3 md:mb-6 result-card-in result-card-in-delay-5">
              <div className="flex items-start gap-2.5 md:gap-4">
                <Icon name="mail" size={20} className="text-slate-700 shrink-0 md:hidden" />
                <Icon name="mail" size={28} className="text-slate-700 shrink-0 hidden md:block" />
                <div className="flex-1">
                  <h3 className="font-bold text-xs md:text-sm mb-0.5 md:mb-1">Get your results emailed</h3>
                  <p className="text-[0.62rem] md:text-xs text-slate-500 mb-2 md:mb-3">We&apos;ll send your shortlist + our free fee comparison PDF.</p>
                  <div className="flex flex-col sm:flex-row gap-1.5 md:gap-2">
                    <input
                      type="email"
                      placeholder="you@email.com"
                      autoComplete="email"
                      aria-label="Email address for quiz results"
                      value={gateEmail}
                      onChange={(e) => setGateEmail(e.target.value)}
                      className="flex-1 px-2.5 py-2 md:px-3 rounded-lg border border-slate-200 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-700/30 focus:border-blue-700"
                    />
                    <button
                      onClick={async () => {
                        if (!gateEmail || !gateEmail.includes("@")) return;
                        setGateConsent(true);
                        await handleGateSubmit();
                        setEmailGate(true); // Hide the form after sending
                      }}
                      disabled={gateStatus === "loading" || !gateEmail.includes("@")}
                      className="px-3 py-2 md:px-4 bg-slate-900 text-white text-xs md:text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60 shrink-0"
                    >
                      {gateStatus === "loading" ? "Sending..." : "Email Me"}
                    </button>
                  </div>
                  {gateStatus === "error" && (
                    <p className="text-[0.62rem] md:text-xs text-red-500 mt-1">Something went wrong. Please try again.</p>
                  )}
                  <p className="text-[0.56rem] md:text-xs text-slate-400 mt-1.5 md:mt-2">No spam. Unsubscribe anytime. <Link href="/privacy" className="underline hover:text-slate-900">Privacy Policy</Link></p>
                </div>
              </div>
            </div>
          )}
          {emailGate && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-4 mb-3 md:mb-6 text-center">
              <span className="text-xs md:text-sm text-slate-700 font-medium">✓ Results sent to {gateEmail}</span>
            </div>
          )}

          {/* Pro upsell — shown below results */}
          <div className="mb-3 md:mb-6 result-card-in result-card-in-delay-5">
            <ProUpsellBanner variant="inline" />
          </div>

          <div className="my-3 md:my-6">
            <CompactDisclaimerLine />
          </div>

          {/* Bottom CTA card */}
          <div className="bg-amber-400 text-slate-900 rounded-xl p-4 md:p-6 mt-1 md:mt-2 mb-4 md:mb-8 text-center result-card-in result-card-in-delay-5">
            <h3 className="text-sm md:text-lg font-bold mb-0.5 md:mb-1">Still not sure?</h3>
            <p className="text-[0.69rem] md:text-sm text-slate-700 mb-3 md:mb-4">Compare all platforms or read detailed reviews.</p>
            <div className="flex flex-row gap-2 md:gap-3 justify-center flex-wrap">
              <a
                href="/compare"
                onClick={() => trackEvent('quiz_internal_cta', { target: 'compare' }, '/quiz')}
                className="px-3 py-2 md:px-5 md:py-2.5 bg-slate-900 text-white text-[0.69rem] md:text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Compare All →
              </a>
              {topMatch?.broker && (
                <a
                  href={`/broker/${topMatch.broker.slug}`}
                  onClick={() => trackEvent('quiz_internal_cta', { target: 'review', broker: topMatch.broker!.slug }, '/quiz')}
                  className="px-3 py-2 md:px-5 md:py-2.5 border border-slate-700 text-slate-900 text-[0.69rem] md:text-sm font-semibold rounded-lg hover:bg-amber-300 transition-colors"
                >
                  {topMatch.broker.name} Review →
                </a>
              )}
              <a
                href="/find-advisor"
                onClick={() => trackEvent('quiz_internal_cta', { target: 'find-advisor' }, '/quiz')}
                className="px-3 py-2 md:px-5 md:py-2.5 border border-slate-700 text-slate-900 text-[0.69rem] md:text-sm font-semibold rounded-lg hover:bg-amber-300 transition-colors"
              >
                Find Advisor →
              </a>
            </div>
          </div>

          {/* Share & Restart */}
          <div className="flex items-center justify-center gap-3 md:gap-4 mt-1 md:mt-2">
            <button
              onClick={handleShareResult}
              className="text-[0.69rem] md:text-sm text-slate-500 hover:text-brand transition-colors flex items-center gap-1 md:gap-1.5 px-3 py-1.5 md:px-4 md:py-2 border border-slate-200 rounded-lg hover:border-slate-300"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-emerald-600 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Share
                </>
              )}
            </button>
            <button
              onClick={() => { clearProgress(); setStep(0); setAnswers([]); }}
              className="text-[0.69rem] md:text-sm text-slate-500 hover:text-brand transition-colors"
            >
              Restart Quiz →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Analyzing transition screen
  if (revealing) {
    return (
      <div className="pt-5 pb-8 md:py-12">
        <div className="container-custom max-w-2xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[40vh] md:min-h-[40vh] reveal-screen-in">
            {/* Animated analyzing spinner */}
            <div className="relative w-12 h-12 md:w-16 md:h-16 mb-4 md:mb-6">
              <div className="absolute inset-0 rounded-full border-3 md:border-4 border-slate-200" />
              <div className="absolute inset-0 rounded-full border-3 md:border-4 border-transparent border-t-blue-700 analyzing-ring-spin" />
            </div>

            <h2 className="text-base md:text-xl font-bold mb-1 md:mb-2 reveal-text-in">
              Analyzing your answers...
            </h2>
            <p className="text-slate-500 text-xs md:text-sm reveal-text-in-delay">
              Matching you with the best platforms
            </p>

            {/* Animated progress dots */}
            <div className="flex gap-1.5 md:gap-2 mt-4 md:mt-6">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-700 analyzing-dot-1" />
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-700 analyzing-dot-2" />
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-700 analyzing-dot-3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Question screen
  const current = questions[step];

  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-2xl mx-auto">
        {/* Data fetch error notice */}
        {fetchError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 md:p-3 mb-3 md:mb-4 text-[0.62rem] md:text-xs text-amber-700">
            {fetchError}
          </div>
        )}

        {/* Resume prompt — shown when saved progress exists */}
        {resumePrompt && step === 0 && (
          <div className="mb-4 md:mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 flex items-center justify-between gap-3" style={{ animation: "resultCardIn 0.3s ease-out" }}>
            <div>
              <p className="text-xs md:text-sm font-semibold text-blue-800">Welcome back!</p>
              <p className="text-[0.62rem] md:text-xs text-blue-600">You have a quiz in progress. Pick up where you left off?</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  const saved = loadSavedProgress();
                  if (saved) {
                    setStep(saved.step);
                    setAnswers(saved.answers);
                  }
                  setResumePrompt(false);
                }}
                className="px-3 py-1.5 bg-blue-700 text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition-colors"
              >
                Resume
              </button>
              <button
                onClick={() => { clearProgress(); setResumePrompt(false); }}
                className="px-3 py-1.5 bg-white text-blue-700 text-xs font-semibold border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Progress dots — hidden on mobile (progress bar is enough) */}
        <div className="hidden md:flex items-center justify-center gap-1.5 md:gap-2 mb-4 md:mb-8">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-colors ${
                i < step ? 'bg-blue-700' : i === step ? 'bg-blue-700 ring-2 ring-blue-700/30 ring-offset-2' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-1.5 md:mb-2">
          <div className="flex justify-between text-[0.62rem] md:text-xs text-slate-500 mb-0.5 md:mb-1">
            <span>Question {step + 1} of {questions.length}</span>
            <span>{Math.round(((step + 1) / questions.length) * 100)}%</span>
          </div>
          <div
            className="h-1 md:h-1.5 bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={questions.length}
            aria-label={`Question ${step + 1} of ${questions.length}`}
          >
            <div className="h-full bg-blue-700 rounded-full transition-all duration-500" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
          </div>
        </div>

        <div key={step} className="quiz-question-enter" aria-live="polite">
          <h1
            ref={questionHeadingRef}
            tabIndex={-1}
            className="text-lg md:text-3xl font-extrabold mb-4 md:mb-8 mt-3 md:mt-6 outline-none"
          >
            {current.question_text}
          </h1>

          <div className="space-y-2 md:space-y-3" role="radiogroup" aria-label={current.question_text}>
            {current.options.map((opt: { label: string; key: string }) => (
              <button
                key={opt.label}
                onClick={() => handleAnswer(opt.key)}
                disabled={animating}
                role="radio"
                aria-checked={selectedKey === opt.key}
                aria-label={opt.label}
                className={`w-full text-left border rounded-lg md:rounded-xl px-4 py-3.5 md:px-6 md:py-4 min-h-[48px] transition-all font-medium text-xs md:text-base ${
                  selectedKey === opt.key
                    ? "border-slate-700 bg-slate-700/5 scale-[0.98]"
                    : "border-slate-200 hover:border-slate-700 hover:bg-slate-700/5"
                } ${animating && selectedKey !== opt.key ? "opacity-50" : ""}`}
              >
                <span className="flex items-center gap-2 md:gap-3">
                  {selectedKey === opt.key && (
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 shrink-0 check-pop" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {step > 0 && (
          <button
            onClick={() => {
              const prevStep = step - 1;
              const prevAnswers = answers.slice(0, -1);
              setStep(prevStep);
              setAnswers(prevAnswers);
              saveProgress(prevStep, prevAnswers);
            }}
            className="mt-3 md:mt-6 px-3 py-2 min-h-[44px] inline-flex items-center text-xs md:text-sm text-slate-500 hover:text-slate-700 active:text-slate-900 transition-colors rounded-lg"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
