/**
 * Match-score + why-this-route explainer.
 *
 * Pure function. Computes a 0-100 confidence score + a 3-5 bullet "why"
 * list from the user's answers and the engine's resolution. Used by the
 * result screen to show a Match Score badge + transparency strip.
 *
 * Score derivation (deterministic, no randomness, no DB):
 *   - Base 55 points
 *   - +10 per concrete signal we routed on (intent picked, sub-question
 *     answered, help_preference set, budget band set, timeline set,
 *     advisor type inferred from goal+budget)
 *   - Capped at 99 — we never display 100% (trust copy: "very strong
 *     match" not "perfect match")
 *
 * Bullets are plain English, ordered by signal strength.
 */

import type { ActionPlanAnswers, IntentSlug, RouteType, Vertical } from "./types";
import type { AdvisorType } from "./inference";

export interface MatchExplainer {
  score: number;
  /** 3-5 plain-English bullets explaining the routing decision. */
  bullets: string[];
}

interface ExplainerInput {
  answers: ActionPlanAnswers;
  intent: IntentSlug | null;
  route: RouteType;
  vertical: Vertical | null;
  advisorType: AdvisorType | null;
}

const INTENT_HUMAN_LABELS: Partial<Record<IntentSlug, string>> = {
  grow:        "long-term growth",
  income:      "income & dividends",
  crypto:      "crypto investing",
  trade:       "active trading",
  automate:    "robo / hands-off investing",
  super:       "super / SMSF",
  property:    "property",
  home:        "buying a home / loan",
  alt_assets:  "alternative assets",
  royalties:   "royalty / income-producing assets",
  pre_ipo:     "pre-IPO / wholesale deals",
  help:        "expert help",
  browse:      "exploring options",
  smsf_property: "SMSF property",
  foreign_investor: "investing into Australia from overseas",
  opportunity_assessment: "assessing a specific opportunity",
};

const HELP_PREFERENCE_LABELS: Record<string, string> = {
  info_only:      "you wanted information only",
  browse:         "you wanted to browse opportunities",
  compare:        "you wanted a platform comparison",
  individual:     "you wanted to connect with one expert",
  firm:           "you wanted to connect with a firm",
  expert_team:    "you wanted a multi-discipline team",
  investor_brief: "you wanted to get quotes from pros",
};

const BUDGET_LABELS: Record<string, string> = {
  under_10k:  "under A$10k",
  "10k_100k": "A$10k–$100k",
  "100k_500k": "A$100k–$500k",
  "500k_1m":  "A$500k–$1m",
  "1m_plus":  "over A$1m",
};

const TIMELINE_LABELS: Record<string, string> = {
  now:         "you're ready now",
  "1_3_months": "you're acting in 1–3 months",
  "3_6_months": "you're acting in 3–6 months",
  "6_12_months": "you're acting in 6–12 months",
  researching:  "you're researching",
};

const SUB_QUESTION_LABELS: Record<string, Record<string, string>> = {
  property_sub: {
    physical: "you want to buy physical property",
    reit:     "you want REITs / fractional",
    smsf:     "you want to use SMSF for property",
    browse:   "you want to browse listings first",
  },
  crypto_sub: {
    first_buy: "you're a first-time crypto buyer",
    hodl:      "you're a long-term holder",
    active:    "you're an active trader",
    tax:       "you need crypto tax help",
  },
  super_sub: {
    compare_funds: "you want to compare super funds",
    smsf_setup:    "you want to set up an SMSF",
    smsf_property: "you want SMSF property",
    pre_retire:    "you're pre-retirement planning",
  },
};

export function buildMatchExplainer(input: ExplainerInput): MatchExplainer {
  const { answers, intent, route, vertical, advisorType } = input;
  const bullets: string[] = [];
  let signals = 0;

  // ── Strongest signal: explicit intent ──
  if (intent) {
    const label = INTENT_HUMAN_LABELS[intent] ?? intent.replace(/_/g, " ");
    bullets.push(`Goal: ${label}`);
    signals++;
  }

  // ── Sub-question signal (much stronger than goal alone) ──
  for (const [subKey, labelMap] of Object.entries(SUB_QUESTION_LABELS)) {
    const val = answers[subKey] as string | undefined;
    if (val && labelMap[val]) {
      bullets.push(labelMap[val]!);
      signals++;
      break; // only one sub-question is ever shown
    }
  }

  // ── Help preference ──
  const help = answers.help_preference as string | undefined;
  if (help && HELP_PREFERENCE_LABELS[help]) {
    bullets.push(`Preference: ${HELP_PREFERENCE_LABELS[help]}`);
    signals++;
  }

  // ── Budget band ──
  const budget = answers.budget_band as string | undefined;
  if (budget && BUDGET_LABELS[budget]) {
    bullets.push(`Budget: ${BUDGET_LABELS[budget]}`);
    signals++;
  }

  // ── Timeline ──
  const timeline = answers.timeline as string | undefined;
  if (timeline && TIMELINE_LABELS[timeline]) {
    bullets.push(TIMELINE_LABELS[timeline]!);
    signals++;
  }

  // ── Inferred advisor type (only show when route is individual and we
  //    didn't already say it via help_preference) ──
  if (route === "individual" && advisorType && advisorType !== "not_sure") {
    const label = advisorType.replace(/_/g, " ");
    bullets.push(`Best fit: ${label}`);
    signals++;
  }

  // ── Vertical filter ──
  if (vertical && (route === "compare" || route === "browse")) {
    bullets.push(`Filtered to ${vertical} ${route === "compare" ? "platforms" : "opportunities"}`);
    signals++;
  }

  // ── Score: base 55 + 9 per signal, capped at 99 ──
  const score = Math.min(99, 55 + signals * 9);

  // Always return at least 1 bullet — guards against empty-answer edge.
  if (bullets.length === 0) {
    bullets.push("Matched to a general starting point");
  }

  return { score, bullets: bullets.slice(0, 5) };
}
