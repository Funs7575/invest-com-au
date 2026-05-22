import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import {
  getAcademyCourse,
  getTopAcademyCourseSlugs,
  creatorName,
  creatorSlug,
  creatorLogoUrl,
} from "@/lib/academy";
import EnrollButton from "./EnrollButton";

const CourseReviews = dynamic(
  () => import("@/app/courses/[slug]/CourseReviews"),
  { ssr: false }
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
  if (!course || course.status !== "published") return {};

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
    ...(course.avg_rating != null && course.review_count > 0
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
                  <p className="text-xs text-slate-400 mb-4">One-time payment</p>
                )}

                <EnrollButton
                  courseId={String(course.id)}
                  courseSlug={slug}
                  isFree={isFree}
                />

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

