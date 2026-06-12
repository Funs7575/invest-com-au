"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Get Matched Showcase G1 (docs/plans/GET_MATCHED_SHOWCASE.md): the real
 * "analyzing moment". Replaces the fake spinner with a staged checklist that
 * animates through the engine's actual stages — reading answers, scoring
 * platforms, ranking advisors, checking supply, composing the plan — ticking
 * each with a check, and ending on a match-score count-up.
 *
 * Dual-gate contract is unchanged (GetMatchedClient gates the result on BOTH
 * this animation's onComplete AND the resolve fetch). This screen owns ONLY
 * the minimum dwell — it fires onComplete when its animation finishes; the
 * client still waits for the resolve payload before swapping to the result.
 *
 * The optional `result` prop carries the (possibly already-resolved) resolve
 * response. When present, the later stages show REAL counts ("Scored N
 * platforms", "Ranked M advisors", "Found K listings") and the count-up uses
 * the real match score. When absent the stages show generic labels — we NEVER
 * block on the data.
 *
 * prefers-reduced-motion: the list renders statically (all ticked) and
 * onComplete fires after a short delay. aria-live="polite" on the stage list.
 */

/** Minimum dwell — long enough to read the five stages tick through. */
const TOTAL_DWELL_MS = 2600;
const STAGE_COUNT = 5;
const STAGE_INTERVAL_MS = Math.floor(TOTAL_DWELL_MS / (STAGE_COUNT + 1));
const REDUCED_MOTION_DWELL_MS = 600;

/** The subset of the resolve response this screen reads to show real counts. */
export interface AnalyzingResultData {
  top_matches?: { kind?: string }[];
  listing_matches?: unknown[];
  match_explainer?: { score: number } | null;
}

interface Props {
  /** Called once when the staged animation (minimum dwell) completes. */
  onComplete: () => void;
  /** Optional resolve payload — when present, stages show real counts. */
  result?: AnalyzingResultData | null;
}

interface StageCounts {
  platforms: number | null;
  advisors: number | null;
  listings: number | null;
}

function deriveCounts(result: AnalyzingResultData | null | undefined): StageCounts {
  if (!result) return { platforms: null, advisors: null, listings: null };
  const matches = result.top_matches ?? [];
  const brokers = matches.filter((m) => m.kind === "broker").length;
  const advisors = matches.filter((m) => m.kind === "advisor").length;
  return {
    platforms: brokers > 0 ? brokers : null,
    advisors: advisors > 0 ? advisors : null,
    listings: result.listing_matches ? result.listing_matches.length : null,
  };
}

function stageLabels(counts: StageCounts): string[] {
  return [
    "Reading your answers",
    counts.platforms !== null
      ? `Scored ${counts.platforms} platform${counts.platforms === 1 ? "" : "s"} on your signals`
      : "Scoring platforms on your signals",
    counts.advisors !== null
      ? `Ranked ${counts.advisors} verified professional${counts.advisors === 1 ? "" : "s"}`
      : "Ranking verified professionals",
    counts.listings !== null
      ? `Found ${counts.listings} matching listing${counts.listings === 1 ? "" : "s"}`
      : "Checking live supply",
    "Composing your plan",
  ];
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function AnalyzingScreen({ onComplete, result }: Props) {
  const reducedMotion = prefersReducedMotion();
  const [activeStage, setActiveStage] = useState(reducedMotion ? STAGE_COUNT : 0);
  // The score count-up runs once the stages finish.
  const targetScore = result?.match_explainer?.score ?? null;
  const [displayScore, setDisplayScore] = useState<number | null>(null);

  // Keep onComplete stable across renders so the timer effect doesn't restart
  // when the parent re-renders (e.g. when the resolve payload arrives).
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Counts can arrive mid-animation; recompute labels on every render so a
  // late-landing payload upgrades the generic labels to real counts in place.
  const counts = deriveCounts(result);
  const labels = stageLabels(counts);

  useEffect(() => {
    if (reducedMotion) {
      const t = setTimeout(() => onCompleteRef.current(), REDUCED_MOTION_DWELL_MS);
      return () => clearTimeout(t);
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= STAGE_COUNT; i++) {
      timers.push(setTimeout(() => setActiveStage(i), STAGE_INTERVAL_MS * i));
    }
    const complete = setTimeout(() => onCompleteRef.current(), TOTAL_DWELL_MS);
    timers.push(complete);
    return () => timers.forEach(clearTimeout);
  }, [reducedMotion]);

  // Score count-up: start once all stages have ticked. ~500ms ramp.
  useEffect(() => {
    if (targetScore === null) return;
    if (reducedMotion) {
      setDisplayScore(targetScore);
      return;
    }
    if (activeStage < STAGE_COUNT) return;
    const steps = 18;
    let frame = 0;
    const iv = setInterval(() => {
      frame++;
      setDisplayScore(Math.round((targetScore * frame) / steps));
      if (frame >= steps) clearInterval(iv);
    }, 28);
    return () => clearInterval(iv);
  }, [targetScore, activeStage, reducedMotion]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6" role="status">
      <div className="w-full max-w-md">
        <p className="text-base sm:text-lg font-semibold text-slate-900 mb-1 text-center">
          Building your action plan…
        </p>
        <p className="text-sm text-slate-500 mb-6 text-center">
          Running your answers through the matching engine.
        </p>

        <ul aria-live="polite" className="space-y-2.5">
          {labels.map((label, i) => {
            const done = i < activeStage;
            const current = i === activeStage && !reducedMotion;
            return (
              <li
                key={i}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  done
                    ? "border-emerald-200 bg-emerald-50"
                    : current
                      ? "border-amber-300 bg-amber-50"
                      : "border-slate-200 bg-white"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    done
                      ? "border-emerald-500 bg-emerald-500"
                      : current
                        ? "border-amber-400"
                        : "border-slate-300"
                  }`}
                >
                  {done ? (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : current ? (
                    <span className="w-2 h-2 rounded-full bg-amber-500 motion-safe:animate-pulse" />
                  ) : null}
                </span>
                <span
                  className={`text-sm ${
                    done
                      ? "text-slate-700 font-medium"
                      : current
                        ? "text-slate-900 font-semibold"
                        : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Match-score count-up — appears once the stages finish. */}
        {displayScore !== null && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white border-2 border-emerald-300 ring-2 ring-emerald-200 flex items-center justify-center">
              <span className="text-2xl font-extrabold text-emerald-700">
                {displayScore}
              </span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest font-bold text-emerald-700">
                Match score
              </p>
              <p className="text-xs text-slate-500">Based on your answers</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
