export type OrgViewType =
  | "dashboard"
  | "courses"
  | "events"
  | "students"
  | "team"
  | "billing"
  | "profile"
  | "settings";

export interface Organisation {
  id: number;
  slug: string;
  name: string;
  organisation_type: string;
  abn?: string;
  website?: string;
  email: string;
  phone?: string;
  logo_url?: string;
  bio?: string;
  location_state?: string;
  stripe_connect_account_id?: string;
  stripe_connect_status: string;
  stripe_connect_payouts_enabled: boolean;
  status: string;
  verification_status: string;
  cpd_provider_number?: string;
  tier: string;
}

export interface OrgStats {
  enrollments_this_month: number;
  revenue_this_month_cents: number;
  total_enrollments: number;
  total_revenue_cents: number;
  active_courses: number;
  cpd_hours_issued: number;
  team_member_count: number;
}
