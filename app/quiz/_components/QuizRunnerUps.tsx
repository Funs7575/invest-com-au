"use client";

import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, AFFILIATE_REL } from "@/lib/tracking";
import { isSponsored } from "@/lib/sponsorship";
import Icon from "@/components/Icon";
import RiskWarningInline from "@/components/RiskWarningInline";
import SponsorBadge from "@/components/SponsorBadge";

interface ScoredResult {
  slug: string;
  total: number;
  broker?: Broker;
}

interface Props {
  runnerUps: ScoredResult[];
  answers: string[];
  getMatchReasons: (answers: string[], broker: Broker) => string[];
}

export default function QuizRunnerUps({ runnerUps, answers, getMatchReasons }: Props) {
  if (runnerUps.length === 0) return null;

  return (
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
  );
}
