/**
 * lib/decision-kit/scorecards.ts
 *
 * Decision Kit — post-call scorecard criteria, validation, and the weighted
 * decision summary maths.
 *
 * After an intro call the consumer rates each respondent against a small,
 * FIXED set of criteria on a 1-5 scale. The client then combines those into a
 * plain "your scores" comparison. Critically this NEVER auto-recommends an
 * adviser — the copy and the summary deliberately stop at "your scores suggest
 * you lean toward…" and remind the consumer the choice is theirs.
 *
 * The maths here is pure (no I/O) so it is fully unit-testable and can run on
 * the client. The DB read/write helpers live in lib/decision-kit/respondents.ts
 * (server-only) and the API route.
 */

/* ─── Fixed criteria ─── */

export type ScorecardCriterionKey =
  | "clarity"
  | "fee_transparency"
  | "relevance"
  | "rapport"
  | "confidence";

export interface ScorecardCriterion {
  key: ScorecardCriterionKey;
  label: string;
  /** What a high score on this criterion means — shown under the stars. */
  hint: string;
}

/**
 * The five fixed criteria, in display order. Fixed so scores are comparable
 * across respondents and over time. (The DB column is jsonb so this set can
 * grow without a migration, but the API only accepts these keys.)
 */
export const SCORECARD_CRITERIA: readonly ScorecardCriterion[] = [
  {
    key: "clarity",
    label: "Clarity",
    hint: "Explained things plainly, without jargon or evasion.",
  },
  {
    key: "fee_transparency",
    label: "Fee transparency",
    hint: "Was upfront and specific about how they're paid and what it costs.",
  },
  {
    key: "relevance",
    label: "Relevance to me",
    hint: "Understood my situation and addressed my actual brief.",
  },
  {
    key: "rapport",
    label: "Rapport",
    hint: "Listened, and felt like someone I could work with.",
  },
  {
    key: "confidence",
    label: "Confidence in them",
    hint: "Overall, how much they earned my trust on this call.",
  },
] as const;

export const SCORECARD_CRITERION_KEYS: readonly ScorecardCriterionKey[] =
  SCORECARD_CRITERIA.map((c) => c.key);

const CRITERION_KEY_SET = new Set<string>(SCORECARD_CRITERION_KEYS);

export const SCORECARD_MIN = 1;
export const SCORECARD_MAX = 5;
export const SCORECARD_NOTES_MAX = 2000;

/** A single criterion → rating map. Partial: the consumer may skip criteria. */
export type ScorecardCriteria = Partial<Record<ScorecardCriterionKey, number>>;

export interface RespondentScorecard {
  professionalId: number;
  criteria: ScorecardCriteria;
  notes: string | null;
  /** Optional explicit overall (1-5). When null, the average is used. */
  overall: number | null;
  updatedAt: string | null;
}

/* ─── Validation (shared by API Zod schema + reads) ─── */

/**
 * Coerce/validate a raw criteria object into a clean { key: 1-5 } map.
 * Drops unknown keys and out-of-range / non-integer values. Pure.
 */
export function sanitiseCriteria(raw: unknown): ScorecardCriteria {
  if (!raw || typeof raw !== "object") return {};
  const out: ScorecardCriteria = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!CRITERION_KEY_SET.has(k)) continue;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) continue;
    const r = Math.round(n);
    if (r < SCORECARD_MIN || r > SCORECARD_MAX) continue;
    out[k as ScorecardCriterionKey] = r;
  }
  return out;
}

/* ─── Per-scorecard average ─── */

/**
 * Average of the rated criteria for one scorecard (ignores skipped criteria).
 * If an explicit `overall` is set it wins. Returns null when there is nothing
 * to average and no overall. Rounded to 1 dp. Pure.
 */
export function scorecardAverage(card: {
  criteria: ScorecardCriteria;
  overall?: number | null;
}): number | null {
  if (typeof card.overall === "number" && card.overall >= SCORECARD_MIN) {
    return Math.round(card.overall * 10) / 10;
  }
  const vals = Object.values(card.criteria).filter(
    (v): v is number => typeof v === "number",
  );
  if (vals.length === 0) return null;
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  return Math.round(mean * 10) / 10;
}

/** How many of the fixed criteria have been rated on this scorecard. */
export function ratedCount(criteria: ScorecardCriteria): number {
  return SCORECARD_CRITERION_KEYS.reduce(
    (n, k) => (typeof criteria[k] === "number" ? n + 1 : n),
    0,
  );
}

/* ─── Decision summary across respondents ─── */

export interface DecisionSummaryEntry {
  professionalId: number;
  name: string;
  /** Average score 1-5, or null when this respondent hasn't been scored. */
  average: number | null;
  /** Number of criteria rated (0-5). */
  rated: number;
}

export interface DecisionSummary {
  /** Sorted desc by average; unscored respondents sink to the bottom. */
  entries: DecisionSummaryEntry[];
  /** Respondents that actually have at least one rating. */
  scoredCount: number;
  /**
   * The professionalId with the single highest average, ONLY when it is
   * strictly ahead of the runner-up by a clear margin AND at least two
   * respondents are scored. null otherwise (ties, single entry, all unscored).
   * This is a *lean* signal for soft copy — never a recommendation.
   */
  leaderId: number | null;
  /** True when the top two scored respondents are within the tie threshold. */
  isClose: boolean;
}

/** Averages within this of each other are treated as "too close to call". */
export const SUMMARY_TIE_THRESHOLD = 0.3;

/**
 * Build the weighted decision summary from each respondent's scorecard.
 * Pure — the caller passes the respondent names + their scorecards.
 *
 * Deliberately conservative: we only surface a `leaderId` when one respondent
 * is clearly ahead, so the UI never nudges the consumer on a coin-flip.
 */
export function buildDecisionSummary(
  respondents: Array<{ professionalId: number; name: string }>,
  cards: Array<{
    professionalId: number;
    criteria: ScorecardCriteria;
    overall?: number | null;
  }>,
): DecisionSummary {
  const byPro = new Map<number, (typeof cards)[number]>();
  for (const c of cards) byPro.set(c.professionalId, c);

  const entries: DecisionSummaryEntry[] = respondents.map((r) => {
    const card = byPro.get(r.professionalId);
    const criteria = card?.criteria ?? {};
    return {
      professionalId: r.professionalId,
      name: r.name,
      average: card ? scorecardAverage(card) : null,
      rated: ratedCount(criteria),
    };
  });

  // Sort: scored (higher average first) above unscored; stable name tiebreak.
  entries.sort((a, b) => {
    const av = a.average;
    const bv = b.average;
    if (av == null && bv == null) return a.name.localeCompare(b.name);
    if (av == null) return 1;
    if (bv == null) return -1;
    if (bv !== av) return bv - av;
    return a.name.localeCompare(b.name);
  });

  const scored = entries.filter((e) => e.average != null);
  const scoredCount = scored.length;

  let leaderId: number | null = null;
  let isClose = false;
  if (scoredCount >= 2) {
    const top = scored[0]!;
    const second = scored[1]!;
    const gap = (top.average as number) - (second.average as number);
    isClose = gap <= SUMMARY_TIE_THRESHOLD;
    if (!isClose) leaderId = top.professionalId;
  }

  return { entries, scoredCount, leaderId, isClose };
}
