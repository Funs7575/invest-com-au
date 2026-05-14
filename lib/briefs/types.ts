/**
 * Brief domain types — mirror the columns added by
 * 20260723_pmp01_provider_marketplace_foundation.sql.
 *
 * A "brief" is a row in `advisor_auctions` with `flow_type='accept'`.
 * `flow_type='auction'` rows remain the legacy bid-auction shape and are
 * read/written by the existing /quotes/post and /api/quotes paths.
 */

export type BriefFlowType = "auction" | "accept";

export type BriefTemplate =
  | "general"
  | "smsf_property"
  | "foreign_investor"
  | "expat"
  | "opportunity_assessment"
  | "business_acquisition"
  | "commercial_property"
  | "second_opinion"
  | "mortgage"
  | "tax"
  | "smsf_accountant"
  | "financial_adviser"
  | "listing"
  | "listing_readiness";

export type ProviderPreference =
  | "any"
  | "individual"
  | "firm"
  | "expert_team"
  | "multiple";

export type RoutingMode = "smart_match" | "direct" | "multi_response";

export type TrackerStatus =
  | "new"
  | "contacted"
  | "call_booked"
  | "proposal_sent"
  | "won"
  | "lost"
  | "withdrawn";

export type RiskReviewStatus =
  | "clear"
  | "pending_review"
  | "approved"
  | "rejected";

export type RiskSeverity = "warn" | "review" | "block";

export interface BriefRow {
  id: number;
  slug: string;
  flow_type: BriefFlowType;
  brief_template: BriefTemplate | null;
  brief_payload: Record<string, unknown>;
  provider_preference: ProviderPreference | null;
  routing_mode: RoutingMode | null;
  target_professional_id: number | null;
  target_firm_id: number | null;
  target_team_id: number | null;
  accept_credits_cost: number | null;
  accepted_by_professional_id: number | null;
  accepted_by_team_id: number | null;
  accepted_at: string | null;
  tracker_status: TrackerStatus;
  risk_flags: string[];
  risk_review_status: RiskReviewStatus;
  listing_id: number | null;
  // Legacy/shared fields still on advisor_auctions:
  job_title: string;
  job_description: string;
  budget_band: string;
  advisor_types: string[] | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone?: string | null;
  status: string;
  ends_at: string;
  created_at: string;
}

export interface MaskedBrief {
  id: number;
  slug: string;
  brief_template: BriefTemplate | null;
  brief_payload: Record<string, unknown>;
  provider_preference: ProviderPreference | null;
  routing_mode: RoutingMode | null;
  budget_band: string;
  location: string | null;
  advisor_types: string[] | null;
  job_title: string;
  // Deliberately short summary, no PII.
  description_preview: string;
  accept_credits_cost: number | null;
  created_at: string;
  ends_at: string;
  status: string;
  tracker_status: TrackerStatus;
}

export type ProviderKind = "individual" | "firm" | "expert_team";

export interface EligibleProvider {
  kind: ProviderKind;
  id: number;
  reason: string;
  score: number;
}
