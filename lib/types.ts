export interface TeamMember {
  id: number;
  slug: string;
  full_name: string;
  role: 'contributor' | 'staff_writer' | 'editor' | 'expert_reviewer' | 'course_creator' | 'consultant';
  short_bio?: string;
  credentials?: string[];
  disclosure?: string;
  linkedin_url?: string;
  twitter_url?: string;
  publications?: { name: string; url: string }[];
  avatar_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Broker {
  id: number;
  name: string;
  slug: string;
  color: string;
  icon?: string;
  cta_text?: string;
  benefit_cta?: string;
  tagline?: string;
  asx_fee?: string;
  asx_fee_value?: number;
  us_fee?: string;
  us_fee_value?: number;
  fx_rate?: number;
  chess_sponsored: boolean;
  inactivity_fee?: string;
  payment_methods?: string[];
  smsf_support: boolean;
  is_crypto: boolean;
  min_deposit?: string;
  platforms?: string[];
  pros?: string[];
  cons?: string[];
  affiliate_url?: string;
  rating?: number;
  layer?: string;
  deal: boolean;
  editors_pick: boolean;
  status: string;
  review_content?: string;
  fee_audit?: Record<string, string | number | null>;
  markets?: string[];
  regulated_by?: string;
  year_founded?: number;
  headquarters?: string;
  deal_text?: string;
  deal_expiry?: string;
  deal_category?: string;
  deal_terms?: string;
  deal_source?: string;
  deal_verified_date?: string;
  sponsorship_tier?: 'featured_partner' | 'editors_pick' | 'deal_of_month' | null;
  sponsorship_start?: string;
  sponsorship_end?: string;
  commission_type?: string;
  commission_value?: number;
  estimated_epc?: number;
  fee_source_url?: string;
  fee_source_tcs_url?: string;
  fee_verified_date?: string;
  fee_changelog?: { date: string; field: string; old_value: string; new_value: string }[];
  fee_last_checked?: string;
  fee_page_hash?: string;
  link_status?: string;
  link_status_code?: number;
  link_last_checked?: string;
  reviewer_id?: number;
  reviewer?: TeamMember;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  content?: string;
  sections?: { heading: string; body: string }[];
  tags?: string[];
  read_time?: number;
  related_brokers?: string[];
  related_calc?: string;
  cover_image_url?: string;
  evergreen: boolean;
  status?: string;
  published_at?: string;
  author_name?: string;
  author_title?: string;
  author_linkedin?: string;
  author_twitter?: string;
  author_id?: number;
  author?: TeamMember;
  reviewer_id?: number;
  reviewer?: TeamMember;
  reviewed_at?: string;
  changelog?: { date: string; summary: string }[];
  created_at: string;
  updated_at: string;
}

export interface Scenario {
  id: number;
  title: string;
  slug: string;
  hero_title?: string;
  icon?: string;
  problem?: string;
  solution?: string;
  brokers?: string[];
  considerations?: string[];
  related_calculators?: string[];
  related_articles?: string[];
  created_at: string;
  updated_at: string;
}

export interface AffiliateClick {
  id: number;
  broker_id?: number;
  broker_name?: string;
  broker_slug?: string;
  source?: string;
  page?: string;
  layer?: string;
  user_agent?: string;
  ip_hash?: string;
  click_id?: string;
  session_id?: string;
  scenario?: string;
  device_type?: string;
  placement_type?: string;
  clicked_at: string;
}

export interface AnalyticsEvent {
  id: number;
  event_type: string;
  event_data?: Record<string, unknown>;
  session_id?: string;
  page?: string;
  ip_hash?: string;
  user_agent?: string;
  created_at: string;
}

export interface BrokerAnswer {
  id: number;
  answer: string;
  answered_by?: string;
  author_slug?: string;
  display_name?: string;
  is_accepted?: boolean;
  status?: string;
  created_at: string;
}

export interface BrokerQuestion {
  id: number;
  question: string;
  display_name?: string;
  created_at: string;
  broker_answers?: BrokerAnswer[];
}

export interface QuizQuestion {
  id: number;
  order_index: number;
  question_text: string;
  options: { label: string; key: string }[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalculatorConfig {
  id: number;
  calc_type: string;
  config: Record<string, any>;
  updated_at: string;
}

export interface EmailCapture {
  id: number;
  email: string;
  source?: string;
  captured_at: string;
}

export interface SiteSettings {
  id: number;
  key: string;
  value?: string;
  updated_at: string;
}

export interface UserReview {
  id: number;
  broker_id: number;
  broker_slug: string;
  display_name: string;
  email?: string;
  rating: number;
  title: string;
  body: string;
  pros?: string | null;
  cons?: string | null;
  fees_rating?: number;
  platform_rating?: number;
  support_rating?: number;
  reliability_rating?: number;
  experience_months?: number;
  status: 'pending' | 'verified' | 'approved' | 'rejected';
  verification_token?: string;
  verified_at?: string | null;
  moderation_note?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface BrokerReviewStats {
  broker_id: number;
  review_count: number;
  average_rating: number;
  avg_fees_rating?: number;
  avg_platform_rating?: number;
  avg_support_rating?: number;
  avg_reliability_rating?: number;
}

export interface SwitchStory {
  id: number;
  source_broker_id: number;
  source_broker_slug: string;
  dest_broker_id: number;
  dest_broker_slug: string;
  display_name: string;
  email?: string;
  title: string;
  body: string;
  reason?: string | null;
  source_rating: number;
  dest_rating: number;
  estimated_savings?: string | null;
  time_with_source?: string | null;
  status: 'pending' | 'verified' | 'approved' | 'rejected';
  verification_token?: string;
  verified_at?: string | null;
  moderation_note?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Course {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  creator_id?: number;
  creator?: TeamMember;
  price: number;
  pro_price?: number;
  currency: string;
  stripe_price_id?: string;
  stripe_pro_price_id?: string;
  revenue_share_percent: number;
  estimated_hours?: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  cover_image_url?: string;
  guarantee?: string;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CourseLesson {
  id: number;
  course_slug: string;
  module_index: number;
  module_title: string;
  lesson_index: number;
  title: string;
  slug: string;
  content?: string;
  video_url?: string;
  video_duration_seconds?: number;
  duration_minutes: number;
  related_brokers?: string[];
  is_free_preview: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CoursePurchase {
  id: number;
  user_id: string;
  course_slug: string;
  course_id?: number;
  stripe_payment_id?: string;
  amount_paid: number;
  purchased_at: string;
}

export interface CourseRevenue {
  id: number;
  course_id: number;
  purchase_id: number;
  creator_id: number;
  total_amount: number;
  creator_amount: number;
  platform_amount: number;
  revenue_share_percent: number;
  status: 'pending' | 'paid' | 'void';
  paid_at?: string;
  created_at: string;
}

export interface CourseProgress {
  id: number;
  user_id: string;
  lesson_id: number;
  completed_at: string;
}

export interface Consultation {
  id: number;
  slug: string;
  title: string;
  description?: string;
  consultant_id: number;
  consultant?: TeamMember;
  duration_minutes: number;
  price: number;
  pro_price?: number;
  stripe_price_id?: string;
  stripe_pro_price_id?: string;
  cal_link: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ConsultationBooking {
  id: number;
  user_id: string;
  consultation_id: number;
  stripe_payment_id?: string;
  amount_paid: number;
  cal_booking_uid?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  booked_at: string;
}

// ─── Feature 4: Fee Benchmarking ───

export type BenchmarkDimension = 'asxFees' | 'usFees' | 'fxRate' | 'platformRating' | 'features' | 'costStability';

export interface BrokerBenchmark {
  slug: string;
  name: string;
  color: string;
  icon?: string;
  percentiles: Record<BenchmarkDimension, number>;
  ranks: Record<BenchmarkDimension, number>;
  overallPercentile: number;
}

// ─── Feature 5: Cohort Analysis ───

export interface CohortStats {
  cohort_label: string;
  total_count: number;
  sufficient_data: boolean;
  broker_distribution: {
    broker_slug: string;
    broker_name?: string;
    count: number;
    percentage: number;
  }[];
}

// ─── Feature 6: Broker Transfer Guides ───

export interface TransferStep {
  title: string;
  description: string;
  time_estimate: string;
  warning?: string;
}

export interface BrokerTransferGuide {
  id: number;
  broker_slug: string;
  transfer_type: 'outbound' | 'inbound';
  steps: TransferStep[];
  chess_transfer_fee: number;
  supports_in_specie: boolean;
  in_specie_notes?: string;
  special_requirements: string[];
  estimated_timeline_days: number;
  exit_fees?: string;
  helpful_links: { label: string; url: string }[];
  created_at: string;
  updated_at: string;
}

// ─── Feature 8: Broker Health & Risk Score ───

export interface BrokerHealthScore {
  id: number;
  broker_slug: string;
  overall_score: number;
  regulatory_score: number;
  regulatory_notes?: string;
  client_money_score: number;
  client_money_notes?: string;
  financial_stability_score: number;
  financial_stability_notes?: string;
  platform_reliability_score: number;
  platform_reliability_notes?: string;
  insurance_score: number;
  insurance_notes?: string;
  afsl_number?: string;
  afsl_status?: string;
  last_reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Feature 9: Regulatory & Tax Change Alerts ───

export interface RegulatoryAlert {
  id: number;
  title: string;
  slug: string;
  body?: string;
  source_url?: string;
  source_name?: string;
  alert_type: 'tax' | 'regulatory' | 'super' | 'reporting';
  severity: 'info' | 'important' | 'urgent';
  effective_date?: string;
  impact_summary?: string;
  action_items: { text: string; url?: string }[];
  status: 'draft' | 'published';
  published_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Feature 10: Quarterly Industry Reports ───

export interface QuarterlyReport {
  id: number;
  title: string;
  slug: string;
  quarter: string;
  year: number;
  cover_image_url?: string;
  executive_summary?: string;
  sections: { heading: string; body: string }[];
  key_findings: string[];
  fee_changes_summary: { broker: string; field: string; old_value: string; new_value: string }[];
  new_entrants: string[];
  status: 'draft' | 'published';
  published_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Feature 11: Exclusive Pro Deals ───

export interface ProDeal {
  id: number;
  broker_slug: string;
  title: string;
  description?: string;
  deal_value?: string;
  redemption_code?: string;
  redemption_url?: string;
  redemption_instructions?: string;
  terms?: string;
  start_date?: string;
  end_date?: string;
  status: 'active' | 'expired' | 'upcoming';
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Broker Marketplace OS ───

export interface BrokerAccount {
  id: string;
  auth_user_id: string;
  broker_slug: string;
  email: string;
  full_name: string;
  role: 'owner' | 'manager' | 'viewer';
  company_name?: string;
  phone?: string;
  status: 'pending' | 'active' | 'suspended';
  last_login_at?: string;
  terms_accepted_at?: string;
  terms_version?: string;
  postback_api_key?: string;
  package_id?: number;
  package_started_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BrokerWallet {
  id: number;
  broker_slug: string;
  balance_cents: number;
  lifetime_deposited_cents: number;
  lifetime_spent_cents: number;
  currency: string;
  auto_topup_enabled: boolean;
  auto_topup_threshold_cents?: number;
  auto_topup_amount_cents?: number;
  stripe_payment_method_id?: string;
  low_balance_alert_enabled: boolean;
  low_balance_threshold_cents?: number;
  last_low_balance_alert_at?: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  broker_slug: string;
  type: 'deposit' | 'spend' | 'refund' | 'adjustment';
  amount_cents: number;
  balance_after_cents: number;
  description?: string;
  reference_type?: string;
  reference_id?: string;
  stripe_payment_intent_id?: string;
  created_by?: string;
  created_at: string;
}

export interface MarketplacePlacement {
  id: number;
  slug: string;
  name: string;
  page: string;
  position: string;
  inventory_type: 'featured' | 'cpc';
  max_slots: number;
  base_rate_cents?: number;
  description?: string;
  is_active: boolean;
  monthly_impressions?: number;
  avg_ctr_pct?: number;
  stats_updated_at?: string;
}

export interface Campaign {
  id: number;
  broker_slug: string;
  placement_id: number;
  name: string;
  inventory_type: 'featured' | 'cpc';
  rate_cents: number;
  daily_budget_cents?: number;
  total_budget_cents?: number;
  total_spent_cents: number;
  start_date: string;
  end_date?: string;
  status: 'pending_review' | 'approved' | 'active' | 'paused' | 'budget_exhausted' | 'completed' | 'rejected' | 'cancelled';
  review_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  priority: number;
  active_hours_start?: number | null;
  active_hours_end?: number | null;
  active_days?: number[] | null;
  created_at: string;
  updated_at: string;
  placement?: MarketplacePlacement;
}

export interface CampaignEvent {
  id: number;
  campaign_id: number;
  broker_slug: string;
  event_type: 'impression' | 'click' | 'conversion';
  click_id?: string;
  page?: string;
  placement_id?: number;
  scenario?: string;
  device_type?: string;
  conversion_value_cents?: number;
  cost_cents: number;
  created_at: string;
}

export interface CampaignDailyStats {
  id: number;
  campaign_id: number;
  broker_slug: string;
  stat_date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend_cents: number;
}

export interface MarketplaceInvoice {
  id: number;
  broker_slug: string;
  amount_cents: number;
  type: 'wallet_topup' | 'manual_adjustment';
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
  description?: string;
  invoice_number?: string;
  line_items?: { description: string; amount_cents: number; quantity: number }[];
  tax_cents?: number;
  subtotal_cents?: number;
  broker_company_name?: string;
  broker_email?: string;
  broker_abn?: string;
  paid_at?: string;
  created_at: string;
}

// ─── Allocation Decision Logging ───

export interface AllocationDecision {
  id: number;
  placement_slug: string;
  page?: string;
  scenario?: string;
  device_type?: string;
  candidates: { broker_slug: string; campaign_id: number; rate_cents: number }[];
  winners: { broker_slug: string; campaign_id: number; rate_cents: number; inventory_type: string }[];
  rejection_log: { broker_slug: string; campaign_id: number; reason: string }[];
  winner_count: number;
  candidate_count: number;
  fallback_used: boolean;
  duration_ms?: number;
  created_at: string;
}

// ─── Conversion Events ───

export interface ConversionEvent {
  id: number;
  click_id?: string;
  broker_slug: string;
  campaign_id?: number;
  event_type: 'opened' | 'funded' | 'first_trade' | 'custom';
  conversion_value_cents: number;
  metadata?: Record<string, unknown>;
  source: 'postback' | 'manual' | 'webhook';
  created_at: string;
}

// ─── Broker Packages ───

export interface BrokerPackage {
  id: number;
  slug: string;
  name: string;
  tier: 'starter' | 'growth' | 'dominance' | 'enterprise';
  description?: string;
  monthly_fee_cents: number;
  included_placements: { placement_slug: string; inventory_type: string; rate_cents_override?: number }[];
  cpc_rate_discount_pct: number;
  featured_slots_included: number;
  share_of_voice_pct?: number;
  support_level: string;
  is_active: boolean;
  sort_order: number;
}

// ─── Broker Data Changes ───

export interface BrokerDataChange {
  id: number;
  broker_id?: number;
  broker_slug: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  change_type: 'update' | 'add' | 'remove';
  changed_at: string;
  changed_by: string;
  source: 'manual' | 'auto_detect' | 'fee_check' | 'admin';
}

// ─── Broker Creatives ───

export interface BrokerCreative {
  id: number;
  broker_slug: string;
  type: 'logo' | 'banner' | 'icon' | 'screenshot';
  label?: string;
  url: string;
  width?: number;
  height?: number;
  file_size_bytes?: number;
  is_active: boolean;
  sort_order: number;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

// ─── A/B Tests ───

export interface ABTest {
  id: number;
  broker_slug: string;
  name: string;
  type: 'cta_text' | 'deal_text' | 'banner' | 'landing_page';
  status: 'draft' | 'running' | 'paused' | 'completed';
  variant_a: Record<string, string>;
  variant_b: Record<string, string>;
  traffic_split: number;
  impressions_a: number;
  impressions_b: number;
  clicks_a: number;
  clicks_b: number;
  conversions_a: number;
  conversions_b: number;
  winner?: 'a' | 'b';
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

// ─── Broker Notifications ───

export interface BrokerNotification {
  id: number;
  broker_slug: string;
  type: 'low_balance' | 'campaign_approved' | 'campaign_rejected' | 'campaign_paused' | 'budget_exhausted' | 'payment_received' | 'system' | 'support_reply' | 'budget_pacing' | 'anomaly' | 'recommendation' | 're_engagement';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
}

// ─── Support Tickets ───

export interface SupportTicket {
  id: number;
  broker_slug: string;
  subject: string;
  category: 'billing' | 'campaigns' | 'technical' | 'general' | 'account';
  status: 'open' | 'in_progress' | 'waiting_reply' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: number;
  ticket_id: number;
  sender_type: 'broker' | 'admin';
  sender_name?: string;
  message: string;
  created_at: string;
}

// ─── Campaign Templates ───

export interface CampaignTemplate {
  id: number;
  broker_slug: string;
  name: string;
  placement_id?: number;
  inventory_type?: string;
  rate_cents?: number;
  daily_budget_cents?: number;
  total_budget_cents?: number;
  active_hours_start?: number | null;
  active_hours_end?: number | null;
  active_days?: number[] | null;
  created_at: string;
  updated_at: string;
}

// ─── Broker Activity Log ───

export interface BrokerActivityLog {
  id: number;
  broker_slug: string;
  action: string;
  detail?: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}
