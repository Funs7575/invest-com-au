"use client";

/**
 * Imperative "journey moment" — the celebration card for milestone
 * events (first save, first compare, quiz done). Follows the house
 * imperative-toast pattern (components/Toast.tsx) so any client
 * component can fire it without providers or layout changes.
 *
 * Feel: a spring-in card (bottom-centre, thumb territory on mobile)
 * with the milestone, stage-progress dots, and one next-step line —
 * celebration that immediately hands back momentum. Confetti only on
 * stage advances, and never when the user prefers reduced motion.
 */

import {
  recordMilestone,
  JOURNEY_MILESTONE_LABELS,
  type JourneyMilestone,
  type MilestoneResult,
} from "@/lib/journey";

const CARD_ID = "__journey_moment";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function renderCard(result: MilestoneResult): void {
  document.getElementById(CARD_ID)?.remove();

  const card = document.createElement("div");
  card.id = CARD_ID;
  card.setAttribute("role", "status");
  card.setAttribute("aria-live", "polite");
  card.className =
    "fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm rounded-2xl border-2 border-amber-200 bg-white shadow-xl p-4 toast-enter";

  const reduced = prefersReducedMotion();

  // Stage-progress dots: filled per milestone reached.
  const dots = Array.from({ length: result.totalMilestones })
    .map(
      (_, i) =>
        `<span class="inline-block w-1.5 h-1.5 rounded-full ${i < result.count ? "bg-amber-500" : "bg-slate-200"}"></span>`,
    )
    .join("");

  const confetti =
    result.stageAdvanced && !reduced
      ? `<div class="confetti-container confetti-active" aria-hidden="true">${Array.from({ length: 12 })
          .map(
            (_, i) =>
              `<span class="confetti-particle" style="--confetti-delay:${(i * 0.05).toFixed(2)}s; left:${8 + i * 7}%"></span>`,
          )
          .join("")}</div>`
      : "";

  card.innerHTML = `
    ${confetti}
    <div class="flex items-start gap-3">
      <div class="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-base" aria-hidden="true">⭐</div>
      <div class="min-w-0">
        <p class="text-sm font-bold text-slate-900 leading-snug">${JOURNEY_MILESTONE_LABELS[result.milestone]}</p>
        <p class="text-xs text-slate-500 mt-0.5">Stage ${result.stage.level}: ${result.stage.name}</p>
        <div class="flex items-center gap-1 mt-1.5">${dots}</div>
        ${result.stage.nextHint ? `<p class="text-xs text-slate-600 mt-1.5 leading-relaxed">${result.stage.nextHint}</p>` : ""}
      </div>
    </div>`;

  document.body.appendChild(card);
  const ttl = reduced ? 3200 : 4200;
  window.setTimeout(() => {
    card.classList.remove("toast-enter");
    card.classList.add("toast-exit");
    window.setTimeout(() => card.remove(), 250);
  }, ttl);
}

/**
 * Record the milestone and, when it's genuinely new, show the moment.
 * Returns the result so callers can fall back to a quiet toast for
 * repeat actions. Safe to call from any client event handler.
 */
export function fireJourneyMoment(milestone: JourneyMilestone): MilestoneResult {
  const result = recordMilestone(milestone);
  if (result.isNew && typeof document !== "undefined") {
    renderCard(result);
  }
  return result;
}
