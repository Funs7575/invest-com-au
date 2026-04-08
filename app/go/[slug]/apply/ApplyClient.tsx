"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { trackEvent } from "@/lib/tracking";

interface ApplyBroker {
  name: string;
  slug: string;
  tagline: string | null;
  rating: number | null;
  logo_url: string | null;
  asx_fee: string | null;
  us_fee: string | null;
  fx_rate: number | null;
  chess_sponsored: boolean;
  year_founded: number | null;
  affiliate_url: string | null;
  deal: boolean;
  deal_text: string | null;
  deal_badge: string | null;
  pros: string[] | string | null;
  platform_type: string | null;
  min_deposit: string | null;
}

function parsePros(pros: string[] | string | null): string[] {
  if (!pros) return [];
  if (Array.isArray(pros)) return pros;
  try {
    const parsed = JSON.parse(pros);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function RatingStars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.25 && rating - full < 0.75;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center" aria-label={`${rating} out of 5 stars`}>
        {Array.from({ length: full }).map((_, i) => (
          <span key={`f${i}`} className="text-amber-500 text-sm">
            &#9733;
          </span>
        ))}
        {hasHalf && (
          <span className="text-amber-400 text-sm">&#9733;</span>
        )}
        {Array.from({ length: empty }).map((_, i) => (
          <span key={`e${i}`} className="text-slate-200 text-sm">
            &#9733;
          </span>
        ))}
      </div>
      <span className="text-xs font-semibold text-slate-600">
        {rating.toFixed(1)}/5
      </span>
    </div>
  );
}

export default function ApplyClient({ broker }: { broker: ApplyBroker }) {
  const [countdown, setCountdown] = useState(15);
  const [cancelled, setCancelled] = useState(false);

  const redirectUrl = `/go/${broker.slug}?placement=apply_page`;

  // Track conversion_intent impression
  useEffect(() => {
    trackEvent("conversion_intent", {
      broker_slug: broker.slug,
      broker_name: broker.name,
    }, `/go/${broker.slug}/apply`);
  }, [broker.slug, broker.name]);

  // Countdown timer
  useEffect(() => {
    if (cancelled) return;
    if (countdown <= 0) {
      window.location.href = redirectUrl;
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, cancelled, redirectUrl]);

  const handleCancel = useCallback(() => {
    setCancelled(true);
  }, []);

  const prosList = parsePros(broker.pros).slice(0, 3);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-6 md:p-8">
          {/* Broker identity */}
          <div className="flex items-center gap-4 mb-4">
            {broker.logo_url ? (
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-white border border-slate-100">
                <Image
                  src={broker.logo_url}
                  alt={`${broker.name} logo`}
                  width={64}
                  height={64}
                  className="w-full h-full object-contain p-1"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-400 shrink-0">
                {broker.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {broker.name}
              </h1>
              {broker.tagline && (
                <p className="text-sm text-slate-500 mt-0.5">
                  {broker.tagline}
                </p>
              )}
            </div>
          </div>

          {/* Rating */}
          {broker.rating != null && broker.rating > 0 && (
            <div className="mb-5">
              <RatingStars rating={broker.rating} />
            </div>
          )}

          {/* Key fees */}
          {(broker.asx_fee || broker.us_fee || broker.fx_rate != null) && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {broker.asx_fee && (
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-[0.65rem] text-slate-500 uppercase tracking-wider font-medium">
                    ASX Fee
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {broker.asx_fee}
                  </p>
                </div>
              )}
              {broker.us_fee && (
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-[0.65rem] text-slate-500 uppercase tracking-wider font-medium">
                    US Fee
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {broker.us_fee}
                  </p>
                </div>
              )}
              {broker.fx_rate != null && (
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-[0.65rem] text-slate-500 uppercase tracking-wider font-medium">
                    FX Rate
                  </p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {broker.fx_rate}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Trust signals */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              ASIC Regulated
            </span>
            {broker.chess_sponsored && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                CHESS Sponsored
              </span>
            )}
            {broker.year_founded && (
              <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                Est. {broker.year_founded}
              </span>
            )}
          </div>

          {/* Pros list */}
          {prosList.length > 0 && (
            <ul className="space-y-2 mb-5">
              {prosList.map((pro, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-slate-700"
                >
                  <svg
                    className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {pro}
                </li>
              ))}
            </ul>
          )}

          {/* Deal banner */}
          {broker.deal_text && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
              <div className="flex items-center gap-2">
                {broker.deal_badge && (
                  <span className="inline-block px-2 py-0.5 bg-amber-500 text-white text-[0.6rem] font-bold uppercase rounded">
                    {broker.deal_badge}
                  </span>
                )}
                <p className="text-sm font-semibold text-amber-900">
                  {broker.deal_text}
                </p>
              </div>
            </div>
          )}

          {/* Primary CTA */}
          <Link
            href={`/go/${broker.slug}?placement=apply_page&ref=apply`}
            className="block w-full text-center px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Continue to {broker.name}
          </Link>

          {/* Secondary link */}
          <div className="text-center mt-3">
            <Link
              href="/compare"
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              &larr; Back to comparison
            </Link>
          </div>

          {/* Countdown / auto-redirect */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            {!cancelled ? (
              <div>
                <p className="text-xs text-slate-400">
                  Redirecting in{" "}
                  <span className="font-semibold text-slate-600">
                    {countdown}
                  </span>{" "}
                  seconds...
                </p>
                <button
                  onClick={handleCancel}
                  className="text-xs text-slate-400 underline hover:text-slate-600 transition-colors mt-1"
                >
                  Cancel auto-redirect
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Auto-redirect cancelled. Click the button above when ready.
              </p>
            )}
          </div>

          {/* Fine print */}
          <p className="text-[0.65rem] text-slate-400 text-center mt-4 leading-relaxed">
            You&apos;re being redirected to {broker.name}&apos;s website.
            Invest.com.au may earn a commission.
          </p>
        </div>
      </div>
    </div>
  );
}
