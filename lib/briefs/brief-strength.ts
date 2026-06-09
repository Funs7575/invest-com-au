/**
 * Deterministic brief-strength scoring for the Brief Studio creation flow.
 *
 * Mirrors the 1..5 rubric the AI quality scorer uses (`lib/ai/brief-quality.ts`)
 * — clarity, specificity, genuine intent — but runs client-side with no API
 * call, so the strength meter updates live as the user types and coaches them
 * toward the single highest-impact improvement.
 *
 * The score is a 0..100 sum across six dimensions. Tips are emitted for the
 * dimensions with the biggest remaining gap so the meter always points at the
 * next best thing to add.
 */

export interface BriefStrengthFieldHint {
  key: string;
  required?: boolean;
}

export interface BriefStrengthInput {
  title: string;
  description: string;
  /** "" | budget band | "not_sure" */
  budgetBand: string;
  /** "" | AU state code */
  locationState: string;
  /** Structured template answers. */
  payload: Record<string, unknown>;
  /** The template's field hints, used for structured completeness + timeline relevance. */
  fields: readonly BriefStrengthFieldHint[];
}

export type StrengthTier = "weak" | "fair" | "good" | "great";

export interface StrengthTip {
  id: string;
  text: string;
}

export interface BriefStrength {
  /** 0..100 */
  score: number;
  tier: StrengthTier;
  label: string;
  /** Up to 3 coaching tips, highest-impact first. */
  tips: StrengthTip[];
}

const MONEY_OR_TIME =
  /(\$|\d|asap|urgent|deadline|week|month|year|quarter|by\s|before\s)/i;

function isFilled(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value != null && value !== "";
}

interface Dimension {
  earned: number;
  max: number;
  tip?: StrengthTip;
}

function scoreTitle(title: string): Dimension {
  const len = title.trim().length;
  let earned: number;
  if (len === 0) earned = 0;
  else if (len < 8) earned = 4;
  else if (len < 20) earned = 12;
  else earned = 18;
  if (len >= 8 && /\d/.test(title)) earned = Math.min(20, earned + 2);
  return {
    earned,
    max: 20,
    tip:
      earned < 14
        ? {
            id: "title",
            text: "Make your title specific — add a location, amount or timeframe.",
          }
        : undefined,
  };
}

function scoreDescription(description: string): Dimension {
  const text = description.trim();
  const len = text.length;
  let earned: number;
  if (len < 30) earned = 0;
  else if (len < 80) earned = 14;
  else if (len < 160) earned = 24;
  else if (len < 300) earned = 32;
  else earned = 36;
  if (len >= 30 && MONEY_OR_TIME.test(text)) earned = Math.min(40, earned + 4);
  return {
    earned,
    max: 40,
    tip:
      earned < 28
        ? {
            id: "description",
            text: "Add a sentence or two: your situation, the outcome you want, and any deadline.",
          }
        : undefined,
  };
}

function scoreBudget(budgetBand: string): Dimension {
  let earned: number;
  if (!budgetBand) earned = 0;
  else if (budgetBand === "not_sure") earned = 4;
  else earned = 12;
  return {
    earned,
    max: 12,
    tip:
      earned < 12
        ? {
            id: "budget",
            text: "Set a budget band so pros can pitch the right scope.",
          }
        : undefined,
  };
}

function scoreLocation(locationState: string): Dimension {
  const earned = locationState ? 8 : 0;
  return {
    earned,
    max: 8,
    tip:
      earned === 0
        ? {
            id: "location",
            text: "Add your state so we match pros licensed where you are.",
          }
        : undefined,
  };
}

function scoreTimeline(
  payload: Record<string, unknown>,
  fields: readonly BriefStrengthFieldHint[],
): Dimension {
  const relevant = fields.some((f) => f.key === "timeline");
  if (!relevant) {
    // Template has no timeline field — treat as satisfied so notes-only
    // templates aren't penalised for a question we never asked.
    return { earned: 10, max: 10 };
  }
  const value = payload.timeline;
  let earned: number;
  if (!isFilled(value)) earned = 0;
  else if (value === "not_sure") earned = 3;
  else earned = 10;
  return {
    earned,
    max: 10,
    tip:
      earned < 10
        ? { id: "timeline", text: "Add a timeline so pros know how urgent this is." }
        : undefined,
  };
}

function scoreStructured(
  payload: Record<string, unknown>,
  fields: readonly BriefStrengthFieldHint[],
): Dimension {
  const structural = fields.filter((f) => f.key !== "timeline");
  if (structural.length === 0) return { earned: 10, max: 10 };
  const filled = structural.filter((f) => isFilled(payload[f.key])).length;
  const earned = Math.round((10 * filled) / structural.length);
  return {
    earned,
    max: 10,
    tip:
      earned < 7
        ? {
            id: "structured",
            text: "Answer the remaining detail questions — they help pros quote accurately.",
          }
        : undefined,
  };
}

function tierFor(score: number): { tier: StrengthTier; label: string } {
  if (score < 40) return { tier: "weak", label: "Needs more detail" };
  if (score < 65) return { tier: "fair", label: "Getting there" };
  if (score < 85) return { tier: "good", label: "Strong brief" };
  return { tier: "great", label: "Excellent — pros love this" };
}

export function scoreBriefStrength(input: BriefStrengthInput): BriefStrength {
  const dims: Dimension[] = [
    scoreTitle(input.title),
    scoreDescription(input.description),
    scoreBudget(input.budgetBand),
    scoreLocation(input.locationState),
    scoreTimeline(input.payload, input.fields),
    scoreStructured(input.payload, input.fields),
  ];

  const score = Math.max(
    0,
    Math.min(100, dims.reduce((sum, d) => sum + d.earned, 0)),
  );
  const { tier, label } = tierFor(score);

  const tips = dims
    .filter((d): d is Dimension & { tip: StrengthTip } => d.tip != null)
    .sort((a, b) => b.max - b.earned - (a.max - a.earned))
    .slice(0, 3)
    .map((d) => d.tip);

  return { score, tier, label, tips };
}
