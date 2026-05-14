/**
 * Get Matched engine — turns Q&A answers into an `ActionPlan`.
 *
 * Sequence:
 *   1. Resolve primary intent from `answers.intent` (Q2 mapping).
 *   2. Pick a starting route from intent default + `help_preference` /
 *      `route_hint` overrides on the latest answer.
 *   3. Run the brief-marketplace risk scanner over the concatenated answer
 *      payload — severity ≥ review forces `risk_review_status='pending_review'`
 *      on any brief created downstream.
 *   4. Look up the result template (route × intent override).
 *   5. Build the action plan with checklist + risk flags + recommended
 *      brief template.
 *   6. (Server-only) Resolve up to 3 recommended providers by reusing
 *      `lib/briefs/routing.ts::resolveEligibleProviders` over a synthetic
 *      brief.
 *
 * The non-IO parts of this module are pure and unit-tested.
 */

import type { BriefRow } from "@/lib/briefs/types";
import { scanBrief, type RiskScanResult } from "@/lib/briefs/risk-flags";
import { resolveEligibleProviders } from "@/lib/briefs/routing";
import { getAcceptCost } from "@/lib/briefs/credits";

import type {
  ActionPlanAnswers,
  ChecklistItem,
  IntentDef,
  IntentSlug,
  ResultTemplate,
  RouteType,
  Vertical,
} from "./types";
import { inferRoute, type AdvisorType } from "./inference";
import { getResultTemplate } from "./templates";

export interface ResolveResult {
  intent: IntentSlug | null;
  secondaryIntent: IntentSlug | null;
  route: RouteType;
  /** Terminal URL the primary CTA on the result screen should link to.
   *  Includes vertical / advisor-type filters when relevant. */
  primaryHref: string;
  /** Vertical inferred from the answers — used by callers that want to
   *  show a vertical badge on the result. */
  vertical: Vertical | null;
  /** Advisor type inferred from the answers — used when the route is
   *  `individual` to filter recommended providers. */
  advisorType: AdvisorType | null;
  goal: string | null;
  template: ResultTemplate;
  checklist: ChecklistItem[];
  riskFlags: string[];
  riskSeverity: RiskScanResult["severity"];
  recommendedBriefTemplate: string | null;
  acceptCreditsCost: number | null;
  helpNeeded: string[];
  budgetBand: string | null;
  timeline: string | null;
  locationState: string | null;
  countryOfResidence: string | null;
}

/**
 * Pure resolver — used by tests + the API route. Delegates to
 * `inferRoute` in ./inference.ts which encodes the full 13 × 8 routing
 * matrix.
 *
 * Kept exported for back-compat with existing call sites that only want
 * the route. New callers should use `inferRoute` directly to also get
 * the terminal href + vertical + advisor type.
 */
export function deriveRoute(
  answers: ActionPlanAnswers,
  _intents: IntentDef[],
): { intent: IntentSlug | null; secondary: IntentSlug | null; route: RouteType } {
  const intent = (answers.intent as IntentSlug | undefined) ?? null;
  const { route } = inferRoute(answers);
  return { intent, secondary: deriveSecondaryIntent(answers, intent), route };
}

function deriveSecondaryIntent(
  answers: ActionPlanAnswers,
  primary: IntentSlug | null,
): IntentSlug | null {
  // Heuristic: when the user picks a complex primary intent + says they
  // also need lending, the secondary intent is `mortgage_help`. Same for
  // tax / legal cues. These improve admin funnel reporting; they do not
  // change routing today.
  if (!primary) return null;
  const helpNeeded = Array.isArray(answers.help_needed)
    ? (answers.help_needed as string[])
    : [];
  if (helpNeeded.includes("lending")) return "mortgage_help";
  if (helpNeeded.includes("tax_accounting")) return "tax_help";
  if (helpNeeded.includes("legal_review")) return "legal_help";
  return null;
}

export function buildChecklist(template: ResultTemplate): ChecklistItem[] {
  return template.checklist.map((item) => ({ ...item, done: false }));
}

export function goalLabel(
  intent: IntentSlug | null,
  intents: IntentDef[],
): string | null {
  if (!intent) return null;
  const match = intents.find((i) => i.slug === intent);
  return match?.label ?? null;
}

export interface ResolveActionPlanOptions {
  answers: ActionPlanAnswers;
  intents: IntentDef[];
}

/**
 * Full resolver — non-pure: scans risk patterns and computes accept cost.
 * The DB writes happen in `lib/getmatched/action-plans.ts`.
 */
export async function resolveActionPlan({
  answers,
  intents,
}: ResolveActionPlanOptions): Promise<ResolveResult> {
  const inferred = inferRoute(answers);
  const intent = (answers.intent as IntentSlug | undefined) ?? null;
  const secondary = deriveSecondaryIntent(answers, intent);
  const route = inferred.route;
  const template = await getResultTemplate(route, intent);
  const goal = goalLabel(intent, intents);
  const checklist = buildChecklist(template);

  // Override the template's primary CTA href with the routed terminal href
  // (with vertical / advisor-type filters baked in) when we have one.
  const effectiveTemplate: ResultTemplate = inferred.href
    ? {
        ...template,
        primary_cta: { ...template.primary_cta, href: inferred.href },
      }
    : template;

  // Risk scan: stringify the structured answers + free-text fields.
  const riskText = stringifyAnswers(answers);
  const risk = await scanBrief(riskText);

  const recommendedBriefTemplate =
    intents.find((i) => i.slug === intent)?.default_brief_template ?? null;
  const acceptCreditsCost = recommendedBriefTemplate
    ? await getAcceptCost({
        briefTemplate: recommendedBriefTemplate,
        providerKind:
          route === "expert_team"
            ? "expert_team"
            : route === "firm"
              ? "firm"
              : "individual",
      })
    : null;

  return {
    intent,
    secondaryIntent: secondary,
    route,
    primaryHref: inferred.href,
    vertical: inferred.vertical,
    advisorType: inferred.advisor_type,
    goal,
    template: effectiveTemplate,
    checklist,
    riskFlags: risk.flags,
    riskSeverity: risk.severity,
    recommendedBriefTemplate,
    acceptCreditsCost,
    helpNeeded: Array.isArray(answers.help_needed)
      ? (answers.help_needed as string[])
      : [],
    budgetBand: (answers.budget_band as string | undefined) ?? null,
    timeline: (answers.timeline as string | undefined) ?? null,
    locationState: (answers.location_state as string | undefined) ?? null,
    countryOfResidence:
      (answers.country_of_residence as string | undefined) ?? null,
  };
}

export interface RecommendedProvidersInput {
  intent: IntentSlug | null;
  route: RouteType;
  briefTemplate: string | null;
  budgetBand: string | null;
  locationState: string | null;
}

/**
 * Build a synthetic brief row and reuse the existing routing engine to pick
 * up to 3 providers we can preview on the result screen. Returns IDs only;
 * the caller hydrates profile data.
 */
export async function recommendedProviders(
  input: RecommendedProvidersInput,
): Promise<{ kind: "individual" | "firm" | "expert_team"; id: number }[]> {
  const syntheticBrief: BriefRow = {
    id: -1,
    slug: "synthetic",
    flow_type: "accept",
    brief_template: (input.briefTemplate as BriefRow["brief_template"]) ?? null,
    brief_payload: {},
    provider_preference:
      input.route === "expert_team"
        ? "expert_team"
        : input.route === "firm"
          ? "firm"
          : input.route === "individual"
            ? "individual"
            : "any",
    routing_mode: "smart_match",
    target_professional_id: null,
    target_firm_id: null,
    target_team_id: null,
    accept_credits_cost: null,
    accepted_by_professional_id: null,
    accepted_by_team_id: null,
    accepted_at: null,
    tracker_status: "new",
    risk_flags: [],
    risk_review_status: "clear",
    listing_id: null,
    job_title: "",
    job_description: "",
    budget_band: input.budgetBand ?? "not_sure",
    advisor_types: null,
    location: input.locationState,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    status: "open",
    ends_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    created_at: new Date().toISOString(),
  };
  const providers = await resolveEligibleProviders(syntheticBrief);
  return providers.slice(0, 3).map((p) => ({ kind: p.kind, id: p.id }));
}

function stringifyAnswers(answers: ActionPlanAnswers): string {
  return Object.values(answers)
    .map((v) => {
      if (Array.isArray(v)) return v.join(" ");
      if (v == null) return "";
      return String(v);
    })
    .join(" ");
}
