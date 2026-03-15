"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { trackEvent } from "@/lib/tracking";
import { getStoredUtm } from "@/components/UtmCapture";

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

interface QuizOption {
  label: string;
  points: number;
}

interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
}

interface CategoryBreakdown {
  label: string;
  questions: string[];
  maxPoints: number;
  score: number;
  advisorType: string;
  needKey: string;
}

/* ──────────────────────────────────────────────
   Questions
   ────────────────────────────────────────────── */

const QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    text: "Do you have an emergency fund?",
    options: [
      { label: "3+ months", points: 10 },
      { label: "1-3 months", points: 7 },
      { label: "Less than 1 month", points: 3 },
      { label: "No", points: 0 },
    ],
  },
  {
    id: "q2",
    text: "How much of your income do you save?",
    options: [
      { label: "20%+", points: 10 },
      { label: "10-20%", points: 7 },
      { label: "5-10%", points: 4 },
      { label: "Less than 5%", points: 1 },
    ],
  },
  {
    id: "q3",
    text: "Do you have personal debt (excluding mortgage)?",
    options: [
      { label: "No debt", points: 10 },
      { label: "Paying it down", points: 6 },
      { label: "Minimum payments", points: 2 },
      { label: "Growing debt", points: 0 },
    ],
  },
  {
    id: "q4",
    text: "Is your super on track?",
    options: [
      { label: "Ahead of target", points: 10 },
      { label: "On track", points: 7 },
      { label: "Behind", points: 3 },
      { label: "Not sure", points: 2 },
    ],
  },
  {
    id: "q5",
    text: "Do you have income protection or life insurance?",
    options: [
      { label: "Both", points: 10 },
      { label: "One of them", points: 6 },
      { label: "None", points: 0 },
    ],
  },
  {
    id: "q6",
    text: "Do you have a will and estate plan?",
    options: [
      { label: "Yes, updated", points: 10 },
      { label: "Yes, outdated", points: 5 },
      { label: "No", points: 0 },
    ],
  },
  {
    id: "q7",
    text: "How do you invest outside super?",
    options: [
      { label: "Diversified portfolio", points: 10 },
      { label: "Some investments", points: 6 },
      { label: "Just savings", points: 3 },
      { label: "Nothing", points: 0 },
    ],
  },
  {
    id: "q8",
    text: "Do you know your tax deductions?",
    options: [
      { label: "Maximise every year", points: 10 },
      { label: "Claim some", points: 5 },
      { label: "Not really", points: 1 },
    ],
  },
  {
    id: "q9",
    text: "Do you review your finances regularly?",
    options: [
      { label: "Monthly", points: 10 },
      { label: "Quarterly", points: 7 },
      { label: "Yearly", points: 4 },
      { label: "Never", points: 0 },
    ],
  },
  {
    id: "q10",
    text: "Do you have specific financial goals?",
    options: [
      { label: "Written plan", points: 10 },
      { label: "Mental goals", points: 6 },
      { label: "Vague ideas", points: 2 },
      { label: "No", points: 0 },
    ],
  },
];

/* ──────────────────────────────────────────────
   Category definitions
   ────────────────────────────────────────────── */

const CATEGORIES: Omit<CategoryBreakdown, "score">[] = [
  { label: "Savings & Emergency", questions: ["q1", "q2"], maxPoints: 20, advisorType: "Financial Planner", needKey: "planning" },
  { label: "Debt", questions: ["q3"], maxPoints: 10, advisorType: "Debt Counsellor", needKey: "debt" },
  { label: "Super & Retirement", questions: ["q4"], maxPoints: 10, advisorType: "Financial Planner", needKey: "planning" },
  { label: "Protection", questions: ["q5", "q6"], maxPoints: 20, advisorType: "Insurance Broker", needKey: "insurance" },
  { label: "Investing", questions: ["q7", "q8"], maxPoints: 20, advisorType: "Financial Planner", needKey: "planning" },
  { label: "Planning", questions: ["q9", "q10"], maxPoints: 20, advisorType: "Financial Planner", needKey: "planning" },
];

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function storeQualificationData(
  key: string,
  data: Record<string, unknown>
) {
  try {
    sessionStorage.setItem(
      `invest_qual_${key}`,
      JSON.stringify({ ...data, timestamp: new Date().toISOString() })
    );
  } catch {
    /* quota exceeded */
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Attention";
}

function getScoreRingColor(score: number): string {
  if (score >= 80) return "stroke-emerald-500";
  if (score >= 60) return "stroke-blue-500";
  if (score >= 40) return "stroke-amber-500";
  return "stroke-red-500";
}

/* ──────────────────────────────────────────────
   AdvisorMatchCTA
   ────────────────────────────────────────────── */

function AdvisorMatchCTA({ needKey, label }: { needKey: string; label: string }) {
  return (
    <Link
      href={`/find-advisor?need=${needKey}`}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group"
      onClick={() => trackEvent("score_advisor_cta_click", { needKey }, "/score")}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
        <Icon name="users" size={20} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">
          Speak to a {label}
        </p>
        <p className="text-xs text-slate-500">
          Get matched with a verified professional
        </p>
      </div>
      <Icon name="chevron-right" size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
    </Link>
  );
}

/* ──────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────── */

export default function ScoreClient() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [email, setEmail] = useState("");
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [fadeState, setFadeState] = useState<"in" | "out">("in");

  /* ── Computed values ── */

  const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0);

  const categoryBreakdowns: CategoryBreakdown[] = CATEGORIES.map((cat) => {
    const score = cat.questions.reduce(
      (sum, qId) => sum + (answers[qId] ?? 0),
      0
    );
    return { ...cat, score };
  });

  const weakestAreas = [...categoryBreakdowns]
    .sort((a, b) => a.score / a.maxPoints - b.score / b.maxPoints)
    .slice(0, 3);

  const weakestNeedKey = weakestAreas[0]?.needKey ?? "planning";

  /* ── Handlers ── */

  function handleAnswer(points: number) {
    const questionId = QUESTIONS[currentStep].id;

    setFadeState("out");

    setTimeout(() => {
      const newAnswers = { ...answers, [questionId]: points };
      setAnswers(newAnswers);

      if (currentStep === 0) {
        trackEvent("score_quiz_start", {}, "/score");
      }

      trackEvent("score_quiz_step", {
        step: currentStep + 1,
        questionId,
        points,
      }, "/score");

      if (currentStep + 1 >= QUESTIONS.length) {
        const finalScore = Object.values(newAnswers).reduce((s, v) => s + v, 0);
        const finalWeakest = CATEGORIES.map((cat) => ({
          ...cat,
          score: cat.questions.reduce((s, qId) => s + (newAnswers[qId] ?? 0), 0),
        }))
          .sort((a, b) => a.score / a.maxPoints - b.score / b.maxPoints)
          .slice(0, 3)
          .map((c) => c.label);

        trackEvent("score_quiz_complete", {
          score: finalScore,
          weakest_areas: finalWeakest,
        }, "/score");

        storeQualificationData("financial_score", {
          score: finalScore,
          answers: newAnswers,
          weakest_area: finalWeakest[0],
        });

        setShowResults(true);
      } else {
        setCurrentStep((s) => s + 1);
      }

      setFadeState("in");
    }, 200);
  }

  async function handleEmailCapture() {
    if (!email || !email.includes("@") || emailSubmitting) return;

    setEmailSubmitting(true);

    const finalWeakest = categoryBreakdowns
      .sort((a, b) => a.score / a.maxPoints - b.score / b.maxPoints)
      .slice(0, 3)
      .map((c) => c.label);

    try {
      const utm = getStoredUtm();
      await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "financial-score",
          context: {
            score: totalScore,
            answers,
            weakest_areas: finalWeakest,
          },
          ...utm,
        }),
      });

      trackEvent("score_email_capture", {
        source: "financial-score",
        score: totalScore,
      }, "/score");

      setEmailCaptured(true);
    } catch {
      /* silently fail */
    } finally {
      setEmailSubmitting(false);
    }
  }

  /* ── Results Screen ── */

  if (showResults) {
    const circumference = 2 * Math.PI * 54;
    const strokeDashoffset = circumference - (totalScore / 100) * circumference;

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-4 py-12">
          {/* Score Display */}
          <div className="text-center mb-10">
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500 mb-4">
              Your Financial Health Score
            </p>

            <div className="relative mx-auto mb-4 h-40 w-40">
              <svg className="h-40 w-40 -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  className={getScoreRingColor(totalScore)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{
                    transition: "stroke-dashoffset 1s ease-out",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-extrabold ${getScoreColor(totalScore)}`}>
                  {totalScore}
                </span>
                <span className="text-sm text-slate-400">/100</span>
              </div>
            </div>

            <p className={`text-xl font-bold ${getScoreColor(totalScore)}`}>
              {getScoreLabel(totalScore)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {totalScore >= 80
                ? "You're in great shape! A few tweaks could optimise things further."
                : totalScore >= 60
                  ? "Solid foundation. Addressing a couple of gaps could make a big difference."
                  : totalScore >= 40
                    ? "There are some important areas that need attention."
                    : "Getting professional advice could significantly improve your financial position."}
            </p>
          </div>

          {/* Email Capture */}
          {!emailCaptured ? (
            <div className="mb-10 rounded-xl border border-blue-200 bg-blue-50 p-6 text-center">
              <Icon name="mail" size={28} className="mx-auto text-blue-600 mb-2" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Get your full report emailed
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Detailed breakdown with personalised action steps sent to your inbox.
              </p>
              <div className="flex gap-2 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailCapture()}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={handleEmailCapture}
                  disabled={emailSubmitting || !email.includes("@")}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {emailSubmitting ? "Sending..." : "Send Report"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-10 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-700">
                <Icon name="check-circle" size={20} />
                <p className="text-sm font-medium">Report sent! Check your inbox.</p>
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Score Breakdown
            </h3>
            <div className="space-y-4">
              {categoryBreakdowns.map((cat) => {
                const pct = Math.round((cat.score / cat.maxPoints) * 100);
                return (
                  <div key={cat.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">
                        {cat.label}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {cat.score}/{cat.maxPoints}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${getScoreBgColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personalised Recommendations */}
          <div className="mb-10">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Recommended Next Steps
            </h3>
            <div className="space-y-3">
              {weakestAreas.map((area) => {
                const pct = Math.round(
                  (area.score / area.maxPoints) * 100
                );
                return (
                  <div
                    key={area.label}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          pct < 40
                            ? "bg-red-100 text-red-600"
                            : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        <Icon
                          name={pct < 40 ? "alert-triangle" : "alert-circle"}
                          size={16}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {area.label}{" "}
                          <span className="font-normal text-slate-500">
                            ({area.score}/{area.maxPoints})
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {getRecommendation(area.label, pct)}
                        </p>
                        <Link
                          href={`/find-advisor?need=${area.needKey}`}
                          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                          onClick={() =>
                            trackEvent(
                              "score_recommendation_click",
                              { category: area.label, needKey: area.needKey },
                              "/score"
                            )
                          }
                        >
                          Find a {area.advisorType}
                          <Icon name="arrow-right" size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AdvisorMatchCTA */}
          <div className="mb-10">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Based on your weakest area
            </h3>
            <AdvisorMatchCTA
              needKey={weakestNeedKey}
              label={weakestAreas[0]?.advisorType ?? "Financial Planner"}
            />
          </div>

          {/* Restart */}
          <div className="text-center">
            <button
              onClick={() => {
                setCurrentStep(0);
                setAnswers({});
                setShowResults(false);
                setEmail("");
                setEmailCaptured(false);
                setFadeState("in");
              }}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Quiz Screen ── */

  const question = QUESTIONS[currentStep];
  const progress = ((currentStep) / QUESTIONS.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Progress Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">
              Step {currentStep + 1} of {QUESTIONS.length}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div
          className={`w-full max-w-lg transition-opacity duration-200 ${
            fadeState === "out" ? "opacity-0" : "opacity-100"
          }`}
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-center mb-8 leading-tight">
            {question.text}
          </h1>

          <div className="space-y-3">
            {question.options.map((option) => (
              <button
                key={option.label}
                onClick={() => handleAnswer(option.points)}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-6 py-4 text-left text-base sm:text-lg font-medium text-slate-800 shadow-sm hover:border-blue-400 hover:shadow-md hover:bg-blue-50 active:scale-[0.98] transition-all"
              >
                {option.label}
              </button>
            ))}
          </div>

          {currentStep > 0 && (
            <button
              onClick={() => {
                setFadeState("out");
                setTimeout(() => {
                  const prevId = QUESTIONS[currentStep - 1].id;
                  const newAnswers = { ...answers };
                  delete newAnswers[prevId];
                  setAnswers(newAnswers);
                  setCurrentStep((s) => s - 1);
                  setFadeState("in");
                }, 200);
              }}
              className="mx-auto mt-6 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Icon name="arrow-left" size={14} />
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Recommendation copy per category
   ────────────────────────────────────────────── */

function getRecommendation(category: string, pct: number): string {
  const recs: Record<string, string> = {
    "Savings & Emergency":
      pct < 40
        ? "Building an emergency fund should be your top priority. Even $20/week adds up fast."
        : "You have some savings in place. Aim for 3-6 months of expenses as a safety net.",
    Debt:
      pct < 40
        ? "Tackling debt will free up cash for savings and investing. Consider speaking to a debt specialist."
        : "You're making progress on debt. A structured repayment plan could help you clear it faster.",
    "Super & Retirement":
      pct < 40
        ? "Your super may need attention. A financial planner can review your fund and contribution strategy."
        : "Your super is doing okay. Consider salary sacrificing or reviewing your investment option.",
    Protection:
      pct < 40
        ? "You have significant gaps in your financial safety net. Insurance and estate planning are essential."
        : "Some protection is in place. Review your policies to ensure cover matches your current situation.",
    Investing:
      pct < 40
        ? "Getting started with investing, even small amounts, can make a big difference over time."
        : "You're investing, but there may be room to diversify or optimise your tax position.",
    Planning:
      pct < 40
        ? "Without regular reviews and clear goals, it's easy to drift off track. A plan makes all the difference."
        : "You have some structure. Writing down your goals and reviewing monthly could boost your progress.",
  };
  return recs[category] ?? "Consider speaking to a professional about this area.";
}
