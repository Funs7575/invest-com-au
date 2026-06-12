/**
 * Journey staging (Feel layer v2 — restores the modules PR #1561's
 * consumers import; the originals never landed with that merge).
 *
 * A visitor's stage is derived purely from their unlocked research
 * milestones (lib/milestones — localStorage, client-side). Stages name the
 * research arc, never investing prowess (§9 firewall): Curious → Saver →
 * Comparer → Planner → Decider.
 *
 * Server-side (no localStorage) this resolves to Stage 1, which is also
 * the correct cold-visitor answer.
 */

import { getMilestones, hasMilestone } from "@/lib/milestones";

export interface JourneyStage {
  level: number;
  name: string;
  /** One factual nudge towards the next stage; null when the consumer's
   *  own fallback copy is the better fit. */
  nextHint: string | null;
}

export interface JourneySnapshot {
  stage: JourneyStage;
  /** Count of unlocked milestones, for progress affordances. */
  unlockedCount: number;
}

const STAGES: JourneyStage[] = [
  {
    level: 1,
    name: "Curious",
    nextHint: null, // consumers carry the best "how to start saving" copy in context
  },
  {
    level: 2,
    name: "Saver",
    nextHint: "You've started saving — three saves of one kind makes a side-by-side shortlist.",
  },
  {
    level: 3,
    name: "Comparer",
    nextHint: "You've compared real numbers — a saved plan keeps your next steps in one place.",
  },
  {
    level: 4,
    name: "Planner",
    nextHint: "Plan in hand — whatever you decide next, you'll have done the homework first.",
  },
  {
    level: 5,
    name: "Decider",
    nextHint: null, // nothing to upsell at the top of the research arc
  },
];

function stageLevel(): number {
  if (hasMilestone("decided_broker")) return 5;
  if (hasMilestone("first_plan_saved") || hasMilestone("profile_complete")) return 4;
  if (hasMilestone("first_compare")) return 3;
  if (hasMilestone("first_save")) return 2;
  return 1;
}

export function journeySnapshot(): JourneySnapshot {
  const level = stageLevel();
  const stage = STAGES[level - 1] ?? STAGES[0]!;
  return {
    stage,
    unlockedCount: Object.keys(getMilestones()).length,
  };
}
