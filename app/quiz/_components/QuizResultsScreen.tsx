"use client";

import Link from "next/link";
import type { Broker } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE_SHORT, CRYPTO_WARNING, SPONSORED_DISCLOSURE_SHORT } from "@/lib/compliance";
import { isSponsored } from "@/lib/sponsorship";
import Icon from "@/components/Icon";
import CohortInsights from "@/components/CohortInsights";

import QuizTopMatch from "./QuizTopMatch";
import QuizComparisonTable from "./QuizComparisonTable";
import QuizRunnerUps from "./QuizRunnerUps";
import QuizResultsFooter from "./QuizResultsFooter";
import ThreadCardsStrip, { type ThreadAnswers } from "./ThreadCardsStrip";
import QuizNextBestActions from "./QuizNextBestActions";
import QuizPrimaryActionHero from "./QuizPrimaryActionHero";
import QuizInlineEmailCapture from "./QuizInlineEmailCapture";
import { resolveBestOutcome } from "@/lib/quiz-outcome";

interface ScoredResult {
  slug: string;
  total: number;
  broker?: Broker;
}

interface Props {
  results: ScoredResult[];
  answers: string[];
  unifiedAnswers: ThreadAnswers;
  hasCryptoResult: boolean;
  copied: boolean;
  showScoring: boolean;
  onSetShowScoring: (v: boolean) => void;
  onShareResult: () => void;
  onRestart: () => void;
  getMatchReasons: (answers: string[], broker: Broker) => string[];
  /** Inline email capture handlers — gate moved post-results so users see
      the win first, then get nudged to capture (warm conversion). */
  onEmailCaptureSubmit: (email: string, name: string) => Promise<void> | void;
  emailCaptureStatus: "idle" | "loading" | "submitted" | "error";
}

export default function QuizResultsScreen({
  results,
  answers,
  unifiedAnswers,
  hasCryptoResult,
  copied,
  showScoring,
  onSetShowScoring,
  onShareResult,
  onRestart,
  getMatchReasons,
  onEmailCaptureSubmit,
  emailCaptureStatus,
}: Props) {
  const topMatch = results[0];
  const runnerUps = results.slice(1);
  const allResults = results.filter(r => r.broker);
  const alternativesCount = Math.max(0, allResults.length - 1);
  const hasSponsoredResult = allResults.some(r => r.broker && isSponsored(r.broker));

  // Resolve the inferred best outcome — post-job, calculator-first,
  // bundle-stack, advisor-browse, education-first, advisor-match, or
  // diy-broker (default fall-through). The outcome can suppress the broker
  // leaderboard entirely (e.g. for property-physical the broker list isn't
  // the answer — a buyer's agent + mortgage broker is).
  const outcome = resolveBestOutcome(unifiedAnswers);
  const heroEnabled = outcome.kind !== "diy-broker";
  const showBrokerResults = !outcome.suppressBrokerResults;
  const showRunnerUps = !outcome.suppressRunnerUps;

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
              onClick={onRestart}
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
              {/* eslint-disable react-hooks/purity -- decorative confetti, deliberate randomness on each render */}
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
              {/* eslint-enable react-hooks/purity */}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon name="trophy" size={36} className="celebrate-emoji text-amber-500 md:hidden" />
              <Icon name="trophy" size={56} className="celebrate-emoji text-amber-500 hidden md:block" />
            </div>
          </div>
          <h1 className="text-xl md:text-3xl font-extrabold mb-1 md:mb-2">
            {alternativesCount > 0
              ? `Your top match (and ${alternativesCount} ${alternativesCount === 1 ? "alternative" : "alternatives"})`
              : "Your top match"}
          </h1>
          <p className="text-[0.69rem] md:text-base text-slate-600">Scored against the criteria you selected — your #1 first, alternatives below.</p>
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

        {/* Primary action hero — renders the inferred best move FIRST when
            the outcome resolver decides the user's right next step is
            something other than "pick a broker" (post a job, run a
            calculator, browse advisors, build a stack, get educated). For
            diy-broker outcomes this is a no-op and the top match below
            takes over. */}
        {heroEnabled && <QuizPrimaryActionHero outcome={outcome} />}

        {/* Top Match — surfaced above the fold for diy-broker outcomes.
            For non-broker outcomes (post-job, calculator-first, etc.) the
            top match is still shown UNLESS the outcome explicitly
            suppresses the leaderboard (property-physical, business-intl,
            mortgage-home — where a broker pick isn't relevant). */}
        {showBrokerResults && topMatch?.broker && (
          <div id="top-match">
            <QuizTopMatch topMatch={topMatch} answers={answers} getMatchReasons={getMatchReasons} />
          </div>
        )}

        {/* Consolidated disclosures — one collapsible card combining the
            general-advice warning and the sponsored-results disclosure.
            Previously these were two separate stacked blocks above the top
            match; merging + collapsing reduces ~200px of mobile scroll. */}
        <details className="bg-slate-50 border border-slate-200 rounded-lg mb-3 md:mb-6 group">
          <summary className="px-3 py-2 text-[0.62rem] md:text-xs text-slate-500 font-medium cursor-pointer flex items-center gap-1.5 list-none [&::-webkit-details-marker]:hidden">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>How we work &amp; why these results</span>
            {hasSponsoredResult && (
              <span className="ml-1 px-1.5 py-px bg-blue-50 border border-blue-200 rounded-full text-[0.55rem] md:text-[0.62rem] font-semibold text-blue-700">Includes sponsored</span>
            )}
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-400 ml-auto transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </summary>
          <div className="px-3 pb-2.5 space-y-2 text-[0.62rem] md:text-xs leading-relaxed">
            <p className="text-slate-500">
              <strong>General advice only:</strong> {GENERAL_ADVICE_WARNING} {ADVERTISER_DISCLOSURE_SHORT}
            </p>
            {hasSponsoredResult && (
              <p className="text-blue-700">
                <strong>Sponsored partners:</strong> Sponsored partners may receive a minor position boost if they already score in the top 5. {SPONSORED_DISCLOSURE_SHORT}
              </p>
            )}
          </div>
        </details>

        {/* Your investing stack — multi-thread bundle cards conditional on quiz answers.
            Now sits below the top match so the user sees the answer first, then
            the broader "broker + super + savings + tax" framing. */}
        <ThreadCardsStrip answers={unifiedAnswers} />

        {/* Quick Comparison Table — only for outcomes that surface broker results */}
        {showBrokerResults && <QuizComparisonTable allResults={allResults} />}

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
            onClick={() => onSetShowScoring(!showScoring)}
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

        {/* Advisor Recommendation — revenue-priority ordered upsell */}
        {(() => {
          // Revenue-ranked order: mortgage broker ($300-$2000 CPA) first, then buyer's agent,
          // financial planner, SMSF, crypto tax. All conditions evaluated; highest-revenue match wins.
          const advisorContexts: { condition: boolean; type: string; advisorHref: string; heading: string; desc: string; context: "mortgage" | "property" | "smsf" | "high-value" | "tax" | "general" }[] = [
            {
              condition: answers.includes('home') || (answers.includes('property') && (answers.includes('large') || answers.includes('whale') || answers.includes('xlarge'))),
              type: "mortgage-broker",
              advisorHref: "/advisors/mortgage-brokers",
              heading: "Need a mortgage broker?",
              desc: "A broker compares 30+ lenders to find the best rate for your situation — free to use, paid by the lender.",
              context: "mortgage",
            },
            {
              condition: answers.includes('property'),
              type: "buyers-agent",
              advisorHref: "/advisors/buyers-agents",
              heading: "Considering investment property?",
              desc: "A buyer's agent finds off-market deals, negotiates price, and can save you more than their fee on a typical purchase.",
              context: "property",
            },
            {
              condition: answers.includes('large') || answers.includes('whale') || answers.includes('xlarge'),
              type: "financial-planner",
              advisorHref: "/advisors/financial-planners",
              heading: "Investing $100k+?",
              desc: "At this level, a one-off financial plan ($2,500–$5,500) can optimise your tax position and portfolio structure significantly.",
              context: "high-value",
            },
            {
              condition: answers.includes('super') || answers.includes('smsf'),
              type: "smsf-accountant",
              advisorHref: "/advisors/smsf-accountants",
              heading: "Setting up an SMSF?",
              desc: "You'll need a specialist SMSF accountant for setup, compliance, and annual audits. Most setups cost $1,500–$3,000.",
              context: "smsf",
            },
            {
              condition: answers.includes('crypto'),
              type: "tax-agent",
              advisorHref: "/advisors/tax-agents",
              heading: "Crypto tax getting complex?",
              desc: "A crypto-specialist tax agent can handle DeFi, staking, and CGT calculations — and may save more than their fee.",
              context: "general",
            },
          ];
          // First match wins — list is revenue-ranked so highest-value advisor type always surfaces
          const match = advisorContexts.find(c => c.condition);
          if (!match) return null;
          return (
            <div className="mb-4 md:mb-6 result-card-in result-card-in-delay-3">
              <div className="bg-gradient-to-br from-amber-50 to-slate-50 border border-amber-200/60 rounded-xl p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Icon name="users" size={20} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.58rem] md:text-[0.62rem] font-bold uppercase tracking-wider text-amber-600 mb-0.5">Based on your answers</p>
                    <h3 className="text-sm md:text-base font-bold text-slate-900 mb-1">{match.heading}</h3>
                    <p className="text-xs md:text-sm text-slate-500 mb-3 leading-relaxed">{match.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={match.advisorHref}
                        className="px-3 py-1.5 md:px-4 md:py-2 bg-amber-500 text-white text-[0.65rem] md:text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors"
                        onClick={() => trackEvent("quiz_advisor_click", { type: match.type, context: match.context })}
                      >
                        Browse Verified Professionals →
                      </Link>
                      <Link
                        href="/find-advisor"
                        className="px-3 py-1.5 md:px-4 md:py-2 border border-amber-200 text-amber-700 text-[0.65rem] md:text-xs font-semibold rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        All Advisor Types
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Runner Ups — only when the outcome surfaces broker comparisons.
            Outcomes like education-first / post-job / property-physical
            suppress this; the broker leaderboard is noise for those users. */}
        {showBrokerResults && showRunnerUps && (
          <QuizRunnerUps runnerUps={runnerUps} answers={answers} getMatchReasons={getMatchReasons} />
        )}

        {/* Inline email capture — warm-capture sweet spot. The user has
            seen the primary action hero AND the broker results above, so
            they know the value before being asked. Dismissable; success
            state swaps the form for a thank-you. */}
        <QuizInlineEmailCapture
          onSubmit={onEmailCaptureSubmit}
          status={emailCaptureStatus}
        />

        {/* Next-best-actions — vertical-aware cross-sell strip.
            Surfaces calculators, advisor types, and topic hubs based on the
            user's actual answers (super → retirement-calc + SMSF accountant,
            crypto → tax agent, property → mortgage broker, etc.). The strip is
            the antidote to "quiz returns 1 broker and ends" — most users have
            multiple latent needs the result page should acknowledge. */}
        <QuizNextBestActions
          answers={unifiedAnswers}
          topSlugs={allResults.map(r => r.slug)}
          showPostJobFallback={
            unifiedAnswers.complexity === "complex" || unifiedAnswers.amount === "whale"
          }
        />

        {/* P1 #7: Crypto warning when results include a crypto broker */}
        {hasCryptoResult && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 md:p-3 mb-3 md:mb-4">
            <p className="text-[0.62rem] md:text-xs text-amber-700 leading-relaxed">
              <strong>Crypto Warning:</strong> {CRYPTO_WARNING}
            </p>
          </div>
        )}

        <QuizResultsFooter
          results={results}
          answers={answers}
          unifiedAnswers={unifiedAnswers}
          copied={copied}
          topMatch={topMatch}
          onShareResult={onShareResult}
          onRestart={onRestart}
        />
      </div>
    </div>
  );
}
