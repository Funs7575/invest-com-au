"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Broker } from "@/lib/types";
import { trackClick, trackEvent, getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE_SHORT, CRYPTO_WARNING } from "@/lib/compliance";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import RiskWarningInline from "@/components/RiskWarningInline";

type WeightKey = "beginner" | "low_fee" | "us_shares" | "smsf" | "crypto" | "advanced";

interface QuizWeight {
  broker_slug: string;
  beginner_weight: number;
  low_fee_weight: number;
  us_shares_weight: number;
  smsf_weight: number;
  crypto_weight: number;
  advanced_weight: number;
}

// Fallback questions if DB fetch fails
const fallbackQuestions = [
  { question_text: "What is your main investing goal?", options: [{ label: "Buy Crypto", key: "crypto" }, { label: "Active Trading", key: "trade" }, { label: "Dividend Income", key: "income" }, { label: "Long-Term Growth", key: "grow" }] },
  { question_text: "How experienced are you with investing?", options: [{ label: "Complete Beginner", key: "beginner" }, { label: "Some Experience", key: "intermediate" }, { label: "Advanced / Professional", key: "pro" }] },
  { question_text: "How much are you looking to invest?", options: [{ label: "Under $5,000", key: "small" }, { label: "$5,000 - $50,000", key: "medium" }, { label: "$50,000 - $100,000", key: "large" }, { label: "$100,000+", key: "whale" }] },
  { question_text: "What matters most to you?", options: [{ label: "Lowest Fees", key: "fees" }, { label: "Safety (CHESS)", key: "safety" }, { label: "Best Tools & Research", key: "tools" }, { label: "Simplicity", key: "simple" }] },
];

// Fallback scoring weights
const fallbackScores: Record<string, Record<WeightKey, number>> = {
  "selfwealth": { beginner: 7, low_fee: 9, us_shares: 7, smsf: 8, crypto: 0, advanced: 5 },
  "stake": { beginner: 8, low_fee: 10, us_shares: 10, smsf: 3, crypto: 0, advanced: 4 },
  "commsec": { beginner: 9, low_fee: 3, us_shares: 5, smsf: 7, crypto: 0, advanced: 6 },
  "cmc-markets": { beginner: 6, low_fee: 8, us_shares: 8, smsf: 5, crypto: 0, advanced: 8 },
  "interactive-brokers": { beginner: 3, low_fee: 7, us_shares: 9, smsf: 6, crypto: 0, advanced: 10 },
  "moomoo": { beginner: 7, low_fee: 9, us_shares: 9, smsf: 4, crypto: 0, advanced: 7 },
  "superhero": { beginner: 8, low_fee: 9, us_shares: 7, smsf: 6, crypto: 4, advanced: 4 },
  "tiger-brokers": { beginner: 5, low_fee: 7, us_shares: 9, smsf: 3, crypto: 0, advanced: 7 },
  "swyftx": { beginner: 8, low_fee: 7, us_shares: 0, smsf: 3, crypto: 10, advanced: 5 },
  "coinspot": { beginner: 9, low_fee: 5, us_shares: 0, smsf: 2, crypto: 9, advanced: 3 },
};

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [questions, setQuestions] = useState(fallbackQuestions);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [weights, setWeights] = useState<Record<string, Record<string, number>>>(fallbackScores);
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
  const mountedRef = useRef(true);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);

  // Cleanup ref for unmount protection (P0 #4)
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
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
        const w: Record<string, Record<string, number>> = {};
        weightsRes.data.forEach((row: QuizWeight) => {
          w[row.broker_slug] = {
            beginner: row.beginner_weight || 0,
            low_fee: row.low_fee_weight || 0,
            us_shares: row.us_shares_weight || 0,
            smsf: row.smsf_weight || 0,
            crypto: row.crypto_weight || 0,
            advanced: row.advanced_weight || 0,
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

  useEffect(() => {
    if (step >= questions.length && step > 0 && brokers.length > 0) {
      trackEvent('quiz_complete', {
        answers,
        top_broker: results[0]?.slug || null,
        results_count: results.length,
      }, '/quiz');
    }
  }, [step, questions.length, brokers.length, results, answers]);

  const handleAnswer = (key: string) => {
    if (animating) return;
    if (step === 0) {
      trackEvent('quiz_start', { first_answer: key }, '/quiz');
    }
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
        // Show "Analyzing" transition, then email gate
        setRevealing(true);
        setAnimating(false);
        setTimeout(() => {
          if (!mountedRef.current) return;
          setRevealing(false);
          setEmailGate(true);
        }, 1800);
      } else {
        setStep(step + 1);
        setAnimating(false);
        // P1 #8: Focus management — move focus to next question heading
        requestAnimationFrame(() => {
          questionHeadingRef.current?.focus();
        });
      }
    }, 350);
  };

  const handleShareResult = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = window.location.href;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate personalized match reasons based on user answers and broker strengths
  const getMatchReasons = (userAnswers: string[], broker: Broker): string[] => {
    const reasons: string[] = [];

    if (userAnswers.includes('fees') || userAnswers.includes('income'))
      reasons.push(`Low brokerage fees (${broker.asx_fee || 'competitive rates'})`);
    if (userAnswers.includes('safety') && broker.chess_sponsored)
      reasons.push('CHESS sponsorship — your shares are held in your name');
    if (userAnswers.includes('beginner') || userAnswers.includes('simple'))
      reasons.push('Simple, beginner-friendly platform and interface');
    if (userAnswers.includes('crypto') && broker.is_crypto)
      reasons.push('Regulated Australian crypto exchange');
    if (userAnswers.includes('large') || userAnswers.includes('whale'))
      reasons.push('Competitive international fees for larger portfolios');
    if (userAnswers.includes('tools') || userAnswers.includes('pro'))
      reasons.push('Advanced charting and research tools');
    if (broker.smsf_support && (userAnswers.includes('income') || userAnswers.includes('grow')))
      reasons.push('Supports SMSF accounts for tax-effective investing');
    if (broker.rating && broker.rating >= 4.5)
      reasons.push(`Highly rated (${broker.rating}/5) by our editorial team`);

    if (!reasons.length) reasons.push('Strong overall score across your selected criteria');
    return reasons.slice(0, 4);
  };

  const [showScoring, setShowScoring] = useState(false);

  // P1 #5: Memoize results to avoid recalculating on every render
  const results = useMemo(() => {
    const scored = Object.entries(weights).map(([slug, scores]) => {
      let total = 0;

      answers.forEach(key => {
        const keyMap: Record<string, WeightKey> = {
          crypto: 'crypto', trade: 'advanced', income: 'low_fee', grow: 'beginner',
          beginner: 'beginner', intermediate: 'low_fee', pro: 'advanced',
          small: 'beginner', medium: 'low_fee', large: 'us_shares', whale: 'advanced',
          fees: 'low_fee', safety: 'beginner', tools: 'advanced', simple: 'beginner',
        };
        const weightKey = keyMap[key] || 'beginner';
        total += (scores[weightKey] || 0);
      });

      const broker = brokers.find(b => b.slug === slug);
      if (broker?.rating) total *= (1 + (broker.rating - 4) * 0.1);

      return { slug, total, broker: broker || null };
    });

    // P2 #14: Tiebreaker — sort by score, then rating, then name
    scored.sort((a, b) =>
      b.total - a.total
      || (b.broker?.rating ?? 0) - (a.broker?.rating ?? 0)
      || (a.broker?.name ?? '').localeCompare(b.broker?.name ?? '')
    );
    return scored.slice(0, 3);
  }, [answers, weights, brokers]);

  // Check if any result is a crypto broker (for crypto warning)
  const hasCryptoResult = useMemo(
    () => results.some(r => r.broker?.is_crypto),
    [results]
  );

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

  // Email gate screen — shown after analyzing, before results
  if (emailGate) {
    return (
      <div className="py-12">
        <div className="container-custom max-w-md mx-auto">
          <div className="text-center mb-6 result-card-in">
            <div className="text-5xl mb-4">📧</div>
            <h1 className="text-2xl font-extrabold mb-2">Get Your Personalised Results</h1>
            <p className="text-slate-600 text-sm">
              We&apos;ll email your broker shortlist so you can compare later — plus our free fee comparison PDF.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm result-card-in result-card-in-delay-1">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Email *</label>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={gateEmail}
                  onChange={(e) => setGateEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">First name <span className="text-slate-400">(optional)</span></label>
                <input
                  type="text"
                  placeholder="Jane"
                  value={gateName}
                  onChange={(e) => setGateName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700"
                />
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gateConsent}
                  onChange={(e) => setGateConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-green-700 shrink-0"
                />
                <span className="text-[0.65rem] text-slate-500 leading-tight">
                  I agree to receive my results and occasional broker updates.{" "}
                  <Link href="/privacy" className="underline hover:text-green-700">Privacy Policy</Link>
                </span>
              </label>
              <button
                onClick={handleGateSubmit}
                disabled={gateStatus === "loading" || !gateEmail.includes("@") || !gateConsent}
                className="w-full px-4 py-3 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
              >
                {gateStatus === "loading" ? "Sending..." : "Send My Results →"}
              </button>
              {gateStatus === "error" && (
                <p className="text-xs text-red-500 text-center">Something went wrong. Please try again.</p>
              )}
            </div>

            <div className="flex items-center gap-3 mt-3 justify-center text-[0.65rem] text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Free PDF
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                No spam
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Unsubscribe anytime
              </span>
            </div>
          </div>

          <div className="text-center mt-4">
            <button
              onClick={handleGateSkip}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Skip — show my results now →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Results screen
  if (step >= questions.length) {
    const topMatch = results[0];
    const runnerUps = results.slice(1);
    const allResults = results.filter(r => r.broker);

    return (
      <div className="py-12">
        <div className="container-custom max-w-2xl mx-auto">
          <div className="text-center mb-8 result-card-in">
            {/* Confetti burst + emoji */}
            <div className="relative h-20 mb-2" aria-hidden="true">
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
                <span className="text-6xl celebrate-emoji">🎉</span>
              </div>
            </div>
            <h1 className="text-3xl font-extrabold mb-2">Your Shortlist</h1>
            <p className="text-slate-600">Based on your answers, these brokers scored highest on your selected criteria.</p>
            <div className="flex items-center justify-center gap-3 mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                ASIC-regulated
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                Based on your answers
              </span>
            </div>
          </div>

          {/* General Advice Warning */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
            <p className="text-[0.7rem] text-slate-500 leading-relaxed">
              <strong>General Advice Warning:</strong> {GENERAL_ADVICE_WARNING} {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>

          {/* Top Match */}
          {topMatch?.broker && (
            <div
              className="border-2 rounded-xl p-8 mb-6 relative overflow-hidden result-card-in result-card-in-delay-1 shine-effect"
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
                className="text-[0.6rem] uppercase font-extrabold tracking-wider mb-4 inline-block px-3 py-1.5 rounded-full badge-pulse"
                style={{
                  color: topMatch.broker.color || '#b45309',
                  background: `${topMatch.broker.color || '#f59e0b'}20`,
                  '--badge-glow': `${topMatch.broker.color || '#f59e0b'}40`,
                } as React.CSSProperties}
              >
                🏆 #1 on Your Shortlist
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0"
                  style={{ background: `${topMatch.broker.color}20`, color: topMatch.broker.color }}
                >
                  {topMatch.broker.icon || topMatch.broker.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-extrabold">{topMatch.broker.name}</h2>
                  <div className="text-sm text-amber">{renderStars(topMatch.broker.rating || 0)} <span className="text-slate-500">{topMatch.broker.rating}/5</span></div>
                </div>
              </div>
              <p className="text-slate-600 mb-4">{topMatch.broker.tagline}</p>

              {/* Why this broker? */}
              <div className="bg-white/60 rounded-lg p-3 mb-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Why {topMatch.broker.name}?
                </p>
                <ul className="space-y-1">
                  {getMatchReasons(answers, topMatch.broker).map((reason, i) => (
                    <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                      <span className="text-green-600 shrink-0">✓</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-5">
                <span className="bg-white/60 px-2 py-1 rounded">ASX: {topMatch.broker.asx_fee}</span>
                <span className="bg-white/60 px-2 py-1 rounded">CHESS: {topMatch.broker.chess_sponsored ? 'Yes' : 'No'}</span>
                <span className="bg-white/60 px-2 py-1 rounded">SMSF: {topMatch.broker.smsf_support ? 'Yes' : 'No'}</span>
              </div>
              <a
                href={getAffiliateLink(topMatch.broker)}
                target="_blank"
                rel={AFFILIATE_REL}
                onClick={() => trackClick(topMatch.broker!.slug, topMatch.broker!.name, 'quiz-result-1', '/quiz', 'quiz')}
                className="block w-full text-center px-6 py-3.5 text-white font-bold rounded-lg transition-all text-lg shadow-lg hover:shadow-xl hover:scale-[1.02]"
                style={{
                  background: topMatch.broker.color || '#f59e0b',
                }}
              >
                {getBenefitCta(topMatch.broker, 'quiz')}
              </a>
              <RiskWarningInline />
              {topMatch.broker.deal && topMatch.broker.deal_text && (
                <div className="mt-3 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-700">
                    🔥 {topMatch.broker.deal_text}
                    {topMatch.broker.deal_expiry && (
                      <span className="text-[0.65rem] text-amber-500 font-normal ml-1">
                        (expires {new Date(topMatch.broker.deal_expiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick Comparison Table */}
          {allResults.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6 result-card-in result-card-in-delay-2">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-700">Quick Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th scope="col" className="px-4 py-2 text-left text-xs text-slate-500 font-medium">Broker</th>
                      <th scope="col" className="px-3 py-2 text-center text-xs text-slate-500 font-medium">ASX Fee</th>
                      <th scope="col" className="px-3 py-2 text-center text-xs text-slate-500 font-medium">FX Rate</th>
                      <th scope="col" className="px-3 py-2 text-center text-xs text-slate-500 font-medium">CHESS</th>
                      <th scope="col" className="px-3 py-2 text-center text-xs text-slate-500 font-medium">Rating</th>
                      <th scope="col" className="px-3 py-2 text-center text-xs text-slate-500 font-medium"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allResults.map((r, i) => r.broker && (
                      <tr key={r.slug} className={`border-b border-slate-50 ${i === 0 ? 'bg-green-50/30' : ''}`}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center text-[0.55rem] font-bold shrink-0"
                              style={{ background: `${r.broker.color}20`, color: r.broker.color }}
                            >
                              {r.broker.icon || r.broker.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-xs">{r.broker.name}</span>
                            {i === 0 && <span className="text-[0.5rem] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">TOP</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs">{r.broker.asx_fee || 'N/A'}</td>
                        <td className="px-3 py-2.5 text-center text-xs">{r.broker.fx_rate != null ? `${r.broker.fx_rate}%` : 'N/A'}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={r.broker.chess_sponsored ? 'text-green-600' : 'text-red-400'}>
                            {r.broker.chess_sponsored ? '✓' : '✗'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs font-semibold">{r.broker.rating}/5</td>
                        <td className="px-3 py-2.5 text-center">
                          <a
                            href={getAffiliateLink(r.broker)}
                            target="_blank"
                            rel={AFFILIATE_REL}
                            onClick={() => trackClick(r.broker!.slug, r.broker!.name, `quiz-compare-${i + 1}`, '/quiz', 'quiz')}
                            className="inline-block px-3 py-1.5 bg-green-700 text-white text-xs font-semibold rounded-md hover:bg-green-800 transition-colors"
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
          )}

          {/* Scoring Transparency */}
          <div className="mb-6 result-card-in result-card-in-delay-3">
            <button
              onClick={() => setShowScoring(!showScoring)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <span className="flex items-center gap-2 font-medium">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                How we scored your results
              </span>
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${showScoring ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showScoring && (
              <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600 space-y-3">
                <p>Each broker has pre-set scores across six categories (beginner-friendliness, low fees, US shares, SMSF, crypto, advanced features). Your quiz answers determine which categories matter most:</p>
                <div className="flex flex-wrap gap-1.5">
                  {answers.map((key, i) => {
                    const keyMap: Record<string, string> = {
                      crypto: 'Crypto', trade: 'Advanced', income: 'Low Fees', grow: 'Beginner',
                      beginner: 'Beginner', intermediate: 'Low Fees', pro: 'Advanced',
                      small: 'Beginner', medium: 'Low Fees', large: 'US Shares', whale: 'Advanced',
                      fees: 'Low Fees', safety: 'Beginner', tools: 'Advanced', simple: 'Beginner',
                    };
                    return (
                      <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-full text-[0.65rem] font-medium">
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
                          {i === 0 && '🏆 '}{r.broker?.name}
                        </span>
                        <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: i === 0 ? (r.broker?.color || '#16a34a') : '#94a3b8',
                            }}
                          />
                        </div>
                        <span className="text-[0.65rem] text-slate-500 w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[0.6rem] text-slate-400">Scores are weighted by your answers and adjusted slightly by our editorial rating. No broker pays for a higher quiz score.</p>
              </div>
            )}
          </div>

          {/* Runner Ups */}
          {runnerUps.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3 result-card-in result-card-in-delay-3">Also Worth Considering</h3>
              <div className="space-y-3 mb-8">
                {runnerUps.map((r, i) => r.broker && (
                  <div
                    key={r.slug}
                    className={`border border-slate-200 rounded-xl p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg result-card-in result-card-in-delay-${i + 4}`}
                    style={{ borderLeftWidth: '4px', borderLeftColor: r.broker.color || '#e2e8f0' }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Rank badge */}
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center shrink-0">
                        #{i + 2}
                      </div>
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: `${r.broker.color}20`, color: r.broker.color }}
                      >
                        {r.broker.icon || r.broker.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm">{r.broker.name}</h3>
                        <div className="text-xs text-slate-500">{r.broker.asx_fee} · {r.broker.chess_sponsored ? 'CHESS' : 'Custodial'} · {r.broker.rating}/5</div>
                      </div>
                      <a
                        href={getAffiliateLink(r.broker)}
                        target="_blank"
                        rel={AFFILIATE_REL}
                        onClick={() => trackClick(r.broker!.slug, r.broker!.name, `quiz-result-${i + 2}`, '/quiz', 'quiz')}
                        className="hidden sm:inline-flex shrink-0 px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
                      >
                        {getBenefitCta(r.broker, 'quiz')}
                      </a>
                    </div>
                    <a
                      href={getAffiliateLink(r.broker)}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      onClick={() => trackClick(r.broker!.slug, r.broker!.name, `quiz-result-${i + 2}`, '/quiz', 'quiz')}
                      className="sm:hidden block w-full text-center mt-3 px-4 py-2.5 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 transition-colors"
                    >
                      {getBenefitCta(r.broker, 'quiz')}
                    </a>
                    <RiskWarningInline />
                    {/* Match reasons for runner-ups too */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {getMatchReasons(answers, r.broker).slice(0, 2).map((reason, ri) => (
                        <span key={ri} className="text-[0.6rem] px-2 py-0.5 bg-slate-50 text-slate-500 rounded-full">
                          ✓ {reason}
                        </span>
                      ))}
                    </div>
                    {r.broker.deal && r.broker.deal_text && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[0.6rem] font-semibold text-amber-700">
                          🔥 {r.broker.deal_text}
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
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-[0.7rem] text-amber-700 leading-relaxed">
                <strong>Crypto Warning:</strong> {CRYPTO_WARNING}
              </p>
            </div>
          )}

          <div className="my-6">
            <CompactDisclaimerLine />
          </div>

          {/* Bottom CTA card */}
          <div className="bg-amber-400 text-slate-900 rounded-xl p-6 mt-2 mb-8 text-center result-card-in result-card-in-delay-5">
            <h3 className="text-lg font-bold mb-1">Still not sure?</h3>
            <p className="text-sm text-slate-700 mb-4">Compare all brokers side-by-side or read our detailed reviews.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/compare"
                onClick={() => trackEvent('quiz_internal_cta', { target: 'compare' }, '/quiz')}
                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Compare All Brokers →
              </a>
              {topMatch?.broker && (
                <a
                  href={`/broker/${topMatch.broker.slug}`}
                  onClick={() => trackEvent('quiz_internal_cta', { target: 'review', broker: topMatch.broker!.slug }, '/quiz')}
                  className="px-5 py-2.5 border border-slate-700 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-300 transition-colors"
                >
                  Read {topMatch.broker.name} Review →
                </a>
              )}
            </div>
          </div>

          {/* Share & Restart */}
          <div className="flex items-center justify-center gap-4 mt-2">
            <button
              onClick={handleShareResult}
              className="text-sm text-slate-500 hover:text-brand transition-colors flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg hover:border-slate-300"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-green-600 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Share your result
                </>
              )}
            </button>
            <button
              onClick={() => { setStep(0); setAnswers([]); }}
              className="text-sm text-slate-500 hover:text-brand transition-colors"
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
      <div className="py-12">
        <div className="container-custom max-w-2xl mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[40vh] reveal-screen-in">
            {/* Animated analyzing spinner */}
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-700 analyzing-ring-spin" />
            </div>

            <h2 className="text-xl font-bold mb-2 reveal-text-in">
              Analyzing your answers...
            </h2>
            <p className="text-slate-500 text-sm reveal-text-in-delay">
              Matching you with the best brokers
            </p>

            {/* Animated progress dots */}
            <div className="flex gap-2 mt-6">
              <span className="w-2 h-2 rounded-full bg-green-700 analyzing-dot-1" />
              <span className="w-2 h-2 rounded-full bg-green-700 analyzing-dot-2" />
              <span className="w-2 h-2 rounded-full bg-green-700 analyzing-dot-3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Question screen
  const current = questions[step];

  return (
    <div className="py-12">
      <div className="container-custom max-w-2xl mx-auto">
        {/* Data fetch error notice */}
        {fetchError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-700">
            {fetchError}
          </div>
        )}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${
                i < step ? 'bg-green-700' : i === step ? 'bg-green-700 ring-2 ring-green-700/30 ring-offset-2' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Question {step + 1} of {questions.length}</span>
            <span>{Math.round(((step + 1) / questions.length) * 100)}%</span>
          </div>
          <div
            className="h-1.5 bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={questions.length}
            aria-label={`Question ${step + 1} of ${questions.length}`}
          >
            <div className="h-full bg-green-700 rounded-full transition-all duration-500" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
          </div>
        </div>

        <div key={step} className="quiz-question-enter" aria-live="polite">
          <h1
            ref={questionHeadingRef}
            tabIndex={-1}
            className="text-2xl md:text-3xl font-extrabold mb-8 mt-6 outline-none"
          >
            {current.question_text}
          </h1>

          <div className="space-y-3" role="radiogroup" aria-label={current.question_text}>
            {current.options.map((opt: { label: string; key: string }) => (
              <button
                key={opt.label}
                onClick={() => handleAnswer(opt.key)}
                disabled={animating}
                role="radio"
                aria-checked={selectedKey === opt.key}
                aria-label={opt.label}
                className={`w-full text-left border rounded-xl px-6 py-4 transition-all font-medium text-sm md:text-base ${
                  selectedKey === opt.key
                    ? "border-green-700 bg-green-700/5 scale-[0.98]"
                    : "border-slate-200 hover:border-green-700 hover:bg-green-700/5"
                } ${animating && selectedKey !== opt.key ? "opacity-50" : ""}`}
              >
                <span className="flex items-center gap-3">
                  {selectedKey === opt.key && (
                    <svg className="w-5 h-5 text-green-600 shrink-0 check-pop" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            onClick={() => { setStep(step - 1); setAnswers(answers.slice(0, -1)); }}
            className="mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
