"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, renderStars } from "@/lib/tracking";

type WeightKey = "beginner" | "low_fee" | "us_shares" | "smsf" | "crypto" | "advanced";

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

  useEffect(() => {
    const supabase = createClient();

    // Fetch brokers
    supabase.from('brokers').select('*').eq('status', 'active').order('rating', { ascending: false })
      .then(({ data }) => { if (data) setBrokers(data); });

    // Fetch quiz questions from DB
    supabase.from('quiz_questions').select('*').eq('active', true).order('order_index')
      .then(({ data }) => { if (data && data.length > 0) setQuestions(data); });

    // Fetch quiz weights from DB
    supabase.from('quiz_weights').select('*')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const w: Record<string, Record<string, number>> = {};
          data.forEach((row: any) => {
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
      });
  }, []);

  const handleAnswer = (key: string) => {
    setAnswers([...answers, key]);
    setStep(step + 1);
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
      reasons.push('Beginner-friendly platform with a simple interface');
    if (userAnswers.includes('crypto') && broker.is_crypto)
      reasons.push('Regulated Australian crypto exchange');
    if (userAnswers.includes('large') || userAnswers.includes('whale'))
      reasons.push('Suited for larger portfolios with competitive international fees');
    if (userAnswers.includes('tools') || userAnswers.includes('pro'))
      reasons.push('Advanced charting and research tools');
    if (broker.smsf_support && (userAnswers.includes('income') || userAnswers.includes('grow')))
      reasons.push('Supports SMSF accounts for tax-effective investing');
    if (broker.rating && broker.rating >= 4.5)
      reasons.push(`Highly rated (${broker.rating}/5) by our editorial team`);

    if (!reasons.length) reasons.push('Strong overall score across your priorities');
    return reasons.slice(0, 4);
  };

  const getResults = (): { broker: Broker | null; slug: string; total: number }[] => {
    // Score all brokers based on answers
    const scored = Object.entries(weights).map(([slug, scores]) => {
      let total = 0;

      answers.forEach(key => {
        // Map answer keys to weight categories
        const keyMap: Record<string, WeightKey> = {
          crypto: 'crypto', trade: 'advanced', income: 'low_fee', grow: 'beginner',
          beginner: 'beginner', intermediate: 'low_fee', pro: 'advanced',
          small: 'beginner', medium: 'low_fee', large: 'us_shares', whale: 'advanced',
          fees: 'low_fee', safety: 'beginner', tools: 'advanced', simple: 'beginner',
        };
        const weightKey = keyMap[key] || 'beginner';
        total += (scores[weightKey] || 0);
      });

      // Rating multiplier
      const broker = brokers.find(b => b.slug === slug);
      if (broker?.rating) total *= (1 + (broker.rating - 4) * 0.1);

      return { slug, total, broker: broker || null };
    });

    scored.sort((a, b) => b.total - a.total);
    return scored.slice(0, 3);
  };

  // Results screen
  if (step >= questions.length) {
    const results = getResults();
    const topMatch = results[0];
    const runnerUps = results.slice(1);

    return (
      <div className="py-12">
        <div className="container-custom max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-3xl font-extrabold mb-2">Your Top Matches</h1>
            <p className="text-slate-600">Based on your answers, here are brokers worth considering.</p>
          </div>

          {/* General Advice Warning */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
            <p className="text-[0.65rem] text-slate-500 leading-relaxed">
              <strong>General Advice Warning:</strong> This result is general in nature and does not take into account your personal financial situation. It is not financial advice. We may earn a commission if you open an account via these links, at no extra cost to you. Consider whether any product is appropriate to your circumstances before making a decision.
            </p>
          </div>

          {/* Top Match */}
          {topMatch?.broker && (
            <div
              className="border-2 rounded-xl p-8 mb-6 relative overflow-hidden"
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
              <div
                className="text-[0.6rem] uppercase font-extrabold tracking-wider mb-4 inline-block px-3 py-1 rounded-full"
                style={{
                  color: topMatch.broker.color || '#b45309',
                  background: `${topMatch.broker.color || '#f59e0b'}20`,
                }}
              >
                🏆 #1 Top Match
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
                rel="noopener noreferrer nofollow"
                onClick={() => trackClick(topMatch.broker!.slug, topMatch.broker!.name, 'quiz-result-1', '/quiz', 'quiz')}
                className="block w-full text-center px-6 py-3.5 text-white font-semibold rounded-lg transition-colors text-lg"
                style={{
                  background: topMatch.broker.color || '#f59e0b',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                {getBenefitCta(topMatch.broker, 'quiz')}
              </a>
            </div>
          )}

          {/* Runner Ups */}
          {runnerUps.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">Runner Up{runnerUps.length > 1 ? 's' : ''}</h3>
              <div className="space-y-3 mb-8">
                {runnerUps.map((r, i) => r.broker && (
                  <div
                    key={r.slug}
                    className="border border-slate-200 rounded-xl p-4 flex items-center gap-4"
                    style={{ borderLeftWidth: '4px', borderLeftColor: r.broker.color || '#e2e8f0' }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: `${r.broker.color}20`, color: r.broker.color }}
                    >
                      {r.broker.icon || r.broker.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm">{r.broker.name}</h3>
                      <div className="text-xs text-slate-500">{r.broker.asx_fee} · {r.broker.chess_sponsored ? 'CHESS' : 'Custodial'}</div>
                    </div>
                    <a
                      href={getAffiliateLink(r.broker)}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      onClick={() => trackClick(r.broker!.slug, r.broker!.name, `quiz-result-${i + 2}`, '/quiz', 'quiz')}
                      className="shrink-0 px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
                    >
                      {getBenefitCta(r.broker, 'quiz')}
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Share & Restart */}
          <div className="flex items-center justify-center gap-4">
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

  // Question screen
  const current = questions[step];

  return (
    <div className="py-12">
      <div className="container-custom max-w-2xl mx-auto">
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
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-700 rounded-full transition-all duration-500" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold mb-8 mt-6">{current.question_text}</h1>

        <div className="space-y-3">
          {current.options.map((opt: { label: string; key: string }) => (
            <button
              key={opt.label}
              onClick={() => handleAnswer(opt.key)}
              className="w-full text-left border border-slate-200 rounded-xl px-6 py-4 hover:border-green-700 hover:bg-green-700/5 transition-all font-medium text-sm md:text-base"
            >
              {opt.label}
            </button>
          ))}
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
