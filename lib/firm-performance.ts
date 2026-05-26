// Firm performance data helpers — powers /firm-portal/performance.
//
// The admin client is required here for cross-member metric aggregation:
// advisor_metrics_daily's "Advisor can view own metrics" RLS policy only
// exposes a single advisor's own rows, not their firm mates'. Every caller
// must gate on is_firm_admin via resolveFirmAdminContext before invoking.

// eslint-disable-next-line no-restricted-imports -- Cross-member analytics: firm admin needs to read sibling professionals' advisor_metrics_daily and advisor_leaderboard_monthly rows. The own-row-only RLS policies don't cover firm-wide aggregation. All callers gate on is_firm_admin via resolveFirmAdminContext.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export interface MemberMetrics {
  professionalId: number;
  name: string;
  slug: string;
  photoUrl: string | null;
  views30d: number;
  enquiries30d: number;
  bookingClicks30d: number;
  phoneClicks30d: number;
  websiteClicks30d: number;
  articleViews30d: number;
  rank: number | null;
  score: number | null;
  avgRating: number | null;
  reviewCount: number;
  responseScore: number;
  profileScore: number;
  badgeCount: number;
}

export interface FirmPerformanceSummary {
  firmId: number;
  firmName: string;
  windowStart: string;
  windowEnd: string;
  yearMonth: string;
  totals: {
    views30d: number;
    enquiries30d: number;
    bookingClicks30d: number;
  };
  members: MemberMetrics[];
}

type ProfRow = {
  id: number;
  name: string;
  slug: string;
  photo_url: string | null;
};

type MetricRow = {
  professional_id: number;
  profile_views: number | null;
  enquiry_count: number | null;
  booking_clicks: number | null;
  phone_clicks: number | null;
  website_clicks: number | null;
  article_views: number | null;
};

type LeaderboardRow = {
  professional_id: number;
  rank: number;
  score: number;
  avg_rating: number | null;
  review_count: number;
  response_score: number;
  profile_score: number;
  badge_count: number;
};

const log = logger("firm-performance");

export interface FirmPerformanceOptions {
  client?: ReturnType<typeof createAdminClient>;
}

export async function getFirmPerformanceSummary(
  firmId: number,
  options: FirmPerformanceOptions = {},
): Promise<FirmPerformanceSummary | null> {
  const admin = options.client ?? createAdminClient();
  const now = new Date();

  const { data: firm } = await admin
    .from("advisor_firms")
    .select("id, name")
    .eq("id", firmId)
    .single();
  if (!firm) return null;

  const { data: memberRows, error: memberErr } = await admin
    .from("professionals")
    .select("id, name, slug, photo_url")
    .eq("firm_id", firmId)
    .eq("status", "active")
    .order("name");
  if (memberErr || !memberRows) {
    log.error("Failed to load firm members", { error: memberErr?.message });
    return null;
  }

  const members = memberRows as unknown as ProfRow[];
  const memberIds = members.map((m) => m.id);
  const windowStart = isoDate(30, now);
  const windowEnd = isoDate(0, now);
  const yearMonth = currentYearMonth(now);

  if (memberIds.length === 0) {
    return {
      firmId,
      firmName: firm.name,
      windowStart,
      windowEnd,
      yearMonth,
      totals: { views30d: 0, enquiries30d: 0, bookingClicks30d: 0 },
      members: [],
    };
  }

  const { data: metricRows, error: metricErr } = await admin
    .from("advisor_metrics_daily")
    .select(
      "professional_id, profile_views, enquiry_count, booking_clicks, phone_clicks, website_clicks, article_views",
    )
    .in("professional_id", memberIds)
    .gte("date", windowStart)
    .lte("date", windowEnd);
  if (metricErr) {
    log.error("Failed to load metrics", { error: metricErr.message });
    return null;
  }

  const metricMap = new Map<
    number,
    { views: number; enquiries: number; bookings: number; phone: number; website: number; articles: number }
  >();
  for (const row of (metricRows ?? []) as unknown as MetricRow[]) {
    const e = metricMap.get(row.professional_id) ?? {
      views: 0, enquiries: 0, bookings: 0, phone: 0, website: 0, articles: 0,
    };
    e.views += row.profile_views ?? 0;
    e.enquiries += row.enquiry_count ?? 0;
    e.bookings += row.booking_clicks ?? 0;
    e.phone += row.phone_clicks ?? 0;
    e.website += row.website_clicks ?? 0;
    e.articles += row.article_views ?? 0;
    metricMap.set(row.professional_id, e);
  }

  const { data: lbRows, error: lbErr } = await admin
    .from("advisor_leaderboard_monthly")
    .select(
      "professional_id, rank, score, avg_rating, review_count, response_score, profile_score, badge_count",
    )
    .in("professional_id", memberIds)
    .eq("year_month", yearMonth);
  if (lbErr) {
    log.error("Failed to load leaderboard", { error: lbErr.message });
    return null;
  }

  const lbMap = new Map<number, LeaderboardRow>();
  for (const row of (lbRows ?? []) as unknown as LeaderboardRow[]) {
    lbMap.set(row.professional_id, row);
  }

  const memberMetrics: MemberMetrics[] = members.map((m) => {
    const metrics = metricMap.get(m.id);
    const lb = lbMap.get(m.id);
    return {
      professionalId: m.id,
      name: m.name,
      slug: m.slug,
      photoUrl: m.photo_url,
      views30d: metrics?.views ?? 0,
      enquiries30d: metrics?.enquiries ?? 0,
      bookingClicks30d: metrics?.bookings ?? 0,
      phoneClicks30d: metrics?.phone ?? 0,
      websiteClicks30d: metrics?.website ?? 0,
      articleViews30d: metrics?.articles ?? 0,
      rank: lb?.rank ?? null,
      score: lb?.score ?? null,
      avgRating: lb?.avg_rating ?? null,
      reviewCount: lb?.review_count ?? 0,
      responseScore: lb?.response_score ?? 0,
      profileScore: lb?.profile_score ?? 0,
      badgeCount: lb?.badge_count ?? 0,
    };
  });

  memberMetrics.sort((a, b) => {
    if (a.score !== null && b.score !== null) return b.score - a.score;
    if (a.score !== null) return -1;
    if (b.score !== null) return 1;
    return b.views30d - a.views30d;
  });

  const totals = memberMetrics.reduce(
    (acc, m) => {
      acc.views30d += m.views30d;
      acc.enquiries30d += m.enquiries30d;
      acc.bookingClicks30d += m.bookingClicks30d;
      return acc;
    },
    { views30d: 0, enquiries30d: 0, bookingClicks30d: 0 },
  );

  return { firmId, firmName: firm.name, windowStart, windowEnd, yearMonth, totals, members: memberMetrics };
}

export function isoDate(daysAgo: number, from: Date): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

export function currentYearMonth(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
