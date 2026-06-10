/**
 * lib/getmatched/advisor-allocation.ts
 *
 * The seam that lets the /get-matched funnel drive the rebuilt advisor-matching
 * brain — so there is ONE engine, not two (see docs/plans/UNIFIED_MATCHING_ENGINE.md).
 *
 * /get-matched and the quiz collect answers in different shapes. This translates
 * get-matched's `ActionPlanAnswers` into the canonical `UnifiedAnswers` model,
 * then reuses the SAME engine: `deriveNeeds → pickPrimary` for single-lead
 * allocation, and emits the `QuizAdvisorScoringContext` the caller uses to load
 * and rank real `professionals`. Pure + fully unit-tested; no I/O here.
 */
import type { ActionPlanAnswers } from "./types";
import {
  allocateAdvisors,
  resolveLeadAdvisorType,
  type UnifiedAnswers,
} from "@/lib/quiz-flow";
import type { PrimaryAllocation } from "@/lib/quiz-primary-advisor";
import type { QuizAdvisorScoringContext } from "@/lib/quiz-advisor-scoring";

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

// get-matched `intent` → quiz `goal` (underscore → hyphen). `browse` and any
// unknown intent fall through to "other" — the engine treats it as general.
const GOAL_MAP: Record<string, string> = {
  grow: "grow",
  income: "income",
  crypto: "crypto",
  trade: "trade",
  automate: "automate",
  super: "super",
  property: "property",
  home: "home",
  alt_assets: "alt-assets",
  royalties: "royalties",
  pre_ipo: "pre-ipo",
  help: "help",
};

// get-matched `budget_band` → quiz `amount` enum (small/medium/large/whale).
const AMOUNT_MAP: Record<string, string> = {
  under_10k: "small",
  "10k_100k": "medium",
  "100k_500k": "large",
  "500k_1m": "whale",
  "1m_plus": "whale",
};

// get-matched `budget_band` → the advisor SCORER's budget vocabulary
// (under_100k / 100k_500k / 500k_2m / over_2m). Distinct from `amount` above
// because the two band sets don't align 1:1.
const SCORER_BUDGET_MAP: Record<string, string> = {
  under_10k: "under_100k",
  "10k_100k": "under_100k",
  "100k_500k": "100k_500k",
  "500k_1m": "500k_2m",
  "1m_plus": "over_2m",
};

// get-matched `timeline` → quiz readiness/`stage`. `now` is the settlement /
// EOFY clock (pickPrimary routes it to the conveyancer for a property buy);
// `researching` is the first-class "just learning" education exit.
const STAGE_MAP: Record<string, string> = {
  now: "under-contract",
  "1_3_months": "ready",
  "3_6_months": "exploring",
  "6_12_months": "exploring",
  researching: "learning",
};

// get-matched `help_sub` (the professional the user named) → quiz advisor slug.
const ADVISOR_TYPE_MAP: Record<string, string> = {
  financial_planner: "financial-planner",
  mortgage_broker: "mortgage-broker",
  tax_agent: "tax-agent",
  accountant: "tax-agent",
  buyers_agent: "buyers-agent",
  smsf_accountant: "smsf-accountant",
  conveyancer: "conveyancer",
  property_lawyer: "conveyancer",
  estate_planner: "estate-planner",
  insurance_broker: "insurance-broker",
  commercial_property_agent: "commercial-property-agent",
};

// get-matched `property_sub` → quiz `property_sub`.
const PROPERTY_SUB_MAP: Record<string, string> = {
  physical: "physical",
  reit: "property-reit",
  smsf: "property-super",
};

// get-matched `foreign_focus` → quiz `investor_goal_intl`.
const GOAL_INTL_MAP: Record<string, string> = {
  property: "property",
  business: "business",
  finance: "savings",
  // `tax_legal` is handled as a tax-agent advisor signal, not a goal.
};

// Explicit visa answers we trust verbatim (P3 question). Anything else falls
// back to the starting_point-derived value; "not_sure" stays broad.
const KNOWN_VISA = new Set(["non_resident", "temp_visa", "new_pr", "au_expat"]);

/** AU state code or undefined — "any"/"prefer_not" mean no location signal. */
function stateOrUndefined(v: unknown): string | undefined {
  const s = str(v);
  if (!s || s === "any" || s === "prefer_not") return undefined;
  return s;
}

function helpPreferenceToMode(p?: string): string | undefined {
  if (!p) return undefined;
  if (p === "info_only" || p === "compare") return "diy";
  if (p === "not_sure") return "unsure";
  return "help"; // individual | firm | expert_team | investor_brief
}

/**
 * Translate get-matched answers into the canonical quiz answer model. Robust to
 * missing/unknown values — the engine degrades gracefully (e.g. no state =
 * location-neutral scoring), so matching works before P3 adds the new
 * signal-questions, and sharpens once they land.
 */
export function actionPlanToUnified(a: ActionPlanAnswers): UnifiedAnswers {
  const sp = str(a.starting_point);
  const intent = str(a.intent);
  const helpSub = str(a.help_sub);
  const foreign = str(a.foreign_focus);

  const location: string =
    sp === "overseas" ? "international" : sp === "expat" ? "expat" : "australia";
  const isIntl = location !== "australia";

  const unified: UnifiedAnswers = {
    location,
    goal: intent ? GOAL_MAP[intent] ?? "other" : undefined,
    stage: STAGE_MAP[str(a.timeline) ?? ""],
    amount: AMOUNT_MAP[str(a.budget_band) ?? ""],
    property_sub: PROPERTY_SUB_MAP[str(a.property_sub) ?? ""],
    advisor_type: helpSub ? ADVISOR_TYPE_MAP[helpSub] : undefined,
    mode: helpPreferenceToMode(str(a.help_preference)),
    investor_country: isIntl ? str(a.country_of_residence) : undefined,
    // Explicit visa answer (P3 question) wins; otherwise derive from the
    // starting point. temp_visa is the DASP corridor — load-bearing.
    visa_status: !isIntl
      ? undefined
      : KNOWN_VISA.has(str(a.visa_status) ?? "")
        ? str(a.visa_status)
        : sp === "expat"
          ? "au_expat"
          : "non_resident",
    investor_goal_intl: isIntl
      ? GOAL_INTL_MAP[foreign ?? ""] ?? (intent === "property" ? "property" : undefined)
      : undefined,
  };

  // A cross-border "tax & legal" focus is a tax-agent signal when nothing more
  // specific was named.
  if (isIntl && foreign === "tax_legal" && !unified.advisor_type) {
    unified.advisor_type = "tax-agent";
  }

  return unified;
}

export interface ActionPlanAdvisorAllocation {
  /** The translated canonical answers. */
  unified: UnifiedAnswers;
  /** Single-lead allocation: one primary advisor + the secondary "team". */
  allocation: PrimaryAllocation;
  /** The single advisor type the lead goes to (one lead → one advisor). */
  advisorType: string;
  /** Context to load + rank real `professionals` against (caller does the DB). */
  scoringContext: QuizAdvisorScoringContext;
}

/**
 * Full advisor allocation for a get-matched plan, via the shared engine.
 * Pure: returns the single-lead allocation + the scoring context; the caller
 * loads candidates and calls `scoreQuizAdvisors`.
 */
export function allocateAdvisorsFromActionPlan(
  a: ActionPlanAnswers,
): ActionPlanAdvisorAllocation {
  const unified = actionPlanToUnified(a);
  const allocation = allocateAdvisors(unified);
  const advisorType = resolveLeadAdvisorType(unified);

  const scoringContext: QuizAdvisorScoringContext = {
    advisorType,
    goal: unified.goal,
    amount: unified.amount,
    budget: SCORER_BUDGET_MAP[str(a.budget_band) ?? ""],
    userState: stateOrUndefined(a.location_state),
    isInternational: unified.location !== "australia",
    investorCountry: unified.investor_country,
    visaStatus: unified.visa_status,
    investorGoalIntl: unified.investor_goal_intl,
  };

  return { unified, allocation, advisorType, scoringContext };
}
