import { NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("org-auth:dashboard");

/**
 * GET /api/org-auth/dashboard
 *
 * Returns aggregate stats for the authenticated organisation:
 * enrollments, revenue, active courses, CPD hours issued.
 */
export async function GET() {
  try {
    const session = await requireOrgSession();
    const admin = createAdminClient();

    // 1. Get org's published course IDs
    const { data: courses, error: coursesErr } = await admin
      .from("courses")
      .select("id")
      .eq("organisation_id", session.organisationId)
      .eq("creator_kind", "organisation")
      .eq("status", "published");

    if (coursesErr) {
      log.error("Failed to fetch org courses", { error: coursesErr });
      return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
    }

    const orgCourseIds = (courses ?? []).map((c: { id: number }) => c.id);

    if (orgCourseIds.length === 0) {
      return NextResponse.json({
        enrollments_this_month: 0,
        revenue_this_month_cents: 0,
        total_enrollments: 0,
        total_revenue_cents: 0,
        active_courses: 0,
        cpd_hours_issued: 0,
      });
    }

    // 2. Fetch all paid purchases for this org's courses
    const { data: purchases, error: purchasesErr } = await admin
      .from("course_purchases")
      .select("id, amount_cents, purchased_at, course_id")
      .in("course_id", orgCourseIds)
      .eq("status", "paid");

    if (purchasesErr) {
      log.error("Failed to fetch purchases", { error: purchasesErr });
      return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
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

    // 3. Count active (published) courses
    const active_courses = orgCourseIds.length;

    // 4. Sum CPD hours issued via cpd_credits joined on courses
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

    return NextResponse.json({
      enrollments_this_month,
      revenue_this_month_cents,
      total_enrollments,
      total_revenue_cents,
      active_courses,
      cpd_hours_issued,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("GET /api/org-auth/dashboard error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
