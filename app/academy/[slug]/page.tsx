import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { SHOW_RATINGS } from "@/lib/compliance-config";
import SocialShareButtons from "@/components/SocialShareButtons";
import {
  getAcademyCourse,
  getTopAcademyCourseSlugs,
  creatorName,
  creatorSlug,
  creatorLogoUrl,
} from "@/lib/academy";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- enrollment SELECT + certificate SELECT require service_role; course_enrollments has deny-all-anon RLS and certificate lookup is cross-scoped (see CLAUDE.md)
import { createAdminClient } from "@/lib/supabase/admin";
import EnrollButton from "./EnrollButton";
import CourseCompleteButton from "@/components/CourseCompleteButton";

const CourseReviews = dynamic(
  () => import("@/app/courses/[slug]/CourseReviews"),
);

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getTopAcademyCourseSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getAcademyCourse(slug);
  if (!course || course.status !== "published") return { robots: { index: false } };

  return {
    title: `${course.title} | Invest.com.au Academy`,
    description: course.description ?? "",
    alternates: { canonical: `/academy/${slug}` },
    openGraph: {
      title: course.title,
      description: course.description ?? "",
      url: `/academy/${slug}`,
      ...(course.cover_image_url
        ? {
            images: [
              {
                url: course.cover_image_url,
                width: 1200,
                height: 630,
                alt: course.title,
              },
            ],
          }
        : {}),
    },
    twitter: { card: "summary_large_image" },
  };
}

export const revalidate = 3600;

export default async function AcademyCourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const course = await getAcademyCourse(slug);
  if (!course || course.status !== "published") notFound();

  // ── Enrollment status (server-side, for CourseCompleteButton) ────────────
  // createClient() resolves the user JWT; createAdminClient() is used for the
  // actual SELECT because course_enrollments has deny-all-anon RLS and there
  // is no authenticated-role SELECT policy today (see CLAUDE.md allowed scope).
  let isEnrolled = false;
  let isCompleted = false;
  let certificateId: string | null = null;
  let isAuthenticated = false;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isAuthenticated = true;
      const admin = createAdminClient();
      const courseIdStr = String(course.id);

      const { data: enrollment } = await admin
        .from("course_enrollments")
        .select("status")
        .eq("course_id", courseIdStr)
        .eq("user_id", user.id)
        .maybeSingle();

      if (enrollment) {
        isEnrolled = true;
        isCompleted = (enrollment as { status: string }).status === "completed";

        if (isCompleted) {
          const { data: cert } = await admin
            .from("course_certificates")
            .select("id")
            .eq("course_id", courseIdStr)
            .eq("user_id", user.id)
            .maybeSingle();
          certificateId = (cert as { id: string } | null)?.id ?? null;
        }
      }
    }
  } catch {
    // Non-fatal: if auth/DB check fails, the completion button simply won't
    // render. Do not crash the page for unauthenticated or misconfigured envs.
  }

  const name = creatorName(course);
  const profilePath = creatorSlug(course);
  const avatarUrl = creatorLogoUrl(course);
  const isFree = course.price_cents === 0;
  const priceDisplay = isFree
    ? "Free"
    : `$${(course.price_cents / 100).toFixed(0)}`;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Academy", url: absoluteUrl("/academy") },
    { name: course.title },
  ]);

  const courseFaqs = [
    {
      q: `What is covered in "${course.title}"?`,
      a: course.description
        ? `${course.description} The course is published on Invest.com.au Academy and designed for Australian investors.`
        : `"${course.title}" covers key financial education content tailored to Australian investors. Enrol to access all lessons.`,
    },
    {
      q: `How much does "${course.title}" cost?`,
      a: isFree
        ? `"${course.title}" is completely free — no credit card required. Simply enrol to get immediate access to all course content.`
        : `"${course.title}" is priced at ${priceDisplay} (AUD, one-time payment). Once purchased, you have permanent access to all lessons and course materials.`,
    },
    {
      q: `How long does it take to complete "${course.title}"?`,
      a: course.cpd_hours != null && course.cpd_hours > 0
        ? `This course is designed to take approximately ${course.cpd_hours} hour${course.cpd_hours !== 1 ? "s" : ""} to complete and awards ${course.cpd_hours} CPD hour${course.cpd_hours !== 1 ? "s" : ""} on completion. You can work through it at your own pace.`
        : `You can work through the course lessons at your own pace — there is no time limit on access once enrolled.`,
    },
    {
      q: `Is this course financial advice?`,
      a: `No. All content on Invest.com.au Academy is general financial education only and does not take into account your personal financial situation, needs, or objectives. It is not a substitute for personalised financial advice from an ASIC-licensed financial advisor. If you need tailored advice, we can match you with a verified advisor at invest.com.au/find-advisor.`,
    },
  ];
  const courseFaqLd = faqJsonLd(courseFaqs);

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.description ?? "",
    url: absoluteUrl(`/academy/${course.slug}`),
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    ...(course.creator_kind === "organisation" && course.organisation
      ? {
          instructor: {
            "@type": "Organization",
            name: course.organisation.name,
            url: absoluteUrl(`/providers/${course.organisation.slug}`),
          },
        }
      : course.creator_kind === "advisor" && course.professional
        ? {
            instructor: {
              "@type": "Person",
              name: course.professional.name,
              url: absoluteUrl(`/advisor/${course.professional.slug}`),
            },
          }
        : {}),
    offers: {
      "@type": "Offer",
      price: (course.price_cents / 100).toFixed(2),
      priceCurrency: "AUD",
      availability: "https://schema.org/InStock",
      url: absoluteUrl(`/academy/${course.slug}`),
    },
    ...(course.cpd_hours != null && course.cpd_hours > 0
      ? { timeRequired: `PT${Math.ceil(course.cpd_hours)}H` }
      : {}),
    inLanguage: "en-AU",
    ...(SHOW_RATINGS && course.avg_rating != null && course.review_count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: course.avg_rating,
            reviewCount: course.review_count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      {courseFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(courseFaqLd) }}
        />
      )}

      <div className="py-6 md:py-12">
        <div className="container-custom max-w-5xl">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/academy" className="hover:text-slate-900">
              Academy
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">{course.title}</span>
          </nav>

          {course.cover_image_url && (
            <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden mb-8 bg-slate-100">
              <Image
                src={course.cover_image_url}
                alt={course.title}
                fill
                sizes="(max-width: 1024px) 100vw, 960px"
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
                {course.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                {course.cpd_hours != null && course.cpd_hours > 0 && (
                  <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    CPD Accredited · {course.cpd_hours} hrs
                  </span>
                )}
                {course.avg_rating != null && course.review_count > 0 && (
                  <span className="text-sm text-slate-500">
                    <span className="text-amber-400 font-bold">
                      {"★".repeat(Math.round(course.avg_rating))}
                    </span>{" "}
                    {course.avg_rating.toFixed(1)} ({course.review_count}{" "}
                    review{course.review_count !== 1 ? "s" : ""})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-6">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={name}
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                    {name.charAt(0)}
                  </div>
                )}
                <span className="text-sm text-slate-600">
                  {profilePath ? (
                    <Link
                      href={profilePath}
                      className="text-teal-600 hover:underline font-medium"
                    >
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </span>
              </div>

              <div className="mb-6">
                <SocialShareButtons
                  url={absoluteUrl(`/academy/${course.slug}`)}
                  title={`${course.title} | Invest.com.au Academy`}
                  compact
                />
              </div>

              {course.description && (
                <div className="prose prose-slate max-w-none text-slate-700 mb-8">
                  <p>{course.description}</p>
                </div>
              )}
            </div>

            <div>
              <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p
                  className={`text-3xl font-extrabold mb-1 ${isFree ? "text-teal-600" : "text-slate-900"}`}
                >
                  {priceDisplay}
                </p>
                {!isFree && (
                  <p className="text-xs text-slate-500 mb-4">One-time payment</p>
                )}

                <EnrollButton
                  courseId={String(course.id)}
                  courseSlug={slug}
                  isFree={isFree}
                />

                {isAuthenticated && (
                  <CourseCompleteButton
                    courseId={String(course.id)}
                    isEnrolled={isEnrolled}
                    isCompleted={isCompleted}
                    certificateId={certificateId}
                  />
                )}

                {course.cpd_hours != null && course.cpd_hours > 0 && (
                  <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
                    <svg
                      className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Awards {course.cpd_hours} CPD hour
                    {course.cpd_hours !== 1 ? "s" : ""} on completion
                  </div>
                )}
              </div>
            </div>
          </div>

          <section className="mt-10 border-t border-slate-100 pt-8">
            <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
            <div className="space-y-3">
              {courseFaqs.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                    {faq.q}
                    <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="mt-12">
            <Suspense>
              <CourseReviews slug={slug} />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}

