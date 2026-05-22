import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("org-auth:students");

/**
 * GET /api/org-auth/students
 *
 * Returns enrolled students across all org courses.
 * Combines course purchases with investor_profiles for display names.
 */
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`org_students_get:${ip}`, 20, 1)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await requireOrgSession();
    const admin = createAdminClient();

    // 1. Get org's course IDs and slugs
    const { data: courses, error: coursesErr } = await admin
      .from("courses")
      .select("id, slug, title")
      .eq("organisation_id", session.organisationId)
      .eq("creator_kind", "organisation");

    if (coursesErr) {
      log.error("Failed to fetch org courses", { error: coursesErr });
      return NextResponse.json({ error: "Failed to load students" }, { status: 500 });
    }

    const orgCourses = courses ?? [];
    const courseIds = orgCourses.map((c: { id: number }) => c.id);

    if (courseIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // 2. Get all paid purchases for those courses
    const { data: purchases, error: purchasesErr } = await admin
      .from("course_purchases")
      .select("user_id, course_id, purchased_at")
      .in("course_id", courseIds)
      .eq("status", "paid")
      .order("purchased_at", { ascending: false });

    if (purchasesErr) {
      log.error("Failed to fetch purchases", { error: purchasesErr });
      return NextResponse.json({ error: "Failed to load students" }, { status: 500 });
    }

    const allPurchases = purchases ?? [];

    if (allPurchases.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // 3. Get investor profiles for display names
    const userIds = [...new Set(allPurchases.map((p: { user_id: string }) => p.user_id))];

    const { data: profiles, error: profilesErr } = await admin
      .from("investor_profiles")
      .select("auth_user_id, display_name")
      .in("auth_user_id", userIds);

    if (profilesErr) {
      log.warn("Failed to fetch investor profiles", { error: profilesErr });
    }

    const profileMap = new Map<string, string>();
    for (const p of profiles ?? []) {
      if (p.auth_user_id && p.display_name) {
        profileMap.set(p.auth_user_id as string, p.display_name as string);
      }
    }

    // Build course title map
    const courseTitleMap = new Map<number, string>();
    for (const c of orgCourses) {
      courseTitleMap.set(c.id as number, c.title as string);
    }

    // 4. Assemble student list
    const students = allPurchases.map(
      (p: { user_id: string; course_id: number | null; purchased_at: string | null }) => ({
        user_id: p.user_id,
        user_name: profileMap.get(p.user_id) ?? p.user_id,
        course_id: p.course_id,
        course_title: p.course_id != null ? (courseTitleMap.get(p.course_id) ?? "Unknown") : "Unknown",
        enrolled_at: p.purchased_at,
        completion_pct: 0,
        has_certificate: false,
      }),
    );

    return NextResponse.json({ students });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("GET /api/org-auth/students error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
