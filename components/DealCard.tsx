"use client";

import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import { RISK_WARNING_CTA } from "@/lib/compliance";
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow duration-200">
      {/* Header: broker info */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
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
          <div className="text-xs text-amber">
            {renderStars(broker.rating || 0)}{" "}
            <span className="text-slate-500">{broker.rating}/5</span>
          </div>
        </div>
        {broker.deal_category && (
          <span className="text-[0.65rem] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium uppercase tracking-wide shrink-0">
            {broker.deal_category}
          </span>
        )}
      </div>

      {/* Deal text — prominent */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-3 mb-3">
        <p className="text-sm font-semibold text-slate-700">{broker.deal_text}</p>
        {expiryFormatted && (
          <p className={`text-[0.65rem] mt-1 font-medium ${isUrgent ? "text-red-600" : "text-amber-600"}`}>
            {isUrgent && daysRemaining !== null ? (
              <>{daysRemaining === 0 ? "Expires today!" : `Only ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left!`}</>
            ) : (
              <>Expires {expiryFormatted}</>
            )}
          </p>
        )}
      </div>

      {/* Deal terms (fine print) */}
      {broker.deal_terms && (
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          {broker.deal_terms}
        </p>
      )}

      {/* Verified badge */}
      {verifiedFormatted && (
        <div className="flex items-center gap-1.5 mb-3">
          <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-[0.65rem] text-slate-500">
            Verified {verifiedFormatted}
            {broker.deal_source && <> via {broker.deal_source}</>}
          </span>
        </div>
      )}

      {/* CTA */}
      <a
        href={getAffiliateLink(broker)}
        target="_blank"
        rel={AFFILIATE_REL}
        onClick={() =>
          trackClick(broker.slug, broker.name, "deals-hub", "/deals", "compare")
        }
        className="block w-full text-center py-3 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 hover:scale-105 hover:shadow-[0_0_12px_rgba(217,119,6,0.3)] transition-all duration-200 active:scale-[0.98]"
      >
        Claim Deal →
      </a>

      {/* Risk warning */}
      <p className="text-xs text-slate-400 text-center mt-2">
        {RISK_WARNING_CTA}
      </p>
    </div>
  );
}
