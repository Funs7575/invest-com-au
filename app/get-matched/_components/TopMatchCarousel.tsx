"use client";

import Image from "next/image";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { TopMatch } from "@/lib/getmatched/types";
import { SHOW_ADVISOR_RATINGS, SHOW_RATINGS } from "@/lib/compliance-config";
import { trackClick } from "@/lib/tracking";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import { formatAnnualFee } from "@/lib/getmatched/fee-projection";

/**
 * Top-3 carousel — first card is the affiliate-aware hero (existing
 * TopMatchCard styling), 2nd + 3rd are slimmer comparison cards.
 * Horizontal scroll on mobile, 3-column grid on desktop. Each card
 * is independently affiliate-tracked.
 *
 * Replaces the single-card variant. If only 1 match is returned the
 * hero renders without runner-ups; if 0, parent skips the section.
 */

interface Props {
  matches: TopMatch[];
}

/** Licence gate per match kind — broker and advisor ratings are separately
 *  flagged in lib/compliance-config (single source). */
function showRatingFor(match: TopMatch): boolean {
  return match.kind === "advisor" ? SHOW_ADVISOR_RATINGS : SHOW_RATINGS;
}

export default function TopMatchCarousel({ matches }: Props) {
  if (matches.length === 0) return null;

  const hero = matches[0]!;
  const runners = matches.slice(1, 3);

  // Showcase G3 — factual fee projections. The hero shows its own annual
  // estimate (with the trade-frequency assumption disclosed inline). When the
  // hero and a runner-up both have projections, surface a strictly factual
  // delta on whichever is cheaper — calculator output, never a quality claim.
  const heroFee = hero.kind === "broker" ? hero.fee_projection : undefined;
  const cheapestRunner = runners
    .filter((m) => m.kind === "broker" && m.fee_projection)
    .sort(
      (a, b) =>
        a.fee_projection!.annualCostAud - b.fee_projection!.annualCostAud,
    )[0];

  // Compare hero vs cheapest runner-up; the saving line shows on the cheaper.
  let savingOnHero: number | null = null;
  let savingRunnerSlug: string | null = null;
  let savingRunnerAmount: number | null = null;
  let savingRunnerVsName: string | null = null;
  if (heroFee && cheapestRunner?.fee_projection) {
    const runnerCost = cheapestRunner.fee_projection.annualCostAud;
    const gap = Math.abs(heroFee.annualCostAud - runnerCost);
    if (gap > 0) {
      if (heroFee.annualCostAud < runnerCost) {
        savingOnHero = gap; // hero is cheaper than the runner-up
      } else {
        savingRunnerSlug = cheapestRunner.slug;
        savingRunnerAmount = gap; // runner-up is cheaper than the hero
        savingRunnerVsName = hero.name;
      }
    }
  }

  return (
    <section className="mb-6" style={{ animation: "iv-reveal 400ms ease-out" }}>
      {/* Hero card (same as TopMatchCard original) */}
      <div className="bg-white rounded-3xl border-2 border-amber-300 shadow-lg p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {hero.logo_url ? (
            <Image
              src={hero.logo_url}
              alt={`${hero.name} logo`}
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
              {hero.name}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              {hero.one_line_why}
            </p>
            {heroFee && (
              <p className="mt-1.5 text-xs sm:text-sm font-semibold text-slate-900">
                ≈ {formatAnnualFee(heroFee)} on your stated amount
                <span className="font-normal text-slate-500">
                  {" "}· {heroFee.assumptionLabel}
                </span>
              </p>
            )}
            {savingOnHero !== null && cheapestRunner && (
              <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                ≈ ${savingOnHero.toLocaleString("en-AU")}/yr less than {cheapestRunner.name}
              </p>
            )}
          </div>
          {showRatingFor(hero) && hero.rating !== null && (
            <div className="hidden sm:block text-right shrink-0">
              <div className="inline-flex items-center gap-1 text-sm font-bold text-slate-900">
                <Icon name="star" size={14} className="text-amber-500" />
                {hero.rating.toFixed(1)}
              </div>
              <p className="text-[10px] text-slate-500">out of 5</p>
            </div>
          )}
        </div>
        <Link
          href={hero.cta_href}
          onClick={() => trackClick(hero.slug, hero.name, 'get-matched-1', '/get-matched', 'get-matched')}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm sm:text-base px-5 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
        >
          {hero.cta_label}
          <Icon name="arrow-right" size={14} />
        </Link>
        <p className="mt-3 text-[11px] text-slate-500 text-center">
          {ADVERTISER_DISCLOSURE_SHORT}
        </p>
      </div>

      {/* Runner-up cards — slimmer, side-by-side */}
      {runners.length > 0 && (
        <>
          <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-5 mb-2.5 px-1">
            Other strong matches
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {runners.map((m, i) => (
              <Link
                key={m.slug}
                href={m.cta_href}
                onClick={() => trackClick(m.slug, m.name, `get-matched-${i + 2}`, '/get-matched', 'get-matched')}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-amber-400 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <div className="flex items-start gap-3">
                  {m.logo_url ? (
                    <Image
                      src={m.logo_url}
                      alt={`${m.name} logo`}
                      width={40}
                      height={40}
                      className="rounded-lg object-contain bg-slate-50 shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-base shrink-0">
                      {m.tier === 2 ? "🥈" : "🥉"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <p className="font-bold text-sm text-slate-900 truncate">{m.name}</p>
                      {showRatingFor(m) && m.rating !== null && (
                        <span className="text-[11px] text-slate-500 shrink-0">
                          {m.rating.toFixed(1)} / 5
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-snug">
                      {m.one_line_why}
                    </p>
                    {m.kind === "broker" && m.fee_projection && (
                      <p className="mt-1 text-xs font-semibold text-slate-700">
                        ≈ {formatAnnualFee(m.fee_projection)}
                        <span className="font-normal text-slate-500">
                          {" "}· {m.fee_projection.assumptionLabel}
                        </span>
                      </p>
                    )}
                    {savingRunnerSlug === m.slug &&
                      savingRunnerAmount !== null &&
                      savingRunnerVsName && (
                        <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                          ≈ ${savingRunnerAmount.toLocaleString("en-AU")}/yr less than {savingRunnerVsName}
                        </p>
                      )}
                  </div>
                  <Icon
                    name="arrow-right"
                    size={14}
                    className="text-slate-300 group-hover:text-amber-500 shrink-0 mt-1"
                  />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <p className="text-[11px] text-slate-500 mt-3 text-center">
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
