"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/tracking";

interface QuizResultEntry {
  slug: string;
  name: string;
  score: number;
  logo_url: string | null;
  color: string;
  tagline: string | null;
  rating: number | null;
}

interface StoredQuizResults {
  answers: string[];
  results: QuizResultEntry[];
  completedAt: string;
}

/** Map quiz answer keys to human-readable "why recommended" reasons */
const ANSWER_REASONS: Record<string, string> = {
  grow: "long-term growth focus",
  crypto: "crypto trading",
  trade: "active trading",
  automate: "hands-off investing",
  super: "retirement planning",
  property: "property exposure",
  beginner: "beginner-friendly",
  intermediate: "balanced features",
  pro: "advanced tools",
  small: "low minimums",
  medium: "competitive fees",
  large: "premium features",
  whale: "high-value accounts",
  fees: "lowest fees",
  safety: "strong safety (CHESS)",
  tools: "research & tools",
  simple: "simplicity",
  handsfree: "automated investing",
};

function getRecommendationReason(answers: string[]): string {
  const reasons = answers
    .map((a) => ANSWER_REASONS[a])
    .filter(Boolean)
    .slice(0, 2);
  return reasons.length > 0 ? `Matched for ${reasons.join(" & ")}` : "Top match from your quiz";
}

export default function PersonalizedRecommendations() {
  const [data, setData] = useState<StoredQuizResults | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("invest-quiz-results");
      if (!raw) return;
      const parsed: StoredQuizResults = JSON.parse(raw);
      // Validate shape
      if (!parsed.results || !Array.isArray(parsed.results) || parsed.results.length === 0) return;
      // Check if results are less than 30 days old
      const age = Date.now() - new Date(parsed.completedAt).getTime();
      if (age > 30 * 24 * 60 * 60 * 1000) return;
      setData(parsed);
    } catch {
      // Corrupt data — ignore
    }
  }, []);

  if (!data || dismissed) return null;

  const top3 = data.results.slice(0, 3);
  const reason = getRecommendationReason(data.answers);

  return (
    <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200 rounded-xl p-4 md:p-5 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ contain: "layout style" }}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Your Recommended Platforms</h3>
            <p className="text-[0.62rem] text-slate-500">{reason}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            trackEvent("personalized_recs_dismissed");
          }}
          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          aria-label="Dismiss recommendations"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
        {top3.map((result, i) => (
          <Link
            key={result.slug}
            href={`/broker/${result.slug}`}
            onClick={() => trackEvent("personalized_rec_clicked", { broker: result.slug, position: i + 1 })}
            className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 group-hover:scale-105 transition-transform"
              style={{ backgroundColor: result.color || "#64748b" }}
            >
              {result.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {i === 0 && (
                  <span className="text-[0.56rem] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    #1 Match
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-800 truncate">{result.name}</p>
              {result.rating && (
                <p className="text-[0.62rem] text-slate-400">{result.rating}/5 rating</p>
              )}
            </div>
            <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 mt-3">
        <Link
          href="/quiz"
          className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
          onClick={() => trackEvent("personalized_recs_retake_quiz")}
        >
          Retake Quiz &rarr;
        </Link>
      </div>
    </div>
  );
}
