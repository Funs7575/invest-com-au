/**
 * lib/getmatched/deep-link-prefill.ts
 *
 * Translate the cross-border deep-link query params (`?specialty=` /
 * `?country=`) that country pages and adviser CTAs forward into the
 * canonical `/get-matched` funnel into a start prefill the engine already
 * understands.
 *
 * History: those params used to keep the dedicated `/find-advisor` wizard
 * alive via a `missing` carve-out in next.config.ts (the 1.75× cross-border
 * premium line). Once `/get-matched` can consume them the carve-out is
 * removed and `/find-advisor` folds fully into the one funnel — these two
 * params are the last thing the dedicated flow did that the unified flow
 * couldn't.
 *
 * Mapping rules (mirrors the find-advisor cross-border routing):
 *   - specialty → prefill `intent: "help"` + `help_sub: <advisor type>`.
 *     The advisor type is resolved through an `AdvisorNeed` (validated
 *     against `QUIZ_ADVISOR_TYPES`, the need-slug SSOT) and then converted
 *     to the engine's `help_sub` answer vocabulary. An unmapped specialty
 *     still sets `intent: "help"` so the user lands in the advisor lane —
 *     the help_sub sub-question simply asks.
 *   - country → prefill `starting_point: "overseas"` +
 *     `country_of_residence: <quizKey>`. The incoming value may be a
 *     foreign-investment folder slug ("united-kingdom"), an ISO-3166
 *     alpha-2 code ("gb"/"hk") or already the engine's quizKey
 *     ("uk"/"hong_kong") — all three normalise through the
 *     `lib/intent-context` SSOT.
 *
 * The engine (`inferRoute` / `resolveLanes` / `actionPlanToUnified`) already
 * routes on `intent`, `help_sub`, `starting_point` and `country_of_residence`,
 * so no engine change is needed — this is purely a param → answer translation.
 */
import type { ActionPlanAnswers } from "@/lib/getmatched/types";
import type { AdvisorNeed } from "@/lib/quiz-primary-advisor";
import { QUIZ_ADVISOR_TYPES } from "@/lib/quiz-advisor-types";
import {
  intentCountryFromSlug,
  intentCountryFromIso,
  intentCountryFromQuizKey,
  quizKeyForIntentCode,
} from "@/lib/intent-context";

/**
 * Cross-border / vertical `?specialty=` values (forwarded from country
 * pages and adviser CTAs) → the quiz `AdvisorNeed` they correspond to.
 *
 * Keys are lower-cased before lookup so the matcher is tolerant of the
 * mixed casing in the wild ("UK Pension Transfer", "FIRB Property
 * (Non-Resident)", "mortgage", "super"). Values are validated below
 * against `QUIZ_ADVISOR_TYPES` at module load so a typo fails fast.
 */
const SPECIALTY_TO_NEED: Record<string, AdvisorNeed> = {
  // ── Cross-border specialties (CROSS_BORDER_SPECIALTIES) ──
  "uk pension transfer": "financial-planner",
  "fatca-aware us expat planning": "tax-agent",
  "dasp processing": "tax-agent",
  "firb property (non-resident)": "buyers-agent",
  // ── Plain vertical specialties still pointed at the old wizard ──
  super: "smsf-accountant",
  mortgage: "mortgage-broker",
  "first home buyers": "mortgage-broker",
  "foreign_investment_lawyer": "conveyancer",
};

// Fail fast if a value drifts out of the need-slug SSOT.
for (const need of Object.values(SPECIALTY_TO_NEED)) {
  if (!(need in QUIZ_ADVISOR_TYPES)) {
    throw new Error(
      `deep-link-prefill: "${need}" is not a QUIZ_ADVISOR_TYPES need slug`,
    );
  }
}

/**
 * `AdvisorNeed` (kebab) → get-matched `help_sub` answer value. The help_sub
 * question (lib/getmatched/fallbacks.ts) only offers six concrete advisor
 * types; needs without a dedicated option fold into the nearest one (e.g.
 * estate-planner / insurance-broker → financial_planner — the generalist who
 * coordinates them) so the lane still routes to the advisor flow.
 */
const NEED_TO_HELP_SUB: Record<AdvisorNeed, string> = {
  "mortgage-broker": "mortgage_broker",
  "buyers-agent": "buyers_agent",
  conveyancer: "lawyer",
  "financial-planner": "financial_planner",
  "smsf-accountant": "smsf_accountant",
  "tax-agent": "tax_agent",
  "insurance-broker": "financial_planner",
  "estate-planner": "financial_planner",
  "commercial-property-agent": "buyers_agent",
  "aged-care-advisor": "financial_planner",
  "debt-counsellor": "financial_planner",
  "not-sure": "not_sure_help",
};

/** Resolve a `?specialty=` value to a get-matched `help_sub`, or null. */
export function helpSubForSpecialty(specialty: string | null | undefined): string | null {
  if (!specialty) return null;
  const need = SPECIALTY_TO_NEED[specialty.trim().toLowerCase()];
  return need ? NEED_TO_HELP_SUB[need] : null;
}

/**
 * Resolve a `?country=` value (folder slug, ISO alpha-2, or quizKey) to the
 * engine's `country_of_residence` answer value (quizKey), or null.
 */
export function countryOfResidenceForParam(country: string | null | undefined): string | null {
  if (!country) return null;
  const raw = country.trim();
  if (!raw) return null;
  const code =
    intentCountryFromSlug(raw.toLowerCase()) ??
    intentCountryFromIso(raw) ??
    intentCountryFromQuizKey(raw.toLowerCase());
  return code ? quizKeyForIntentCode(code) : null;
}

/**
 * Build the start prefill for the `?specialty=` / `?country=` deep links.
 * Returns an empty object when neither param carries a usable signal, so
 * the caller can spread it unconditionally.
 */
export function deepLinkPrefill(params: {
  specialty?: string | null;
  country?: string | null;
}): ActionPlanAnswers {
  const prefill: ActionPlanAnswers = {};

  // specialty ⇒ advisor lane. The presence of any specialty means the user
  // came from an "I want an expert" surface, so set intent: "help" even when
  // the specific help_sub doesn't resolve.
  if (params.specialty && params.specialty.trim()) {
    prefill.intent = "help";
    const helpSub = helpSubForSpecialty(params.specialty);
    if (helpSub) prefill.help_sub = helpSub;
  }

  // country ⇒ overseas starting point + resolved residence.
  const residence = countryOfResidenceForParam(params.country);
  if (residence) {
    prefill.starting_point = "overseas";
    prefill.country_of_residence = residence;
  }

  return prefill;
}
