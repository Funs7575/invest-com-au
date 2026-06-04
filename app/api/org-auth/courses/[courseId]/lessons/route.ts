import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrgSession } from "@/lib/require-org-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("org-auth:lessons");

const CreateLessonSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  module_title: z.string().min(1).max(200),
  module_index: z.number().int().min(0),
  lesson_index: z.number().int().min(0),
  content: z.string().max(50000).optional(),
  video_url: z.string().url().optional().nullable(),
  duration_minutes: z.number().int().min(1).optional().nullable(),
  video_duration_seconds: z.number().int().min(0).optional().nullable(),
  is_free_preview: z.boolean().optional(),
});

const PatchLessonSchema = z.object({
  lessonId: z.number().int().positive(),
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  module_title: z.string().min(1).max(200).optional(),
  module_index: z.number().int().min(0).optional(),
  lesson_index: z.number().int().min(0).optional(),
  content: z.string().max(50000).optional(),
  video_url: z.string().url().optional().nullable(),
  duration_minutes: z.number().int().min(1).optional().nullable(),
  video_duration_seconds: z.number().int().min(0).optional().nullable(),
  is_free_preview: z.boolean().optional(),
});

/**
 * GET /api/org-auth/courses/[courseId]/lessons
 *
 * Returns all lessons for a course owned by the authenticated organisation.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const session = await requireOrgSession();
    const admin = createAdminClient();
    const { courseId: courseIdStr } = await params;
    const courseId = parseInt(courseIdStr, 10);

    if (isNaN(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    // Verify ownership — org must own this course
    const { data: course, error: courseErr } = await admin
      .from("courses")
      .select("id, slug")
      .eq("id", courseId)
      .eq("organisation_id", session.organisationId)
      .eq("creator_kind", "organisation")
      .single();

    if (courseErr || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const { data: lessons, error: lessonsErr } = await admin
      .from("course_lessons")
      .select(
        "id, slug, title, module_title, module_index, lesson_index, content, video_url, duration_minutes, video_duration_seconds, is_free_preview, created_at, updated_at",
      )
      .eq("course_slug", course.slug as string)
      .order("module_index")
      .order("lesson_index");

    if (lessonsErr) {
      log.error("Failed to fetch lessons", { courseId, error: lessonsErr });
      return NextResponse.json({ error: "Failed to load lessons" }, { status: 500 });
    }

    return NextResponse.json({ lessons: lessons ?? [] });
  } catch (err) {
    if (err instanceof Response) return err;
    log.error("GET /api/org-auth/courses/[courseId]/lessons error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/org-auth/courses/[courseId]/lessons
 *
 * Creates a new lesson for a course owned by the authenticated organisation.
 */
export const POST = withValidatedBody(
  CreateLessonSchema,
  async (request: NextRequest, body) => {
    try {
      const session = await requireOrgSession();
      if (session.role === "viewer") {
        return NextResponse.json({ error: "Forbidden — viewers cannot create lessons." }, { status: 403 });
      }
      const admin = createAdminClient();

      // Parse courseId from URL
      const url = new URL(request.url);
      const parts = url.pathname.split("/");
      const courseIdStr = parts[parts.indexOf("courses") + 1] ?? "";
      const courseId = parseInt(courseIdStr, 10);

      if (isNaN(courseId)) {
        return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
      }

      // Verify ownership
      const { data: course, error: courseErr } = await admin
        .from("courses")
        .select("id, slug")
        .eq("id", courseId)
        .eq("organisation_id", session.organisationId)
        .eq("creator_kind", "organisation")
        .single();

      if (courseErr || !course) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
      }

      const { data: lesson, error: insertErr } = await admin
        .from("course_lessons")
        .insert({
          course_slug: course.slug as string,
          title: body.title,
          slug: body.slug,
          module_title: body.module_title,
          module_index: body.module_index,
          lesson_index: body.lesson_index,
          content: body.content ?? null,
          video_url: body.video_url ?? null,
          duration_minutes: body.duration_minutes ?? null,
          video_duration_seconds: body.video_duration_seconds ?? null,
          is_free_preview: body.is_free_preview ?? false,
        })
        .select("*")
        .single();

      if (insertErr || !lesson) {
        log.error("Failed to create lesson", { courseId, error: insertErr });
        return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 });
      }

      return NextResponse.json({ lesson }, { status: 201 });
    } catch (err) {
      if (err instanceof Response) return err as NextResponse;
      log.error("POST /api/org-auth/courses/[courseId]/lessons error", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
);

/**
 * PATCH /api/org-auth/courses/[courseId]/lessons
 *
 * Updates a lesson for a course owned by the authenticated organisation.
 */
export const PATCH = withValidatedBody(
  PatchLessonSchema,
  async (request: NextRequest, body) => {
    try {
      const session = await requireOrgSession();
      if (session.role === "viewer") {
        return NextResponse.json({ error: "Forbidden — viewers cannot edit lessons." }, { status: 403 });
      }
      const admin = createAdminClient();

      // Parse courseId from URL
      const url = new URL(request.url);
      const parts = url.pathname.split("/");
      const courseIdStr = parts[parts.indexOf("courses") + 1] ?? "";
      const courseId = parseInt(courseIdStr, 10);

      if (isNaN(courseId)) {
        return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
      }

      // Verify course ownership
      const { data: course, error: courseErr } = await admin
        .from("courses")
        .select("id, slug")
        .eq("id", courseId)
        .eq("organisation_id", session.organisationId)
        .eq("creator_kind", "organisation")
        .single();

      if (courseErr || !course) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
      }

      const { lessonId, ...fields } = body;

      // Verify lesson belongs to this course
      const { data: existing, error: fetchErr } = await admin
        .from("course_lessons")
        .select("id")
        .eq("id", lessonId)
        .eq("course_slug", course.slug as string)
        .single();

      if (fetchErr || !existing) {
        return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
      }

      // Build update payload — omit undefined fields
      const update: Record<string, unknown> = {};
      if (fields.title !== undefined) update.title = fields.title;
      if (fields.slug !== undefined) update.slug = fields.slug;
      if (fields.module_title !== undefined) update.module_title = fields.module_title;
      if (fields.module_index !== undefined) update.module_index = fields.module_index;
      if (fields.lesson_index !== undefined) update.lesson_index = fields.lesson_index;
      if (fields.content !== undefined) update.content = fields.content;
      if (fields.video_url !== undefined) update.video_url = fields.video_url;
      if (fields.duration_minutes !== undefined) update.duration_minutes = fields.duration_minutes;
      if (fields.video_duration_seconds !== undefined)
        update.video_duration_seconds = fields.video_duration_seconds;
      if (fields.is_free_preview !== undefined) update.is_free_preview = fields.is_free_preview;

      const { data: updated, error: updateErr } = await admin
        .from("course_lessons")
        .update(update)
        .eq("id", lessonId)
        .select("*")
        .single();

      if (updateErr || !updated) {
        log.error("Failed to update lesson", { lessonId, error: updateErr });
        return NextResponse.json({ error: "Failed to update lesson" }, { status: 500 });
      }

      return NextResponse.json({ lesson: updated });
    } catch (err) {
      if (err instanceof Response) return err as NextResponse;
      log.error("PATCH /api/org-auth/courses/[courseId]/lessons error", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  },
);
