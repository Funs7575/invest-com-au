"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Broker, UserReview, BrokerReviewStats, SwitchStory } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL, trackPageDuration } from "@/lib/tracking";
import ProUpsell from "@/components/ProUpsell";
import { CURRENT_YEAR } from "@/lib/seo";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
  PDS_CONSIDERATION,
  CRYPTO_WARNING,
  CRYPTO_REGULATORY_NOTE,
  CFD_WARNING,
  NEGATIVE_BALANCE_PROTECTION,
  SUPER_WARNING,
  FSG_NOTE,
  AFCA_REFERENCE,
} from "@/lib/compliance";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import RecentlyViewed, { trackView } from "@/components/RecentlyViewed";
import StickyCTABar from "@/components/StickyCTABar";
import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";
import CountUp from "@/components/CountUp";
import ScrollReveal from "@/components/ScrollReveal";
import Icon from "@/components/Icon";
import UserReviewsList from "@/components/UserReviewsList";
import SwitchStoriesList from "@/components/SwitchStoriesList";
import OnThisPage from "@/components/OnThisPage";
import CollapsibleSection from "@/components/CollapsibleSection";
import AdSlot from "@/components/AdSlot";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import LeadMagnet from "@/components/LeadMagnet";

function FeeVerdict({ value, thresholds }: { value: number | undefined; thresholds: [number, number] }) {
  if (value == null) return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full">N/A</span>;
  const color = value <= thresholds[0] ? 'green' : value <= thresholds[1] ? 'amber' : 'red';
  const label = value <= thresholds[0] ? 'Low' : value <= thresholds[1] ? 'Medium' : 'High';
  const colorMap = { green: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-700' };
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colorMap[color]}`}>{label}</span>;
}

function getBestFor(b: Broker): string[] {
  const bestFor: string[] = [];
  const pt = b.platform_type;

  if (pt === 'share_broker' || pt === 'cfd_forex') {
    if ((b.asx_fee_value ?? 999) === 0) bestFor.push("Cost-conscious traders who want $0 brokerage");
    else if ((b.asx_fee_value ?? 999) <= 5) bestFor.push("Active traders looking for low fees");
    if (b.chess_sponsored) bestFor.push("Safety-first investors who want CHESS sponsorship");
    if (b.smsf_support) bestFor.push("SMSF trustees needing compliant custody");
    if (b.fx_rate != null && b.fx_rate <= 0.3) bestFor.push("International investors wanting low FX fees");
  } else if (pt === 'robo_advisor') {
    bestFor.push("Hands-off investors who want automated portfolio management");
    if ((b.asx_fee_value ?? 999) <= 0.5) bestFor.push("Fee-conscious investors looking for low management fees");
  } else if (pt === 'crypto_exchange') {
    bestFor.push("Crypto investors on a regulated Australian exchange");
  } else if (pt === 'research_tool') {
    bestFor.push("Self-directed investors who want in-depth research and analysis");
  } else if (pt === 'super_fund') {
    bestFor.push("Australians looking for a high-performing super fund");
  } else if (pt === 'property_platform') {
    bestFor.push("Investors wanting property exposure without buying a house");
  } else if (pt === 'savings_account') {
    bestFor.push("Investors parking cash between trades at a competitive rate");
    bestFor.push("Anyone building an emergency fund that earns real interest");
  } else if (pt === 'term_deposit') {
    bestFor.push("Conservative investors wanting guaranteed returns with zero market risk");
    bestFor.push("Savers with a defined sum they won't need for a known period");
  }

  if (b.is_crypto && pt !== 'crypto_exchange') bestFor.push("Investors who also want crypto access");
  if (!bestFor.length) bestFor.push("General investors looking for a solid all-rounder");
  return bestFor;
}

interface RelatedArticle {
  id: number;
  title: string;
  slug: string;
  category?: string;
  read_time?: number;
}

interface BrokerReviewProps {
  broker: Broker;
  similar: Broker[];
  relatedArticles?: RelatedArticle[];
  authorName?: string;
  authorTitle?: string;
  authorUrl?: string;
  authorAvatarUrl?: string;
  datePublished?: string | null;
  dateModified?: string | null;
  userReviews?: UserReview[];
  userReviewStats?: BrokerReviewStats | null;
  switchStories?: SwitchStory[];
  feeHistory: { id: number; field_name: string; old_value: string | null; new_value: string | null; change_type: string; changed_at: string }[];
  relatedDeals?: Broker[];
}

const FIELD_LABELS: Record<string, string> = {
  asx_fee: "ASX Brokerage Fee",
  asx_fee_value: "ASX Fee (Numeric)",
  us_fee: "US Share Fee",
  us_fee_value: "US Fee (Numeric)",
  fx_rate: "FX Conversion Rate",
  inactivity_fee: "Inactivity Fee",
  chess_sponsored: "CHESS Sponsorship",
  smsf_support: "SMSF Support",
  rating: "Editor Rating",
  deal: "Active Deal",
  deal_text: "Deal Details",
  deal_expiry: "Deal Expiry",
  min_deposit: "Minimum Deposit",
  fee_page: "Fee Page",
  fee_detected_change: "Fee Page",
};

/** Fields where old/new values are internal hashes, not human-readable */
const HASH_FIELDS = new Set(["fee_page", "fee_detected_change"]);

function formatFieldName(name: string): string {
  return FIELD_LABELS[name] || name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const CATEGORY_COLORS: Record<string, string> = {
  tax: "bg-purple-100 text-purple-700",
  beginners: "bg-blue-100 text-blue-700",
  smsf: "bg-emerald-100 text-emerald-700",
  strategy: "bg-amber-100 text-amber-700",
  news: "bg-red-100 text-red-700",
  reviews: "bg-teal-100 text-teal-700",
};

export default function BrokerReviewClient({
  broker: b,
  similar,
  relatedArticles,
  authorName,
  authorTitle,
  authorUrl,
  authorAvatarUrl,
  datePublished,
  dateModified,
  userReviews = [],
  userReviewStats = null,
  switchStories = [],
  feeHistory,
  relatedDeals = [],
}: BrokerReviewProps) {
  // Track this broker for "Recently Viewed"
  useEffect(() => { trackView(b); trackPageDuration(`/broker/${b.slug}`); }, [b]);

  const isSavingsOrTD = b.platform_type === 'savings_account' || b.platform_type === 'term_deposit';
  const feeRows = isSavingsOrTD ? [
    { label: 'Interest Rate', value: b.asx_fee || 'N/A', numVal: b.asx_fee_value, thresholds: [4, 5] as [number, number], verdict: b.asx_fee_value != null && b.asx_fee_value >= 5 ? 'Excellent' : b.asx_fee_value != null && b.asx_fee_value >= 4 ? 'Good' : 'Below average' },
    { label: 'Minimum Deposit', value: b.min_deposit || '$0', numVal: 0, thresholds: [0, 0] as [number, number], verdict: b.min_deposit === '$0' || !b.min_deposit ? 'None' : 'Required' },
    { label: 'Government Guarantee', value: 'Up to $250,000', numVal: 0, thresholds: [0, 0] as [number, number], verdict: 'Protected' },
    { label: 'Monthly Fees', value: 'None', numVal: 0, thresholds: [0, 0] as [number, number], verdict: 'None' },
  ] : [
    { label: 'ASX Brokerage', value: b.asx_fee || 'N/A', numVal: b.asx_fee_value, thresholds: [5, 15] as [number, number], verdict: b.asx_fee_value != null && b.asx_fee_value <= 5 ? 'Low' : b.asx_fee_value != null && b.asx_fee_value <= 15 ? 'Medium' : 'High' },
    { label: 'US Brokerage', value: b.us_fee || 'N/A', numVal: b.us_fee_value, thresholds: [0, 5] as [number, number], verdict: b.us_fee_value === 0 ? 'Free' : b.us_fee_value != null && b.us_fee_value <= 5 ? 'Low' : 'High' },
    { label: 'FX Rate', value: b.fx_rate != null ? `${b.fx_rate}%` : 'N/A', numVal: b.fx_rate, thresholds: [0.3, 0.5] as [number, number], verdict: b.fx_rate != null && b.fx_rate <= 0.3 ? 'Excellent' : b.fx_rate != null && b.fx_rate <= 0.5 ? 'Fair' : 'Expensive' },
    { label: 'Inactivity Fee', value: b.inactivity_fee || 'None', numVal: b.inactivity_fee === 'None' || !b.inactivity_fee ? 0 : 1, thresholds: [0, 0] as [number, number], verdict: b.inactivity_fee === 'None' || !b.inactivity_fee ? 'None' : 'Watch out' },
  ];

  const searchParams = useSearchParams();
  const reviewVerified = searchParams.get('review_verified') === '1';
  const storyVerified = searchParams.get('story_verified') === '1';

  const stickyDetail = (b.platform_type === 'share_broker' || b.platform_type === 'cfd_forex')
    ? `${b.asx_fee || 'N/A'} ASX · ${b.chess_sponsored ? 'CHESS' : 'Custodial'} · ${b.rating}/5`
    : b.platform_type === 'savings_account'
    ? `${b.asx_fee || 'N/A'} rate · Gov. Guaranteed · ${b.rating}/5`
    : b.platform_type === 'term_deposit'
    ? `${b.asx_fee || 'N/A'} rate · Min ${b.min_deposit || '$1k'} · ${b.rating}/5`
    : `${b.rating}/5`;
  const bestFor = getBestFor(b);

  // Real cost calculations
  const asxCost = b.asx_fee_value ?? 0;
  const usCost = (amount: number) => {
    const fee = b.us_fee_value ?? 0;
    const fxCost = amount * ((b.fx_rate ?? 0) / 100);
    return fee + fxCost;
  };
  const costScenarios = isSavingsOrTD ? [
    { label: "$10,000 Balance", amount: 10000, cost: 10000 * (parseFloat(b.asx_fee?.replace(/[^0-9.]/g, '') || '0') / 100), type: "asx" as const },
    { label: "$25,000 Balance", amount: 25000, cost: 25000 * (parseFloat(b.asx_fee?.replace(/[^0-9.]/g, '') || '0') / 100), type: "asx" as const },
    { label: "$50,000 Balance", amount: 50000, cost: 50000 * (parseFloat(b.asx_fee?.replace(/[^0-9.]/g, '') || '0') / 100), type: "asx" as const },
  ] : [
    { label: "$1,000 ASX Trade", amount: 1000, cost: asxCost, type: "asx" as const },
    { label: "$5,000 US Trade", amount: 5000, cost: usCost(5000), type: "us" as const },
    { label: "$10,000 US Trade", amount: 10000, cost: usCost(10000), type: "us" as const },
  ];

  // Build TOC items dynamically based on available content
  const tocItems = [
    { id: "best-for", label: "Best For" },
    { id: "verdict", label: "Verdict" },
    { id: "fees", label: isSavingsOrTD ? "Rate Details" : "Fee Audit" },
    { id: "cost-example", label: isSavingsOrTD ? "Interest Earned" : "Trade Costs" },
    { id: "safety", label: "Safety Check" },
    { id: "pros-cons", label: "Pros & Cons" },
    ...(userReviews.length > 0 ? [{ id: "reviews", label: `User Reviews (${userReviews.length})` }] : [{ id: "reviews", label: "Write a Review" }]),
    ...(switchStories.length > 0 ? [{ id: "switch-stories", label: "Switch Stories" }] : []),
    ...(feeHistory.length > 0 ? [{ id: "fee-history", label: "Fee History" }] : []),
    { id: "details", label: "Details" },
    ...(relatedDeals.length > 0 ? [{ id: "deals", label: "Deals" }] : []),
    ...(similar.length > 0 ? [{ id: "similar", label: "vs Alternatives" }] : []),
    ...(relatedArticles && relatedArticles.length > 0 ? [{ id: "related-articles", label: "Related Guides" }] : []),
    { id: "questions", label: "Q&A" },
  ];

  return (
    <div className="py-5 md:py-12">
      <OnThisPage items={tocItems} />
      <div className="container-custom max-w-4xl">
        {/* Breadcrumb */}
        <div className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/reviews" className="hover:text-brand">Reviews</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-brand">{b.name}</span>
        </div>

        {/* Review Verified Banner */}
        {reviewVerified && (
          <div className="bg-emerald-100 border border-emerald-200 rounded-xl p-3 md:p-4 mb-4 md:mb-6 text-center">
            <p className="text-xs md:text-sm font-semibold text-emerald-900">
              Thanks — your review has been verified! It should appear on this page shortly.
            </p>
          </div>
        )}

        {/* Story Verified Banner */}
        {storyVerified && (
          <div className="bg-emerald-100 border border-emerald-200 rounded-xl p-3 md:p-4 mb-4 md:mb-6 text-center">
            <p className="text-xs md:text-sm font-semibold text-emerald-900">
              Thanks — your switching story has been verified! It should appear on this page shortly.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 mb-4 md:mb-6 shadow-sm">
          <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
            <div
              className="w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-xl md:text-3xl font-bold shrink-0 shadow-sm"
              style={{ background: `${b.color}15`, color: b.color, border: `2px solid ${b.color}30` }}
            >
              {b.icon || b.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-3xl font-extrabold leading-tight text-slate-900">{b.name} Review ({CURRENT_YEAR})</h1>
              <p className="text-slate-500 mt-0.5 md:mt-1 text-xs md:text-base">{b.tagline}</p>
              <div className="flex items-center gap-2 md:gap-3 flex-wrap mt-2">
                <span className="text-amber-400 text-sm">{renderStars(b.rating || 0)}</span>
                <span className="text-sm font-bold text-slate-700">{b.rating}/5</span>
                {b.chess_sponsored && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">CHESS</span>
                )}
                {b.deal && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">Deal Active</span>
                )}
              </div>
            </div>
          </div>
          <a
            href={getAffiliateLink(b)}
            target="_blank"
            rel={AFFILIATE_REL}
            onClick={() => trackClick(b.slug, b.name, 'review-header', `/broker/${b.slug}`, 'review')}
            className="block md:inline-block w-full md:w-auto text-center px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 hover:shadow-lg hover:shadow-amber-600/20 transition-all"
          >
            {getBenefitCta(b, 'review')}
          </a>
        </div>
        <p className="text-xs text-slate-400 mb-1">
          {ADVERTISER_DISCLOSURE_SHORT}
        </p>
        <p className="text-xs text-slate-400 mb-3">
          {PDS_CONSIDERATION}{" "}
          <a href="#important-info" className="text-blue-700 hover:underline">
            Important information, fees &amp; exit policy →
          </a>
        </p>

        {/* Author Byline & Dates — E-E-A-T visible signals */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-4 pb-4 border-b border-slate-100">
          {authorName && (
            <span className="flex items-center gap-1.5">
              {authorAvatarUrl ? (
                <Image src={authorAvatarUrl} alt={authorName} width={24} height={24} className="rounded-full object-cover" />
              ) : (
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              )}
              Reviewed by{" "}
              {authorUrl ? (
                <a href={authorUrl} className="font-semibold text-slate-700 hover:text-blue-700 transition-colors">
                  {authorName}
                </a>
              ) : (
                <span className="font-semibold text-slate-700">{authorName}</span>
              )}
              {authorTitle && <span className="text-slate-400">· {authorTitle}</span>}
            </span>
          )}
          {datePublished && (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Published: <span className="font-medium text-slate-600">{datePublished}</span>
            </span>
          )}
          {dateModified && dateModified !== datePublished && (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Updated: <span className="font-medium text-slate-600">{dateModified}</span>
            </span>
          )}
        </div>

        {/* Share */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[0.62rem] text-slate-400 font-medium">Share:</span>
          <button
            onClick={() => { if (navigator.share) { navigator.share({ title: `${b.name} Review — Invest.com.au`, url: window.location.href }); } else { navigator.clipboard.writeText(window.location.href); alert("Link copied!"); } }}
            className="text-[0.62rem] px-2 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors"
            aria-label="Share this review"
          >
            <Icon name="share-2" size={12} className="inline mr-1" />Copy Link
          </button>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${b.name} Review — ${b.rating}/5 on Invest.com.au`)}&url=${encodeURIComponent(`https://invest-com-au.vercel.app/broker/${b.slug}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.62rem] px-2 py-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors"
          >
            𝕏 Post
          </a>
        </div>

        {/* Deal banner */}
        {b.deal && b.deal_text && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 md:p-4 mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              <Icon name="flame" size={20} className="text-amber-500 shrink-0 md:hidden" />
              <Icon name="flame" size={24} className="text-amber-500 shrink-0 hidden md:block" />
              <div>
                <div className="text-[0.62rem] md:text-xs font-bold uppercase tracking-wide text-amber-700 mb-0.5">Limited Time Deal</div>
                <p className="text-xs md:text-sm font-semibold text-slate-700">{b.deal_text}</p>
                {b.deal_expiry && (
                  <p className="text-[0.62rem] md:text-[0.69rem] text-amber-600 mt-0.5">
                    Expires {new Date(b.deal_expiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
            <a
              href={getAffiliateLink(b)}
              target="_blank"
              rel={AFFILIATE_REL}
              onClick={() => trackClick(b.slug, b.name, 'review-deal-banner', `/broker/${b.slug}`, 'review')}
              className="shrink-0 w-full sm:w-auto text-center px-4 py-2 md:px-5 md:py-2.5 bg-amber-600 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-amber-700 transition-all"
            >
              Claim Deal →
            </a>
          </div>
        )}

        {/* Who Is This Best For? */}
        <div id="best-for" className="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6 mb-6 md:mb-8 scroll-mt-20">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="target" size={20} className="text-blue-700 shrink-0" />
            <h2 className="text-base md:text-lg font-extrabold text-slate-900">Who Is {b.name} Best For?</h2>
          </div>
          <ul className="space-y-2">
            {bestFor.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-blue-600 font-bold mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Editorial Verdict — Bottom Line */}
        <div id="verdict" className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 md:p-8 mb-6 md:mb-8 scroll-mt-20">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Icon name="award" size={20} className="text-amber-400 shrink-0" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-extrabold">The Bottom Line</h2>
                <p className="text-[0.6rem] md:text-xs text-slate-400">Our editorial verdict</p>
              </div>
            </div>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-4">
              {b.rating && b.rating >= 4.5
                ? `${b.name} is one of the strongest platforms in its category. `
                : b.rating && b.rating >= 3.5
                ? `${b.name} is a solid choice for the right investor. `
                : `${b.name} has some clear strengths but also notable limitations. `
              }
              {bestFor[0] ? `It's particularly well-suited for ${bestFor[0].toLowerCase()}. ` : ""}
              {(b.asx_fee_value ?? 999) === 0
                ? "The $0 brokerage on ASX trades is a standout feature that's hard to beat. "
                : (b.asx_fee_value ?? 999) <= 5
                ? `At ${b.asx_fee}, it's competitively priced for ASX trading. `
                : b.platform_type === "crypto_exchange"
                ? "As an AUSTRAC-registered exchange, it meets Australian regulatory requirements. "
                : b.platform_type === "robo_advisor"
                ? "The automated approach suits investors who prefer a hands-off strategy. "
                : ""
              }
              {b.chess_sponsored ? "CHESS sponsorship provides an important safety layer. " : ""}
            </p>
            <div className="flex items-center gap-4 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-lg">{renderStars(b.rating || 0)}</span>
                <span className="text-2xl font-extrabold">{b.rating}<span className="text-sm text-slate-400">/5</span></span>
              </div>
              <a
                href={getAffiliateLink(b)}
                target="_blank"
                rel={AFFILIATE_REL}
                onClick={() => trackClick(b.slug, b.name, 'review-verdict', `/broker/${b.slug}`, 'review')}
                className="ml-auto px-5 py-2.5 bg-amber-500 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-amber-600 hover:shadow-lg hover:shadow-amber-500/20 transition-all"
              >
                {getBenefitCta(b, 'review')}
              </a>
            </div>
          </div>
        </div>

        {/* Who Is This NOT For? */}
        {(() => {
          const notFor: string[] = [];
          if ((b.asx_fee_value ?? 0) > 10 && !isSavingsOrTD) notFor.push("Cost-conscious traders — fees above $10 per trade are above market average");
          if (!b.chess_sponsored && (b.platform_type === "share_broker")) notFor.push("Safety-first investors who require CHESS sponsorship");
          if (!b.smsf_support && b.platform_type === "share_broker") notFor.push("SMSF trustees — no SMSF account support");
          if (b.platform_type === "crypto_exchange") notFor.push("Traditional share investors — this is a crypto-only platform");
          if (b.platform_type === "robo_advisor") notFor.push("Active traders who want to pick individual stocks");
          if (b.platform_type === "research_tool") notFor.push("Beginners — this is a research tool, not a trading platform");
          if (b.platform_type === "savings_account") notFor.push("Investors seeking share trading or crypto — this is a cash savings account only");
          if (b.platform_type === "term_deposit") {
            notFor.push("Anyone who might need their money before the term ends — early withdrawal penalties apply");
            notFor.push("Investors wanting market returns — term deposits offer fixed, lower rates in exchange for certainty");
          }
          if (b.fx_rate != null && b.fx_rate > 0.7) notFor.push("International investors — FX fees above 0.7% are relatively high");
          if (b.inactivity_fee && b.inactivity_fee !== "None" && b.inactivity_fee !== "$0") notFor.push(`Infrequent traders — inactivity fee of ${b.inactivity_fee} applies`);
          if (notFor.length === 0) return null;
          return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-6 mb-6 md:mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="alert-triangle" size={20} className="text-red-600 shrink-0" />
                <h2 className="text-base md:text-lg font-extrabold text-slate-900">Who Is {b.name} NOT For?</h2>
              </div>
              <ul className="space-y-2">
                {notFor.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-red-500 font-bold mt-0.5">✗</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Key Stats — Quick Reference */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-6 md:mb-8">
          {[
            { label: "ASX Fee", value: b.asx_fee || "N/A", sub: b.asx_fee_value != null && b.asx_fee_value === 0 ? "Free" : undefined, accent: "border-t-emerald-500" },
            { label: "US Fee", value: b.us_fee || "N/A", sub: b.platform_type === "crypto_exchange" ? "N/A" : undefined, accent: "border-t-blue-500" },
            { label: "FX Rate", value: b.fx_rate != null ? `${b.fx_rate}%` : "N/A", accent: "border-t-amber-500" },
            { label: "Safety", value: b.chess_sponsored ? "CHESS" : b.platform_type === "crypto_exchange" ? "AUSTRAC" : "Custodian", accent: "border-t-violet-500" },
          ].map((stat, i) => (
            <div key={i} className={`bg-white border border-slate-200 border-t-2 ${stat.accent} rounded-xl p-3 md:p-4 text-center card-hover`}>
              <div className="text-[0.62rem] md:text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</div>
              <div className="text-base md:text-lg font-extrabold text-slate-900 mt-1">{stat.value}</div>
              {stat.sub && <div className="text-[0.56rem] md:text-[0.62rem] text-emerald-600 font-bold mt-0.5">{stat.sub}</div>}
            </div>
          ))}
        </div>
        <h2 id="fees" className="text-xl md:text-2xl font-extrabold mb-2 scroll-mt-20">{isSavingsOrTD ? "Rate Details" : "Fee Audit"}</h2>
        <p className="text-slate-600 mb-4 text-sm">We&apos;ve audited {b.name}&apos;s fee structure so you don&apos;t have to read the PDS.</p>
        <ScrollReveal animation="fee-row-stagger" className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8">
          {feeRows.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5 md:px-5 md:py-3.5 border-b border-slate-100 last:border-b-0">
              <span className="text-xs md:text-sm font-medium text-slate-700">{row.label}</span>
              <div className="flex items-center gap-2 md:gap-3">
                <span className="font-semibold text-xs md:text-sm">{row.value}</span>
                <FeeVerdict value={row.numVal} thresholds={row.thresholds} />
              </div>
            </div>
          ))}
        </ScrollReveal>

        {/* Sources & Verification — E-E-A-T transparency signals */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="clipboard-list" size={18} className="text-slate-500 shrink-0" />
            <h3 className="text-sm font-extrabold text-slate-700">Sources &amp; Verification</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Our review is based on hands-on analysis of {b.name}&apos;s fee schedule, platform features, and regulatory status.
            We cross-reference data from official pricing pages, Product Disclosure Statements (PDS), and ASIC registers.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
            <span>
              Data verified:{" "}
              <strong className="text-slate-700">
                {b.fee_verified_date
                  ? new Date(b.fee_verified_date).toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })
                  : "Verification pending"}
              </strong>
            </span>
            {b.fee_source_url && (
              <a href={b.fee_source_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                Pricing page ↗
              </a>
            )}
            {b.fee_source_tcs_url && (
              <a href={b.fee_source_tcs_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
                Terms &amp; Conditions ↗
              </a>
            )}
            <Link href="/how-we-verify" className="text-blue-700 hover:underline">
              How we verify fees
            </Link>
            {b.fee_last_checked && (
              <FeesFreshnessIndicator lastChecked={b.fee_last_checked} variant="inline" />
            )}
            <a
              href={`mailto:hello@invest.com.au?subject=Data correction: ${b.name}&body=Hi, I noticed incorrect data on the ${b.name} review page (${typeof window !== 'undefined' ? window.location.href : ''}).%0A%0AWhat's wrong:%0A%0AWhat it should be:`}
              className="text-[0.56rem] text-slate-400 hover:text-red-500 transition-colors"
            >
              Report an error
            </a>
          </div>
          {b.fee_changelog && b.fee_changelog.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-800">
                Fee Change History ({b.fee_changelog.length})
              </summary>
              <div className="mt-2 space-y-1">
                {b.fee_changelog.map((change, i) => (
                  <div key={i} className="text-xs text-slate-500">
                    <span className="text-slate-400">{change.date}</span>{" "}
                    — {change.field}: {change.old_value} → {change.new_value}
                  </div>
                ))}
              </div>
            </details>
          )}
          {/* Editorial independence notice */}
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-500">Editorial independence:</strong> Our ratings and rankings are determined by our editorial team using a standardised methodology. Affiliate partnerships may influence which platforms we review but never our ratings or recommendations.{" "}
              <Link href="/how-we-verify" className="text-blue-700 hover:underline">Read our full methodology →</Link>
            </p>
          </div>
        </div>

        {/* Real Cost Example */}
        <div id="cost-example" className="border border-slate-200 rounded-xl p-4 md:p-6 mb-6 md:mb-8 scroll-mt-20">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="calculator" size={20} className="text-slate-600 shrink-0" />
            <h2 className="text-base md:text-lg font-extrabold">{isSavingsOrTD ? "How Much Would You Earn?" : "What Would a Typical Trade Cost?"}</h2>
          </div>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-3 md:gap-4">
            {costScenarios.map((s, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-2.5 md:p-4 text-center">
                <p className="text-[0.58rem] md:text-xs font-semibold uppercase tracking-wide text-slate-500 mb-0.5 md:mb-1">{s.label}</p>
                <p className="text-lg md:text-2xl font-extrabold text-brand">
                  <CountUp end={s.cost} prefix="$" decimals={2} duration={1200} />
                </p>
                <p className="text-[0.56rem] md:text-xs text-slate-400 mt-0.5 md:mt-1">
                  {isSavingsOrTD ? "per year" : `${((s.cost / s.amount) * 100).toFixed(2)}%`}
                  {!isSavingsOrTD && s.type === "us" && b.fx_rate != null && (
                    <span className="block text-slate-400">incl. {b.fx_rate}% FX</span>
                  )}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Estimates based on published fee schedule. Actual costs may vary.{' '}
            <Link href="/calculators" className="text-blue-700 hover:underline">Try our full calculators →</Link>
          </p>
        </div>

        {/* Inline CTA 1 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm min-w-0 flex-1">
              <strong>Like what you see?</strong>{' '}
              {(b.asx_fee_value ?? 999) <= 5
                ? `${b.name} offers some of the lowest fees in Australia.`
                : b.chess_sponsored
                ? `${b.name} is CHESS sponsored — your shares, your name.`
                : `See if ${b.name} fits your needs.`}
            </p>
            <a
              href={getAffiliateLink(b)}
              target="_blank"
              rel={AFFILIATE_REL}
              onClick={() => trackClick(b.slug, b.name, 'review-inline-1', `/broker/${b.slug}`, 'review')}
              className="shrink-0 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
            >
              {getBenefitCta(b, 'review')}
            </a>
          </div>
        </div>

        {/* Safety Check */}
        <h2 id="safety" className="text-lg md:text-2xl font-extrabold mb-2 md:mb-3 scroll-mt-20">Safety &amp; Scam Check</h2>
        <div className={`rounded-xl p-4 md:p-6 mb-6 md:mb-8 border ${b.chess_sponsored ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            {b.chess_sponsored
              ? <Icon name="check-circle" size={28} className="text-emerald-600 shrink-0" />
              : <Icon name="alert-triangle" size={28} className="text-red-500 shrink-0" />
            }
            <h3 className="text-base md:text-lg font-bold">
              {b.chess_sponsored
                ? 'CHESS Sponsored — You Own Your Shares'
                : 'Custodial Model — Broker Holds Your Shares'}
            </h3>
          </div>
          <p className="text-sm text-slate-700">
            {b.chess_sponsored
              ? `${b.name} is CHESS sponsored. Your shares are registered directly in your name on the ASX via a HIN. If ${b.name} goes bust, your shares are safe.`
              : `${b.name} uses a custodial model. Shares are held in the broker's name. If they were to fail, your shares would be part of the insolvency process.`}
          </p>
        </div>

        {/* Pros & Cons */}
        <div id="pros-cons" className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8 scroll-mt-20">
          {b.pros && b.pros.length > 0 && (
            <ScrollReveal animation="scroll-slide-left" className="bg-emerald-50 rounded-xl p-4 md:p-6">
              <h3 className="text-emerald-800 font-bold mb-3">What We Like</h3>
              <ul className="space-y-2">
                {b.pros.map((pro: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-emerald-600 font-bold mt-0.5">+</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          )}
          {b.cons && b.cons.length > 0 && (
            <ScrollReveal animation="scroll-slide-right" className="bg-red-50 rounded-xl p-4 md:p-6">
              <h3 className="text-red-800 font-bold mb-3">What We Don&apos;t</h3>
              <ul className="space-y-2">
                {b.cons.map((con: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-red-600 font-bold mt-0.5">-</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          )}
        </div>

        {/* Advisor prompt — contextual based on platform type */}
        <div className="mb-6 md:mb-8">
          <AdvisorPrompt
            context={b.smsf_support ? "smsf" : b.platform_type === "property_platform" ? "property" : "general"}
          />
        </div>

        {/* In-content display ad */}
        <AdSlot
          placement="display-incontent-review"
          variant="in-content"
          page={`/broker/${b.slug}`}
          brokers={similar}
        />

        {/* Important Information — exit/closure policy, regulatory, risk warnings */}
        <div id="important-info" className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mb-6 md:mb-8 scroll-mt-20">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="clipboard-list" size={18} className="text-slate-500 shrink-0" />
            <h2 className="text-base md:text-lg font-extrabold text-slate-900">Important Information</h2>
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            {/* Account & Exit */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">Account Closure &amp; Switching</h3>
              <ul className="space-y-1 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>You can close your {b.name} account at any time by contacting their support team.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>
                    {b.chess_sponsored
                      ? `CHESS-sponsored shares can be transferred to another broker via a HIN transfer (typically 3–5 business days). ${b.name} may charge a transfer-out fee.`
                      : `As a custodial broker, transferring shares to another platform may require selling and rebuying. Check ${b.name}'s transfer options before opening an account.`}
                  </span>
                </li>
                {b.inactivity_fee && b.inactivity_fee !== 'None' && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">⚠</span>
                    <span><strong>Inactivity fee:</strong> {b.inactivity_fee}. If you stop trading, this fee may apply to your account.</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>
                    No cooling-off period applies to brokerage accounts in Australia. Once you open an account and place a trade, standard terms apply.{" "}
                    <Link href="/switch" className="text-blue-700 hover:underline">Use our switch planner →</Link>
                  </span>
                </li>
              </ul>
            </div>

            {/* Regulatory */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">Regulatory Status</h3>
              <ul className="space-y-1 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>
                    {b.regulated_by
                      ? `${b.name} is regulated by ${b.regulated_by}.`
                      : `Check ${b.name}'s AFSL status on the ASIC register before investing.`}
                    {b.year_founded && ` Founded in ${b.year_founded}.`}
                    {b.headquarters && ` Headquartered in ${b.headquarters}.`}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>Client funds are subject to the protections outlined in their Financial Services Guide (FSG) and Product Disclosure Statement (PDS).</span>
                </li>
              </ul>
            </div>

            {/* Platform-Specific Australian Warnings */}
            {(b.is_crypto || b.platform_type === "crypto_exchange") && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <h3 className="font-semibold text-amber-800 mb-1 text-xs flex items-center gap-1.5">
                  <span>⚠️</span> Crypto Risk Warning
                </h3>
                <p className="text-xs text-amber-700 leading-relaxed mb-1.5">{CRYPTO_WARNING}</p>
                <p className="text-[0.69rem] text-amber-600 leading-relaxed">{CRYPTO_REGULATORY_NOTE}</p>
              </div>
            )}

            {b.platform_type === "cfd_forex" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h3 className="font-semibold text-red-800 mb-1 text-xs flex items-center gap-1.5">
                  <span>🔴</span> CFD Risk Warning — ASIC Product Intervention Order
                </h3>
                <p className="text-xs text-red-700 leading-relaxed mb-1.5">{CFD_WARNING}</p>
                <p className="text-[0.69rem] text-red-600 leading-relaxed">{NEGATIVE_BALANCE_PROTECTION}</p>
              </div>
            )}

            {b.platform_type === "super_fund" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h3 className="font-semibold text-blue-800 mb-1 text-xs flex items-center gap-1.5">
                  <span>🏛️</span> Super Fund Switching Warning — ASIC RG 183
                </h3>
                <p className="text-xs text-blue-700 leading-relaxed">{SUPER_WARNING}</p>
              </div>
            )}

            {/* FSG & AFCA Reference */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-1">Financial Services Guide &amp; Complaints</h3>
              <ul className="space-y-1 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>{FSG_NOTE}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>{AFCA_REFERENCE}</span>
                </li>
              </ul>
            </div>

            {/* General Advice Warning */}
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500 leading-relaxed">
                <strong className="text-slate-600">General Advice Warning:</strong> {GENERAL_ADVICE_WARNING}
              </p>
            </div>
          </div>
        </div>

        {/* User Reviews Section */}
        <div id="reviews" className="scroll-mt-20">
          <CollapsibleSection collapsedHeight={500} totalCount={userReviews.length} itemLabel="reviews">
            <UserReviewsList
              reviews={userReviews}
              stats={userReviewStats}
              brokerSlug={b.slug}
              brokerName={b.name}
            />
          </CollapsibleSection>
        </div>

        {/* Switch Stories Section */}
        <div id="switch-stories" className="scroll-mt-20">
          <CollapsibleSection collapsedHeight={400} totalCount={switchStories.length} itemLabel="stories">
            <SwitchStoriesList
              stories={switchStories}
              brokerSlug={b.slug}
              brokerName={b.name}
            />
          </CollapsibleSection>
        </div>

        {/* Fee Change History */}
        {feeHistory.length > 0 && (
          <section id="fee-history" className="mb-10 scroll-mt-20">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Icon name="clock" size={20} className="text-slate-400" />
              Fee Change History
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Tracking every fee and data change for {b.name}. Changes detected automatically via fee page monitoring.
            </p>
            <CollapsibleSection collapsedHeight={350} totalCount={feeHistory.length} itemLabel="changes">
              <div className="space-y-2">
                {feeHistory.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mt-0.5 ${
                      c.change_type === 'update' ? 'bg-blue-50 text-blue-700' :
                      c.change_type === 'add' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {c.change_type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-700">{formatFieldName(c.field_name)}</span>
                      {HASH_FIELDS.has(c.field_name) ? (
                        <p className="text-xs text-slate-500 mt-0.5">Change detected on pricing page</p>
                      ) : (
                        <>
                          {c.change_type === 'update' && (
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                              <span className="line-through text-red-400 truncate max-w-[180px]">{c.old_value || '\u2014'}</span>
                              <span className="text-slate-300">{'\u2192'}</span>
                              <span className="text-blue-700 font-medium truncate max-w-[180px]">{c.new_value || '\u2014'}</span>
                            </div>
                          )}
                          {c.change_type === 'add' && <p className="text-xs text-emerald-700 mt-0.5">{c.new_value}</p>}
                          {c.change_type === 'remove' && <p className="text-xs text-red-500 line-through mt-0.5">{c.old_value}</p>}
                        </>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(c.changed_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Changes detected via automated fee page monitoring. <Link href="/whats-new" className="underline hover:text-slate-600">View all changes {'\u2192'}</Link>
              </p>
            </CollapsibleSection>
          </section>
        )}

        {/* Inline CTA 2 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-sm min-w-0 flex-1">
              <strong>Ready to decide?</strong>{' '}
              {b.deal
                ? b.deal_text
                : (b.asx_fee_value ?? 999) === 0
                ? 'Trade with $0 brokerage on ASX and US shares.'
                : (b.asx_fee_value ?? 999) <= 5
                ? `Start trading from just ${b.asx_fee} per trade.`
                : 'Open an account in minutes.'}
            </p>
            <a
              href={getAffiliateLink(b)}
              target="_blank"
              rel={AFFILIATE_REL}
              onClick={() => trackClick(b.slug, b.name, 'review-inline-2', `/broker/${b.slug}`, 'review')}
              className="shrink-0 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
            >
              {getBenefitCta(b, 'review')}
            </a>
          </div>
        </div>

        {/* Details Grid */}
        <h2 id="details" className="text-lg md:text-2xl font-extrabold mb-2 md:mb-3 scroll-mt-20">Details</h2>
        <div className="grid grid-cols-2 gap-2 md:gap-4 mb-6 md:mb-8">
          <div className="bg-slate-50 rounded-lg p-3 md:p-4">
            <p className="text-[0.6rem] md:text-[0.69rem] uppercase text-slate-500 tracking-wide font-medium mb-0.5 md:mb-1">Platforms</p>
            <p className="text-xs md:text-sm font-medium">{b.platforms?.join(', ') || 'N/A'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 md:p-4">
            <p className="text-[0.6rem] md:text-[0.69rem] uppercase text-slate-500 tracking-wide font-medium mb-0.5 md:mb-1">Payment Methods</p>
            <p className="text-xs md:text-sm font-medium">{b.payment_methods?.join(', ') || 'N/A'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 md:p-4">
            <p className="text-[0.6rem] md:text-[0.69rem] uppercase text-slate-500 tracking-wide font-medium mb-0.5 md:mb-1">SMSF Support</p>
            <p className="text-xs md:text-sm font-medium">{b.smsf_support ? 'Yes' : 'No'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 md:p-4">
            <p className="text-[0.6rem] md:text-[0.69rem] uppercase text-slate-500 tracking-wide font-medium mb-0.5 md:mb-1">Min Deposit</p>
            <p className="text-xs md:text-sm font-medium">{b.min_deposit || '$0'}</p>
          </div>
        </div>

        {/* Related Deals */}
        {relatedDeals.length > 0 && (
          <div id="deals" className="mb-8 scroll-mt-20">
            <h2 className="text-xl font-extrabold mb-2">Deals From Similar Platforms</h2>
            <p className="text-sm text-slate-600 mb-4">
              Active promotions from other {b.platform_type?.replace(/_/g, " ") || "investing"} platforms:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedDeals.map((d) => (
                <div
                  key={d.slug}
                  className="border border-slate-200 rounded-xl p-3 md:p-4 hover:shadow-md transition-shadow flex items-start gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: `${d.color}20`, color: d.color }}
                  >
                    {d.icon || d.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Link href={`/broker/${d.slug}`} className="font-bold text-sm hover:text-blue-700 transition-colors">
                        {d.name}
                      </Link>
                      <span className="text-xs text-amber">{d.rating}/5</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug mb-1.5">
                      {d.deal_text}
                    </p>
                    {d.deal_expiry && (
                      <p className="text-[0.62rem] text-slate-400 mb-2">
                        Expires {new Date(d.deal_expiry).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                    <a
                      href={getAffiliateLink(d)}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      onClick={() => trackClick(d.slug, d.name, "review-related-deal", `/broker/${b.slug}`, "review")}
                      className="inline-block text-xs px-3 py-1.5 bg-amber-600 text-white font-semibold rounded-md hover:bg-amber-700 transition-colors"
                    >
                      Claim Deal →
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/deals" className="inline-block mt-3 text-xs text-slate-500 hover:text-slate-700 transition-colors">
              View all deals →
            </Link>
          </div>
        )}

        {/* Similar Platforms */}
        {similar.length > 0 && (
          <>
            <h2 id="similar" className="text-lg md:text-xl font-extrabold mb-1.5 md:mb-2 scroll-mt-20">Compare {b.name} vs Alternatives</h2>
            <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">See how {b.name} stacks up head-to-head:</p>
            {/* Quick versus links */}
            <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
              {similar.slice(0, 5).map(s => (
                <Link
                  key={s.slug}
                  href={`/versus/${b.slug}-vs-${s.slug}`}
                  className="px-2.5 py-1.5 md:px-3 md:py-2 text-[0.65rem] md:text-xs font-semibold border border-slate-200 rounded-lg hover:border-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  {b.name} vs {s.name}
                </Link>
              ))}
            </div>
            {/* Platform cards */}
            <ScrollReveal animation="scroll-stagger-children" className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
              {similar.map(s => (
                <Link
                  key={s.slug}
                  href={`/versus/${b.slug}-vs-${s.slug}`}
                  className="border border-slate-200 rounded-xl p-2.5 md:p-4 hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <div
                    className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold mb-1.5 md:mb-2"
                    style={{ background: `${s.color}20`, color: s.color }}
                  >
                    {s.icon || s.name.charAt(0)}
                  </div>
                  <h3 className="font-bold text-xs md:text-sm">{s.name}</h3>
                  <div className="text-[0.62rem] md:text-xs text-amber">{renderStars(s.rating || 0)} <span className="text-slate-500">{s.rating}/5</span></div>
                  <div className="text-[0.58rem] md:text-xs text-slate-500 mt-0.5 md:mt-1">{s.asx_fee} · {s.chess_sponsored ? 'CHESS' : 'Custodial'}</div>
                  <span className="inline-block mt-1.5 md:mt-2 text-[0.62rem] md:text-xs px-2 py-0.5 md:px-3 md:py-1 bg-slate-900 text-white rounded-md font-semibold">vs {b.name} →</span>
                </Link>
              ))}
            </ScrollReveal>
          </>
        )}

        {/* Related Articles */}
        {relatedArticles && relatedArticles.length > 0 && (
          <>
            <h2 id="related-articles" className="text-lg md:text-xl font-extrabold mb-1.5 md:mb-2 scroll-mt-20">Guides Featuring {b.name}</h2>
            <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">
              Our editorial team has covered {b.name} in these articles:
            </p>
            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-8">
              {relatedArticles.map((article) => {
                const color = CATEGORY_COLORS[article.category || ""] || "bg-slate-100 text-slate-700";
                return (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    className="border border-slate-200 rounded-xl p-3 md:p-4 hover:shadow-md transition-shadow flex flex-col"
                  >
                    {article.category && (
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full self-start mb-1 ${color}`}>
                        {article.category}
                      </span>
                    )}
                    <h3 className="text-sm font-bold line-clamp-2 flex-1">{article.title}</h3>
                    {article.read_time && (
                      <span className="text-xs text-slate-400 mt-2">{article.read_time} min read</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Bottom CTA */}
        <div className="bg-amber-400 text-slate-900 rounded-xl p-5 md:p-8 text-center">
          <h2 className="text-lg md:text-2xl font-extrabold mb-1.5 md:mb-2">Ready to try {b.name}?</h2>
          <p className="text-xs md:text-base text-slate-700 mb-3 md:mb-4">
            {b.deal_text || ((b.asx_fee_value ?? 999) <= 5
              ? `Start trading from just ${b.asx_fee} per trade. Takes under 5 minutes.`
              : 'Open an account and start trading in minutes.')}
          </p>
          <a
            href={getAffiliateLink(b)}
            target="_blank"
            rel={AFFILIATE_REL}
            onClick={() => trackClick(b.slug, b.name, 'review-bottom', `/broker/${b.slug}`, 'review')}
            className="inline-block px-6 py-3 md:px-8 md:py-3.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 hover:shadow-lg transition-all active:scale-[0.98] text-sm md:text-lg"
          >
            {getBenefitCta(b, 'review')}
          </a>
          <p className="text-[0.58rem] md:text-xs text-slate-600 mt-2 md:mt-3">{ADVERTISER_DISCLOSURE_SHORT}</p>
        </div>

        {/* Not convinced? More tools */}
        <div className="mt-4 md:mt-6 text-center">
          <p className="text-xs md:text-sm text-slate-500 mb-2">Want to compare other options?</p>
          <div className="flex gap-2 md:gap-3 justify-center flex-wrap">
            <Link href="/portfolio-calculator" className="text-xs md:text-sm text-violet-700 font-semibold hover:text-violet-800 transition-colors border border-violet-200 rounded-lg px-3 py-2 md:px-4 hover:bg-violet-50">
              Fee Calculator →
            </Link>
            <Link href="/quiz" className="text-xs md:text-sm text-amber-700 font-semibold hover:text-amber-800 transition-colors border border-amber-200 rounded-lg px-3 py-2 md:px-4 hover:bg-amber-50">
              Quiz →
            </Link>
            <Link href="/compare" className="text-xs md:text-sm text-slate-600 font-semibold hover:text-slate-800 transition-colors border border-slate-200 rounded-lg px-3 py-2 md:px-4 hover:bg-slate-50">
              Compare All →
            </Link>
            <Link href="/fee-alerts" className="text-xs md:text-sm text-slate-600 font-semibold hover:text-slate-800 transition-colors border border-slate-200 rounded-lg px-3 py-2 md:px-4 hover:bg-slate-50">
              Fee Alerts →
            </Link>
          </div>
        </div>

        {/* Email Capture */}
        <div className="mt-6 md:mt-8">
          <LeadMagnet />
        </div>

        {/* Pro upsell */}
        <div className="mt-4">
          <ProUpsell variant="fee-alert" />
        </div>

        <RecentlyViewed currentSlug={b.slug} />

        <CompactDisclaimerLine />
      </div>

      <StickyCTABar broker={b} detail={stickyDetail} context="review" />
    </div>
  );
}
