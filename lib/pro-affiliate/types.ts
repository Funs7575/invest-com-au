/**
 * Pro affiliate program — shared types.
 *
 * The program lets verified pros (individuals + expert_teams) share a
 * personal landing page on LinkedIn and earn credits when their audience
 * signs up, posts a brief, or has a brief accepted.
 */

export type ProKind = "professional" | "team";

export type AffiliateSourceEvent =
  | "signup"
  | "brief_created"
  | "brief_accepted";

export interface ProAffiliateLink {
  id: number;
  pro_slug: string;
  pro_kind: ProKind;
  share_token: string;
  created_at: string;
  last_clicked_at: string | null;
  click_count: number;
  signup_count: number;
  brief_count: number;
}

export interface ProAffiliateClick {
  id: number;
  share_token: string;
  session_id: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  landing_page: string | null;
  clicked_at: string;
  attributed_user_id: string | null;
}

export interface ProAffiliateCredit {
  id: number;
  pro_slug: string;
  pro_kind: ProKind;
  source_event: AffiliateSourceEvent;
  credits_awarded: number;
  attributed_brief_id: number | null;
  attributed_user_id: string | null;
  created_at: string;
}

/** Window in which an earlier click counts as an attribution source. */
export const ATTRIBUTION_WINDOW_DAYS = 90;
