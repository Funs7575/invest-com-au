/**
 * /api/advisor-auth/courses/[courseId]/lessons
 *
 * Manage lessons for an advisor-owned course. Uses createAdminClient()
 * for the same reason as the parent courses route: requireAdvisorSession()
 * supports both Supabase Auth and legacy cookie sessions, and the latter
 * has no auth.uid() linkage for RLS.  Ownership is enforced at the
 * application layer by verifying advisor_professional_id on the course.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("advisor-auth:courses:lessons");

type RouteContext = { params: Promise<{ courseId: string }> };

// ─── helpers ─────────────────────────────────────────────────────────────────

function autoLessonSlug(courseSlug: string, moduleIndex: number, lessonIndex: number, title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${courseSlug}-m${moduleIndex}-l${lessonIndex}-${base}`.slice(0, 200);
}

/** Verify the advisor owns the course and return {id, slug} or null */
async function getOwnedCourse(
  advisorId: number,
  courseId: number,
): Promise<{ id: number; slug: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("courses")
    .select("id, slug")
    .eq("id", courseId)
    .eq("advisor_professional_id", advisorId)
    .eq("is_advisor_created", true)
    .maybeSingle();
  return data ?? null;
}

// ─── GET — list lessons for a course ─────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const { courseId: courseIdStr } = await context.params;
  const courseId = parseInt(courseIdStr, 10);
  if (!courseId || isNaN(courseId)) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const course = await getOwnedCourse(advisorId, courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: lessons, error } = await admin
    .from("course_lessons")
    .select(
      "id, slug, title, module_title, module_index, lesson_index, content, video_url, duration_minutes, is_free_preview, created_at, updated_at",
    )
    .eq("course_slug", course.slug)
    .order("module_index", { ascending: true })
    .order("lesson_index", { ascending: true });

  if (error) {
    log.error("lessons fetch failed", { advisor_id: advisorId, course_id: courseId, error: error.message });
    return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 });
  }

  return NextResponse.json({ lessons: lessons ?? [] });
}

// ─── POST — add a lesson ──────────────────────────────────────────────────────

const CreateLessonBody = z.object({
  title: z.string().min(2).max(200),
  module_title: z.string().min(1).max(200),
  module_index: z.number().int().min(0).max(100),
  lesson_index: z.number().int().min(0).max(100),
  content: z.string().max(50000).optional(),
  video_url: z.string().url().max(500).optional().or(z.literal("")),
  duration_minutes: z.number().int().min(0).max(600).optional(),
  is_free_preview: z.boolean().optional(),
});

export const POST = withValidatedBody(CreateLessonBody, async (request, body) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const courseIdStr = segments[segments.indexOf("courses") + 1];
  const courseId = parseInt(courseIdStr ?? "", 10);
  if (!courseId || isNaN(courseId)) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_lessons_create:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const course = await getOwnedCourse(advisorId, courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Check for slug uniqueness within the course
  let slug = autoLessonSlug(course.slug, body.module_index, body.lesson_index, body.title);
  const { count } = await admin
    .from("course_lessons")
    .select("id", { count: "exact", head: true })
    .like("slug", `${slug}%`);
  if ((count ?? 0) > 0) {
    slug = `${slug}-${Date.now()}`.slice(0, 200);
  }

  const { data: lesson, error } = await admin
    .from("course_lessons")
    .insert({
      course_slug: course.slug,
      slug,
      title: body.title,
      module_title: body.module_title,
      module_index: body.module_index,
      lesson_index: body.lesson_index,
      content: body.content ?? null,
      video_url: body.video_url || null,
      duration_minutes: body.duration_minutes ?? null,
      is_free_preview: body.is_free_preview ?? false,
    })
    .select(
      "id, slug, title, module_title, module_index, lesson_index, content, video_url, duration_minutes, is_free_preview, created_at",
    )
    .single();

  if (error) {
    log.error("lesson insert failed", { advisor_id: advisorId, course_id: courseId, error: error.message });
    return NextResponse.json({ error: "Failed to create lesson" }, { status: 500 });
  }

  return NextResponse.json({ lesson }, { status: 201 });
});

// ─── PATCH — update a lesson ──────────────────────────────────────────────────

const UpdateLessonBody = z.object({
  lessonId: z.number().int().positive(),
  title: z.string().min(2).max(200).optional(),
  module_title: z.string().min(1).max(200).optional(),
  module_index: z.number().int().min(0).max(100).optional(),
  lesson_index: z.number().int().min(0).max(100).optional(),
  content: z.string().max(50000).optional(),
  video_url: z.string().url().max(500).optional().or(z.literal("")),
  duration_minutes: z.number().int().min(0).max(600).optional(),
  is_free_preview: z.boolean().optional(),
});

export const PATCH = withValidatedBody(UpdateLessonBody, async (request, body) => {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  const courseIdStr = segments[segments.indexOf("courses") + 1];
  const courseId = parseInt(courseIdStr ?? "", 10);
  if (!courseId || isNaN(courseId)) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_lessons_update:${ip}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const course = await getOwnedCourse(advisorId, courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Verify the lesson belongs to this course
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("course_lessons")
    .select("id")
    .eq("id", body.lessonId)
    .eq("course_slug", course.slug)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.module_title !== undefined) updates.module_title = body.module_title;
  if (body.module_index !== undefined) updates.module_index = body.module_index;
  if (body.lesson_index !== undefined) updates.lesson_index = body.lesson_index;
  if (body.content !== undefined) updates.content = body.content;
  if (body.video_url !== undefined) updates.video_url = body.video_url || null;
  if (body.duration_minutes !== undefined) updates.duration_minutes = body.duration_minutes;
  if (body.is_free_preview !== undefined) updates.is_free_preview = body.is_free_preview;

  const { data: lesson, error } = await admin
    .from("course_lessons")
    .update(updates)
    .eq("id", body.lessonId)
    .select(
      "id, slug, title, module_title, module_index, lesson_index, content, video_url, duration_minutes, is_free_preview, created_at, updated_at",
    )
    .single();

  if (error) {
    log.error("lesson update failed", { advisor_id: advisorId, lesson_id: body.lessonId, error: error.message });
    return NextResponse.json({ error: "Failed to update lesson" }, { status: 500 });
  }

  return NextResponse.json({ lesson });
});

// ─── DELETE — remove a lesson ─────────────────────────────────────────────────

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { courseId: courseIdStr } = await context.params;
  const courseId = parseInt(courseIdStr, 10);
  if (!courseId || isNaN(courseId)) {
    return NextResponse.json({ error: "Invalid courseId" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_lessons_delete:${ip}`, 20, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const course = await getOwnedCourse(advisorId, courseId);
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Parse lessonId from request body
  let lessonId: number;
  try {
     
    const raw = await request.json() as { lessonId?: unknown };
    const result = z.object({ lessonId: z.coerce.number().int().positive() }).safeParse(raw);
    if (!result.success) {
      return NextResponse.json({ error: "lessonId is required" }, { status: 400 });
    }
    lessonId = result.data.lessonId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("course_lessons")
    .delete()
    .eq("id", lessonId)
    .eq("course_slug", course.slug);

  if (error) {
    log.error("lesson delete failed", { advisor_id: advisorId, lesson_id: lessonId, error: error.message });
    return NextResponse.json({ error: "Failed to delete lesson" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
