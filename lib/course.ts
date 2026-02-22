import { createClient } from "@/lib/supabase/server";
import type { Course, CourseLesson } from "@/lib/types";

/** Legacy export — existing code that imports this still works */
export const COURSE_SLUG = "investing-101";

export interface CourseModule {
  index: number;
  title: string;
  description: string;
  lessons: {
    index: number;
    title: string;
    slug: string;
    isFreePreview?: boolean;
    videoUrl?: string;
    videoDurationSeconds?: number;
  }[];
}

/* ─── DB-driven course fetchers ─── */

/**
 * Fetch a single course by slug, optionally joining creator.
 */
export async function getCourse(slug: string): Promise<Course | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*, creator:team_members(*)")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Course | null) ?? null;
}

/**
 * Fetch all published courses for the catalog page.
 */
export async function getPublishedCourses(): Promise<Course[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*, creator:team_members(*)")
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  return (data as Course[]) || [];
}

/**
 * Fetch all courses (any status) for admin.
 */
export async function getAllCourses(): Promise<Course[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*, creator:team_members(*)")
    .order("sort_order", { ascending: true });
  return (data as Course[]) || [];
}

/**
 * Fetch lessons for a course, ordered by module then lesson index.
 */
export async function getCourseLessons(courseSlug: string): Promise<CourseLesson[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_lessons")
    .select("*")
    .eq("course_slug", courseSlug)
    .order("module_index")
    .order("lesson_index");
  return (data as CourseLesson[]) || [];
}

/**
 * Group a flat list of lessons into CourseModule[] for display.
 */
export function groupLessonsIntoModules(lessons: CourseLesson[]): CourseModule[] {
  const map = new Map<number, CourseModule>();

  for (const l of lessons) {
    let mod = map.get(l.module_index);
    if (!mod) {
      mod = {
        index: l.module_index,
        title: l.module_title,
        description: "",
        lessons: [],
      };
      map.set(l.module_index, mod);
    }
    mod.lessons.push({
      index: l.lesson_index,
      title: l.title,
      slug: l.slug,
      isFreePreview: l.is_free_preview,
      videoUrl: l.video_url ?? undefined,
      videoDurationSeconds: l.video_duration_seconds ?? undefined,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.index - b.index);
}

/**
 * Flatten all lessons into a single ordered slug list for prev/next navigation.
 */
export function getAllLessonSlugs(lessons: CourseLesson[]): string[] {
  return lessons.map((l) => l.slug);
}

/**
 * Find module + lesson info by slug from a flat lesson list.
 */
export function findLessonBySlug(lessons: CourseLesson[], slug: string) {
  for (const l of lessons) {
    if (l.slug === slug) {
      return {
        module: { index: l.module_index, title: l.module_title },
        lesson: {
          index: l.lesson_index,
          title: l.title,
          slug: l.slug,
          isFreePreview: l.is_free_preview,
        },
      };
    }
  }
  return null;
}
