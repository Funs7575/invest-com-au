"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/Icon";

export interface MatchedAdvisor {
  id: number;
  slug: string;
  name: string;
  firm_name: string | null;
  type: string;
  photo_url: string | null;
  rating: number;
  review_count: number;
  location_display: string | null;
  specialties: string[];
  fee_description: string | null;
  verified: boolean;
}

function typeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex" aria-label={`${rating.toFixed(1)} stars out of 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <svg
            key={i}
            className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "text-amber-400" : "text-slate-200"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-xs font-semibold text-slate-700">{rating.toFixed(1)}</span>
      {count > 0 && <span className="text-xs text-slate-400">({count} reviews)</span>}
    </div>
  );
}

interface Props {
  userEmail: string;
  userFirstName: string;
  currentMatch: MatchedAdvisor | null;
  allMatches: MatchedAdvisor[];
  matchIndex: number;
  onRematch: () => void;
  rematching: boolean;
  noMoreMatches: boolean;
  onRestart: () => void;
  submitError: string | null;
  onConfirm: (advisor: MatchedAdvisor) => void;
  confirming: boolean;
}

export default function AdvisorMatchedScreen({
  userEmail, userFirstName, currentMatch, allMatches,
  matchIndex, onRematch, rematching, noMoreMatches, onRestart,
  submitError, onConfirm, confirming,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Scroll to top of card on rematch
  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [matchIndex]);

  if (!currentMatch) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
          <Icon name="search" size={28} className="text-slate-400" />
        </div>
        <div>
          <p className="font-bold text-slate-800 mb-1">No advisors found in your area</p>
          <p className="text-sm text-slate-500 mb-4">
            We couldn&apos;t find a verified match right now, but our team can help.
          </p>
          <Link
            href="/find-advisor"
            className="inline-block px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors"
          >
            Browse all advisors →
          </Link>
        </div>
        <button onClick={onRestart} className="block mx-auto text-xs text-slate-400 hover:text-slate-600 transition-colors mt-2">
          Start over →
        </button>
      </div>
    );
  }

  return (
    <div ref={cardRef} className="space-y-5 advisor-step-enter">
      {/* Header */}
      <div className="text-center py-4">
        <div className="relative w-16 h-16 mx-auto mb-4">
          {/* Outer pulse ring */}
          <div className="absolute inset-0 rounded-full bg-emerald-100 match-ring-pulse" />
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center relative">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1.5">
          We found a match!
        </h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          {userFirstName ? `${userFirstName}, review` : "Review"} this advisor and confirm if you&apos;d like to connect — it&apos;s 100% free.
        </p>

        {/* Match counter */}
        {allMatches.length > 1 && (
          <div className="inline-flex items-center gap-1.5 mt-2 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-semibold text-amber-700">
              Showing match {matchIndex + 1} of {allMatches.length}
            </span>
          </div>
        )}
      </div>

      {/* Advisor card */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-white shadow-lg match-ring-pulse">
        {/* Top bar */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Icon name="zap" size={14} className="text-white" />
            <span className="text-xs font-bold tracking-wide uppercase">Your Matched Advisor</span>
          </div>
          {currentMatch.verified && (
            <div className="flex items-center gap-1 bg-white/25 backdrop-blur-sm rounded-full px-2.5 py-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-[0.65rem] font-bold text-white">ASIC Verified</span>
            </div>
          )}
        </div>

        <div className="p-5 md:p-6">
          {/* Profile */}
          <div className="flex items-start gap-4 mb-5">
            <div className="relative shrink-0">
              <Image
                src={currentMatch.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentMatch.name)}&size=160&background=f59e0b&color=fff&bold=true`}
                alt={currentMatch.name}
                width={80}
                height={80}
                className="rounded-xl object-cover w-16 h-16 md:w-20 md:h-20 ring-2 ring-amber-200"
              />
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-extrabold text-slate-900 leading-tight">{currentMatch.name}</h3>
              <p className="text-sm font-semibold text-amber-600 mt-0.5">{typeLabel(currentMatch.type)}</p>
              {currentMatch.firm_name && (
                <p className="text-xs text-slate-500 mt-0.5">{currentMatch.firm_name}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                {currentMatch.rating > 0 && (
                  <StarRating rating={currentMatch.rating} count={currentMatch.review_count} />
                )}
                {currentMatch.location_display && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Icon name="map-pin" size={10} className="text-slate-400" />
                    {currentMatch.location_display}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Specialties */}
          {currentMatch.specialties?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {currentMatch.specialties.slice(0, 5).map((s) => (
                <span key={s} className="text-[0.65rem] font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Fees */}
          {currentMatch.fee_description && (
            <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl mb-5">
              <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-slate-600 leading-relaxed">{currentMatch.fee_description}</p>
            </div>
          )}

          {/* What happens next — shown before confirm button */}
          <div className="bg-slate-50 rounded-xl p-4 mb-5">
            <p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">What happens next</p>
            <div className="space-y-2.5">
              <div className="flex items-start gap-3 next-step-item next-step-item-1">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[0.6rem] font-extrabold text-amber-700">1</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">Your details are sent to {currentMatch.name.split(" ")[0]}</strong> — they receive your contact info and quiz summary
                </p>
              </div>
              <div className="flex items-start gap-3 next-step-item next-step-item-2">
                <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[0.6rem] font-extrabold text-amber-700">2</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">They contact you within 1 business day</strong> to arrange a free, no-obligation intro call at a time that suits you
                </p>
              </div>
              <div className="flex items-start gap-3 next-step-item next-step-item-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-emerald-700">100% free to you</strong> — no cost, no commitment, no obligation to proceed
                </p>
              </div>
            </div>
          </div>

          {/* CTA buttons */}
          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 mb-3">
              {submitError}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              onClick={() => onConfirm(currentMatch)}
              disabled={confirming}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-amber-200"
            >
              {confirming ? (
                <>
                  <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Connecting you…
                </>
              ) : (
                <>
                  Yes, send my details to {currentMatch.name.split(" ")[0]} — it&apos;s free
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>

            {!noMoreMatches && (
              <button
                onClick={onRematch}
                disabled={rematching}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-1.5 rounded-xl hover:bg-slate-50"
              >
                {rematching ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Finding next match…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Show me a different advisor
                  </>
                )}
              </button>
            )}
          </div>

          {/* Browse link */}
          <div className="mt-3 pt-3 border-t border-slate-100 text-center">
            <Link href="/advisors" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Browse all verified advisors →
            </Link>
          </div>
        </div>
      </div>

      {/* No more matches */}
      {noMoreMatches && allMatches.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-amber-800 mb-1">You&apos;ve seen all available matches</p>
          <p className="text-xs text-amber-700 mb-3">Our directory is growing — browse all verified advisors:</p>
          <Link href="/advisors" className="inline-block px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors">
            Browse all advisors →
          </Link>
        </div>
      )}

      {/* Footer restart */}
      <div className="text-center pt-2">
        <button onClick={onRestart} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          Start the quiz over →
        </button>
      </div>
    </div>
  );
}
