"use client";

import { useState } from "react";
import Link from "next/link";

const questions = [
  {
    q: "What best describes your investing experience?",
    options: [
      { label: "Complete beginner", weight: "beginner" },
      { label: "Some experience", weight: "low_fee" },
      { label: "Experienced trader", weight: "advanced" },
    ],
  },
  {
    q: "What do you most want to invest in?",
    options: [
      { label: "ASX shares", weight: "beginner" },
      { label: "US shares (Tesla, Apple, etc.)", weight: "us_shares" },
      { label: "Crypto", weight: "crypto" },
      { label: "A bit of everything", weight: "low_fee" },
    ],
  },
  {
    q: "What matters most to you?",
    options: [
      { label: "Lowest fees possible", weight: "low_fee" },
      { label: "Easy to use platform", weight: "beginner" },
      { label: "Advanced tools & charting", weight: "advanced" },
      { label: "SMSF support", weight: "smsf" },
    ],
  },
  {
    q: "How often do you plan to trade?",
    options: [
      { label: "A few times a year", weight: "beginner" },
      { label: "Monthly", weight: "low_fee" },
      { label: "Weekly or more", weight: "advanced" },
    ],
  },
];

type WeightKey = "beginner" | "low_fee" | "us_shares" | "smsf" | "crypto" | "advanced";

const brokerScores: Record<string, Record<WeightKey, number>> = {
  "selfwealth": { beginner: 7, low_fee: 9, us_shares: 7, smsf: 8, crypto: 0, advanced: 5 },
  "stake": { beginner: 8, low_fee: 10, us_shares: 10, smsf: 3, crypto: 0, advanced: 4 },
  "commsec": { beginner: 9, low_fee: 3, us_shares: 5, smsf: 7, crypto: 0, advanced: 6 },
  "commsec-pocket": { beginner: 10, low_fee: 8, us_shares: 0, smsf: 0, crypto: 0, advanced: 2 },
  "cmc-markets": { beginner: 6, low_fee: 8, us_shares: 8, smsf: 5, crypto: 0, advanced: 8 },
  "interactive-brokers": { beginner: 3, low_fee: 7, us_shares: 9, smsf: 6, crypto: 0, advanced: 10 },
  "nabtrade": { beginner: 7, low_fee: 3, us_shares: 5, smsf: 8, crypto: 0, advanced: 5 },
  "pearler": { beginner: 9, low_fee: 8, us_shares: 5, smsf: 4, crypto: 0, advanced: 3 },
  "superhero": { beginner: 8, low_fee: 9, us_shares: 7, smsf: 6, crypto: 4, advanced: 4 },
  "tiger-brokers": { beginner: 5, low_fee: 7, us_shares: 9, smsf: 3, crypto: 0, advanced: 7 },
  "swyftx": { beginner: 8, low_fee: 7, us_shares: 0, smsf: 3, crypto: 10, advanced: 5 },
  "coinspot": { beginner: 9, low_fee: 5, us_shares: 0, smsf: 2, crypto: 9, advanced: 3 },
};

const brokerNames: Record<string, string> = {
  "selfwealth": "SelfWealth",
  "stake": "Stake",
  "commsec": "CommSec",
  "commsec-pocket": "CommSec Pocket",
  "cmc-markets": "CMC Markets",
  "interactive-brokers": "Interactive Brokers",
  "nabtrade": "nabtrade",
  "pearler": "Pearler",
  "superhero": "Superhero",
  "tiger-brokers": "Tiger Brokers",
  "swyftx": "Swyftx",
  "coinspot": "CoinSpot",
};

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const handleAnswer = (weight: string) => {
    const newAnswers = [...answers, weight];
    setAnswers(newAnswers);
    setStep(step + 1);
  };

  const getResults = () => {
    const weightCounts: Record<string, number> = {};
    answers.forEach(w => {
      weightCounts[w] = (weightCounts[w] || 0) + 1;
    });

    const scored = Object.entries(brokerScores).map(([slug, scores]) => {
      let total = 0;
      Object.entries(weightCounts).forEach(([key, count]) => {
        total += (scores[key as WeightKey] || 0) * count;
      });
      return { slug, total };
    });

    scored.sort((a, b) => b.total - a.total);
    return scored.slice(0, 3);
  };

  if (step >= questions.length) {
    const results = getResults();
    return (
      <div className="py-12">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">Your Best Match</h1>
            <p className="text-lg text-slate-600 mb-10">
              Based on your answers, here are our top picks for you.
            </p>

            <div className="space-y-4">
              {results.map((r, i) => (
                <Link
                  key={r.slug}
                  href={`/broker/${r.slug}`}
                  className={`block border rounded-lg p-6 text-left hover:shadow-lg transition-shadow ${
                    i === 0 ? 'border-amber bg-amber/5 ring-2 ring-amber' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      {i === 0 && (
                        <span className="text-xs font-bold text-amber uppercase tracking-wide">Best Match</span>
                      )}
                      <h2 className={`text-xl font-bold ${i === 0 ? 'text-2xl' : ''}`}>
                        {brokerNames[r.slug] || r.slug}
                      </h2>
                    </div>
                    <span className="text-amber font-semibold">View &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>

            <button
              onClick={() => { setStep(0); setAnswers([]); }}
              className="mt-8 text-sm text-slate-500 hover:text-brand"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const current = questions[step];

  return (
    <div className="py-12">
      <div className="container-custom">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-500 mb-2">
              <span>Question {step + 1} of {questions.length}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber rounded-full transition-all duration-300"
                style={{ width: `${((step + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-8">{current.q}</h1>

          <div className="space-y-3">
            {current.options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleAnswer(opt.weight)}
                className="w-full text-left border border-slate-200 rounded-lg px-6 py-4 hover:border-amber hover:bg-amber/5 transition-colors font-medium"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
