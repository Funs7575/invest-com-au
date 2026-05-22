import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import {
  getAcademyCourses,
  creatorName,
  creatorSlug,
  creatorLogoUrl,
  type AcademyCourse,
} from "@/lib/academy";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "CPD & Professional Development Courses | Invest.com.au Academy",
  description:
    "Browse CPD-accredited and professional development courses for Australian financial advisors and planners. Meet your 40-hour annual CPD requirement with courses from verified providers.",
  alternates: { canonical: "/academy" },
  openGraph: {
    title: "CPD & Professional Development Courses",
    description:
      "CPD-accredited courses for Australian financial professionals. Browse by advisor, provider, or CPD category.",
    url: "/academy",
  },
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="flex items-center gap-1 text-xs text-slate-500">
      <span aria-label={`${rating.toFixed(1)} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= rounded ? "text-amber-400" : "text-slate-200"}>
            ★
          </span>
        ))}
      </span>
      <span>
        {rating.toFixed(1)} ({count})
      </span>
    </span>
  );
}

function CourseCard({ course }: { course: AcademyCourse }) {
  const name = creatorName(course);
  const profilePath = creatorSlug(course);
  const avatarUrl = creatorLogoUrl(course);
  const isFree = course.price_cents === 0;
  const priceDisplay = isFree
    ? "Free"
    : `$${(course.price_cents / 100).toFixed(0)}`;

  return (
    <Link
      href={`/academy/${course.slug}`}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-lg hover:border-teal-200 transition-all duration-200"
    >
      <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
        {course.cover_image_url ? (
          <Image
            src={course.cover_image_url}
            alt={course.title}
            width={400}
            height={225}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-white/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
        )}
        {course.cpd_hours != null && course.cpd_hours > 0 && (
          <span className="absolute top-2 left-2 bg-teal-600 text-white text-[0.65rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            {course.cpd_hours} CPD hrs
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-2">
        <h2 className="font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors">
          {course.title}
        </h2>

        <div className="flex items-center gap-2 min-w-0">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              width={20}
              height={20}
              className="w-5 h-5 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[0.6rem] font-bold flex-shrink-0">
              {name.charAt(0)}
            </div>
          )}
          {profilePath ? (
            <span
              className="text-xs text-teal-600 hover:underline truncate"
              onClick={(e) => e.preventDefault()}
            >
              {name}
            </span>
          ) : (
            <span className="text-xs text-slate-500 truncate">{name}</span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-100">
          {course.avg_rating != null && course.review_count > 0 ? (
            <StarRating rating={course.avg_rating} count={course.review_count} />
          ) : (
            <span className="text-xs text-slate-400">No reviews yet</span>
          )}
          <span
            className={`text-sm font-extrabold ${isFree ? "text-teal-600" : "text-slate-800"}`}
          >
            {priceDisplay}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function AcademyPage() {
  const courses = await getAcademyCourses();

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Academy" },
  ]);

  const catalogJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "CPD & Professional Development Courses",
    description:
      "CPD-accredited and professional development courses for Australian financial advisors.",
    numberOfItems: courses.length,
    itemListElement: courses.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Course",
        name: c.title,
        url: absoluteUrl(`/academy/${c.slug}`),
      },
    })),
  };

  const byAdvisors = courses.filter((c) => c.creator_kind === "advisor");
  const byProviders = courses.filter((c) => c.creator_kind === "organisation");
  const free = courses.filter((c) => c.price_cents === 0);
  const cpdAccredited = courses.filter(
    (c) => c.cpd_hours != null && c.cpd_hours > 0
  );

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

      <div className="py-6 md:py-14">
        <div className="container-custom max-w-6xl">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Academy</span>
          </nav>

          <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-teal-800 text-white px-6 py-10 md:px-12 md:py-14 mb-10 text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4">
              CPD &amp; Professional Development Courses
            </h1>
            <p className="text-teal-100 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              Meet your 40-hour annual CPD requirement with courses from
              verified Australian advisors and accredited CPD providers.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { label: "All Courses", count: courses.length },
              { label: "By Advisors", count: byAdvisors.length },
              { label: "By Providers", count: byProviders.length },
              { label: "Free", count: free.length },
              { label: "CPD Accredited", count: cpdAccredited.length },
            ].map(({ label, count }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-slate-200 text-sm text-slate-600 bg-white hover:border-teal-300 hover:text-teal-700 transition-colors cursor-default select-none"
              >
                {label}
                <span className="text-xs text-slate-400 font-medium">
                  {count}
                </span>
              </span>
            ))}
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-slate-500 text-lg mb-2">No courses available yet.</p>
              <p className="text-slate-400 text-sm">
                Check back soon — new courses are added regularly.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
