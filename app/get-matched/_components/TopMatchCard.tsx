"use client";

import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { TopMatch } from "@/lib/getmatched/types";

/**
 * Hero card on the result screen when route = `compare`. Mirrors the
 * styling of the old quiz's `QuizTopMatch.tsx` so users coming from
 * either entry point see the same revenue-aware reveal moment.
 *
 * Compliance note: copy reads "Best match based on your answers" (passive
 * routing language), not "We recommend" (personal-advice phrasing).
 */

interface Props {
  match: TopMatch;
}

export default function TopMatchCard({ match }: Props) {
  return (
    <section
      className="bg-white rounded-3xl border-2 border-amber-300 shadow-lg p-5 sm:p-6 mb-6"
      style={{ animation: "iv-reveal 400ms ease-out" }}
    >
      <div className="flex items-start gap-4">
        {match.logo_url ? (
          <Image
            src={match.logo_url}
            alt={`${match.name} logo`}
            width={56}
            height={56}
            className="rounded-xl object-contain bg-slate-50 shrink-0"
            unoptimized
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">
            🏆
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 mb-1">
            Best match based on your answers
          </p>
          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-0.5">
            {match.name}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600">
            {match.one_line_why}
          </p>
        </div>
        {match.rating !== null && (
          <div className="hidden sm:block text-right shrink-0">
            <div className="inline-flex items-center gap-1 text-sm font-bold text-slate-900">
              <Icon name="star" size={14} className="text-amber-500" />
              {match.rating.toFixed(1)}
            </div>
            <p className="text-[10px] text-slate-400">out of 5</p>
          </div>
        )}
      </div>
      <Link
        href={match.cta_href}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm sm:text-base px-5 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        {match.cta_label}
        <Icon name="arrow-right" size={14} />
      </Link>
      <p className="text-[10px] text-slate-400 mt-3 text-center">
        Routed from your answers. General information only — not personal advice.
      </p>
      <style>{`
        @keyframes iv-reveal {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </section>
  );
}
