/**
 * lib/getmatched/drip-lane.ts
 *
 * Lane-aware drip variants (Decision Engine §3 — "drip templates get
 * lane-aware variants"). Pure: given a plan's stored route + answers, it
 * derives the hero lane and returns the copy angle the resume email should
 * lead with.
 *
 * - hero `advisor`   → lead with the matched-advisor angle
 * - hero `listings`  → lead with new-matching-listings angle
 * - hero `platforms` → lead with the fee / comparison angle
 * - anything else (brief / education / no signal) → the default copy
 *
 * No I/O, no new infra, no new flag. The existing plan-resume-digest cron
 * calls this to pick the variant; the master `email_drip_send` kill switch
 * still gates the send.
 *
 * General information only — no advice, no personal recommendation in the
 * variant copy.
 */
import type { ActionPlanAnswers, RouteType } from "./types";
import { resolveLanes, type LaneKind } from "./resolve-lanes";

/** The hero lanes that have a tailored drip angle. */
export type DripLane = "advisor" | "listings" | "platforms" | "default";

export interface DripLaneInput {
  /** Persisted plan route (may be null on a bare draft). */
  route?: RouteType | null;
  /** Persisted answers — fed to the pure lane resolver when present. */
  answers?: ActionPlanAnswers | null;
}

export interface DripVariant {
  lane: DripLane;
  /** Email subject lead (the digest appends the goal line). */
  subjectLead: string;
  /** One-sentence body intro that leads with the lane's angle. */
  intro: string;
}

/**
 * Route → hero-lane fallback, used when answers are absent or resolve to
 * no signal. Mirrors how `inferRoute` route types map onto lane kinds.
 */
function laneFromRoute(route: RouteType | null | undefined): DripLane {
  switch (route) {
    case "individual":
    case "firm":
    case "expert_team":
    case "second_opinion":
      return "advisor";
    case "browse":
      return "listings";
    case "compare":
      return "platforms";
    default:
      // investor_brief / listing_brief / guide → no tailored angle.
      return "default";
  }
}

/** Map a resolved hero LaneKind to a drip lane (brief/education → default). */
function laneFromHero(hero: LaneKind): DripLane {
  if (hero === "advisor" || hero === "listings" || hero === "platforms") {
    return hero;
  }
  return "default";
}

/**
 * Resolve the drip lane for a plan. Prefers the answer-driven hero (the same
 * pure resolver the result screen uses) and falls back to the stored route.
 */
export function resolveDripLane(input: DripLaneInput): DripLane {
  const answers = input.answers;
  if (answers && Object.keys(answers).length > 0) {
    const hero = resolveLanes(answers).hero;
    const lane = laneFromHero(hero);
    if (lane !== "default") return lane;
  }
  return laneFromRoute(input.route);
}

const VARIANTS: Record<DripLane, Omit<DripVariant, "lane">> = {
  advisor: {
    subjectLead: "Your matched professional is ready",
    intro:
      "We lined up a professional who fits what you described — pick up your plan to see who and why.",
  },
  listings: {
    subjectLead: "New opportunities match your plan",
    intro:
      "Opportunities matching your stated criteria are waiting in your plan — open it to browse the specific matches.",
  },
  platforms: {
    subjectLead: "Compare the platforms that fit your plan",
    intro:
      "We shortlisted the platforms that fit your goal, with a factual fee comparison — open your plan to weigh them up.",
  },
  default: {
    subjectLead: "Pick up where you left off",
    intro:
      "You started building an investment action plan but didn't finish — it takes under a minute to wrap up.",
  },
};

/** Pick the full drip variant (subject lead + intro) for a plan. */
export function selectDripVariant(input: DripLaneInput): DripVariant {
  const lane = resolveDripLane(input);
  return { lane, ...VARIANTS[lane] };
}
