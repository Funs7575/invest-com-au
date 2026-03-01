import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { getPublishedCourses } from "@/lib/course";
import type { Course } from "@/lib/types";
import CoursesGate from "./CoursesGate";

export const metadata: Metadata = {
  title: "Courses — Learn to Invest in Australia",
  description:
    "Expert-led investing courses for Australians. Learn shares, ETFs, tax, SMSF, and more from industry professionals.",
  alternates: { canonical: "/courses" },
  openGraph: {
    title: `Courses — ${SITE_NAME}`,
    description: "Expert-led investing courses for Australians.",
    url: "/courses",
  },
};

export const revalidate = 3600;

function levelBadge(level: string) {
  const styles: Record<string, string> = {
    beginner: "bg-emerald-50 text-emerald-700",
    intermediate: "bg-blue-50 text-blue-700",
    advanced: "bg-purple-50 text-purple-700",
  };
  return (
    <span
      className={`text-[0.69rem] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
        styles[level] || styles.beginner
      }`}
    >
      {level}
    </span>
  );
}

function CourseCard({ course }: { course: Course }) {
  const priceDisplay = (course.price / 100).toFixed(0);

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-200"
    >
      {/* Cover image or gradient */}
      {course.cover_image_url ? (
        <div className="aspect-[16/9] overflow-hidden bg-slate-100 relative">
          <Image
            src={course.cover_image_url}
            alt={course.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
          <span className="text-4xl" aria-hidden="true">🎓</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          {levelBadge(course.level)}
          {course.featured && (
            <span className="text-[0.69rem] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700 uppercase tracking-wide">
              Featured
            </span>
          )}
        </div>

        <h2 className="font-bold text-slate-900 mb-1 group-hover:text-slate-700 transition-colors line-clamp-2">
          {course.title}
        </h2>

        {course.subtitle && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">
            {course.subtitle}
          </p>
        )}

        {/* Creator info */}
        {course.creator && (
          <div className="flex items-center gap-2 mb-3">
            {course.creator.avatar_url ? (
              <Image
                src={course.creator.avatar_url}
                alt={course.creator.full_name}
                width={24}
                height={24}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[0.5rem] font-bold text-slate-500">
                {course.creator.full_name.charAt(0)}
              </div>
            )}
            <span className="text-xs text-slate-500">
              {course.creator.full_name}
            </span>
          </div>
        )}

        {/* Meta + price */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {course.estimated_hours && (
              <span>~{course.estimated_hours}h</span>
            )}
          </div>
          <span className="text-lg font-extrabold text-slate-700">
            ${priceDisplay}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function CoursesPage() {
  const courses = await getPublishedCourses();

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Courses" },
  ]);

  const catalogJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Investing Courses",
    description: "Expert-led investing courses for Australians.",
    numberOfItems: courses.length,
    itemListElement: courses.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Course",
        name: c.title,
        url: absoluteUrl(`/courses/${c.slug}`),
      },
    })),
  };

  // Separate featured from the rest
  const featured = courses.filter((c) => c.featured);
  const rest = courses.filter((c) => !c.featured);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(catalogJsonLd) }}
      />

      <Suspense>
        <CoursesGate>
          <div className="py-12">
            <div className="container-custom max-w-6xl">
              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
                <Link href="/" className="hover:text-slate-900">
                  Home
                </Link>
                <span className="mx-2">/</span>
                <span className="text-slate-700">Courses</span>
              </nav>

              {/* Hero */}
              <div className="text-center mb-12">
                <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
                  Learn to Invest
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Expert-led courses built for Australian investors. From beginner
                  basics to advanced strategies.
                </p>
              </div>

              {/* Featured courses */}
              {featured.length > 0 && (
                <div className="mb-12">
                  <h2 className={`text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 ${
                    featured.length <= 2 ? "text-center" : ""
                  }`}>
                    Featured
                  </h2>
                  <div className={`grid gap-6 ${
                    featured.length === 1
                      ? "max-w-md mx-auto"
                      : featured.length === 2
                        ? "md:grid-cols-2 max-w-3xl mx-auto"
                        : "md:grid-cols-2 lg:grid-cols-3"
                  }`}>
                    {featured.map((c) => (
                      <CourseCard key={c.id} course={c} />
                    ))}
                  </div>
                </div>
              )}

              {/* All courses */}
              {rest.length > 0 && (
                <div>
                  {featured.length > 0 && (
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                      All Courses
                    </h2>
                  )}
                  <div className={`grid gap-6 ${
                    rest.length === 1
                      ? "max-w-md mx-auto"
                      : rest.length === 2
                        ? "md:grid-cols-2 max-w-3xl mx-auto"
                        : "md:grid-cols-2 lg:grid-cols-3"
                  }`}>
                    {rest.map((c) => (
                      <CourseCard key={c.id} course={c} />
                    ))}
                  </div>
                </div>
              )}

              {courses.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-slate-500">
                    No courses available yet. Check back soon!
                  </p>
                </div>
              )}
            </div>
          </div>
        </CoursesGate>
      </Suspense>
    </>
  );
}
