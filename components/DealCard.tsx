"use client";

import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import { isSponsored } from "@/lib/sponsorship";
import SponsorBadge from "@/components/SponsorBadge";

export default function DealCard({ broker }: { broker: Broker }) {
  const expiryDate = broker.deal_expiry ? new Date(broker.deal_expiry) : null;
  const expiryFormatted = expiryDate
    ? expiryDate.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // Calculate days remaining for urgency indicator
  const daysRemaining = expiryDate
    ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const isUrgent = daysRemaining !== null && daysRemaining <= 14;

  const verifiedFormatted = broker.deal_verified_date
    ? new Date(broker.deal_verified_date).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 md:p-5 hover:shadow-md transition-shadow duration-200 flex flex-col">
      {/* Header: broker info + category */}
      <div className="flex items-center gap-2.5 md:gap-3 mb-2.5 md:mb-3">
        <div
          className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold shrink-0"
          style={{ background: `${broker.color}20`, color: broker.color }}
        >
          {broker.icon || broker.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <a
              href={`/broker/${broker.slug}`}
              className="font-bold text-sm hover:text-slate-900 transition-colors"
            >
              {broker.name}
            </a>
            {isSponsored(broker) && <SponsorBadge broker={broker} />}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber">
              {renderStars(broker.rating || 0)}
            </span>
            <span className="text-[0.69rem] text-slate-400">{broker.rating}/5</span>
          </div>
        </div>
        {broker.deal_category && (
          <span className="text-[0.62rem] md:text-[0.69rem] px-1.5 md:px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium uppercase tracking-wide shrink-0">
            {broker.deal_category}
          </span>
        )}
      </div>

      {/* Deal highlight — compact amber box */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-lg px-3 py-2 md:p-3 mb-2 md:mb-3">
        <p className="text-[0.8rem] md:text-sm font-semibold text-slate-700 leading-snug">{broker.deal_text}</p>
        {expiryFormatted && (
          <p className={`text-[0.62rem] md:text-[0.69rem] mt-0.5 md:mt-1 font-medium ${isUrgent ? "text-red-600" : "text-amber-600"}`}>
            {isUrgent && daysRemaining !== null ? (
              <>{daysRemaining === 0 ? "Expires today!" : `${daysRemaining}d left`}</>
            ) : (
              <>Exp. {expiryFormatted}</>
            )}
          </p>
        )}
      </div>

      {/* Terms + verified — inline on mobile to save vertical space */}
      {(broker.deal_terms || verifiedFormatted) && (
        <div className="flex items-start gap-2 mb-2 md:mb-3">
          {broker.deal_terms && (
            <p className="text-[0.62rem] md:text-xs text-slate-400 leading-relaxed flex-1 line-clamp-2">
              {broker.deal_terms}
            </p>
          )}
          {verifiedFormatted && (
            <span className="flex items-center gap-1 shrink-0">
              <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-[0.62rem] md:text-[0.69rem] text-slate-500">
                {verifiedFormatted}
              </span>
            </span>
          )}
        </div>
      )}

      {/* CTA — auto pushed to bottom */}
      <a
        href={getAffiliateLink(broker)}
        target="_blank"
        rel={AFFILIATE_REL}
        onClick={() =>
          trackClick(broker.slug, broker.name, "deals-hub", "/deals", "compare")
        }
        className="mt-auto block w-full text-center py-2.5 md:py-3 bg-amber-600 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-amber-700 hover:shadow-[0_0_12px_rgba(217,119,6,0.3)] transition-all duration-200 active:scale-[0.98]"
      >
        Claim Deal →
      </a>
    </div>
  );
}
