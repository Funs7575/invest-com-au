/**
 * lib/advisor-profile-match.ts
 *
 * Computes a factual compatibility score (0–100) between a user's stated
 * investment preferences and an advisor's stated service offerings.
 *
 * COMPLIANCE: This is NOT a suitability recommendation under RG 234 / RG 256.
 * The score reflects stated profile overlap only (user's stated preferences
 * matched against advisor's stated specialties and minimum investment). It does
 * not imply advice quality, past performance, or suitability.
 *
 * Pure function — no I/O.
 */

export interface UserMatchProfile {
  primary_vertical: string | null;
  budget_band: string | null;
  is_fhb: boolean;
  is_hnw: boolean;
  is_pre_retiree: boolean;
  experience_level: string | null;
  location_state?: string | null;
}

export interface AdvisorMatchProfile {
  id: number;
  specialties: unknown;      // JSONB — string[] in practice
  min_investment_cents: number | null;
  minimum_investment_cents: number | null;
  location_state: string | null;
  office_states: string[] | null;
  accepts_new_clients: boolean;
  advisor_tier: string | null;
  rating: number | null;
  review_count: number | null;
}

export interface IdealClientCriteria {
  verticals?: string[];
  budget_bands?: string[];
  archetypes?: string[];
  experience_levels?: string[];
  description?: string;
}

/**
 * Boost added to the match score (up to 10 pts) when the user's profile
 * matches the advisor's stated ideal-client criteria.
 *
 * This is an additive bonus on top of the base 0–100 score — capped at 100.
 */
export function computeIdealClientBoost(
  user: UserMatchProfile,
  criteria: IdealClientCriteria | null | undefined,
): number {
  if (!criteria) return 0;

  let matches = 0;
  let checks = 0;

  if (criteria.verticals && criteria.verticals.length > 0) {
    checks++;
    if (user.primary_vertical && criteria.verticals.includes(user.primary_vertical)) matches++;
  }

  if (criteria.budget_bands && criteria.budget_bands.length > 0) {
    checks++;
    if (user.budget_band && criteria.budget_bands.includes(user.budget_band)) matches++;
  }

  if (criteria.archetypes && criteria.archetypes.length > 0) {
    checks++;
    const userArchetypes = [
      ...(user.is_fhb ? ["fhb"] : []),
      ...(user.is_hnw ? ["hnw"] : []),
      ...(user.is_pre_retiree ? ["pre_retiree"] : []),
    ];
    if (userArchetypes.some((a) => criteria.archetypes!.includes(a))) matches++;
  }

  if (criteria.experience_levels && criteria.experience_levels.length > 0) {
    checks++;
    if (user.experience_level && criteria.experience_levels.includes(user.experience_level)) matches++;
  }

  if (checks === 0) return 0;
  return Math.round((matches / checks) * 10);
}

// Budget band midpoints in cents (for min_investment comparison)
const BUDGET_MIDPOINTS: Record<string, number> = {
  under_100k:  50_000_00,
  "100k_250k": 175_000_00,
  "250k_500k": 375_000_00,
  "500k_1m":   750_000_00,
  "1m_5m":   2_500_000_00,
  "5m_plus": 10_000_000_00,
};

function toSpecialtiesArray(specialties: unknown): string[] {
  if (!specialties) return [];
  if (Array.isArray(specialties)) return specialties.map(String);
  if (typeof specialties === "string") {
    try { return JSON.parse(specialties) as string[]; } catch { return [specialties]; }
  }
  return [];
}

/**
 * Returns 0–100 compatibility between a user profile and an advisor profile.
 *
 * Weights:
 *   Specialty / vertical match   40 pts
 *   Budget / minimum investment  30 pts
 *   Archetype alignment          20 pts  (FHB / HNW / pre-retiree)
 *   Location overlap             10 pts
 *   Ideal-client criteria boost   0–10 pts (additive, capped at 100)
 */
export function computeAdvisorProfileMatch(
  user: UserMatchProfile,
  advisor: AdvisorMatchProfile,
  idealCriteria?: IdealClientCriteria | null,
): number {
  const specs = toSpecialtiesArray(advisor.specialties);
  const specsLower = specs.map((s) => s.toLowerCase());

  let score = 0;

  // 1. Specialty / vertical match (40 pts)
  if (user.primary_vertical) {
    const v = user.primary_vertical.toLowerCase();
    if (specsLower.some((s) => s.includes(v) || v.includes(s))) {
      score += 40;
    } else if (specsLower.length > 0) {
      // Some specialty listed but no match — partial credit for having specialties
      score += 8;
    }
  } else if (specsLower.length > 0) {
    // No vertical set — neutral partial
    score += 15;
  } else {
    // Generalist advisor, no vertical set — neutral
    score += 20;
  }

  // 2. Budget / minimum investment match (30 pts)
  const minInvest = advisor.min_investment_cents ?? advisor.minimum_investment_cents;
  const userMidpoint = user.budget_band ? (BUDGET_MIDPOINTS[user.budget_band] ?? null) : null;
  if (userMidpoint != null && minInvest != null) {
    if (minInvest <= userMidpoint) {
      score += 30;
    } else if (minInvest <= userMidpoint * 2) {
      score += 15; // slightly above budget — partial
    }
  } else if (minInvest == null) {
    score += 20; // no minimum stated — assume accessible
  }

  // 3. Archetype alignment (20 pts)
  let archetypeScore = 0;
  if (user.is_fhb && specsLower.some((s) => s.includes("first home") || s.includes("fhb") || s.includes("property"))) {
    archetypeScore += 10;
  }
  if (user.is_hnw && specsLower.some((s) => s.includes("hnw") || s.includes("high net worth") || s.includes("smsf") || s.includes("estate"))) {
    archetypeScore += 10;
  }
  if (user.is_pre_retiree && specsLower.some((s) => s.includes("retirement") || s.includes("retiree") || s.includes("super") || s.includes("pension"))) {
    archetypeScore += 10;
  }
  // Cap archetype contribution at 20 pts
  score += Math.min(20, archetypeScore === 0 ? 10 : archetypeScore);

  // 4. Location overlap (10 pts)
  const userState = user.location_state ?? null;
  if (userState) {
    const advisorStates = advisor.office_states ?? (advisor.location_state ? [advisor.location_state] : []);
    if (advisorStates.map((s) => s.toLowerCase()).includes(userState.toLowerCase())) {
      score += 10;
    }
  } else {
    score += 5; // no location set — neutral half credit
  }

  // Apply ideal-client criteria boost
  const boost = computeIdealClientBoost(user, idealCriteria);

  return Math.min(100, score + boost);
}
