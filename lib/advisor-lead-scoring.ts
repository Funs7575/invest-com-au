/**
 * Advisor lead quality scoring.
 *
 * Turns a raw lead payload into a 0-100 quality score plus a
 * human-readable band (cold / warm / hot) and an audit trail
 * of which signals contributed. Used by the lead router to:
 *
 *   1. Prioritise hot leads for advisors (faster dispatch)
 *   2. Set per-lead fees (hot leads cost more)
 *   3. Let advisors dispute low-quality leads with an audit trail
 *
 * This is a deterministic scorer — no ML, no external services.
 * The inputs are things we can observe about the lead at intake
 * time:
 *
 *   - Contact completeness (phone + email + name all present?)
 *   - Source page (a lead from /find-advisor is higher intent
 *     than one from the homepage)
 *   - Quiz + form depth (did they answer >3 questions?)
 *   - Budget / need declared (SMSF $500k+ trumps "just looking")
 *   - Email domain class (personal > disposable > corporate)
 *   - Attribution channel (direct > organic > paid social)
 *
 * Every signal has a weight in SIGNAL_WEIGHTS so the tuning
 * surface is one constant, not code scattered across routes.
 */

export type LeadBand = "cold" | "warm" | "hot";

export interface LeadScoringInput {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  message?: string | null;
  sourcePage?: string | null;
  /** From the quiz: how many answers did the user submit. */
  quizAnswerCount?: number | null;
  /** Declared budget/investment amount in AUD. */
  declaredBudgetAud?: number | null;
  /**
   * Stated intent from form — 'info' | 'comparison' | 'ready_to_engage'.
   * ready_to_engage scores highest; info scores lowest.
   */
  intent?: string | null;
  /** UTM medium: 'direct' | 'organic' | 'social' | 'paid' */
  utmMedium?: string | null;
  /** Is the email from a known disposable domain list. */
  isDisposableEmail?: boolean | null;
  /** Has the same email previously submitted a bookable lead. */
  isRepeatLeadEmail?: boolean | null;
}

export interface LeadScoringSignal {
  code: string;
  weight: number;
  contribution: number;
  detail?: string;
}

export interface LeadScoringResult {
  score: number;                // 0-100
  band: LeadBand;
  signals: LeadScoringSignal[];
}

/**
 * Weight catalogue. Positive weights add to score, negative
 * subtract. Total theoretical range is ~ -40 to +140; the
 * compute step clamps to 0-100.
 */
const SIGNAL_WEIGHTS = {
  contact_email: 5,
  contact_phone: 10,
  contact_name: 5,
  contact_complete_bonus: 5,       // +5 if all three are present
  message_substantive: 10,          // >30 chars
  quiz_deep: 15,                    // 4+ answers
  quiz_shallow: 5,                  // 1-3 answers
  budget_high: 25,                  // >= 500k
  budget_mid: 15,                   // 100k-500k
  budget_low: 5,                    // 10k-100k
  intent_ready: 20,
  intent_comparison: 10,
  intent_info: 0,
  source_find_advisor: 10,
  source_quiz: 10,
  source_article: 5,
  utm_direct: 10,
  utm_organic: 5,
  utm_paid: 0,
  utm_social: 0,
  disposable_email_penalty: -30,
  repeat_email_penalty: -10,
} as const;

function bandFor(score: number): LeadBand {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

export function scoreLead(input: LeadScoringInput): LeadScoringResult {
  const signals: LeadScoringSignal[] = [];
  let score = 0;

  const add = (code: keyof typeof SIGNAL_WEIGHTS, detail?: string) => {
    const weight = SIGNAL_WEIGHTS[code];
    signals.push({ code, weight, contribution: weight, detail });
    score += weight;
  };

  // Contact completeness
  const hasEmail = !!input.email && input.email.length > 3;
  const hasPhone = !!input.phone && input.phone.length >= 8;
  const hasName = !!input.name && input.name.trim().length >= 2;
  if (hasEmail) add("contact_email");
  if (hasPhone) add("contact_phone");
  if (hasName) add("contact_name");
  if (hasEmail && hasPhone && hasName) add("contact_complete_bonus");

  // Message depth
  const msgLen = (input.message || "").trim().length;
  if (msgLen >= 30) add("message_substantive", `${msgLen} chars`);

  // Quiz depth
  const qCount = input.quizAnswerCount || 0;
  if (qCount >= 4) add("quiz_deep", `${qCount} answers`);
  else if (qCount >= 1) add("quiz_shallow", `${qCount} answers`);

  // Budget — high-net-worth leads are worth dramatically more.
  const budget = input.declaredBudgetAud || 0;
  if (budget >= 500_000) add("budget_high", `$${budget.toLocaleString()}`);
  else if (budget >= 100_000) add("budget_mid", `$${budget.toLocaleString()}`);
  else if (budget >= 10_000) add("budget_low", `$${budget.toLocaleString()}`);

  // Intent
  const intent = (input.intent || "").toLowerCase();
  if (intent === "ready_to_engage") add("intent_ready");
  else if (intent === "comparison") add("intent_comparison");
  else if (intent === "info") add("intent_info");

  // Source page
  const src = (input.sourcePage || "").toLowerCase();
  if (src.includes("/find-advisor")) add("source_find_advisor");
  else if (src.includes("/quiz")) add("source_quiz");
  else if (src.includes("/article") || src.includes("/best-for")) add("source_article");

  // UTM medium
  const medium = (input.utmMedium || "").toLowerCase();
  if (medium === "direct" || medium === "(direct)" || medium === "") add("utm_direct");
  else if (medium === "organic" || medium === "search") add("utm_organic");
  else if (medium === "paid" || medium === "cpc" || medium === "ppc") add("utm_paid");
  else if (medium === "social") add("utm_social");

  // Penalties — applied AFTER the positives so the signal list
  // shows the full picture of why the score is what it is.
  if (input.isDisposableEmail) add("disposable_email_penalty");
  if (input.isRepeatLeadEmail) add("repeat_email_penalty");

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    band: bandFor(score),
    signals,
  };
}
