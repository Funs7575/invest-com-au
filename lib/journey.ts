/**
 * The Journey layer — client-side milestone model behind the delight
 * moments (first save, first compare, quiz done…). Design notes in
 * docs/strategy/FIN_NOTEBOOK.md ("Feel layer").
 *
 * Principles:
 * - Celebrates curiosity and decision-quality, never transactions —
 *   the compliance-safe inverse of trade-confetti. Copy stays factual.
 * - PII-free and schema-free: a tiny localStorage event log under the
 *   `inv_` prefix convention. No network, no cookies, no identity.
 * - Pure + SSR-safe: storage access is guarded; the math is testable.
 */

export type JourneyMilestone =
  | "first_save"
  | "first_compare"
  | "quiz_complete"
  | "first_article"
  | "profile_complete";

export interface JourneyStage {
  /** 1-based stage index. */
  level: number;
  name: string;
  /** What reaching the NEXT stage takes — the nudge copy. */
  nextHint: string | null;
}

/** Stage ladder: named identity per level of engagement. */
const STAGES: { name: string; nextHint: string | null }[] = [
  { name: "Curious", nextHint: "Save anything that catches your eye to start your shortlist." },
  { name: "Explorer", nextHint: "Save one more and compare them side by side." },
  { name: "Comparer", nextHint: "Two minutes of quiz questions sharpens every match on the site." },
  { name: "Shortlister", nextHint: "Read one guide on your shortlisted picks — it all compounds." },
  { name: "Decision-ready", nextHint: null },
];

export const JOURNEY_MILESTONE_LABELS: Record<JourneyMilestone, string> = {
  first_save: "First save on your shortlist",
  first_compare: "First side-by-side comparison",
  quiz_complete: "Quiz complete — matches personalised",
  first_article: "First guide read",
  profile_complete: "Investor profile complete",
};

const STORAGE_KEY = "inv_journey";

interface JourneyState {
  /** Milestone → ISO timestamp of first occurrence. */
  milestones: Partial<Record<JourneyMilestone, string>>;
}

function readState(): JourneyState {
  if (typeof window === "undefined") return { milestones: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { milestones: {} };
    const parsed = JSON.parse(raw) as JourneyState;
    return parsed && typeof parsed === "object" && parsed.milestones ? parsed : { milestones: {} };
  } catch {
    return { milestones: {} };
  }
}

function writeState(state: JourneyState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full/blocked — the journey quietly degrades to stateless.
  }
}

export function journeyStageFor(milestoneCount: number): JourneyStage {
  const idx = Math.min(milestoneCount, STAGES.length - 1);
  const stage = STAGES[idx]!;
  return { level: idx + 1, name: stage.name, nextHint: stage.nextHint };
}

export interface MilestoneResult {
  /** True the first time this milestone is ever recorded. */
  isNew: boolean;
  milestone: JourneyMilestone;
  /** Stage after recording. */
  stage: JourneyStage;
  /** True when this milestone tipped the user into a new stage. */
  stageAdvanced: boolean;
  /** Total distinct milestones reached. */
  count: number;
  totalMilestones: number;
}

/**
 * Record a milestone (idempotent). Returns enough for the caller to
 * decide between a full celebration (isNew) and a quiet acknowledgement.
 */
export function recordMilestone(milestone: JourneyMilestone): MilestoneResult {
  const state = readState();
  const isNew = !state.milestones[milestone];
  const prevCount = Object.keys(state.milestones).length;
  if (isNew) {
    state.milestones[milestone] = new Date().toISOString();
    writeState(state);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("inv:journey"));
    }
  }
  const count = Object.keys(state.milestones).length;
  return {
    isNew,
    milestone,
    stage: journeyStageFor(count),
    stageAdvanced: isNew && journeyStageFor(count).level > journeyStageFor(prevCount).level,
    count,
    totalMilestones: Object.keys(JOURNEY_MILESTONE_LABELS).length,
  };
}

export function journeySnapshot(): { count: number; stage: JourneyStage; milestones: JourneyMilestone[] } {
  const state = readState();
  const milestones = Object.keys(state.milestones) as JourneyMilestone[];
  return { count: milestones.length, stage: journeyStageFor(milestones.length), milestones };
}
