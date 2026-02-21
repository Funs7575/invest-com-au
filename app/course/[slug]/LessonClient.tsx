"use client";

import { useState } from "react";
import Link from "next/link";
import type { CourseLesson } from "@/lib/types";
import type { CourseModule } from "@/lib/course";

interface LessonInfo {
  index: number;
  title: string;
  slug: string;
  isFreePreview?: boolean;
}

interface Props {
  lesson: CourseLesson | null;
  lessonInfo: LessonInfo;
  moduleInfo: { index: number; title: string };
  modules: CourseModule[];
  prevSlug: string | null;
  nextSlug: string | null;
  lessonIdMap: Record<string, number>;
  completedLessonIds: number[];
  isFreePreview: boolean;
  isLoggedIn: boolean;
}

export default function LessonClient({
  lesson,
  lessonInfo,
  moduleInfo,
  modules,
  prevSlug,
  nextSlug,
  lessonIdMap,
  completedLessonIds,
  isFreePreview,
  isLoggedIn,
}: Props) {
  const [completed, setCompleted] = useState(
    lesson ? completedLessonIds.includes(lesson.id) : false
  );
  const [marking, setMarking] = useState(false);

  // Calculate overall progress
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
  const completedCount = completedLessonIds.length + (completed && lesson && !completedLessonIds.includes(lesson.id) ? 1 : 0);
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const handleMarkComplete = async () => {
    if (!lesson) return;
    setMarking(true);
    try {
      const res = await fetch("/api/course/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_id: lesson.id }),
      });
      if (res.ok) {
        setCompleted(true);
      }
    } catch {
      // Silently fail
    }
    setMarking(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Mobile course nav — collapsible outline (visible below lg) */}
      <details className="lg:hidden mb-6 rounded-xl border border-slate-200 bg-white w-full">
        <summary className="flex items-center justify-between cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
          <span>Course Outline — Module {moduleInfo.index}: {moduleInfo.title}</span>
          <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </summary>
        <div className="px-4 pb-3 space-y-2 max-h-64 overflow-y-auto">
          {modules.map((mod) => (
            <div key={mod.index}>
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400 mb-1">
                Module {mod.index}: {mod.title}
              </p>
              <ul className="space-y-0.5 mb-2">
                {mod.lessons.map((l) => {
                  const isCurrent = l.slug === lessonInfo.slug;
                  return (
                    <li key={l.slug}>
                      <Link
                        href={`/course/${l.slug}`}
                        className={`block px-2 py-1 rounded text-xs transition-colors ${
                          isCurrent
                            ? "bg-green-50 text-green-800 font-bold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {l.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </details>

      {/* Sidebar — course outline (desktop) */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20">
          {/* Progress bar */}
          {isLoggedIn && !isFreePreview && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <nav className="space-y-3 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            {modules.map((mod) => (
              <div key={mod.index}>
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400 mb-1">
                  Module {mod.index}: {mod.title}
                </p>
                <ul className="space-y-0.5">
                  {mod.lessons.map((l) => {
                    const isCurrent = l.slug === lessonInfo.slug;
                    const lessonId = lessonIdMap[l.slug];
                    const isCompleted = lessonId ? completedLessonIds.includes(lessonId) || (isCurrent && completed) : false;

                    return (
                      <li key={l.slug}>
                        <Link
                          href={`/course/${l.slug}`}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                            isCurrent
                              ? "bg-green-50 text-green-800 font-bold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-green-700"
                          }`}
                        >
                          {isCompleted ? (
                            <svg className="w-3.5 h-3.5 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : isCurrent ? (
                            <span className="w-3.5 h-3.5 rounded-full bg-green-600 shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                          )}
                          <span className="truncate">{l.title}</span>
                          {l.isFreePreview && (
                            <span className="text-[0.45rem] px-1 py-0.5 bg-green-50 text-green-600 rounded font-medium ml-auto shrink-0">
                              FREE
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Module badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-slate-400 font-medium">
            Module {moduleInfo.index}
          </span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-400">{moduleInfo.title}</span>
          {isFreePreview && (
            <span className="text-[0.55rem] px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">
              FREE PREVIEW
            </span>
          )}
        </div>

        <h1 className="text-2xl md:text-3xl font-extrabold mb-6">{lessonInfo.title}</h1>

        {/* Lesson content */}
        {lesson?.content ? (
          <article
            className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-green-700 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          />
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <p className="text-sm text-slate-500">
              Lesson content is being prepared. Check back soon!
            </p>
          </div>
        )}

        {/* Mark complete + navigation */}
        <div className="mt-10 pt-6 border-t border-slate-200">
          {/* Mark complete button */}
          {isLoggedIn && !isFreePreview && lesson && (
            <div className="mb-6">
              {completed ? (
                <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Lesson completed ✓
                </div>
              ) : (
                <button
                  onClick={handleMarkComplete}
                  disabled={marking}
                  className="px-5 py-2.5 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
                >
                  {marking ? "Saving..." : "Mark as Complete ✓"}
                </button>
              )}
            </div>
          )}

          {/* Prev / Next */}
          <div className="flex items-center justify-between">
            {prevSlug ? (
              <Link
                href={`/course/${prevSlug}`}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-green-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous Lesson
              </Link>
            ) : <div />}

            {nextSlug ? (
              <Link
                href={`/course/${nextSlug}`}
                className="flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
              >
                Next Lesson
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <Link
                href="/course"
                className="flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800 transition-colors"
              >
                Back to Course Overview
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>

        {/* Free preview upsell */}
        {isFreePreview && !isLoggedIn && (
          <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 text-center">
            <h3 className="font-bold text-slate-700 mb-1">Enjoying the free preview?</h3>
            <p className="text-sm text-slate-500 mb-4">
              Get all {modules.reduce((s, m) => s + m.lessons.length, 0)} lessons with lifetime access.
            </p>
            <Link
              href="/course#pricing"
              className="inline-block px-6 py-2.5 bg-green-700 text-white font-bold text-sm rounded-lg hover:bg-green-800 hover:scale-105 transition-all duration-200"
            >
              Get Full Course →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
