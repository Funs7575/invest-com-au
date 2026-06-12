/**
 * Shared API request/response schemas.
 *
 * Every public API route that returns structured data should
 * export its response shape here and assert it with
 * `assertResponse(schema, json)`. The contract test then runs
 * the assertion against a live (or Playwright-mocked) response
 * and fails the build if a backend change breaks the frontend
 * contract.
 *
 * Why zod + a central file instead of per-route schemas:
 *   - Single source of truth, greppable
 *   - Lets us generate a JSON schema bundle for partners /
 *     OpenAPI-like docs later
 *   - Easy to import into the E2E test suite
 */

import { z } from "zod";

// ─── Primitive building blocks ────────────────────────────────────

export const OkResponse = z.object({
  ok: z.literal(true),
});

export const ErrorResponse = z.object({
  error: z.string(),
});

// ─── /api/form-event ───────────────────────────────────────────────

export const FormEventRequest = z.object({
  session_id: z.string().min(1).max(100),
  user_key: z.string().optional().nullable(),
  form_name: z.enum([
    "quiz",
    "advisor_enquiry",
    "advisor_signup",
    "advisor_apply",
    "broker_apply",
    "lead_form",
  ]),
  step: z.string().min(1).max(100),
  step_index: z.number().int().nonnegative().optional().nullable(),
  event: z.enum(["view", "interact", "complete", "abandon"]),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const FormEventResponse = OkResponse;

// ─── /api/attribution/touch ────────────────────────────────────────

export const AttributionTouchRequest = z.object({
  session_id: z.string().min(1).max(100),
  user_key: z.string().optional().nullable(),
  event: z.enum(["view", "click", "signup", "lead", "conversion"]),
  source: z.string().optional().nullable(),
  medium: z.string().optional().nullable(),
  campaign: z.string().optional().nullable(),
  landing_path: z.string().optional().nullable(),
  page_path: z.string().optional().nullable(),
  vertical: z.string().optional().nullable(),
  value_cents: z.number().int().optional().nullable(),
});

// ─── /api/search-semantic ──────────────────────────────────────────

export const SearchHit = z.object({
  type: z.enum(["article", "broker", "advisor", "qa", "scenario"]),
  id: z.string(),
  title: z.string(),
  excerpt: z.string(),
  score: z.number().min(0).max(1),
});

export const SearchResponse = z.object({
  hits: z.array(SearchHit),
  provider: z.string().optional(),
  degraded: z.boolean().optional(),
  error: z.string().optional(),
});

// ─── /api/privacy/request ──────────────────────────────────────────

export const PrivacyRequestInput = z.object({
  email: z.string().email(),
  type: z.enum(["export", "delete"]),
});

export const PrivacyRequestResponse = z.object({
  ok: z.literal(true),
  message: z.string(),
});

// ─── /api/admin/automation/bulk ────────────────────────────────────

export const BulkActionRequest = z.object({
  feature: z.enum([
    "listing_scam",
    "text_moderation",
    "advisor_applications",
    "broker_data_changes",
    "marketplace_campaigns",
  ]),
  targetVerdict: z.string().min(1),
  rowIds: z.array(z.number().int()).min(1).max(500),
  reason: z.string().optional().nullable(),
  subSurface: z.enum(["broker_review", "advisor_review"]).optional(),
});

export const BulkActionResponse = z.object({
  ok: z.boolean(),
  updated: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errors: z.array(z.string()),
});

// ─── /api/quotes (POST) ────────────────────────────────────────────

export const QUOTE_BUDGET_BANDS = [
  "under_500", "500_2k", "2k_5k", "5k_10k", "10k_plus", "not_sure",
] as const;

export const QUOTE_ADVISOR_TYPES = [
  "smsf_accountant", "financial_planner", "property_advisor", "tax_agent",
  "mortgage_broker", "estate_planner", "insurance_broker", "buyers_agent",
  "wealth_manager", "aged_care_advisor", "crypto_advisor", "business_broker",
  "migration_agent", "conveyancer", "property_lawyer",
] as const;

export const QUOTE_AU_STATES = [
  "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT",
] as const;

export const PostJobRequest = z.object({
  job_title: z.string().min(8, "Title must be at least 8 characters.").max(160, "Title too long."),
  job_description: z.string().min(30, "Description must be at least 30 characters.").max(5000, "Description too long."),
  budget_band: z.enum(QUOTE_BUDGET_BANDS, { error: "A valid budget band is required." }),
  advisor_types: z.array(z.enum(QUOTE_ADVISOR_TYPES)).min(1, "Pick at least one advisor type."),
  location_state: z.enum(QUOTE_AU_STATES, { error: "A valid Australian state is required." }),
  contact_name: z.string().min(1, "Name is required.").max(100),
  contact_email: z.string().email("A valid email is required.").max(200),
  contact_phone: z.string().max(20).optional(),
  // Idea #11 — sealed bidding (optional; defaults to open). Only honoured when
  // the `auction_rounds` flag is on; ignored otherwise so posting is unchanged.
  bid_visibility: z.enum(["open", "sealed"]).optional(),
  website: z.string().optional(),
  fax: z.string().optional(),
});

export const AcceptBidRequest = z.object({
  bid_id: z.number().int().positive("bid_id must be a positive integer."),
  contact_email: z.string().email("A valid email is required."),
});

// ─── Idea #11 — best-and-final rounds & counter-offers ─────────────

/** Consumer opens ONE 24h best-and-final round among up to 3 chosen bids. */
export const StartFinalRoundRequest = z.object({
  contact_email: z.string().email("A valid email is required."),
  bid_ids: z
    .array(z.number().int().positive())
    .min(1, "Pick at least one quote for the final round.")
    .max(3, "Pick at most three quotes for the final round."),
});

/** Consumer counters a single bid ("would you do it for $X?"). Cents. */
export const CounterBidRequest = z.object({
  contact_email: z.string().email("A valid email is required."),
  bid_id: z.number().int().positive("bid_id must be a positive integer."),
  counter_amount: z
    .number()
    .int()
    .min(5000, "Counter must be at least $50.")
    .max(100_000_00, "Counter is too large."),
});

/** Advisor accepts or declines a pending counter-offer from the portal. */
export const CounterRespondRequest = z.object({
  bid_id: z.number().int().positive("bid_id must be a positive integer."),
  action: z.enum(["accept", "decline"]),
});

export const PostJobResponse = z.object({
  success: z.literal(true),
  job_id: z.number().int(),
  slug: z.string(),
  ends_at: z.string(),
});

// ─── /api/briefs — Investor Brief marketplace ──────────────────────

export const BRIEF_TEMPLATES = [
  "general",
  "smsf_property",
  "foreign_investor",
  "expat",
  "opportunity_assessment",
  "business_acquisition",
  "commercial_property",
  "second_opinion",
  "mortgage",
  "tax",
  "smsf_accountant",
  "financial_adviser",
  "listing",
  "listing_readiness",
] as const;

export const PROVIDER_PREFERENCES = [
  "any",
  "individual",
  "firm",
  "expert_team",
  "multiple",
] as const;

export const ROUTING_MODES = ["smart_match", "direct", "multi_response"] as const;

export const CreateBriefRequest = z.object({
  brief_template: z.enum(BRIEF_TEMPLATES),
  brief_payload: z.record(z.string(), z.unknown()).default({}),
  job_title: z.string().min(8, "Title must be at least 8 characters.").max(160),
  job_description: z.string().min(30, "Please add a little more context.").max(5000),
  budget_band: z.enum(QUOTE_BUDGET_BANDS),
  advisor_types: z.array(z.enum(QUOTE_ADVISOR_TYPES)).default([]),
  location_state: z.enum(QUOTE_AU_STATES),
  provider_preference: z.enum(PROVIDER_PREFERENCES).default("any"),
  routing_mode: z.enum(ROUTING_MODES).default("smart_match"),
  target_team_slug: z.string().max(120).optional(),
  target_professional_slug: z.string().max(120).optional(),
  target_firm_slug: z.string().max(120).optional(),
  listing_id: z.number().int().positive().optional(),
  contact_name: z.string().min(1).max(100),
  contact_email: z.string().email().max(200),
  contact_phone: z.string().max(20).optional(),
  consent_share: z.boolean().refine((v) => v === true, {
    message: "Please confirm consent to share the brief with verified providers.",
  }),
  // Group Briefs opt-in (idea #17). When true, the brief joins a demand pool
  // (template × state × month) so advisers can make a group offer. Optional —
  // a no-op unless the `demand_pools` flag is on. Defaults false.
  join_demand_pool: z.boolean().optional().default(false),
  // Honeypots — silently accept, ignore.
  website: z.string().optional(),
  fax: z.string().optional(),
});

export const AcceptBriefRequest = z.object({
  team_id: z.number().int().positive().optional(),
});

export const BriefStatusUpdateRequest = z.object({
  tracker_status: z.enum([
    "new",
    "contacted",
    "call_booked",
    "proposal_sent",
    "won",
    "lost",
  ]),
  note: z.string().max(2000).optional(),
});

// ─── /api/intake — Pro intake questions (MM-10) ────────────────────

export const INTAKE_QUESTION_KINDS = [
  "text",
  "number",
  "select",
  "phone",
  "email",
] as const;

export const INTAKE_OWNER_KINDS = ["professional", "team"] as const;

export const CreateIntakeQuestionRequest = z.object({
  owner_kind: z.enum(INTAKE_OWNER_KINDS),
  owner_id: z.number().int().positive(),
  prompt: z.string().min(3).max(240),
  kind: z.enum(INTAKE_QUESTION_KINDS).default("text"),
  options: z.array(z.string().min(1).max(80)).max(10).default([]),
  required: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(99).default(0),
  enabled: z.boolean().default(true),
});

export const UpdateIntakeQuestionRequest = z.object({
  prompt: z.string().min(3).max(240),
  kind: z.enum(INTAKE_QUESTION_KINDS).default("text"),
  options: z.array(z.string().min(1).max(80)).max(10).default([]),
  required: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(99).default(0),
  enabled: z.boolean().default(true),
});

export const SubmitIntakeAnswersRequest = z.object({
  email: z.string().email().max(200),
  answers: z
    .array(
      z.object({
        question_id: z.number().int().positive(),
        answer: z.string().max(1000),
      }),
    )
    .min(1)
    .max(5),
});

// ─── /api/teams/[slug]/briefs/[briefId]/* (Pro Squad inbox) ───────

export const SquadClaimBriefRequest = z.object({
  notes: z.string().max(2000).optional(),
});

export const SquadHandoffBriefRequest = z.object({
  note: z.string().max(2000).optional(),
  to_professional_id: z.number().int().positive().optional(),
});

export const SquadCompleteBriefRequest = z.object({
  note: z.string().max(2000).optional(),
});

// ─── /api/briefs/[slug]/messages (MM32 — brief tracker chat) ──────

export const SendBriefMessageRequest = z.object({
  body: z.string().min(1).max(4000),
});

export const MarkBriefMessagesReadRequest = z.object({}).optional();

// ─── /api/briefs/[slug]/disputes (MM39 — mediation flow) ──────────

export const OpenDisputeRequest = z.object({
  reason: z.string().min(200).max(4000),
  evidence_urls: z.array(z.string().url().max(2000)).max(10).optional(),
});

export const PostDisputeMessageRequest = z.object({
  body: z.string().min(1).max(4000),
});

export const ResolveDisputeRequest = z.object({
  status: z.enum([
    "admin_reviewing",
    "resolved_for_consumer",
    "resolved_for_provider",
    "withdrawn",
  ]),
  resolution_notes: z.string().max(4000).optional(),
});

export const SquadReleaseBriefRequest = z.object({
  note: z.string().max(2000).optional(),
});

// ─── /api/expert-teams ─────────────────────────────────────────────

export const TEAM_TYPES = [
  "same_firm",
  "independent",
  "private_referral",
  "internal_firm",
] as const;

export const TEAM_CATEGORIES = [
  "smsf_property",
  "foreign_investor",
  "expat",
  "commercial_property",
  "business_acquisition",
  "due_diligence",
  "retirement",
  "custom",
] as const;

export type TeamCategory = (typeof TEAM_CATEGORIES)[number];

export const TEAM_CATEGORY_LABELS: Record<TeamCategory, string> = {
  smsf_property: "SMSF Property",
  foreign_investor: "Foreign Investor",
  expat: "Expat Investor",
  commercial_property: "Commercial Property",
  business_acquisition: "Business Acquisition",
  due_diligence: "Opportunity / Due Diligence",
  retirement: "Retirement",
  custom: "General / Custom",
};

export const CreateExpertTeamRequest = z.object({
  name: z.string().min(3).max(120),
  team_category: z.enum(TEAM_CATEGORIES),
  team_type: z.enum(TEAM_TYPES),
  description: z.string().max(2000).optional(),
  niche: z.string().max(200).optional(),
  location_state: z.enum(QUOTE_AU_STATES).optional(),
  service_areas: z.array(z.string().max(80)).max(20).optional(),
  firm_id: z.number().int().positive().optional(),
  disclosure: z.string().max(4000).optional(),
  accepted_brief_templates: z.array(z.enum(BRIEF_TEMPLATES)).max(BRIEF_TEMPLATES.length).optional(),
});

export const InviteExpertTeamMemberRequest = z.object({
  email: z.string().email().max(200),
  name: z.string().max(120).optional(),
  role: z.string().max(60).optional(),
});

export const AcceptExpertTeamInvitationRequest = z.object({
  token: z.string().min(20).max(200),
});

export const SubmitExpertTeamRequest = z.object({});

export const AdminVerifyExpertTeamRequest = z.object({
  approved: z.boolean(),
  rejection_reason: z.string().max(2000).optional(),
  accepts_briefs: z.boolean().optional(),
});

// ─── /api/get-matched (Get Matched 2.0) ─────────────────────────────

export const GM_INTENT_SLUGS = [
  "compare_platform",
  "start_investing",
  "smsf_property",
  "buy_property",
  "opportunity_assessment",
  "business_acquisition",
  "commercial_property",
  "foreign_investor",
  "expat_investing",
  "financial_advice",
  "tax_help",
  "mortgage_help",
  "legal_help",
  "second_opinion",
  "listing_owner",
  "listing_readiness",
  "not_sure",
] as const;

export const GM_ROUTE_TYPES = [
  "compare",
  "browse",
  "individual",
  "firm",
  "expert_team",
  "investor_brief",
  "listing_brief",
  "second_opinion",
  "guide",
] as const;

export const GM_QUESTION_MODES = ["fast", "guided", "both"] as const;

const PlainAnswerValue = z.union([
  z.string().max(500),
  z.array(z.string().max(120)).max(20),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const StartGetMatchedRequest = z.object({
  session_id: z.string().min(8).max(120),
  mode: z.enum(GM_QUESTION_MODES).default("both"),
  prefill: z.record(z.string(), PlainAnswerValue).optional(),
  source_page: z.string().max(500).optional(),
});

export const AnswerQuestionRequest = z.object({
  // `0` means "ephemeral mode" — the server didn't persist a plan row
  // because the DB wasn't ready. The client carries the full answer state
  // in `answers` so the server can resolve the next question without a
  // DB lookup.
  plan_id: z.number().int().nonnegative(),
  question_slug: z.string().min(1).max(80),
  value: PlainAnswerValue,
  answers: z.record(z.string(), PlainAnswerValue).optional(),
});

export const ResolvePlanRequest = z.object({
  // Same convention as `AnswerQuestionRequest` — `0` means ephemeral; the
  // client passes the full `answers` so the engine can resolve without a
  // DB-backed plan row.
  plan_id: z.number().int().nonnegative(),
  answers: z.record(z.string(), PlainAnswerValue).optional(),
});

export const SavePlanRequest = z.object({
  email: z.string().email().max(200),
});

export const ClaimPlanRequest = z.object({
  plan_id: z.number().int().positive(),
});

export const PlanToBriefRequest = z.object({
  contact_name: z.string().min(1).max(100),
  contact_email: z.string().email().max(200),
  contact_phone: z.string().max(20).optional(),
  routing_mode: z.enum(ROUTING_MODES).default("smart_match"),
  provider_preference: z.enum(PROVIDER_PREFERENCES).optional(),
  consent_share: z.boolean().refine((v) => v === true, {
    message: "Please confirm consent to share the brief with verified providers.",
  }),
});

export const ChecklistToggleRequest = z.object({
  index: z.number().int().nonnegative().max(50),
});

export const LogGmEventRequest = z.object({
  session_id: z.string().min(8).max(120),
  event_type: z.enum([
    "started",
    "question_answered",
    "question_abandoned",
    "plan_shown",
    "cta_clicked",
    "plan_saved",
    "account_created",
    "brief_drafted",
    "brief_submitted",
    "risk_flagged",
  ]),
  step: z.number().int().min(0).max(50).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  source_page: z.string().max(500).optional(),
});

// ─── Helper: assert a response matches a schema ────────────────────

/**
 * Validates a parsed JSON body against a zod schema. Throws if it
 * doesn't match so a contract test can see the exact diff.
 *
 * Usage in Playwright / unit tests:
 *
 *     const body = await response.json();
 *     assertContract(SearchResponse, body);
 */
export function assertContract<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown,
): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n");
    throw new Error(`Contract mismatch:\n${msg}`);
  }
  return result.data;
}
