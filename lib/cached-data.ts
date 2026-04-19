import { createClient } from "@supabase/supabase-js";
import { cached, CacheTTL } from "./cache";
import type {
  Broker,
  Article,
  Scenario,
  QuizQuestion,
  SwitchStory,
  UserReview,
  BrokerReviewStats,
  BrokerQuestion,
} from "./types";

/**
 * Creates a plain Supabase client for cached server functions.
 *
 * We use the raw `@supabase/supabase-js` client here (NOT the SSR/cookie-aware
 * client from `@supabase/ssr`) because `unstable_cache` serialises the return
 * value and replays it across requests — cookie-based auth state would be stale
 * and incorrect. All queries here read public data via the anon key.
 */
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Column selections (match existing page queries) ──

const BROKER_LISTING_COLUMNS =
  "id, name, slug, color, icon, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, platform_type, deal, deal_text, deal_expiry, deal_terms, deal_verified_date, deal_category, editors_pick, tagline, cta_text, affiliate_url, sponsorship_tier, benefit_cta, updated_at, fee_last_checked, fee_verified_date, status";

// ── Broker Data (most impactful to cache) ──

/** Active brokers with listing columns — used on homepage, compare page, many listing pages. */
export const getActiveBrokersListing = cached(
  async (): Promise<Broker[]> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("brokers")
      .select(BROKER_LISTING_COLUMNS)
      .eq("status", "active")
      .order("rating", { ascending: false });
    return (data as Broker[]) || [];
  },
  ["brokers", "brokers-listing"],
  { revalidate: CacheTTL.STATIC }
);

/** All active brokers with full columns — used on broker detail page for similar brokers. */
export const getActiveBrokersFull = cached(
  async (): Promise<Broker[]> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("brokers")
      .select("*")
      .eq("status", "active")
      .order("rating", { ascending: false });
    return (data as Broker[]) || [];
  },
  ["brokers", "brokers-full"],
  { revalidate: CacheTTL.STATIC }
);

/** Single broker by slug with full columns + reviewer join. */
export const getBrokerBySlug = cached(
  async (slug: string): Promise<Broker | null> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("brokers")
      .select("*, reviewer:team_members!reviewer_id(*)")
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    return (data as Broker | null);
  },
  ["brokers", "broker-detail"],
  { revalidate: CacheTTL.STATIC }
);

/** Broker review stats from the materialised view. */
export const getBrokerReviewStats = cached(
  async (brokerId: number): Promise<BrokerReviewStats | null> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("broker_review_stats")
      .select(
        "broker_id, review_count, average_rating, avg_fees_rating, avg_platform_rating, avg_support_rating, avg_reliability_rating"
      )
      .eq("broker_id", brokerId)
      .maybeSingle();
    return (data as BrokerReviewStats | null);
  },
  ["broker-reviews", "broker-review-stats"],
  { revalidate: CacheTTL.DYNAMIC }
);

/** Approved user reviews for a broker. */
export const getBrokerReviews = cached(
  async (brokerSlug: string): Promise<UserReview[]> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("user_reviews")
      .select(
        "id, broker_id, broker_slug, display_name, rating, title, body, pros, cons, status, created_at"
      )
      .eq("broker_slug", brokerSlug)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(20);
    return (data as UserReview[]) || [];
  },
  ["broker-reviews"],
  { revalidate: CacheTTL.DYNAMIC }
);

/** Approved Q&A for a broker. */
export const getBrokerQuestions = cached(
  async (brokerSlug: string): Promise<BrokerQuestion[]> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("broker_questions")
      .select(
        "id, question, display_name, created_at, broker_answers(id, answer, answered_by, author_slug, display_name, is_accepted, created_at)"
      )
      .eq("broker_slug", brokerSlug)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10);
    return (data as BrokerQuestion[]) || [];
  },
  ["broker-questions"],
  { revalidate: CacheTTL.MODERATE }
);

/** Articles related to a broker (by related_brokers array). */
export const getBrokerArticles = cached(
  async (brokerSlug: string) => {
    const supabase = getClient();
    const { data } = await supabase
      .from("articles")
      .select("id, title, slug, category, read_time")
      .contains("related_brokers", [brokerSlug])
      .limit(4);
    return data || [];
  },
  ["articles", "broker-articles"],
  { revalidate: CacheTTL.MODERATE }
);

/** Switch stories involving a broker. */
export const getBrokerSwitchStories = cached(
  async (brokerSlug: string): Promise<SwitchStory[]> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("switch_stories")
      .select(
        "id, source_broker_id, source_broker_slug, dest_broker_id, dest_broker_slug, display_name, title, body, reason, source_rating, dest_rating, estimated_savings, time_with_source, status, created_at"
      )
      .or(
        `source_broker_slug.eq.${brokerSlug},dest_broker_slug.eq.${brokerSlug}`
      )
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10);
    return (data as SwitchStory[]) || [];
  },
  ["switch-stories"],
  { revalidate: CacheTTL.DYNAMIC }
);

/** Fee change history for a broker. */
export const getBrokerFeeHistory = cached(
  async (brokerSlug: string) => {
    const supabase = getClient();
    const { data } = await supabase
      .from("broker_data_changes")
      .select(
        "id, field_name, old_value, new_value, change_type, changed_at"
      )
      .eq("broker_slug", brokerSlug)
      .order("changed_at", { ascending: false })
      .limit(20);
    return data || [];
  },
  ["broker-fee-history"],
  { revalidate: CacheTTL.MODERATE }
);

// ── Article Data ──

/** All published articles (listing page). */
export const getPublishedArticles = cached(
  async (): Promise<Article[]> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("articles")
      .select("*")
      .order("published_at", { ascending: false });
    return (data as Article[]) || [];
  },
  ["articles", "articles-list"],
  { revalidate: CacheTTL.MODERATE }
);

/** Single article by slug with author/reviewer joins. */
export const getArticleBySlug = cached(
  async (slug: string): Promise<Article | null> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("articles")
      .select(
        "*, author:team_members!author_id(*), reviewer:team_members!reviewer_id(*)"
      )
      .eq("slug", slug)
      .maybeSingle();
    return (data as Article | null);
  },
  ["articles", "article-detail"],
  { revalidate: CacheTTL.MODERATE }
);

/** Recent published articles for the homepage (limited set). */
export const getRecentArticles = cached(
  async (limit: number = 6) => {
    const supabase = getClient();
    const { data } = await supabase
      .from("articles")
      .select(
        "id, title, slug, excerpt, category, read_time, tags, cover_image_url"
      )
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);
    return data || [];
  },
  ["articles", "articles-recent"],
  { revalidate: CacheTTL.MODERATE }
);

/** Related articles by category (for article detail sidebar). */
export const getRelatedArticles = cached(
  async (category: string, excludeSlug: string) => {
    const supabase = getClient();
    const { data } = await supabase
      .from("articles")
      .select("slug, title, category, read_time, id")
      .eq("category", category)
      .neq("slug", excludeSlug)
      .limit(3);
    return data || [];
  },
  ["articles", "articles-related"],
  { revalidate: CacheTTL.MODERATE }
);

// ── Scenario Data ──

/** All scenarios. */
export const getScenarios = cached(
  async (): Promise<Scenario[]> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("scenarios")
      .select("*")
      .order("title");
    return (data as Scenario[]) || [];
  },
  ["scenarios"],
  { revalidate: CacheTTL.STATIC }
);

// ── Quiz Data ──

/** Active quiz questions in order. */
export const getQuizQuestions = cached(
  async (): Promise<QuizQuestion[]> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("quiz_questions")
      .select("*")
      .eq("active", true)
      .order("order_index");
    return (data as QuizQuestion[]) || [];
  },
  ["quiz-questions"],
  { revalidate: CacheTTL.STATIC }
);

// ── Switch Stories ──

/** Approved switch stories, optionally filtered by broker. */
export const getApprovedSwitchStories = cached(
  async (brokerSlug?: string): Promise<SwitchStory[]> => {
    const supabase = getClient();
    let query = supabase
      .from("switch_stories")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10);

    if (brokerSlug) {
      query = query.or(
        `source_broker_slug.eq.${brokerSlug},dest_broker_slug.eq.${brokerSlug}`
      );
    }

    const { data } = await query;
    return (data as SwitchStory[]) || [];
  },
  ["switch-stories"],
  { revalidate: CacheTTL.DYNAMIC }
);

// ── Brokers with FX data (for international articles) ──

/** Active brokers with FX rates, sorted cheapest first. */
export const getFxBrokers = cached(
  async (): Promise<Broker[]> => {
    const supabase = getClient();
    const { data } = await supabase
      .from("brokers")
      .select("*")
      .eq("status", "active")
      .not("fx_rate", "is", null)
      .order("fx_rate", { ascending: true });
    return (data as Broker[]) || [];
  },
  ["brokers", "brokers-fx"],
  { revalidate: CacheTTL.STATIC }
);
