import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  SITE_NAME,
  courseJsonLd as buildCourseJsonLd,
  REVIEW_AUTHOR,
} from "@/lib/seo";
import { getCourse, getCourseLessons, groupLessonsIntoModules } from "@/lib/course";
import { GENERAL_ADVICE_WARNING, COURSE_AFFILIATE_DISCLOSURE, ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import CoursePageClient from "./CoursePageClient";
import CoursesGate from "../CoursesGate";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course || course.status !== "published") return {};

  return {
    title: course.title,
    description: course.description || course.subtitle || "",
    alternates: { canonical: `/courses/${slug}` },
    openGraph: {
      title: course.title,
      description: course.subtitle || course.description || "",
      url: `/courses/${slug}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(course.title)}&subtitle=${encodeURIComponent(course.subtitle || "")}&type=default`,
          width: 1200,
          height: 630,
          alt: course.title,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}

export const revalidate = 3600;

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course || course.status !== "published") notFound();

  const lessons = await getCourseLessons(slug);
  const modules = groupLessonsIntoModules(lessons);
  const totalLessons = lessons.length;
  const freePreviewCount = lessons.filter((l) => l.is_free_preview).length;

  // Find first free preview for CTA
  const firstFreePreview = lessons.find((l) => l.is_free_preview);

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Courses", url: absoluteUrl("/courses") },
    { name: course.title },
  ]);

  const jsonLd = buildCourseJsonLd(course, totalLessons, modules.length);

  const priceDisplay = (course.price / 100).toFixed(0);
  const proPriceDisplay = course.pro_price ? (course.pro_price / 100).toFixed(0) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Suspense>
        <CoursesGate>
      <div className="py-12">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-green-700">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/courses" className="hover:text-green-700">Courses</Link>
            <span className="mx-2">/</span>
            <span className="text-green-700">{course.title}</span>
          </nav>

          {/* Hero */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${
                course.level === "beginner" ? "bg-green-50 text-green-700" :
                course.level === "intermediate" ? "bg-blue-50 text-blue-700" :
                "bg-purple-50 text-purple-700"
              }`}>
                {course.level}
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
              {course.title}
            </h1>

            {course.subtitle && (
              <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-6">
                {course.subtitle}
              </p>
            )}

            <div className="flex items-center justify-center gap-6 text-sm text-slate-500 mb-6">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                {modules.length} modules
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {totalLessons} lessons
              </span>
              {course.estimated_hours && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ~{course.estimated_hours} hours
                </span>
              )}
            </div>

            {/* Creator card */}
            {course.creator && (
              <div className="inline-flex items-center gap-3 bg-slate-50 rounded-full px-4 py-2">
                {course.creator.avatar_url ? (
                  <img
                    src={course.creator.avatar_url}
                    alt={course.creator.full_name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                    {course.creator.full_name.charAt(0)}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900">{course.creator.full_name}</p>
                  {course.creator.credentials?.[0] && (
                    <p className="text-xs text-slate-500">{course.creator.credentials[0]}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Module cards */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-8">What You&apos;ll Learn</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((mod) => (
                <div
                  key={mod.index}
                  className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">
                      {mod.index}
                    </div>
                    <h3 className="font-bold text-sm">{mod.title}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {mod.lessons.map((lesson) => (
                      <li key={lesson.slug} className="flex items-center gap-2 text-xs text-slate-600">
                        {lesson.isFreePreview ? (
                          <Link
                            href={`/courses/${slug}/${lesson.slug}`}
                            className="flex items-center gap-2 hover:text-green-700 transition-colors"
                          >
                            <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[0.5rem]">▶</span>
                            {lesson.title}
                            <span className="text-[0.5rem] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">FREE</span>
                          </Link>
                        ) : (
                          <>
                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            {lesson.title}
                          </>
                        )}
                        {lesson.videoUrl && (
                          <svg className="w-3 h-3 text-slate-300 shrink-0 ml-auto" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Free preview CTA */}
          {freePreviewCount > 0 && firstFreePreview && (
            <div className="text-center mb-16 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8">
              <h2 className="text-xl font-bold mb-2">Try Before You Buy</h2>
              <p className="text-sm text-slate-600 mb-4">
                {freePreviewCount} lesson{freePreviewCount > 1 ? "s are" : " is"} completely free — no sign-up required.
              </p>
              <Link
                href={`/courses/${slug}/${firstFreePreview.slug}`}
                className="inline-block px-6 py-3 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 hover:scale-105 hover:shadow-[0_0_12px_rgba(21,128,61,0.3)] transition-all duration-200"
              >
                Start Free Preview →
              </Link>
            </div>
          )}

          {/* Pricing */}
          <div id="pricing" className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-2">One Price. Lifetime Access.</h2>
            <p className="text-sm text-slate-500 text-center mb-8 max-w-lg mx-auto">
              Pay once and get every lesson, future updates
              {course.guarantee ? `, and a ${course.guarantee.toLowerCase().replace(".", "")}` : ""}
            </p>
            <CoursePageClient course={course} firstLessonSlug={lessons[0]?.slug} />
          </div>

          {/* Creator bio */}
          {course.creator && (
            <div className="mb-16 max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-8">About the Instructor</h2>
              <div className="flex items-start gap-5 bg-slate-50 rounded-2xl p-6">
                {course.creator.avatar_url ? (
                  <img
                    src={course.creator.avatar_url}
                    alt={course.creator.full_name}
                    className="w-16 h-16 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-xl font-bold text-green-700 shrink-0">
                    {course.creator.full_name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-900">{course.creator.full_name}</h3>
                  {course.creator.credentials?.length ? (
                    <p className="text-xs text-slate-500 mb-2">
                      {course.creator.credentials.join(" · ")}
                    </p>
                  ) : null}
                  {course.creator.short_bio && (
                    <p className="text-sm text-slate-600">{course.creator.short_bio}</p>
                  )}
                  <div className="flex gap-3 mt-3">
                    {course.creator.linkedin_url && (
                      <a href={course.creator.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 hover:underline">LinkedIn</a>
                    )}
                    {course.creator.twitter_url && (
                      <a href={course.creator.twitter_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 hover:underline">Twitter</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FAQ */}
          <div className="mb-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: "Is this financial advice?",
                  a: "No. This course provides general education about investing in Australia. It is not personal financial advice. Always consider your own circumstances and consult a licensed adviser if needed.",
                },
                ...(proPriceDisplay ? [{
                  q: "What if I already have an Investor Pro subscription?",
                  a: `Pro subscribers get a discount — pay just $${proPriceDisplay} instead of $${priceDisplay}. The discount is applied automatically at checkout.`,
                }] : []),
                ...(course.guarantee ? [{
                  q: "Is there a money-back guarantee?",
                  a: course.guarantee,
                }] : []),
                {
                  q: "How long do I have access?",
                  a: "Lifetime. You pay once and keep access to all lessons forever, including any future updates.",
                },
              ].map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-white">
                  <summary className="flex items-center justify-between cursor-pointer p-4 text-sm font-semibold text-slate-700 hover:text-green-700 transition-colors">
                    {faq.q}
                    <svg className="w-4 h-4 shrink-0 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <div className="px-4 pb-4 text-sm text-slate-600">{faq.a}</div>
                </details>
              ))}
            </div>
          </div>

          {/* Compliance */}
          <div className="space-y-3 text-center">
            <p className="text-xs text-slate-400">{GENERAL_ADVICE_WARNING}</p>
            <p className="text-xs text-slate-400">{COURSE_AFFILIATE_DISCLOSURE}</p>
            <p className="text-xs text-slate-400">{ADVERTISER_DISCLOSURE_SHORT}</p>
            <p className="text-xs text-slate-400 mt-4">
              {course.creator ? (
                <>Course by <span className="font-medium">{course.creator.full_name}</span>. </>
              ) : (
                <>Course content by <a href={REVIEW_AUTHOR.url} className="underline hover:text-green-700">{REVIEW_AUTHOR.name}</a>. </>
              )}
              <Link href="/how-we-earn" className="underline hover:text-green-700">How we earn</Link>
            </p>
          </div>
        </div>
      </div>
        </CoursesGate>
      </Suspense>
    </>
  );
}
