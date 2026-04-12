"use client";

import { memo, useState, useMemo } from "react";
import type { Broker } from "@/lib/types";
import { trackClick, trackEvent, getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import { isSponsored } from "@/lib/sponsorship";
import SponsorBadge from "@/components/SponsorBadge";
import BrokerLogo from "@/components/BrokerLogo";

export default memo(function DealCard({
  broker,
  isFeaturedCampaign = false,
  campaignId,
}: {
  broker: Broker;
  isFeaturedCampaign?: boolean;
  campaignId?: number;
}) {
  const [termsOpen, setTermsOpen] = useState(false);

  const expiryDate = broker.deal_expiry ? new Date(broker.deal_expiry) : null;
  const expiryFormatted = expiryDate
    ? expiryDate.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // Calculate days and hours remaining for countdown
  const msRemaining = expiryDate
    ? Math.max(0, expiryDate.getTime() - Date.now())
    : null;
  const daysRemaining = msRemaining !== null
    ? Math.floor(msRemaining / (1000 * 60 * 60 * 24))
    : null;
  const hoursRemaining = msRemaining !== null
    ? Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    : null;
  const isUrgent = daysRemaining !== null && daysRemaining <= 7;
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 14;

  const verifiedFormatted = broker.deal_verified_date
    ? new Date(broker.deal_verified_date).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
      })
    : null;

  // Determine if this deal has a strong value proposition (for "savings" badge)
  const hasValueBadge = useMemo(() => {
    const text = (broker.deal_text || "").toLowerCase();
    return (
      text.includes("free") ||
      text.includes("$0") ||
      text.includes("no fee") ||
      text.includes("cashback") ||
      text.includes("bonus") ||
      text.includes("save") ||
      text.includes("off")
    );
  }, [broker.deal_text]);

  // Build CPC-attributed link if campaign ID present
  const baseLink = getAffiliateLink(broker);
  const affiliateLink = campaignId
    ? `${baseLink}${baseLink.includes("?") ? "&" : "?"}cid=${campaignId}&placement=deals`
    : baseLink;

  return (
    <div
      className={`group relative rounded-xl border bg-white p-3 md:p-5 flex flex-col transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg bg-clip-padding ${
        isFeaturedCampaign
          ? "border-blue-200 ring-1 ring-blue-100"
          : "border-slate-200 hover:border-transparent"
      }`}
    >
      {/* Gradient border overlay on hover */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"
        style={{
          background: `linear-gradient(135deg, ${broker.color}30, ${broker.color}10, transparent)`,
          margin: "-1px",
          borderRadius: "0.8rem",
        }}
      />

      {/* Value badge top-right */}
      {hasValueBadge && (
        <div className="absolute -top-2 -right-2 z-10">
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[0.6rem] font-bold rounded-full shadow-sm">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Great Value
          </span>
        </div>
      )}

      {/* Hot Deal / Featured indicator */}
      {isFeaturedCampaign && (
        <div className="absolute -top-2 -left-2 z-10">
          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[0.6rem] font-bold rounded-full shadow-sm animate-pulse">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
            </svg>
            Hot Deal
          </span>
        </div>
      )}

      {/* Header: broker info + category */}
      <div className="flex items-center gap-2.5 md:gap-3 mb-2.5 md:mb-3">
        {/* Broker logo/icon */}
        <div className="relative shrink-0">
          <BrokerLogo broker={broker} size="lg" className="transition-transform duration-300 group-hover:scale-105" />
          {/* Subtle glow ring */}
          <div
            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              boxShadow: `0 0 20px ${broker.color}30`,
            }}
          />
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
            {isFeaturedCampaign && !isSponsored(broker) && (
              <span className="text-[0.56rem] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full uppercase tracking-wide">Sponsored</span>
            )}
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

      {/* Deal highlight box with shimmer for urgent deals */}
      <div className="relative bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-lg px-3 py-2.5 md:p-3.5 mb-2 md:mb-3 overflow-hidden">
        {/* Shimmer animation for urgent deals */}
        {isUrgent && (
          <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{
                animation: "dealShimmer 3s infinite",
              }}
            />
          </div>
        )}

        {/* Limited Time pulse indicator */}
        {isUrgent && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[0.6rem] font-bold text-red-600 uppercase tracking-wider">Limited Time</span>
          </div>
        )}

        {/* Deal text — larger and bolder */}
        <p className="text-sm md:text-base font-bold text-slate-800 leading-snug">{broker.deal_text}</p>

        {/* Countdown timer for deals expiring within 14 days */}
        {isExpiringSoon && daysRemaining !== null && hoursRemaining !== null && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              <div className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[0.65rem] font-bold tabular-nums ${
                isUrgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
              }`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {daysRemaining}d : {hoursRemaining.toString().padStart(2, "0")}h left
              </div>
            </div>
            {expiryFormatted && (
              <span className={`text-[0.6rem] font-medium ${isUrgent ? "text-red-500" : "text-amber-600"}`}>
                Exp. {expiryFormatted}
              </span>
            )}
          </div>
        )}

        {/* Non-countdown expiry for deals > 14 days */}
        {!isExpiringSoon && expiryFormatted && (
          <p className="text-[0.62rem] md:text-[0.69rem] mt-1 font-medium text-amber-600">
            Exp. {expiryFormatted}
          </p>
        )}
      </div>

      {/* Verified date (always visible) + Terms (expandable toggle) */}
      <div className="flex items-center gap-2 mb-2 md:mb-3">
        {verifiedFormatted && (
          <span className="flex items-center gap-1 shrink-0">
            <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-[0.62rem] md:text-[0.69rem] text-slate-500">
              Verified {verifiedFormatted}
            </span>
          </span>
        )}
        {broker.deal_terms && (
          <button
            onClick={() => setTermsOpen(!termsOpen)}
            className="flex items-center gap-0.5 text-[0.62rem] md:text-[0.69rem] text-slate-400 hover:text-slate-600 transition-colors ml-auto"
            aria-expanded={termsOpen}
          >
            <svg className={`w-3 h-3 transition-transform duration-200 ${termsOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
            Terms apply
          </button>
        )}
      </div>

      {/* Expandable terms */}
      {broker.deal_terms && termsOpen && (
        <div className="mb-2 md:mb-3 px-2.5 py-2 bg-slate-50 rounded-md border border-slate-100 animate-[dealFadeIn_0.2s_ease-out]">
          <p className="text-[0.62rem] md:text-xs text-slate-500 leading-relaxed">
            {broker.deal_terms}
          </p>
        </div>
      )}

      {/* CTA with gradient and hover glow */}
      <a
        href={affiliateLink}
        target="_blank"
        rel={AFFILIATE_REL}
        onClick={() => {
          trackClick(broker.slug, broker.name, "deals-hub", "/deals", "compare", undefined, campaignId ? "deals" : undefined);
          trackEvent('deal_claimed', { broker_slug: broker.slug, broker_name: broker.name, deal_text: broker.deal_text || '' }, '/deals');
        }}
        className="mt-auto block w-full text-center py-2.5 md:py-3 text-white text-xs md:text-sm font-bold rounded-lg transition-all duration-200 active:scale-[0.98] hover:shadow-[0_0_20px_rgba(217,119,6,0.35)] bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
      >
        {broker.deal_text?.toLowerCase().includes("free") ? "Get Free Access \u2192" : getBenefitCta(broker, "compare")}
      </a>

    </div>
  );
})
