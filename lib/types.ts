export interface TeamMember {
  id: number;
  slug: string;
  full_name: string;
  role: 'contributor' | 'staff_writer' | 'editor' | 'expert_reviewer';
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
  fee_audit?: any;
  markets?: string[];
  regulated_by?: string;
  year_founded?: number;
  headquarters?: string;
  deal_text?: string;
  deal_expiry?: string;
  commission_type?: string;
  commission_value?: number;
  estimated_epc?: number;
  fee_source_url?: string;
  fee_source_tcs_url?: string;
  fee_verified_date?: string;
  fee_changelog?: { date: string; field: string; old_value: string; new_value: string }[];
  fee_last_checked?: string;
  fee_page_hash?: string;
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
