import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { COURSE_CONFIG, COURSE_MODULES, findLessonBySlug, getAllLessonSlugs } from "@/lib/course";
import { hasCourseAccess } from "@/lib/server/course-access";
import { GENERAL_ADVICE_WARNING, COURSE_AFFILIATE_DISCLOSURE } from "@/lib/compliance";
import type { CourseLesson } from "@/lib/types";
import LessonClient from "./LessonClient";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const info = findLessonBySlug(slug);
  if (!info) return {};

  const title = `${info.lesson.title} — ${COURSE_CONFIG.title}`;
  return {
    title,
    description: `Module ${info.module.index}: ${info.module.title} — ${info.lesson.title}`,
    alternates: { canonical: `/course/${slug}` },
    robots: { index: false }, // Don't index lesson pages (gated content)
  };
}

export async function generateStaticParams() {
  return getAllLessonSlugs().map((slug) => ({ slug }));
}

export const revalidate = 3600;

export default async function LessonPage({ params }: PageProps) {
  const { slug } = await params;

  // Find lesson metadata from static config
  const info = findLessonBySlug(slug);
  if (!info) notFound();

  // Fetch lesson content from database
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("course_lessons")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  const dbLesson = lesson as CourseLesson | null;

  // Check if this is a free preview
  const isFreePreview = info.lesson.isFreePreview || false;

  // Check auth + purchase
  const { data: { user } } = await supabase.auth.getUser();
  let hasAccess = isFreePreview;
  let completedLessonIds: number[] = [];

  if (user) {
    const purchased = await hasCourseAccess(user.id);
    if (purchased) {
      hasAccess = true;

      // Fetch progress
      const { data: progress } = await supabase
        .from("course_progress")
        .select("lesson_id")
        .eq("user_id", user.id);
      completedLessonIds = (progress || []).map((p: { lesson_id: number }) => p.lesson_id);
    }
  }

  // Build prev/next navigation
  const allSlugs = getAllLessonSlugs();
  const currentIndex = allSlugs.indexOf(slug);
  const prevSlug = currentIndex > 0 ? allSlugs[currentIndex - 1] : null;
  const nextSlug = currentIndex < allSlugs.length - 1 ? allSlugs[currentIndex + 1] : null;

  // Fetch all lesson IDs for progress mapping
  const { data: allLessons } = await supabase
    .from("course_lessons")
    .select("id, slug")
    .eq("course_slug", "investing-101")
    .order("module_index")
    .order("lesson_index");

  const lessonIdMap: Record<string, number> = {};
  (allLessons || []).forEach((l: { id: number; slug: string }) => {
    lessonIdMap[l.slug] = l.id;
  });

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Course", url: absoluteUrl("/course") },
    { name: info.lesson.title },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="py-8">
        <div className="container-custom max-w-6xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-green-700">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/course" className="hover:text-green-700">Course</Link>
            <span className="mx-2">/</span>
            <span className="text-green-700">{info.lesson.title}</span>
          </nav>

          {!hasAccess ? (
            /* ─── Gated: show paywall ─── */
            <div className="max-w-2xl mx-auto text-center py-16">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
              <h1 className="text-2xl font-extrabold mb-2">{info.lesson.title}</h1>
              <p className="text-sm text-slate-500 mb-2">
                Module {info.module.index}: {info.module.title}
              </p>
              <p className="text-slate-600 mb-8">
                This lesson is part of the full course. Purchase to unlock all {COURSE_CONFIG.totalLessons} lessons.
              </p>
              <Link
                href="/course#pricing"
                className="inline-block px-8 py-3 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 hover:scale-105 hover:shadow-[0_0_12px_rgba(21,128,61,0.3)] transition-all duration-200"
              >
                Unlock Course — ${COURSE_CONFIG.price}
              </Link>
              <p className="text-xs text-slate-400 mt-3">{COURSE_CONFIG.guarantee}</p>
            </div>
          ) : (
            /* ─── Accessible: show lesson content ─── */
            <LessonClient
              lesson={dbLesson}
              lessonInfo={info.lesson}
              moduleInfo={{ index: info.module.index, title: info.module.title }}
              modules={COURSE_MODULES}
              prevSlug={prevSlug}
              nextSlug={nextSlug}
              lessonIdMap={lessonIdMap}
              completedLessonIds={completedLessonIds}
              isFreePreview={isFreePreview}
              isLoggedIn={!!user}
            />
          )}

          {/* Compliance */}
          <div className="mt-12 space-y-2 text-center">
            <p className="text-[0.6rem] text-slate-400">{GENERAL_ADVICE_WARNING}</p>
            <p className="text-[0.6rem] text-slate-400">{COURSE_AFFILIATE_DISCLOSURE}</p>
          </div>
        </div>
      </div>
    </>
  );
}
