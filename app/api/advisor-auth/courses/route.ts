/**
 * /api/advisor-auth/courses
 *
 * Advisor course management — list, create, and update courses the
 * authenticated advisor owns. Uses createAdminClient() because
 * requireAdvisorSession() supports both Supabase Auth sessions and legacy
 * cookie sessions (advisor_sessions table), and the latter has no
 * auth.uid() linkage so RLS SELECT policies cannot be relied on here.
 * Ownership is enforced at the application layer via advisor_professional_id.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("advisor-auth:courses");

// ─── helpers ─────────────────────────────────────────────────────────────────

function autoSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── GET — list courses owned by the authenticated advisor ────────────────────

export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: courses, error } = await admin
    .from("courses")
    .select(
      "id, slug, title, subtitle, description, status, price, level, estimated_hours, cover_image_url, is_advisor_created, advisor_professional_id, submitted_at, rejection_reason, created_at, updated_at",
    )
    .eq("advisor_professional_id", advisorId)
    .eq("is_advisor_created", true)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("courses fetch failed", { advisor_id: advisorId, error: error.message });
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }

  return NextResponse.json({ courses: courses ?? [] });
}

// ─── POST — create a new draft course ────────────────────────────────────────

const CreateCourseBody = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(5000).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  price: z.number().min(0).max(100000).optional(),
  estimated_hours: z.number().min(0).max(1000).optional(),
  cover_image_url: z.string().url().max(500).optional().or(z.literal("")),
});

export const POST = withValidatedBody(CreateCourseBody, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_courses_create:${ip}`, 10, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify advisor has Stripe Connect payouts enabled before allowing course creation
  const admin = createAdminClient();
  const { data: advisor } = await admin
    .from("professionals")
    .select("stripe_connect_payouts_enabled, status")
    .eq("id", advisorId)
    .maybeSingle();

  if (!advisor || advisor.status !== "active") {
    return NextResponse.json({ error: "Only active advisors can create courses" }, { status: 403 });
  }

  if (!advisor.stripe_connect_payouts_enabled) {
    return NextResponse.json(
      { error: "You must connect Stripe payouts before creating courses" },
      { status: 403 },
    );
  }

  const baseSlug = autoSlug(body.title);

  // Ensure slug uniqueness by appending a suffix if needed
  let slug = baseSlug;
  const { count } = await admin
    .from("courses")
    .select("id", { count: "exact", head: true })
    .like("slug", `${baseSlug}%`);
  if ((count ?? 0) > 0) {
    slug = `${baseSlug}-${Date.now()}`;
  }

  const { data: course, error } = await admin
    .from("courses")
    .insert({
      title: body.title,
      slug,
      description: body.description ?? null,
      level: body.level ?? "beginner",
      price: body.price !== undefined ? Math.round(body.price * 100) : 0,
      estimated_hours: body.estimated_hours ?? null,
      cover_image_url: body.cover_image_url || null,
      status: "draft",
      is_advisor_created: true,
      advisor_professional_id: advisorId,
      revenue_share_percent: 70, // Default: advisor gets 70%, platform takes 30%
      currency: "aud",
    })
    .select(
      "id, slug, title, description, status, price, level, estimated_hours, cover_image_url, is_advisor_created, advisor_professional_id, submitted_at, rejection_reason, created_at",
    )
    .single();

  if (error) {
    log.error("course insert failed", { advisor_id: advisorId, error: error.message });
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }

  return NextResponse.json({ course }, { status: 201 });
});

// ─── PATCH — update course fields or transition status ────────────────────────

const UpdateCourseBody = z.object({
  courseId: z.number().int().positive(),
  title: z.string().min(5).max(200).optional(),
  description: z.string().max(5000).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  price: z.number().min(0).max(100000).optional(),
  estimated_hours: z.number().min(0).max(1000).optional(),
  cover_image_url: z.string().url().max(500).optional().or(z.literal("")),
  status: z.enum(["draft", "submitted"]).optional(),
});

export const PATCH = withValidatedBody(UpdateCourseBody, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_courses_update:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify ownership
  const { data: existing } = await admin
    .from("courses")
    .select("id, status, advisor_professional_id")
    .eq("id", body.courseId)
    .eq("advisor_professional_id", advisorId)
    .eq("is_advisor_created", true)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Status transition rules: advisors can only go draft → submitted.
  // Admin controls submitted → published / rejected transitions.
  if (body.status !== undefined) {
    const allowed: Record<string, string[]> = {
      draft: ["submitted"],
      submitted: [], // locked while under review
      published: [], // cannot be edited once published without admin action
      rejected: ["draft"], // admin can reopen; advisor can re-edit
    };
    const transitions = allowed[existing.status] ?? [];
    if (!transitions.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot transition from '${existing.status}' to '${body.status}'` },
        { status: 400 },
      );
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.level !== undefined) updates.level = body.level;
  if (body.price !== undefined) updates.price = Math.round(body.price * 100);
  if (body.estimated_hours !== undefined) updates.estimated_hours = body.estimated_hours;
  if (body.cover_image_url !== undefined) {
    updates.cover_image_url = body.cover_image_url || null;
  }
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "submitted") {
      updates.submitted_at = new Date().toISOString();
    }
  }

  const { data: course, error } = await admin
    .from("courses")
    .update(updates)
    .eq("id", body.courseId)
    .select(
      "id, slug, title, description, status, price, level, estimated_hours, cover_image_url, submitted_at, rejection_reason, created_at, updated_at",
    )
    .single();

  if (error) {
    log.error("course update failed", { advisor_id: advisorId, course_id: body.courseId, error: error.message });
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }

  return NextResponse.json({ course });
});
