export type ViewType =
  | "login"
  | "dashboard"
  | "leads"
  | "analytics"
  | "cpd"
  | "profile"
  | "profile-details"
  | "billing"
  | "articles"
  | "courses"
  | "events"
  | "badges"
  | "team"
  | "settings"
  | "widgets"
  | "embed-kit"
  | "feed"
  | "case-studies"
  | "reviews"
  | "earn"
  | "scheduling"
  | "ideal-client";

export type Advisor = {
  id: number; name: string; slug: string; firm_name?: string; email?: string;
  photo_url?: string; type: string; location_display?: string; rating?: number;
  review_count?: number; verified?: boolean; bio?: string; specialties?: string[];
  fee_structure?: string; fee_description?: string; website?: string; phone?: string;
  booking_link?: string; booking_intro?: string;
  profile_complete?: boolean;
  offer_text?: string; offer_terms?: string; offer_active?: boolean;
  firm_id?: number; is_firm_admin?: boolean; account_type?: string; status?: string;
  free_leads_used?: number; lead_price_cents?: number;
  credit_balance_cents?: number; lifetime_credit_cents?: number; lifetime_lead_spend_cents?: number;
  featured_until?: string;
  advisor_tier?: string | null;
  /**
   * ISO 3166-1 alpha-2 codes (lowercased) for cross-border corridors the
   * advisor self-selected on /advisor-portal Profile (FIN_NOTEBOOK Phase B).
   * AU is implicit — every advisor here is AU-licensed — and is omitted.
   */
  available_in_countries?: string[];
  slack_webhook_url?: string | null;
  /** Self-reported availability: 'open' | 'waitlist' | 'closed'. Default 'open'. */
  availability_status?: 'open' | 'waitlist' | 'closed';
  /** Whether Stripe Connect payouts are enabled for this advisor. Used to gate course creation. */
  stripe_connect_payouts_enabled?: boolean;
  languages_spoken?: string[];
  min_client_assets_band?: string | null;
  specializations?: string[];
};

export type FirmMember = { id: number; name: string; slug: string; email?: string; type: string; photo_url?: string; verified?: boolean; status?: string; created_at: string; role?: string; is_firm_admin?: boolean };
export type FirmInvite = { id: number; email: string; name?: string; status: string; created_at: string; expires_at: string };

export type FirmDetails = {
  id: number; name: string; slug: string; abn?: string; acn?: string; afsl_number?: string;
  website?: string; phone?: string; email?: string; logo_url?: string; bio?: string;
  location_state?: string; location_suburb?: string; max_seats: number; status: string;
};

export type FirmAnalyticsMember = FirmMember & {
  leads30d: number; totalLeads: number; views30d: number;
  totalBilledCents: number; convertedLeads: number; conversionRate: string;
  credit_balance_cents?: number;
};

export type FirmAnalyticsSummary = {
  totalMembers: number; totalLeads: number; totalLeads30d: number; totalViews30d: number;
  totalConverted: number; conversionRate: string; totalBilledCents: number;
  totalCreditCents: number; avgRating: string | null;
};

export type Lead = {
  id: number; user_name: string; user_email: string; user_phone?: string;
  message?: string; source_page?: string; status: string; advisor_notes?: string;
  contacted_at?: string; converted_at?: string; created_at: string;
  quality_score?: number; quality_signals?: Record<string, number>;
  qualification_data?: Record<string, unknown>; lead_tier?: string;
  bill_amount_cents: number; billed: boolean;
  review_requested_at?: string | null;
  // Pipeline CRM columns
  pipeline_stage?: string | null;
  next_action_at?: string | null;
  // Firm inbox additions — only present in firm-leads API responses
  professional_id?: number;
  professional_name?: string;
  professional_slug?: string | null;
};

export type FirmMemberOption = { id: number; name: string; slug: string };

// ── Firm Lead-Ops routing (mega-session #13) ──
export type RoutingMode = "manual" | "round_robin" | "load_balanced" | "specialty";

export type RoutingPolicy = {
  mode: RoutingMode;
  specialty_map?: Record<string, number>;
};

export type RoutingMember = {
  id: number;
  name: string;
  slug: string;
  type: string | null;
  availabilityStatus: "open" | "waitlist" | "closed";
  enquiries30d: number | null;
  views30d: number | null;
  responseScore: number | null;
  avgRating: number | null;
  reviewCount: number | null;
};

export type RoutingAssignment = {
  id: number;
  leadRef: string;
  professionalId: number;
  professionalName: string;
  assignedBy: string;
  assignedAt: string;
  reassignedFrom: number | null;
  reassignedFromName: string | null;
};

export type FirmRoutingData = {
  flagEnabled: boolean;
  modes: RoutingMode[];
  policy: RoutingPolicy;
  members: RoutingMember[];
  unavailableCount: number;
  assignments: RoutingAssignment[];
};

export type BillingRecord = {
  id: number; amount_cents: number; description: string; status: string;
  invoice_number?: string; created_at: string;
};

export type SourceBreakdownItem = {
  source: string;
  count: number;
  converted: number;
};

export type Stats = {
  totalViews30d: number; totalLeads: number; leads30d: number;
  convertedLeads: number; conversionRate: string;
  acceptedLeads: number; acceptRate: number;
  leads7d: number; leadsThisMonth: number; leadsLastMonth: number;
  totalBilledCents: number; pendingBilledCents: number; reviewCount: number;
  avgRating: string | null; bookingClicks30d: number;
  hotLeadsCount: number; warmLeadsCount: number; coldLeadsCount: number;
  avgResponseTimeMinutes: number | null;
  phoneClicks: number; websiteClicks: number; bookingClicks: number;
  articleViews: number; searchImpressions: number;
  articles: { title: string; slug: string; views: number; clicks: number }[];
  sourceBreakdown: SourceBreakdownItem[];
};

export type ViewDay = { view_date: string; view_count: number };
export type Review = { id: number; reviewer_name: string; rating: number; title?: string; body?: string; created_at: string; communication_rating?: number; expertise_rating?: number; value_for_money_rating?: number };
export type WeeklyEnquiry = { weekLabel: string; count: number };
export type ProfileCompleteness = {
  score: number;
  missingFields: string[];
  /** Wizard step rollup + next best action (additive — older cached responses may omit them). */
  steps?: import("@/lib/advisor-portal/profile-completeness").StepStatus[];
  nextStep?: import("@/lib/advisor-portal/profile-completeness").WizardStepId | null;
};

export type CategoryPricing = { price_cents: number; free_trial_leads: number; featured_monthly_cents: number };

export type DisputeModal = { leadId: number; leadName: string; daysLeft: number };
