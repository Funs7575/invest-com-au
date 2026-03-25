"use client";

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

interface Props {
  userEmail: string;
  userFirstName: string;
  currentMatch: MatchedAdvisor | null;
  allMatches: MatchedAdvisor[];
  onRematch: () => void;
  rematching: boolean;
  noMoreMatches: boolean;
  onRestart: () => void;
  submitError: string | null;
  onConfirm: (advisor: MatchedAdvisor) => void;
  confirming: boolean;
  confirmedAdvisorId: number | null;
}

export default function AdvisorMatchedScreen({
  userEmail, userFirstName, currentMatch, allMatches,
  onRematch, rematching, noMoreMatches, onRestart,
  submitError, onConfirm, confirming, confirmedAdvisorId,
}: Props) {
  const isCurrentConfirmed = !!(currentMatch && confirmedAdvisorId === currentMatch.id);

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center py-3">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
          {isCurrentConfirmed
            ? "You're connected!"
            : currentMatch
            ? "We found a match!"
            : "Request Received!"}
        </h2>
        <p className="text-sm text-slate-500">
          {isCurrentConfirmed
            ? `${currentMatch!.name} has been notified and will be in touch shortly`
            : currentMatch
            ? `${userFirstName}, review this advisor and confirm if you'd like to connect`
            : "We'll match you with a verified professional shortly"}
        </p>
        {allMatches.length > 1 && (
          <p className="text-xs text-amber-600 font-semibold mt-1">
            Match {allMatches.length} of {allMatches.length}{noMoreMatches ? " (all available)" : ""}
          </p>
        )}
      </div>

      {/* Matched advisor card */}
      {currentMatch && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-white shadow-lg">
          {/* Header bar */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Icon name="zap" size={14} className="text-white" />
              <span className="text-xs font-bold tracking-wide uppercase">Your Matched Advisor</span>
            </div>
            {currentMatch.verified && (
              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-0.5">
                <Icon name="shield-check" size={12} className="text-white" />
                <span className="text-[0.65rem] font-semibold text-white">ASIC Verified</span>
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
                  width={72}
                  height={72}
                  className="rounded-xl object-cover w-16 h-16 md:w-[72px] md:h-[72px] ring-2 ring-amber-200"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg md:text-xl font-extrabold text-slate-900 leading-tight">{currentMatch.name}</h3>
                <p className="text-sm font-semibold text-amber-600 mt-0.5">{typeLabel(currentMatch.type)}</p>
                {currentMatch.firm_name && (
                  <p className="text-xs text-slate-500 mt-0.5">{currentMatch.firm_name}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {currentMatch.rating > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            className={`w-3.5 h-3.5 ${i < Math.round(currentMatch.rating) ? "text-amber-400" : "text-slate-200"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-xs text-slate-500">{currentMatch.rating.toFixed(1)}</span>
                      {currentMatch.review_count > 0 && (
                        <span className="text-xs text-slate-400">({currentMatch.review_count})</span>
                      )}
                    </div>
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
                {currentMatch.specialties.slice(0, 4).map((s) => (
                  <span key={s} className="text-[0.65rem] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Fees */}
            {currentMatch.fee_description && (
              <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl mb-5">
                <Icon name="dollar-sign" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600">{currentMatch.fee_description}</p>
              </div>
            )}

            {/* CTA */}
            {!isCurrentConfirmed ? (
              <div className="space-y-2">
                <button
                  onClick={() => onConfirm(currentMatch)}
                  disabled={confirming}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {confirming ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Connecting…
                    </>
                  ) : (
                    <>Yes, connect me with {currentMatch.name.split(" ")[0]} →</>
                  )}
                </button>
                {!noMoreMatches && (
                  <button
                    onClick={onRematch}
                    disabled={rematching}
                    className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-1.5"
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
                      <>Show me a different advisor →</>
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-sm font-bold text-emerald-800 mb-0.5">Request sent!</p>
                <p className="text-xs text-emerald-600">
                  {currentMatch.name} will contact you at <strong>{userEmail}</strong> within 1 business day.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No more matches */}
      {noMoreMatches && !isCurrentConfirmed && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-sm text-slate-500">
          No more matches available in your area.{" "}
          <Link href="/advisors" className="text-amber-600 font-semibold hover:text-amber-700">Browse all advisors →</Link>
        </div>
      )}

      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Footer actions */}
      <div className="text-center pt-2">
        <button
          onClick={onRestart}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Start over →
        </button>
      </div>
    </div>
  );
}
