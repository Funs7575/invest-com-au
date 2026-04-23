import { describe, it, expect } from "vitest";
import {
  COURSE_SLUG,
  groupLessonsIntoModules,
  getAllLessonSlugs,
  findLessonBySlug,
} from "@/lib/course";
import type { CourseLesson } from "@/lib/types";

function makeLesson(overrides: Partial<CourseLesson> = {}): CourseLesson {
  return {
    id: 1,
    course_slug: "investing-101",
    module_index: 1,
    module_title: "Module 1",
    lesson_index: 1,
    slug: "lesson-1",
    title: "Lesson 1",
    is_free_preview: false,
    video_url: null,
    video_duration_seconds: null,
    content_md: "",
    resources: null,
    sort_order: 0,
    created_at: "",
    updated_at: "",
    ...overrides,
  } as unknown as CourseLesson;
}

describe("COURSE_SLUG", () => {
  it("is the legacy 'investing-101' constant", () => {
    expect(COURSE_SLUG).toBe("investing-101");
  });
});

describe("groupLessonsIntoModules", () => {
  it("returns [] for empty input", () => {
    expect(groupLessonsIntoModules([])).toEqual([]);
  });

  it("groups lessons by module_index and sorts modules ascending", () => {
    const lessons = [
      makeLesson({ module_index: 2, module_title: "M2", lesson_index: 1, slug: "m2-l1" }),
      makeLesson({ module_index: 1, module_title: "M1", lesson_index: 1, slug: "m1-l1" }),
      makeLesson({ module_index: 1, module_title: "M1", lesson_index: 2, slug: "m1-l2" }),
    ];
    const modules = groupLessonsIntoModules(lessons);
    expect(modules).toHaveLength(2);
    expect(modules[0]?.index).toBe(1);
    expect(modules[0]?.title).toBe("M1");
    expect(modules[0]?.lessons).toHaveLength(2);
    expect(modules[1]?.index).toBe(2);
    expect(modules[1]?.lessons).toHaveLength(1);
  });

  it("passes through isFreePreview + videoUrl + videoDurationSeconds", () => {
    const lessons = [
      makeLesson({
        module_index: 1,
        lesson_index: 1,
        slug: "x",
        is_free_preview: true,
        video_url: "https://v.cdn/x.mp4",
        video_duration_seconds: 320,
      }),
    ];
    const [mod] = groupLessonsIntoModules(lessons);
    expect(mod?.lessons[0]?.isFreePreview).toBe(true);
    expect(mod?.lessons[0]?.videoUrl).toBe("https://v.cdn/x.mp4");
    expect(mod?.lessons[0]?.videoDurationSeconds).toBe(320);
  });

  it("coerces null video_url / video_duration_seconds to undefined", () => {
    const lessons = [
      makeLesson({
        module_index: 1,
        lesson_index: 1,
        slug: "x",
        video_url: undefined,
        video_duration_seconds: undefined,
      }),
    ];
    const [mod] = groupLessonsIntoModules(lessons);
    expect(mod?.lessons[0]?.videoUrl).toBeUndefined();
    expect(mod?.lessons[0]?.videoDurationSeconds).toBeUndefined();
  });
});

describe("getAllLessonSlugs", () => {
  it("returns slugs in the original order of the lessons array", () => {
    const lessons = [
      makeLesson({ slug: "a" }),
      makeLesson({ slug: "b" }),
      makeLesson({ slug: "c" }),
    ];
    expect(getAllLessonSlugs(lessons)).toEqual(["a", "b", "c"]);
  });

  it("returns [] for empty input", () => {
    expect(getAllLessonSlugs([])).toEqual([]);
  });
});

describe("findLessonBySlug", () => {
  const lessons = [
    makeLesson({
      module_index: 1,
      module_title: "M1",
      lesson_index: 1,
      slug: "a",
      is_free_preview: true,
    }),
    makeLesson({
      module_index: 2,
      module_title: "M2",
      lesson_index: 3,
      slug: "b",
      title: "Lesson B",
    }),
  ];

  it("returns null when slug missing", () => {
    expect(findLessonBySlug(lessons, "not-a-slug")).toBeNull();
  });

  it("returns the matching module + lesson summary", () => {
    const res = findLessonBySlug(lessons, "b");
    expect(res?.module).toEqual({ index: 2, title: "M2" });
    expect(res?.lesson.slug).toBe("b");
    expect(res?.lesson.title).toBe("Lesson B");
    expect(res?.lesson.index).toBe(3);
    expect(res?.lesson.isFreePreview).toBe(false);
  });

  it("reflects the is_free_preview bit", () => {
    expect(findLessonBySlug(lessons, "a")?.lesson.isFreePreview).toBe(true);
  });
});
