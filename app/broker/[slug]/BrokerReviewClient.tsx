"use client";

import Link from "next/link";
import type { Broker } from "@/lib/types";
import { trackClick, getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import RiskWarningInline from "@/components/RiskWarningInline";
import CompactDisclosure from "@/components/CompactDisclosure";
import StickyCTABar from "@/components/StickyCTABar";
import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";

function FeeVerdict({ value, thresholds }: { value: number | undefined; thresholds: [number, number] }) {
  if (value == null) return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-semibold rounded-full">N/A</span>;
  const color = value <= thresholds[0] ? 'green' : value <= thresholds[1] ? 'amber' : 'red';
  const label = value <= thresholds[0] ? 'Low' : value <= thresholds[1] ? 'Medium' : 'High';
  const colorMap = { green: 'bg-green-100 text-green-700', amber: 'bg-amber-100 text-amber-700', red: 'bg-red-100 text-red-700' };
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colorMap[color]}`}>{label}</span>;
}

function getBestFor(b: Broker): string[] {
  const bestFor: string[] = [];
  if ((b.asx_fee_value ?? 999) === 0) bestFor.push("Cost-conscious traders who want $0 brokerage");
  else if ((b.asx_fee_value ?? 999) <= 5) bestFor.push("Active traders looking for low ASX fees");
  if (b.chess_sponsored) bestFor.push("Safety-first investors who want CHESS sponsorship");
  if (b.smsf_support) bestFor.push("SMSF trustees needing compliant custody");
  if (b.is_crypto) bestFor.push("Crypto investors on a regulated Australian exchange");
  if (b.fx_rate != null && b.fx_rate <= 0.3) bestFor.push("International investors wanting low FX fees");
  if (!bestFor.length) bestFor.push("General investors looking for a solid all-rounder");
  return bestFor;
}

interface BrokerReviewProps {
  broker: Broker;
  similar: Broker[];
  authorName?: string;
  authorTitle?: string;
  authorUrl?: string;
  datePublished?: string | null;
  dateModified?: string | null;
}

export default function BrokerReviewClient({
  broker: b,
  similar,
  authorName,
  authorTitle,
  authorUrl,
  datePublished,
  dateModified,
}: BrokerReviewProps) {
  const feeRows = [
    { label: 'ASX Brokerage', value: b.asx_fee || 'N/A', numVal: b.asx_fee_value, thresholds: [5, 15] as [number, number], verdict: b.asx_fee_value != null && b.asx_fee_value <= 5 ? 'Low' : b.asx_fee_value != null && b.asx_fee_value <= 15 ? 'Medium' : 'High' },
    { label: 'US Brokerage', value: b.us_fee || 'N/A', numVal: b.us_fee_value, thresholds: [0, 5] as [number, number], verdict: b.us_fee_value === 0 ? 'Free' : b.us_fee_value != null && b.us_fee_value <= 5 ? 'Low' : 'High' },
    { label: 'FX Rate', value: b.fx_rate != null ? `${b.fx_rate}%` : 'N/A', numVal: b.fx_rate, thresholds: [0.3, 0.5] as [number, number], verdict: b.fx_rate != null && b.fx_rate <= 0.3 ? 'Excellent' : b.fx_rate != null && b.fx_rate <= 0.5 ? 'Fair' : 'Expensive' },
    { label: 'Inactivity Fee', value: b.inactivity_fee || 'None', numVal: b.inactivity_fee === 'None' || !b.inactivity_fee ? 0 : 1, thresholds: [0, 0] as [number, number], verdict: b.inactivity_fee === 'None' || !b.inactivity_fee ? 'None' : 'Watch out' },
  ];

  const stickyDetail = `${b.asx_fee || 'N/A'} ASX · ${b.chess_sponsored ? 'CHESS' : 'Custodial'} · ${b.rating}/5`;
  const bestFor = getBestFor(b);

  // Real cost calculations
  const asxCost = b.asx_fee_value ?? 0;
  const usCost = (amount: number) => {
    const fee = b.us_fee_value ?? 0;
    const fxCost = amount * ((b.fx_rate ?? 0) / 100);
    return fee + fxCost;
  };
  const costScenarios = [
    { label: "$1,000 ASX Trade", amount: 1000, cost: asxCost, type: "asx" as const },
    { label: "$5,000 US Trade", amount: 5000, cost: usCost(5000), type: "us" as const },
    { label: "$10,000 US Trade", amount: 10000, cost: usCost(10000), type: "us" as const },
  ];

  return (
    <div className="py-12">
      <div className="container-custom max-w-4xl">
        {/* Breadcrumb */}
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-brand">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/reviews" className="hover:text-brand">Reviews</Link>
          <span className="mx-2">/</span>
          <span className="text-brand">{b.name}</span>
        </div>

        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start gap-4 mb-3">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold shrink-0"
              style={{ background: `${b.color}20`, color: b.color }}
            >
              {b.icon || b.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl md:text-4xl font-extrabold">{b.name} Review (2026)</h1>
              <p className="text-slate-600 mt-1">{b.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <span className="text-amber text-sm">{renderStars(b.rating || 0)}</span>
            <span className="text-sm text-slate-500">{b.rating}/5</span>
            {b.chess_sponsored && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">CHESS Sponsored</span>
            )}
            {b.deal && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Deal of the Month</span>
            )}
          </div>
          <a
            href={getAffiliateLink(b)}
            target="_blank"
            rel={AFFILIATE_REL}
            onClick={() => trackClick(b.slug, b.name, 'review-header', `/broker/${b.slug}`, 'review')}
            className="inline-block px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors"
          >
            {getBenefitCta(b, 'review')}
          </a>
          <RiskWarningInline />
        </div>
        <p className="text-xs text-slate-400 mb-3">
          {ADVERTISER_DISCLOSURE_SHORT}
        </p>

        {/* Compact legal disclosures — collapsed accordion */}
        <div className="mb-4 border border-slate-100 rounded-lg px-4">
          <CompactDisclosure />
        </div>

        {/* Author Byline & Dates — E-E-A-T visible signals */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-4 pb-4 border-b border-slate-100">
          {authorName && (
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Reviewed by{" "}
              {authorUrl ? (
                <a href={authorUrl} className="font-semibold text-slate-700 hover:text-green-700 transition-colors">
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

        {/* Deal banner */}
        {b.deal && b.deal_text && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔥</span>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-0.5">Limited Time Deal</div>
                <p className="text-sm font-semibold text-slate-700">{b.deal_text}</p>
                {b.deal_expiry && (
                  <p className="text-[0.65rem] text-amber-600 mt-0.5">
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
              className="shrink-0 px-5 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-all hover:shadow-md active:scale-[0.98]"
            >
              Claim Deal →
            </a>
          </div>
        )}

        {/* Who Is This Best For? */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🎯</span>
            <h2 className="text-lg font-extrabold text-green-900">Who Is {b.name} Best For?</h2>
          </div>
          <ul className="space-y-2">
            {bestFor.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Fee Audit */}
        <h2 className="text-2xl font-extrabold mb-2">Fee Audit</h2>
        <p className="text-slate-600 mb-4 text-sm">We&apos;ve audited {b.name}&apos;s fee structure so you don&apos;t have to read the PDS.</p>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8">
          {feeRows.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 last:border-b-0">
              <span className="text-sm font-medium text-slate-700">{row.label}</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">{row.value}</span>
                <FeeVerdict value={row.numVal} thresholds={row.thresholds} />
              </div>
            </div>
          ))}
        </div>

        {/* Sources & Verification — E-E-A-T transparency signals */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📋</span>
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
              <a href={b.fee_source_url} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
                Pricing page ↗
              </a>
            )}
            {b.fee_source_tcs_url && (
              <a href={b.fee_source_tcs_url} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">
                Terms &amp; Conditions ↗
              </a>
            )}
            <Link href="/how-we-verify" className="text-green-700 hover:underline">
              How we verify fees
            </Link>
            {b.fee_last_checked && (
              <FeesFreshnessIndicator lastChecked={b.fee_last_checked} variant="inline" />
            )}
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
            <p className="text-[0.7rem] text-slate-400 leading-relaxed">
              <strong className="text-slate-500">Editorial independence:</strong> Our ratings and rankings are determined by our editorial team using a standardised methodology. Affiliate partnerships may influence which brokers we review but never our ratings or recommendations.{" "}
              <Link href="/how-we-verify" className="text-green-700 hover:underline">Read our full methodology →</Link>
            </p>
          </div>
        </div>

        {/* Real Cost Example */}
        <div className="border border-slate-200 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🧮</span>
            <h2 className="text-lg font-extrabold">What Would a Typical Trade Cost?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {costScenarios.map((s, i) => (
              <div key={i} className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{s.label}</p>
                <p className="text-2xl font-extrabold text-brand">${s.cost.toFixed(2)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {((s.cost / s.amount) * 100).toFixed(2)}% of trade
                  {s.type === "us" && b.fx_rate != null && (
                    <span className="block text-slate-400">incl. {b.fx_rate}% FX</span>
                  )}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Estimates based on published fee schedule. Actual costs may vary.{' '}
            <Link href="/calculators" className="text-green-700 hover:underline">Try our full calculators →</Link>
          </p>
        </div>

        {/* Inline CTA 1 */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <p className="text-sm flex-1">
            <strong>Like what you see?</strong>{' '}
            {(b.asx_fee_value ?? 999) <= 5
              ? `${b.name} offers some of the lowest fees in Australia.`
              : b.chess_sponsored
              ? `${b.name} is CHESS sponsored — your shares, your name.`
              : `See if ${b.name} fits your needs.`}
          </p>
          <div className="shrink-0 flex flex-col items-start sm:items-end">
            <a
              href={getAffiliateLink(b)}
              target="_blank"
              rel={AFFILIATE_REL}
              onClick={() => trackClick(b.slug, b.name, 'review-inline-1', `/broker/${b.slug}`, 'review')}
              className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
            >
              {getBenefitCta(b, 'review')}
            </a>
            <RiskWarningInline />
          </div>
        </div>

        {/* Safety Check */}
        <h2 className="text-2xl font-extrabold mb-3">Safety &amp; Scam Check</h2>
        <div className={`rounded-xl p-6 mb-8 border ${b.chess_sponsored ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{b.chess_sponsored ? '✅' : '⚠️'}</span>
            <h3 className="text-lg font-bold">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {b.pros && b.pros.length > 0 && (
            <div className="bg-green-50 rounded-xl p-6">
              <h3 className="text-green-800 font-bold mb-3">What We Like</h3>
              <ul className="space-y-2">
                {b.pros.map((pro: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-green-600 font-bold mt-0.5">+</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {b.cons && b.cons.length > 0 && (
            <div className="bg-red-50 rounded-xl p-6">
              <h3 className="text-red-800 font-bold mb-3">What We Don&apos;t</h3>
              <ul className="space-y-2">
                {b.cons.map((con: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-red-600 font-bold mt-0.5">-</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Inline CTA 2 */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <p className="text-sm flex-1">
            <strong>Ready to decide?</strong>{' '}
            {b.deal
              ? b.deal_text
              : (b.asx_fee_value ?? 999) === 0
              ? 'Trade with $0 brokerage on ASX and US shares.'
              : (b.asx_fee_value ?? 999) <= 5
              ? `Start trading from just ${b.asx_fee} per trade.`
              : 'Open an account in minutes.'}
          </p>
          <div className="shrink-0 flex flex-col items-start sm:items-end">
            <a
              href={getAffiliateLink(b)}
              target="_blank"
              rel={AFFILIATE_REL}
              onClick={() => trackClick(b.slug, b.name, 'review-inline-2', `/broker/${b.slug}`, 'review')}
              className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
            >
              {getBenefitCta(b, 'review')}
            </a>
            <RiskWarningInline />
          </div>
        </div>

        {/* Details Grid */}
        <h2 className="text-2xl font-extrabold mb-3">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-[0.65rem] uppercase text-slate-500 tracking-wide font-medium mb-1">Platforms</p>
            <p className="text-sm font-medium">{b.platforms?.join(', ') || 'N/A'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-[0.65rem] uppercase text-slate-500 tracking-wide font-medium mb-1">Payment Methods</p>
            <p className="text-sm font-medium">{b.payment_methods?.join(', ') || 'N/A'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-[0.65rem] uppercase text-slate-500 tracking-wide font-medium mb-1">SMSF Support</p>
            <p className="text-sm font-medium">{b.smsf_support ? 'Yes' : 'No'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-[0.65rem] uppercase text-slate-500 tracking-wide font-medium mb-1">Min Deposit</p>
            <p className="text-sm font-medium">{b.min_deposit || '$0'}</p>
          </div>
        </div>

        {/* Similar Brokers */}
        {similar.length > 0 && (
          <>
            <h2 className="text-xl font-extrabold mb-2">Similar Brokers</h2>
            <p className="text-sm text-slate-600 mb-4">If {b.name} isn&apos;t quite right, consider these alternatives:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {similar.map(s => (
                <Link
                  key={s.slug}
                  href={`/broker/${s.slug}`}
                  className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold mb-2"
                    style={{ background: `${s.color}20`, color: s.color }}
                  >
                    {s.icon || s.name.charAt(0)}
                  </div>
                  <h3 className="font-bold text-sm">{s.name}</h3>
                  <div className="text-xs text-amber">{renderStars(s.rating || 0)} <span className="text-slate-500">{s.rating}/5</span></div>
                  <div className="text-xs text-slate-500 mt-1">ASX: {s.asx_fee} · {s.chess_sponsored ? 'CHESS' : 'Custodial'}</div>
                  <span className="inline-block mt-2 text-xs px-3 py-1 border border-slate-200 rounded-md">Compare →</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Bottom CTA */}
        <div className="bg-amber-400 text-slate-900 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-extrabold mb-2">Ready to try {b.name}?</h2>
          <p className="text-slate-700 mb-4">
            {b.deal_text || ((b.asx_fee_value ?? 999) <= 5
              ? `Start trading from just ${b.asx_fee} per trade. Takes under 5 minutes.`
              : 'Open an account and start trading in minutes.')}
          </p>
          <a
            href={getAffiliateLink(b)}
            target="_blank"
            rel={AFFILIATE_REL}
            onClick={() => trackClick(b.slug, b.name, 'review-bottom', `/broker/${b.slug}`, 'review')}
            className="inline-block px-8 py-3.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 hover:shadow-lg transition-all active:scale-[0.98] text-lg"
          >
            {getBenefitCta(b, 'review')}
          </a>
          <RiskWarningInline />
          <p className="text-xs text-slate-600 mt-3">{ADVERTISER_DISCLOSURE_SHORT}</p>
        </div>

        {/* Not convinced? Quiz prompt */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 mb-2">Want to compare other options?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/quiz" className="text-sm text-green-700 font-semibold hover:text-green-800 transition-colors border border-green-200 rounded-lg px-4 py-2 hover:bg-green-50">
              Take Our Broker Quiz →
            </Link>
            <Link href="/compare" className="text-sm text-slate-600 font-semibold hover:text-slate-800 transition-colors border border-slate-200 rounded-lg px-4 py-2 hover:bg-slate-50">
              Compare All Brokers →
            </Link>
          </div>
        </div>
      </div>

      <StickyCTABar broker={b} detail={stickyDetail} context="review" />
    </div>
  );
}
