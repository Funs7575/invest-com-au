"use client";

import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
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
  topMatch: ScoredResult;
  answers: string[];
  getMatchReasons: (answers: string[], broker: Broker) => string[];
}

export default function QuizTopMatch({ topMatch, answers, getMatchReasons }: Props) {
  if (!topMatch.broker) return null;
  const broker = topMatch.broker;

  return (
    <div
      className="border-2 rounded-xl p-4 md:p-8 mb-3 md:mb-6 relative overflow-hidden result-card-in result-card-in-delay-1 shine-effect"
      style={{
        borderColor: broker.color || '#f59e0b',
        background: `linear-gradient(135deg, ${broker.color}08 0%, ${broker.color}15 100%)`,
      }}
    >
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 w-full h-1"
        style={{ background: broker.color || '#f59e0b' }}
      />
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none top-card-glow"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${broker.color || '#f59e0b'}20 0%, transparent 70%)` }}
        aria-hidden="true"
      />
      <div
        className="text-[0.56rem] md:text-[0.69rem] uppercase font-extrabold tracking-wider mb-2.5 md:mb-4 inline-block px-2 py-1 md:px-3 md:py-1.5 rounded-full badge-pulse"
        style={{
          color: broker.color || '#b45309',
          background: `${broker.color || '#f59e0b'}20`,
          '--badge-glow': `${broker.color || '#f59e0b'}40`,
        } as React.CSSProperties}
      >
        <Icon name="trophy" size={12} className="inline -mt-0.5 md:hidden" />
        <Icon name="trophy" size={14} className="inline -mt-0.5 hidden md:inline" /> #1 Based on Your Filters
      </div>
      <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
        <div
          className="w-11 h-11 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-lg md:text-2xl font-bold shrink-0"
          style={{ background: `${broker.color}20`, color: broker.color }}
        >
          {broker.icon || broker.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <h2 className="text-xl md:text-3xl font-extrabold">{broker.name}</h2>
            {isSponsored(broker) && <SponsorBadge broker={broker} />}
          </div>
          <div className="text-xs md:text-sm text-amber">{renderStars(broker.rating || 0)} <span className="text-slate-500">{broker.rating}/5</span></div>
        </div>
      </div>
      <p className="text-[0.69rem] md:text-base text-slate-600 mb-3 md:mb-4 hidden md:block">{broker.tagline}</p>

      {/* Why this broker? */}
      <div className="bg-white/60 rounded-lg p-2.5 md:p-3 mb-3 md:mb-4">
        <p className="text-[0.56rem] md:text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 md:mb-1.5">
          Why {broker.name}?
        </p>
        <ul className="space-y-0.5 md:space-y-1">
          {getMatchReasons(answers, broker).map((reason, i) => (
            <li key={i} className="text-[0.69rem] md:text-sm text-slate-700 flex items-start gap-1.5 md:gap-2">
              <span className="text-emerald-600 shrink-0">✓</span>
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-1.5 md:gap-3 text-[0.62rem] md:text-xs text-slate-500 mb-3 md:mb-5">
        {(!broker.platform_type || broker.platform_type === 'share_broker') && (
          <>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">ASX: {broker.asx_fee}</span>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">CHESS: {broker.chess_sponsored ? 'Yes' : 'No'}</span>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">SMSF: {broker.smsf_support ? 'Yes' : 'No'}</span>
          </>
        )}
        {broker.platform_type === 'crypto_exchange' && (
          <>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">AUSTRAC Registered</span>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Crypto Exchange</span>
          </>
        )}
        {broker.platform_type === 'robo_advisor' && (
          <>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Automated Investing</span>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Managed Portfolio</span>
          </>
        )}
        {broker.platform_type === 'research_tool' && (
          <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Research & Analysis</span>
        )}
        {broker.platform_type === 'super_fund' && (
          <>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Superannuation</span>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">APRA Regulated</span>
          </>
        )}
        {broker.platform_type === 'property_platform' && (
          <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Property Investing</span>
        )}
        {broker.platform_type === 'cfd_forex' && (
          <>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">CFD & Forex</span>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Leveraged Trading</span>
          </>
        )}
        {broker.platform_type === 'savings_account' && (
          <>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Rate: {broker.asx_fee}</span>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Gov. Guaranteed</span>
          </>
        )}
        {broker.platform_type === 'term_deposit' && (
          <>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Rate: {broker.asx_fee}</span>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Min: {broker.min_deposit}</span>
            <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Gov. Guaranteed</span>
          </>
        )}
        <span className="bg-white/60 px-1.5 py-0.5 md:px-2 md:py-1 rounded">Rating: {broker.rating}/5</span>
      </div>
      <a
        href={getAffiliateLink(broker)}
        target="_blank"
        rel={AFFILIATE_REL}
        onClick={() => trackClick(broker.slug, broker.name, 'quiz-result-1', '/quiz', 'quiz')}
        className="block w-full text-center px-5 py-3 md:px-6 md:py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-all text-sm md:text-lg shadow-lg hover:shadow-xl hover:scale-[1.02]"
      >
        {getBenefitCta(broker, 'quiz')}
      </a>
      <RiskWarningInline />
      {broker.deal && broker.deal_text && (
        <div className="mt-2 md:mt-3 text-center">
          <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-amber-50 border border-amber-200 rounded-full text-[0.62rem] md:text-xs font-semibold text-amber-700">
            <Icon name="flame" size={12} className="inline text-amber-500 md:hidden" />
            <Icon name="flame" size={14} className="inline text-amber-500 hidden md:inline" /> {broker.deal_text}
            {broker.deal_expiry && (
              <span className="text-[0.56rem] md:text-[0.69rem] text-amber-500 font-normal ml-0.5 md:ml-1">
                (expires {new Date(broker.deal_expiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })})
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
