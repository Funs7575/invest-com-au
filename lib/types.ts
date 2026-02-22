export interface TeamMember {
  id: number;
  slug: string;
  full_name: string;
  role: 'contributor' | 'staff_writer' | 'editor' | 'expert_reviewer' | 'course_creator';
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
