import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("org-auth:courses");

const TIER_COURSE_LIMITS: Record<string, number> = {
  free: 1,
  starter: 5,
  growth: 25,
  featured: Infinity,
};

const CreateCourseSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().max(2000).optional(),
  price: z.number().int().min(0),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  estimated_hours: z.number().min(0.5).max(100).optional(),
  is_cpd_eligible: z.boolean().optional(),
  cpd_hours: z.number().min(0).max(40).optional(),
  cpd_category: z.enum(["technical", "conduct", "client_care", "regulatory"]).optional(),
});

const PatchCourseSchema = z.object({
  courseId: z.number().int().positive(),
  title: z.string().min(5).max(120).optional(),
  description: z.string().max(2000).optional(),
  price: z.number().int().min(0).optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  estimated_hours: z.number().min(0.5).max(100).optional(),
  is_cpd_eligible: z.boolean().optional(),
  cpd_hours: z.number().min(0).max(40).optional(),
  cpd_category: z.enum(["technical", "conduct", "client_care", "regulatory"]).optional(),
  status: z.enum(["draft", "submitted"]).optional(),
});

function slugify(title: string, orgId: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base}-org${orgId}-${Date.now()}`;
}

/**
 * GET /api/org-auth/courses
 *
 * Returns all courses belonging to the authenticated organisation.
 */
export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`org_courses_get:${ip}`, 20, 1)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await requireOrgSession();
    const admin = createAdminClient();

    const { data: courses, error } = await admin
      .from("courses")
      .select(
        "id, slug, title, subtitle, description, price, level, estimated_hours, cover_image_url, status, is_cpd_eligible, cpd_hours, cpd_category, created_at",
      )
      .eq("organisation_id", session.organisationId)
      .eq("creator_kind", "organisation")
      .order("created_at", { ascending: false });

    if (error) {
      log.error("Failed to fetch courses", { error });
      return NextResponse.json({ error: "Failed to load courses" }, { status: 500 });
    }

    return NextResponse.json({ courses: courses ?? [] });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("GET /api/org-auth/courses error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/org-auth/courses
 *
 * Creates a new draft course for the authenticated organisation.
 * Enforces per-tier course count limits.
 */
export const POST = withValidatedBody(CreateCourseSchema, async (request, body) => {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`org_courses_post:${ip}`, 5, 1)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await requireOrgSession();
    const admin = createAdminClient();

    // Fetch org tier for limit check
    const { data: org, error: orgErr } = await admin
      .from("organisations")
      .select("tier")
      .eq("id", session.organisationId)
      .single();

    if (orgErr || !org) {
      log.error("Failed to fetch org tier", { error: orgErr });
      return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
    }

    const tier = (org.tier as string) ?? "free";
    const limit = TIER_COURSE_LIMITS[tier] ?? 1;

    if (limit !== Infinity) {
      const { count, error: countErr } = await admin
        .from("courses")
        .select("id", { count: "exact", head: true })
        .eq("organisation_id", session.organisationId)
        .eq("creator_kind", "organisation");

      if (countErr) {
        log.error("Failed to count courses", { error: countErr });
        return NextResponse.json({ error: "Failed to check course limit" }, { status: 500 });
      }

      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          { error: `Course limit reached for ${tier} tier (max ${limit})` },
          { status: 403 },
        );
      }
    }

    const slug = slugify(body.title, session.organisationId);

    const { data: course, error: insertErr } = await admin
      .from("courses")
      .insert({
        title: body.title,
        description: body.description ?? null,
        price: body.price,
        level: body.level ?? null,
        estimated_hours: body.estimated_hours ?? null,
        is_cpd_eligible: body.is_cpd_eligible ?? false,
        cpd_hours: body.cpd_hours ?? null,
        cpd_category: body.cpd_category ?? null,
        slug,
        organisation_id: session.organisationId,
        creator_kind: "organisation",
        status: "draft",
        revenue_share_percent: 70,
      })
      .select("*")
      .single();

    if (insertErr || !course) {
      log.error("Failed to create course", { error: insertErr });
      return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
    }

    return NextResponse.json({ course }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err as NextResponse;
    log.error("POST /api/org-auth/courses error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

/**
 * PATCH /api/org-auth/courses
 *
 * Updates a course owned by the authenticated organisation.
 * Status transitions: draft → submitted only (published/rejected are admin-only).
 */
export const PATCH = withValidatedBody(PatchCourseSchema, async (request, body) => {
  try {
    const session = await requireOrgSession();
    const admin = createAdminClient();

    const { courseId, ...fields } = body;

    // Verify ownership
    const { data: existing, error: fetchErr } = await admin
      .from("courses")
      .select("id, status, organisation_id")
      .eq("id", courseId)
      .eq("organisation_id", session.organisationId)
      .eq("creator_kind", "organisation")
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Status transition guard: only draft→submitted is allowed via PATCH
    if (fields.status !== undefined) {
      const currentStatus = existing.status as string;
      if (currentStatus !== "draft" || fields.status !== "submitted") {
        return NextResponse.json(
          { error: "Only draft→submitted status transition is allowed" },
          { status: 400 },
        );
      }
    }

    // Build update payload — omit undefined fields
    const update: Record<string, unknown> = {};
    if (fields.title !== undefined) update.title = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.price !== undefined) update.price = fields.price;
    if (fields.level !== undefined) update.level = fields.level;
    if (fields.estimated_hours !== undefined) update.estimated_hours = fields.estimated_hours;
    if (fields.is_cpd_eligible !== undefined) update.is_cpd_eligible = fields.is_cpd_eligible;
    if (fields.cpd_hours !== undefined) update.cpd_hours = fields.cpd_hours;
    if (fields.cpd_category !== undefined) update.cpd_category = fields.cpd_category;
    if (fields.status !== undefined) update.status = fields.status;

    const { data: updated, error: updateErr } = await admin
      .from("courses")
      .update(update)
      .eq("id", courseId)
      .select("*")
      .single();

    if (updateErr || !updated) {
      log.error("Failed to update course", { error: updateErr });
      return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
    }

    return NextResponse.json({ course: updated });
  } catch (err) {
    if (err instanceof Response) return err as NextResponse;
    log.error("PATCH /api/org-auth/courses error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
