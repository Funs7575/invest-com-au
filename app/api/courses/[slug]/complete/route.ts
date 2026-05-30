/**
 * POST /api/courses/[slug]/complete
 *
 * NOTE: the dynamic segment is named `[slug]` to match the sibling
 * `[slug]/reviews` route — Next.js requires a single param name per path
 * position. The value passed here is actually a course UUID (callers build
 * the URL directly), so it's aliased back to `courseId` below.
 *
 * Marks a course enrollment as completed for the authenticated user and
 * issues a completion certificate. If the course is CPD-eligible and the
 * user is a licensed advisor, a cpd_credits row is also recorded via
 * lib/course-certificates.ts (which handles both inserts atomically).
 *
 * Auth:   createClient() (user JWT) — verifies enrollment ownership
 * Writes: createAdminClient() via issueCertificate() — service_role-only
 *         INSERT policies on course_certificates + cpd_credits
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { issueCertificate } from "@/lib/course-certificates";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("courses:complete");

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`courses:complete:${ip}`, 20, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    // ── Auth check ───────────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { slug: courseId } = await ctx.params;

    // ── Verify enrollment via admin client ────────────────────────────────────
    // Use admin client so we avoid RLS complications on course_enrollments.
    const admin = createAdminClient();

    const { data: enrollment, error: enrollmentError } = await admin
      .from("course_enrollments")
      .select("id, status, completed_at")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (enrollmentError) {
      log.error("Failed to fetch enrollment", {
        error: enrollmentError.message,
        courseId,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Failed to verify enrollment." },
        { status: 500 },
      );
    }

    if (!enrollment) {
      return NextResponse.json(
        { error: "You are not enrolled in this course." },
        { status: 403 },
      );
    }

    // ── Idempotency: already completed — return the existing certificate ──────
    if (enrollment.status === "completed") {
      const { data: existingCert } = await admin
        .from("course_certificates")
        .select("id, cpd_hours")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();

      // Fetch is_cpd_eligible for the response shape
      const { data: courseRow } = await admin
        .from("courses")
        .select("is_cpd_eligible")
        .eq("id", courseId)
        .maybeSingle();

      return NextResponse.json({
        certificate_id: (existingCert as { id: string } | null)?.id ?? null,
        cpd_hours_earned:
          (existingCert as { cpd_hours: number | null } | null)?.cpd_hours ?? null,
        is_cpd_eligible:
          (courseRow as { is_cpd_eligible: boolean } | null)?.is_cpd_eligible ??
          false,
      });
    }

    // ── Fetch the course slug (issueCertificate takes a slug) ─────────────────
    const { data: courseRow, error: courseError } = await admin
      .from("courses")
      .select("slug, is_cpd_eligible, cpd_hours")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError || !courseRow) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    // ── Mark enrollment completed ─────────────────────────────────────────────
    const now = new Date().toISOString();
    const { error: updateError } = await admin
      .from("course_enrollments")
      .update({ status: "completed", completed_at: now })
      .eq("id", enrollment.id);

    if (updateError) {
      log.error("Failed to mark enrollment completed", {
        error: updateError.message,
        enrollmentId: enrollment.id,
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Failed to mark course as complete. Please try again." },
        { status: 500 },
      );
    }

    // ── Issue certificate (handles CPD credits internally for advisors) ───────
    const cert = await issueCertificate(
      user.id,
      (courseRow as { slug: string }).slug,
      null,
    );

    if (!cert) {
      // issueCertificate returns null when not all lessons are complete, or on
      // an internal error. The enrollment was already marked completed; log and
      // return a partial success so the UI still reflects completion.
      log.warn("issueCertificate returned null after enrollment completed", {
        courseId,
        userId: user.id,
      });
      return NextResponse.json({
        certificate_id: null,
        cpd_hours_earned: null,
        is_cpd_eligible:
          (courseRow as { is_cpd_eligible: boolean }).is_cpd_eligible,
      });
    }

    log.info("Course completion recorded", {
      courseId,
      userId: user.id,
      certificateId: cert.id,
    });

    return NextResponse.json(
      {
        certificate_id: cert.id,
        cpd_hours_earned: cert.cpd_hours,
        is_cpd_eligible: (courseRow as { is_cpd_eligible: boolean }).is_cpd_eligible,
      },
      { status: 201 },
    );
  } catch (err) {
    log.error("Unhandled error in course completion", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
