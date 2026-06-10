/**
 * lib/getmatched/resolve-lanes.ts
 *
 * Decision Engine P5 (docs/plans/UNIFIED_MATCHING_ENGINE.md): the composite
 * multi-lane resolver. Where inferRoute() picks ONE RouteType, this ranks ALL
 * outcome lanes — advisor / listings / platforms / brief / education — by
 * intent, urgency (timeline), certainty, and real supply, then applies the
 * composite rule: the top lane is the hero, and any lane within
 * COMPOSITE_BAND points also renders as a full secondary block ("your
 * situation points two ways").
 *
 * Pure — no I/O. Reasons are factual ("you said…"), never advice. The caller
 * provides real supply counts; an empty lane is demoted (never an empty hero)
 * and the brief lane backfills.
 */
import type { ActionPlanAnswers } from "./types";

export type LaneKind = "advisor" | "listings" | "platforms" | "brief" | "education";

export interface RankedLane {
  kind: LaneKind;
  /** 0–100 after modulation. */
  weight: number;
  /** Factual, user-stated reasons this lane is present. */
  reasons: string[];
}

export interface LaneResolution {
  /** All lanes with weight > 0, best first. */
  lanes: RankedLane[];
  hero: LaneKind;
  /** Lanes within COMPOSITE_BAND of the hero (and ≥ MIN_SECONDARY). */
  secondary: LaneKind[];
}

/** Lanes within this many points of the hero render as full blocks too. */
export const COMPOSITE_BAND = 25;
const MIN_SECONDARY = 30;
const SUPPLY_CEILING_WHEN_EMPTY = 15;

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

const HELP_PREFS_ADVISOR = new Set(["individual", "firm", "expert_team", "investor_brief"]);
const LISTING_INTENTS = new Set(["browse", "alt_assets", "royalties", "pre_ipo"]);
const PLATFORM_INTENTS = new Set(["grow", "income", "crypto", "trade", "automate"]);

export interface LaneSupply {
  /** Real result counts where known; omit = unknown (no demotion). */
  advisor?: number;
  listings?: number;
  platforms?: number;
}

export function resolveLanes(
  a: ActionPlanAnswers,
  supply: LaneSupply = {},
): LaneResolution {
  const intent = str(a.intent) ?? "";
  const helpSub = str(a.help_sub);
  const helpPref = str(a.help_preference) ?? "";
  const timeline = str(a.timeline) ?? "";
  const propertySub = str(a.property_sub);

  const w: Record<LaneKind, number> = { advisor: 0, listings: 0, platforms: 0, brief: 20, education: 15 };
  const r: Record<LaneKind, string[]> = { advisor: [], listings: [], platforms: [], brief: [], education: [] };

  // ── Base weights from intent shape ────────────────────────────────────────
  if (helpSub) {
    w.advisor += 80;
    r.advisor.push("You told us which professional you need");
  } else if (intent === "help" || HELP_PREFS_ADVISOR.has(helpPref)) {
    w.advisor += 70;
    r.advisor.push("You asked for professional help");
  }
  if (intent === "home") {
    w.advisor = Math.max(w.advisor, 80);
    r.advisor.push("A loan is the gating step for a home purchase");
  }
  if (intent === "super") {
    w.advisor = Math.max(w.advisor, 65);
    r.advisor.push("Super/SMSF decisions usually need a specialist");
    w.platforms += 35;
  }
  if (intent === "property") {
    w.advisor = Math.max(w.advisor, propertySub === "physical" ? 70 : 50);
    r.advisor.push("Property purchases involve professionals at several steps");
    w.listings += 45;
    r.listings.push("There are live property-related opportunities to browse");
  }
  if (LISTING_INTENTS.has(intent)) {
    w.listings += 75;
    r.listings.push("You wanted to browse opportunities");
    w.platforms += 25;
  }
  if (PLATFORM_INTENTS.has(intent)) {
    w.platforms += 70;
    r.platforms.push("Comparing platforms fits a do-it-yourself goal");
  }
  if (helpPref === "compare" || helpPref === "info_only") {
    w.platforms += 25;
    w.education += helpPref === "info_only" ? 30 : 0;
  }

  // ── Certainty: "not sure" answers → guided composite, never a hard push ──
  let unsureCount = 0;
  if (helpPref === "not_sure") unsureCount++;
  if (intent === "browse" || intent === "not_sure") unsureCount++;
  if (str(a.visa_status) === "not_sure") unsureCount++;
  if (unsureCount >= 1) {
    w.brief += 10 * unsureCount;
    r.brief.push("Not sure yet — describe it once and let professionals respond");
    w.education += 8 * unsureCount;
  }
  const totallyUnsure = unsureCount >= 1 && !helpSub && intent !== "home" && !HELP_PREFS_ADVISOR.has(helpPref);
  if (totallyUnsure) {
    // Guided composite: education/brief lead; the advisor lane stays present
    // but must not be the hero (no hard lead push on an uncertain user).
    w.education += 25;
    r.education.push("Start with guides while you weigh it up");
    w.advisor = Math.min(w.advisor, 35);
  }

  // ── Urgency (timeline) ───────────────────────────────────────────────────
  if (timeline === "now") {
    w.advisor += 15;
    r.advisor.push("You're acting right now — a professional shortcuts mistakes");
    w.education = Math.max(0, w.education - 20);
  } else if (timeline === "researching") {
    // Education-first inversion: a researcher is never lead-pushed — the
    // advisor lane survives as a quiet composite secondary, not the hero.
    w.education += 35;
    r.education.push("You're researching — learn first, commit later");
    w.advisor = Math.max(0, w.advisor - 30);
    w.listings += 5;
  }

  // ── Supply: never render an empty hero ───────────────────────────────────
  for (const kind of ["advisor", "listings", "platforms"] as const) {
    const count = supply[kind];
    if (count === 0 && w[kind] > SUPPLY_CEILING_WHEN_EMPTY) {
      w[kind] = SUPPLY_CEILING_WHEN_EMPTY;
      r[kind].push("Limited matching supply right now");
      w.brief += 15;
      if (!r.brief.includes("Post a brief and let professionals come to you")) {
        r.brief.push("Post a brief and let professionals come to you");
      }
    }
  }

  // ── Rank + composite ─────────────────────────────────────────────────────
  const lanes: RankedLane[] = (Object.keys(w) as LaneKind[])
    .map((kind) => ({ kind, weight: Math.round(Math.max(0, Math.min(100, w[kind]))), reasons: r[kind] }))
    .filter((l) => l.weight > 0)
    .sort((x, y) => y.weight - x.weight);

  const hero = lanes[0]?.kind ?? "education";
  const heroWeight = lanes[0]?.weight ?? 0;
  const secondary = lanes
    .slice(1)
    .filter((l) => l.weight >= MIN_SECONDARY && heroWeight - l.weight <= COMPOSITE_BAND)
    .map((l) => l.kind);

  return { lanes, hero, secondary };
}
