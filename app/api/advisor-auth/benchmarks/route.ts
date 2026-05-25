/**
 * GET /api/advisor-auth/benchmarks
 *
 * Returns anonymised peer benchmark stats for the current advisor's
 * type + state cohort. No individual peer data is returned — only
 * aggregated medians and top-25th-percentile values.
 *
 * Response shape:
 *   {
 *     cohortSize: number,
 *     yours: BenchmarkMetrics,
 *     peerMedian: BenchmarkMetrics,
 *     peerTop25: BenchmarkMetrics,
 *   }
 *
 * where BenchmarkMetrics = {
 *   avgResponseMinutes: number | null,
 *   acceptRate: number | null,        // 0-100
 *   rating: number | null,
 *   reviewCount: number | null,
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";

export interface BenchmarkMetrics {
  avgResponseMinutes: number | null;
  acceptRate: number | null;
  rating: number | null;
  reviewCount: number | null;
}

export interface BenchmarksResponse {
  cohortSize: number;
  yours: BenchmarkMetrics;
  peerMedian: BenchmarkMetrics;
  peerTop25: BenchmarkMetrics;
}

/** Compute median of a numeric array (sorted ascending). */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? null);
}

/** Top-25th-percentile (75th pct for ascending-good metrics like rating; 25th for ascending-bad like response time). */
function percentile(values: number[], pct: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((pct / 100) * (sorted.length - 1));
  return sorted[idx] ?? null;
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`benchmarks:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();

  // Fetch the requesting advisor's own data
  const { data: self } = await admin
    .from("professionals")
    .select("type, location_state, avg_response_minutes, rating, review_count")
    .eq("id", advisorId)
    .maybeSingle();

  if (!self) {
    return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
  }

  // Also get their lead-level accept rate from professional_leads
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: selfLeads } = await admin
    .from("professional_leads")
    .select("status")
    .eq("professional_id", advisorId)
    .gte("created_at", thirtyDaysAgo);

  const selfLeadTotal = selfLeads?.length ?? 0;
  const selfLeadAccepted = (selfLeads ?? []).filter((l) => l.status !== "rejected").length;
  const selfAcceptRate = selfLeadTotal > 0
    ? parseFloat(((selfLeadAccepted / selfLeadTotal) * 100).toFixed(1))
    : null;

  const yours: BenchmarkMetrics = {
    avgResponseMinutes: (self.avg_response_minutes as number | null) ?? null,
    acceptRate: selfAcceptRate,
    rating: (self.rating as number | null) ?? null,
    reviewCount: (self.review_count as number | null) ?? null,
  };

  // Fetch peers: same type + state, active status, exclude self
  // We request only aggregate-safe columns — no name/email/slug.
  const query = admin
    .from("professionals")
    .select("id, avg_response_minutes, rating, review_count")
    .eq("type", self.type as string)
    .eq("status", "active")
    .neq("id", advisorId);

  // State filter only when the advisor has a state set — otherwise compare nationally
  if (self.location_state) {
    query.eq("location_state", self.location_state as string);
  }

  const { data: peers } = await query.limit(500);

  const peerRows = peers ?? [];
  const cohortSize = peerRows.length;

  // To compute per-peer accept rate we'd need to query all their leads —
  // that's expensive for a benchmark endpoint. We use a pre-computed column
  // if available, otherwise omit from the peer benchmark gracefully.
  // (A nightly cron could materialise this into professionals.accept_rate_30d.)
  // For now we return null for peer acceptRate to keep the query cheap.

  const peerResponseTimes = peerRows
    .map((p) => p.avg_response_minutes as number | null)
    .filter((v): v is number => v !== null && v > 0);

  const peerRatings = peerRows
    .map((p) => p.rating as number | null)
    .filter((v): v is number => v !== null && v > 0);

  const peerReviewCounts = peerRows
    .map((p) => p.review_count as number | null)
    .filter((v): v is number => v !== null);

  const peerMedian: BenchmarkMetrics = {
    // Lower response time is better — median is straightforward
    avgResponseMinutes: median(peerResponseTimes),
    acceptRate: null,
    rating: median(peerRatings),
    reviewCount: median(peerReviewCounts),
  };

  const peerTop25: BenchmarkMetrics = {
    // Best 25% response time = 25th percentile (lower is better)
    avgResponseMinutes: percentile(peerResponseTimes, 25),
    acceptRate: null,
    // Best 25% rating = 75th percentile (higher is better)
    rating: percentile(peerRatings, 75),
    // Best 25% review count = 75th percentile (higher is better)
    reviewCount: percentile(peerReviewCounts, 75),
  };

  const response: BenchmarksResponse = {
    cohortSize,
    yours,
    peerMedian,
    peerTop25,
  };

  return NextResponse.json(response);
}
