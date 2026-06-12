// Pure user financial health score — no I/O.
// Framed as factual scoring of the user's own data: compliance-safe.

export interface HealthScoreInput {
  // Diversification (from investor_holdings)
  holdingCount: number;
  distinctExchanges: number;
  maxConcentrationPct: number; // 0-100; 100 = single holding

  // Cost (from shortlisted brokers' fee scores; 0-100, higher = cheaper)
  avgFeeScore: number | null; // null = no data

  // Risk alignment (from investor_profiles + investor_goals)
  experienceLevel: "beginner" | "intermediate" | "pro" | null;
  hasGoals: boolean;
  goalProgressPct: number | null; // 0-100 average across goals, or null

  // Engagement (from user_daily_checkins, last 30 days)
  activeCheckinsLast30d: number; // 0–30
  currentStreak: number;
}

export interface HealthScore {
  overall: number;         // 0–100 (rounded integer)
  diversification: number;
  cost: number;
  riskAlignment: number;
  engagement: number;
  grade: "A" | "B" | "C" | "D" | "E";
}

export function computeUserHealthScore(input: HealthScoreInput): HealthScore {
  const diversification = scoreDiversification(input);
  const cost = scoreCost(input);
  const riskAlignment = scoreRiskAlignment(input);
  const engagement = scoreEngagement(input);

  const overall = Math.round(
    diversification * 0.40 +
    cost           * 0.25 +
    riskAlignment  * 0.20 +
    engagement     * 0.15,
  );

  return { overall, diversification, cost, riskAlignment, engagement, grade: gradeFor(overall) };
}

// ── Sub-score functions ───────────────────────────────────────────────────────

function scoreDiversification({ holdingCount, distinctExchanges, maxConcentrationPct }: HealthScoreInput): number {
  if (holdingCount === 0) return 50; // no data — neutral

  let base: number;
  if (holdingCount >= 11)  base = 100;
  else if (holdingCount >= 7)  base = 80;
  else if (holdingCount >= 4)  base = 60;
  else if (holdingCount >= 2)  base = 40;
  else base = 20;

  // Bonus for multi-exchange diversification
  const exchangeBonus = distinctExchanges >= 3 ? 20 : distinctExchanges >= 2 ? 10 : 0;

  // Penalty for extreme concentration
  const concentrationPenalty = maxConcentrationPct > 80 ? 20 : maxConcentrationPct > 60 ? 10 : 0;

  return clamp(base + exchangeBonus - concentrationPenalty, 0, 100);
}

function scoreCost({ avgFeeScore }: HealthScoreInput): number {
  return avgFeeScore ?? 50; // null = no shortlist data, neutral
}

function scoreRiskAlignment({ experienceLevel, hasGoals, goalProgressPct }: HealthScoreInput): number {
  let base = 60; // default

  if (experienceLevel === "pro")           base = 80;
  else if (experienceLevel === "intermediate") base = 70;
  else if (experienceLevel === "beginner") base = 60;

  if (hasGoals) base += 15;

  if (goalProgressPct !== null) {
    // Small bonus for making measurable progress
    if (goalProgressPct >= 75) base += 10;
    else if (goalProgressPct >= 25) base += 5;
  }

  return clamp(base, 0, 100);
}

function scoreEngagement({ activeCheckinsLast30d, currentStreak }: HealthScoreInput): number {
  let base: number;
  if (activeCheckinsLast30d >= 26)     base = 100;
  else if (activeCheckinsLast30d >= 16) base = 75;
  else if (activeCheckinsLast30d >= 6)  base = 50;
  else if (activeCheckinsLast30d >= 1)  base = 25;
  else base = 0;

  // Streak bonus (capped at 20 extra points)
  const streakBonus = Math.min(currentStreak * 2, 20);
  return clamp(base + streakBonus, 0, 100);
}

/** Letter grade for a 0–100 overall score (exported for FY Wrapped). */
export function gradeFor(score: number): HealthScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "E";
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}
