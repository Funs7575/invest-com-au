import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * GET /api/cohort-stats?experience=beginner&range=medium&interest=grow
 *
 * Returns cohort statistics for "people like me" — investors who answered
 * similarly in the quiz. Requires at least 50 respondents in the cohort
 * for meaningful data; otherwise returns insufficient_data flag.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const experience = searchParams.get("experience");
  const range = searchParams.get("range");
  const interest = searchParams.get("interest");

  if (!experience || !range) {
    return NextResponse.json(
      { error: "experience and range params required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Build query — match on experience_level and investment_range from quiz_leads
  let query = supabase
    .from("quiz_leads")
    .select("top_match_slug")
    .eq("experience_level", experience)
    .eq("investment_range", range);

  if (interest) {
    query = query.eq("trading_interest", interest);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalCount = data?.length ?? 0;
  const MIN_COHORT = 50;

  if (totalCount < MIN_COHORT) {
    // Not enough data — return illustrative flag
    return NextResponse.json({
      cohort_label: buildCohortLabel(experience, range, interest),
      total_count: totalCount,
      sufficient_data: false,
      broker_distribution: [],
    });
  }

  // Aggregate broker distribution
  const counts: Record<string, number> = {};
  for (const row of data!) {
    const slug = row.top_match_slug;
    if (slug) {
      counts[slug] = (counts[slug] || 0) + 1;
    }
  }

  // Fetch broker names
  const slugs = Object.keys(counts);
  const { data: brokers } = await supabase
    .from("brokers")
    .select("slug, name")
    .in("slug", slugs);

  const nameMap: Record<string, string> = {};
  for (const b of brokers || []) {
    nameMap[b.slug] = b.name;
  }

  const distribution = Object.entries(counts)
    .map(([slug, count]) => ({
      broker_slug: slug,
      broker_name: nameMap[slug] || slug,
      count,
      percentage: Math.round((count / totalCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return NextResponse.json({
    cohort_label: buildCohortLabel(experience, range, interest),
    total_count: totalCount,
    sufficient_data: true,
    broker_distribution: distribution,
  });
}

function buildCohortLabel(
  experience: string,
  range: string,
  interest: string | null
): string {
  const expMap: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    pro: "Advanced",
  };
  const rangeMap: Record<string, string> = {
    small: "Under $5k",
    medium: "$5k-$50k",
    large: "$50k-$100k",
    whale: "$100k+",
  };
  const interestMap: Record<string, string> = {
    grow: "Growth",
    income: "Income",
    trade: "Trading",
    crypto: "Crypto",
  };
  const parts = [
    expMap[experience] || experience,
    rangeMap[range] || range,
  ];
  if (interest && interestMap[interest]) {
    parts.push(interestMap[interest]);
  }
  return parts.join(" · ");
}
