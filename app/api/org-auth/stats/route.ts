import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("org-auth:stats");

export interface RecentEnrollment {
  user_name: string;
  course_title: string;
  enrolled_at: string;
  amount_cents: number;
}

/**
 * GET /api/org-auth/stats
 *
 * Returns aggregate stats + last 5 enrollments for the authenticated organisation:
 * - enrollments_this_month, revenue_this_month_cents
 * - total_enrollments, total_revenue_cents
 * - active_courses, cpd_hours_issued
 * - recent_enrollments (last 5, for dashboard table)
 */
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`org_stats_get:${ip}`, 30, 1)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await requireOrgSession();
    const admin = createAdminClient();

    // 1. Get org's published course IDs + titles
    const { data: courses, error: coursesErr } = await admin
      .from("courses")
      .select("id, title")
      .eq("organisation_id", session.organisationId)
      .eq("creator_kind", "organisation")
      .eq("status", "published");

    if (coursesErr) {
      log.error("Failed to fetch org courses", { error: coursesErr });
      return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
    }

    const orgCourses = courses ?? [];
    const orgCourseIds = orgCourses.map((c: { id: number }) => c.id);
    const courseTitleMap = new Map<number, string>(
      orgCourses.map((c: { id: number; title: string }) => [c.id, c.title]),
    );

    const active_courses = orgCourseIds.length;

    if (orgCourseIds.length === 0) {
      // Still count team members even if no courses published yet
      const { count: teamCountEarly } = await admin
        .from("organisation_members")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", session.organisationId)
        .eq("status", "active");

      return NextResponse.json({
        stats: {
          enrollments_this_month: 0,
          revenue_this_month_cents: 0,
          total_enrollments: 0,
          total_revenue_cents: 0,
          active_courses: 0,
          cpd_hours_issued: 0,
          team_member_count: teamCountEarly ?? 0,
        },
        recent_enrollments: [],
      });
    }

    // 2. Fetch all paid purchases for this org's courses
    const { data: purchases, error: purchasesErr } = await admin
      .from("course_purchases")
      .select("id, user_id, amount_cents, purchased_at, course_id")
      .in("course_id", orgCourseIds)
      .eq("status", "paid")
      .order("purchased_at", { ascending: false });

    if (purchasesErr) {
      log.error("Failed to fetch purchases", { error: purchasesErr });
      return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
    }

    const allPurchases = purchases ?? [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const thisMonthPurchases = allPurchases.filter(
      (p: { purchased_at: string }) => p.purchased_at >= startOfMonth,
    );

    const total_enrollments = allPurchases.length;
    const total_revenue_cents = allPurchases.reduce(
      (sum: number, p: { amount_cents: number }) => sum + (p.amount_cents ?? 0),
      0,
    );
    const enrollments_this_month = thisMonthPurchases.length;
    const revenue_this_month_cents = thisMonthPurchases.reduce(
      (sum: number, p: { amount_cents: number }) => sum + (p.amount_cents ?? 0),
      0,
    );

    // 3. Sum CPD hours issued
    const { data: cpdData, error: cpdErr } = await admin
      .from("cpd_credits")
      .select("hours_earned, course_id")
      .in("course_id", orgCourseIds);

    if (cpdErr) {
      log.warn("Failed to fetch CPD credits", { error: cpdErr });
    }

    const cpd_hours_issued = (cpdData ?? []).reduce(
      (sum: number, row: { hours_earned: number | null }) => sum + (row.hours_earned ?? 0),
      0,
    );

    // 4. Count accepted team members
    const { count: teamCount, error: teamErr } = await admin
      .from("organisation_members")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", session.organisationId)
      .eq("status", "active");

    if (teamErr) {
      log.warn("Failed to fetch team member count", { error: teamErr });
    }

    const team_member_count = teamCount ?? 0;

    // 5. Build recent enrollments (last 5) — resolve user display names
    const recentPurchases = allPurchases.slice(0, 5);
    const recentUserIds = [...new Set(recentPurchases.map((p: { user_id: string }) => p.user_id))];

    const profileMap = new Map<string, string>();
    if (recentUserIds.length > 0) {
      const { data: profiles, error: profilesErr } = await admin
        .from("investor_profiles")
        .select("auth_user_id, display_name")
        .in("auth_user_id", recentUserIds);

      if (profilesErr) {
        log.warn("Failed to fetch investor profiles for recent enrollments", { error: profilesErr });
      }

      for (const p of profiles ?? []) {
        if (p.auth_user_id && p.display_name) {
          profileMap.set(p.auth_user_id as string, p.display_name as string);
        }
      }
    }

    const recent_enrollments: RecentEnrollment[] = recentPurchases.map(
      (p: { user_id: string; course_id: number | null; purchased_at: string; amount_cents: number }) => ({
        user_name: profileMap.get(p.user_id) ?? "Student",
        course_title: p.course_id != null ? (courseTitleMap.get(p.course_id) ?? "Unknown Course") : "Unknown Course",
        enrolled_at: p.purchased_at,
        amount_cents: p.amount_cents ?? 0,
      }),
    );

    return NextResponse.json({
      stats: {
        enrollments_this_month,
        revenue_this_month_cents,
        total_enrollments,
        total_revenue_cents,
        active_courses,
        cpd_hours_issued,
        team_member_count,
      },
      recent_enrollments,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("GET /api/org-auth/stats error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
