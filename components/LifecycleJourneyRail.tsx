import Link from "next/link";
import { getJourneyContexts } from "@/lib/lifecycle-journeys";

/**
 * <LifecycleJourneyRail> — surfaces the lifecycle journey context for the
 * current hub, showing adjacent stages ("where you came from" and "where
 * this leads") so users can self-navigate the full financial life-event arc.
 *
 * Rendered automatically by <HubPage> when the hub slug is present in at
 * least one LIFECYCLE_JOURNEY. Returns null when no journey includes this hub,
 * so there's no empty state to handle at the call site.
 *
 * Uses only the primary journey for brevity — in rare cases where a hub
 * appears in multiple journeys, the first (entry-point-preferred) journey
 * is shown.
 *
 * L1 — lifecycle-funnel stream (BUILD-EVERYTHING-QUEUE.md)
 */

interface LifecycleJourneyRailProps {
  hubSlug: string;
}

export default function LifecycleJourneyRail({ hubSlug }: LifecycleJourneyRailProps) {
  const contexts = getJourneyContexts(hubSlug);
  if (contexts.length === 0) return null;

  // Render the primary context; if the hub is in multiple journeys, show the
  // first as the "main" and mention the others inline.
  const primary = contexts[0];
  if (!primary) return null;

  const { journey, currentIndex, prevStage, nextStage } = primary;
  const totalStages = journey.stages.length;

  return (
    <section
      className="py-10 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-amber-50"
      data-testid="lifecycle-journey-rail"
      aria-label={`Your journey: ${journey.title}`}
    >
      <div className="container-custom max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1">
              Your journey
            </p>
            <h2 className="text-xl font-extrabold text-slate-900">{journey.title}</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-lg">{journey.description}</p>
          </div>
          {/* Progress indicator */}
          <div
            className="shrink-0 flex flex-col items-end gap-1"
            aria-label={`Stage ${currentIndex + 1} of ${totalStages}`}
          >
            <span className="text-xs text-slate-500 font-medium">
              Stage {currentIndex + 1} of {totalStages}
            </span>
            <div className="flex gap-1" aria-hidden="true">
              {journey.stages.map((stage, i) => (
                <span
                  key={stage.hubSlug}
                  className={`h-1.5 w-6 rounded-full transition-colors ${
                    i === currentIndex
                      ? "bg-amber-500"
                      : i < currentIndex
                        ? "bg-emerald-400"
                        : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Stage cards — prev / current / next */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Previous stage */}
          {prevStage ? (
            <Link
              href={prevStage.href ?? `/${prevStage.hubSlug}`}
              className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-sm transition-all"
              aria-label={`Previous stage: ${prevStage.label}`}
            >
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">
                ← Previous stage
              </p>
              <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 mb-1 transition-colors">
                {prevStage.label}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">{prevStage.tagline}</p>
            </Link>
          ) : (
            <div className="hidden sm:block" aria-hidden="true" />
          )}

          {/* Current stage (non-linked, highlighted) */}
          <div
            className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4"
            aria-current="step"
          >
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
              You are here
            </p>
            <p className="text-sm font-bold text-amber-900 mb-1">
              {journey.stages[currentIndex]?.label ?? hubSlug}
            </p>
            <p className="text-xs text-amber-800 leading-relaxed">
              {journey.stages[currentIndex]?.tagline ?? ""}
            </p>
          </div>

          {/* Next stage */}
          {nextStage ? (
            <Link
              href={nextStage.href ?? `/${nextStage.hubSlug}`}
              className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition-all"
              aria-label={`Next stage: ${nextStage.label}`}
            >
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
                Next stage →
              </p>
              <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700 mb-1 transition-colors">
                {nextStage.label}
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">{nextStage.tagline}</p>
            </Link>
          ) : (
            <div className="hidden sm:block" aria-hidden="true" />
          )}
        </div>

        {/* All stages mini-nav */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-400 mr-1">Full journey:</span>
          {journey.stages.map((stage, i) => {
            const isCurrent = i === currentIndex;
            return isCurrent ? (
              <span
                key={stage.hubSlug}
                className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500 text-slate-900"
                aria-current="step"
              >
                {stage.label}
              </span>
            ) : (
              <Link
                key={stage.hubSlug}
                href={stage.href ?? `/${stage.hubSlug}`}
                className="text-xs font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700 transition-colors"
              >
                {stage.label}
              </Link>
            );
          })}
        </div>

        {/* Other journeys this hub belongs to */}
        {contexts.length > 1 && (
          <p className="mt-3 text-xs text-slate-400">
            Also part of:{" "}
            {contexts
              .slice(1)
              .map((ctx, i) => (
                <span key={ctx.journey.id}>
                  {i > 0 && ", "}
                  <span className="font-medium text-slate-500">{ctx.journey.title}</span>
                </span>
              ))}
          </p>
        )}
      </div>
    </section>
  );
}
