export type ViewType =
  | "login"
  | "dashboard"
  | "leads"
  | "analytics"
  | "profile"
  | "billing"
  | "articles"
  | "team"
  | "settings";

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
  acceptedLeads: number; acceptRate: string;
  totalBilledCents: number; pendingBilledCents: number; reviewCount: number;
  avgRating: string | null; bookingClicks30d: number;
  hotLeadsCount: number; warmLeadsCount: number; coldLeadsCount: number;
  avgResponseTimeMinutes: number | null;
  acceptRate: number;
  leads7d: number;
  leadsThisMonth: number;
  leadsLastMonth: number;
  phoneClicks: number; websiteClicks: number; bookingClicks: number;
  articleViews: number; searchImpressions: number;
  articles: { title: string; slug: string; views: number; clicks: number }[];
  sourceBreakdown: SourceBreakdownItem[];
};

export type ViewDay = { view_date: string; view_count: number };
export type Review = { id: number; reviewer_name: string; rating: number; title?: string; body?: string; created_at: string; communication_rating?: number; expertise_rating?: number; value_for_money_rating?: number };
export type WeeklyEnquiry = { weekLabel: string; count: number };
export type ProfileCompleteness = { score: number; missingFields: string[] };

export type CategoryPricing = { price_cents: number; free_trial_leads: number; featured_monthly_cents: number };

export type DisputeModal = { leadId: number; leadName: string; daysLeft: number };
