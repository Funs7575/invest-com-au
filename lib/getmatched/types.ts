/**
 * Get Matched 2.0 domain types.
 *
 * The router operates on top of the brief-marketplace primitives shipped in
 * PR #821. Every action plan ultimately resolves to one of eight `RouteType`s
 * — six of them deep-link to existing surfaces (`/compare`, `/invest`,
 * `/advisors`, `/briefs/new`, `/teams/<slug>`) and two are guide-only.
 */

export type IntentSlug =
  | "compare_platform"
  | "start_investing"
  | "smsf_property"
  | "buy_property"
  | "opportunity_assessment"
  | "business_acquisition"
  | "commercial_property"
  | "foreign_investor"
  | "expat_investing"
  | "financial_advice"
  | "tax_help"
  | "mortgage_help"
  | "legal_help"
  | "second_opinion"
  | "listing_owner"
  | "listing_readiness"
  | "not_sure";

export type RouteType =
  | "compare"
  | "browse"
  | "individual"
  | "firm"
  | "expert_team"
  | "investor_brief"
  | "listing_brief"
  | "second_opinion"
  | "guide";

export type QuestionKind =
  | "select"
  | "multiselect"
  | "text"
  | "number"
  | "contextual";

export type QuestionMode = "fast" | "guided" | "both";

export interface QuestionOption {
  value: string;
  label: string;
  intent_hint?: IntentSlug;
  route_hint?: RouteType;
  weight?: number;
}

export interface QuestionDef {
  id: number;
  slug: string;
  step: number;
  kind: QuestionKind;
  prompt: string;
  subtitle: string | null;
  options: QuestionOption[];
  shown_if: Record<string, string[] | string | undefined>;
  maps_to: string;
  risk_weight: number;
  mode: QuestionMode;
  enabled: boolean;
  sort_order: number;
}

export interface IntentDef {
  id: number;
  slug: IntentSlug;
  label: string;
  description: string | null;
  default_route: RouteType;
  default_brief_template: string | null;
  risk_level: "low" | "medium" | "high";
  enabled: boolean;
  sort_order: number;
  meta: Record<string, unknown>;
}

export interface ChecklistItem {
  label: string;
  href?: string;
  brief_template?: string;
  done?: boolean;
}

export interface CrossSell {
  label: string;
  href: string;
  icon?: string;
}

export interface ResultTemplate {
  id: number;
  route: RouteType;
  intent_slug: IntentSlug | null;
  headline: string;
  why_text: string;
  checklist: ChecklistItem[];
  primary_cta: { label: string; href: string };
  secondary_ctas: { label: string; href: string }[];
  cross_sells: CrossSell[];
  enabled: boolean;
}

export type PlanStatus = "draft" | "saved" | "converted" | "expired";

export interface ActionPlanAnswers {
  [questionSlug: string]: string | string[] | number | boolean | null;
}

export interface ActionPlan {
  id: number;
  session_id: string;
  auth_user_id: string | null;
  email: string | null;
  intent_slug: IntentSlug | null;
  secondary_intent_slug: IntentSlug | null;
  route: RouteType | null;
  goal: string | null;
  answers: ActionPlanAnswers;
  checklist: ChecklistItem[];
  budget_band: string | null;
  timeline: string | null;
  location_state: string | null;
  country_of_residence: string | null;
  help_needed: string[];
  risk_flags: string[];
  risk_severity: string | null;
  linked_brief_id: number | null;
  share_token: string;
  status: PlanStatus;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ResolvedPlan extends ActionPlan {
  template: ResultTemplate;
  /** Up to 3 providers selected by the resolver — not enriched with full profile. */
  recommended_provider_ids: { kind: "individual" | "firm" | "expert_team"; id: number }[];
  recommended_brief_template: string | null;
  accept_credits_cost: number | null;
}

export type EmbedContext =
  | "homepage"
  | "smsf_guide"
  | "opportunity"
  | "advisor_directory"
  | "platform_compare";

export interface EmbedConfig {
  context: EmbedContext;
  headline: string;
  subtitle: string;
  intent_prefill?: IntentSlug;
  start_step?: number;
  /** Optional pre-filled answers that feed into `ActionPlanAnswers`. */
  prefill_answers?: ActionPlanAnswers;
}
