/**
 * Startup match-feed scoring helpers.
 *
 * Pure functions — no DB calls. Tested in __tests__/lib/startup-match.test.ts.
 *
 * Scoring weights (0–100 scale):
 *   +10 per overlapping sector (up to 50)
 *   +15 if any stage_preference matches startup.stage
 *   +5  if ESIC eligible (tax incentive signal)
 *   +10 if min_ticket_aud <= round min ticket threshold
 * Filtered out entirely: wholesale_only rounds when investor not verified.
 */

export interface OpenRound {
  id: string;
  startup_id: string;
  instrument: string;
  target_aud_cents: number;
  raised_aud_cents: number;
  min_ticket_aud_cents: number;
  wholesale_only: boolean;
  closes_at: string | null;
}

export interface StartupProfileSnippet {
  id: string;
  company_name: string;
  slug: string;
  sector: string[];
  stage: string;
  status: string;
  esic_eligible_self_attested: boolean;
  esic_verified_at: string | null;
}

export interface StartupThesis {
  sector_tags?: string[];
  stage_preferences?: string[];
  min_ticket_aud?: number | null;
  max_ticket_aud?: number | null;
  geography?: string[];
}

export interface ScoredRound {
  round: OpenRound;
  profile: StartupProfileSnippet;
  score: number;
  sectorMatches: string[];
  blockedReason: "wholesale_only" | null;
}

/** Lowercase + replace non-alphanumeric with underscore for tag comparison. */
function normalizeSector(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/**
 * Score a single round against the investor's thesis.
 * Returns `blockedReason: "wholesale_only"` when the investor doesn't hold a
 * verified cert — the caller can choose to omit or surface these rounds with
 * an "upgrade required" badge.
 */
export function scoreRound(
  round: OpenRound,
  profile: StartupProfileSnippet,
  thesis: StartupThesis,
  isWholesaleVerified: boolean,
): ScoredRound {
  const blockedReason: ScoredRound["blockedReason"] =
    round.wholesale_only && !isWholesaleVerified ? "wholesale_only" : null;

  const thesisSectors = (thesis.sector_tags ?? []).map(normalizeSector);
  const startupSectors = (profile.sector ?? []).map(normalizeSector);
  const sectorMatches = thesisSectors.filter((t) => startupSectors.includes(t));

  let score = 0;
  score += Math.min(sectorMatches.length * 10, 50);

  const stages = thesis.stage_preferences ?? [];
  if (stages.length === 0 || stages.includes(profile.stage as never)) {
    score += 15;
  }

  if (profile.esic_eligible_self_attested || profile.esic_verified_at) {
    score += 5;
  }

  const minTicketAud = round.min_ticket_aud_cents / 100;
  const thesisMax = thesis.max_ticket_aud ?? null;
  const thesisMin = thesis.min_ticket_aud ?? null;
  if (thesisMax === null || minTicketAud <= thesisMax) {
    score += 10;
  }
  // Slight penalty if round min is above investor's stated minimum (they may
  // want smaller tickets) — but don't go below 0.
  if (thesisMin !== null && minTicketAud > thesisMin * 4) {
    score = Math.max(0, score - 5);
  }

  return { round, profile, score, sectorMatches, blockedReason };
}

/**
 * Score all open rounds against the thesis, filter out inaccessible wholesale
 * rounds, and return descending by score (ties broken by closes_at ascending).
 */
export function rankRounds(
  rounds: OpenRound[],
  profiles: StartupProfileSnippet[],
  thesis: StartupThesis,
  isWholesaleVerified: boolean,
): ScoredRound[] {
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const scored: ScoredRound[] = [];
  for (const round of rounds) {
    const profile = profileMap.get(round.startup_id);
    if (!profile) continue;
    if (profile.status !== "active") continue;
    const result = scoreRound(round, profile, thesis, isWholesaleVerified);
    // Omit blocked rounds from the visible feed
    if (result.blockedReason === null) {
      scored.push(result);
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aClose = a.round.closes_at ?? "9999";
    const bClose = b.round.closes_at ?? "9999";
    return aClose < bClose ? -1 : aClose > bClose ? 1 : 0;
  });

  return scored;
}

export function raisedPct(round: OpenRound): number {
  if (round.target_aud_cents <= 0) return 0;
  return Math.min(100, Math.round((round.raised_aud_cents / round.target_aud_cents) * 100));
}

export function formatAud(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `$${(dollars / 1_000).toFixed(0)}K`;
  return `$${dollars.toFixed(0)}`;
}
