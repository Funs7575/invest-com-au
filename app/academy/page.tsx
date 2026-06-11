import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
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
    "CPD-accredited courses for Australian financial advisors. Meet your 40-hour annual CPD requirement with verified providers.",
  alternates: { canonical: "/academy" },
  openGraph: {
    title: "CPD & Professional Development Courses",
    description:
      "CPD-accredited courses for Australian financial professionals. Browse by advisor, provider, or CPD category.",
    url: "/academy",
    images: [{ url: `/api/og?title=${encodeURIComponent("CPD & Professional Development")}&sub=${encodeURIComponent("Accredited Courses · Australian Financial Professionals")}`, width: 1200, height: 630 }],
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
            <span className="text-xs text-slate-500">No reviews yet</span>
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

const CATEGORY_LABELS: Record<string, string> = {
  advisors: "By Advisors",
  providers: "By Providers",
  free: "Free",
  cpd: "CPD Accredited",
};

export default async function AcademyPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const activeCategory = resolvedParams.category ?? null;

  const courses = await getAcademyCourses();

  const breadcrumbItems: { name: string; url?: string }[] = [
    { name: "Home", url: absoluteUrl("/") },
    { name: "Academy", url: activeCategory ? absoluteUrl("/academy") : undefined },
  ];
  if (activeCategory && CATEGORY_LABELS[activeCategory]) {
    breadcrumbItems.push({ name: CATEGORY_LABELS[activeCategory] });
  }

  const breadcrumbs = breadcrumbJsonLd(breadcrumbItems);

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

  const academyFaqLd = faqJsonLd([
    { q: "What is CPD for Australian financial advisors?", a: "CPD (Continuing Professional Development) is mandatory ongoing training for Australian financial advisors. ASIC requires 40 hours per year across four categories: technical competence, client care and practice, regulatory compliance and consumer protection, and professionalism and ethics. At least 70% of CPD must come from accredited providers." },
    { q: "How do I claim CPD hours for a course on Invest.com.au Academy?", a: "After completing a CPD-eligible course, you receive a digital certificate with a unique serial number confirming the provider, CPD hours, and category. You record this certificate in your licensee's CPD register or ASIC's Financial Advisers Register portal. The certificate is verifiable at invest.com.au/certificate." },
    { q: "What CPD categories count toward the ASIC 40-hour requirement?", a: "ASIC recognises four CPD categories: (1) Technical competence — financial planning, investment, insurance, tax; (2) Client care and practice — advice documentation, client communication; (3) Regulatory compliance and consumer protection — AFCA, RG 175, BID; (4) Professionalism and ethics — FPA/AFA code. Structured CPD (formal courses) must make up at least 70% of your requirement." },
    { q: "Can I complete CPD online in Australia?", a: "Yes — ASIC accepts online, self-paced CPD for the 40-hour requirement provided it meets accreditation standards. Online courses must include assessments or structured activities and be delivered by an approved provider. All courses on this Academy meet ASIC accreditation requirements." },
    { q: "How many CPD hours do mortgage brokers need?", a: "ASIC requires mortgage brokers to complete CPD as part of their annual licence renewal under the National Consumer Credit Protection Act. MFAA members must complete 30 CPD points per year; FBAA members require 20 CPD hours per year. Both recognise industry-accredited courses from approved training providers." },
  ]);

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
      {academyFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(academyFaqLd) }}
        />
      )}

      <div className="py-6 md:py-14">
        <div className="container-custom max-w-6xl">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            {activeCategory && CATEGORY_LABELS[activeCategory] ? (
              <>
                <Link href="/academy" className="hover:text-slate-900">
                  Academy
                </Link>
                <span className="mx-2">/</span>
                <span className="text-slate-700">{CATEGORY_LABELS[activeCategory]}</span>
              </>
            ) : (
              <span className="text-slate-700">Academy</span>
            )}
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
              { label: "All Courses", count: courses.length, value: null },
              { label: "By Advisors", count: byAdvisors.length, value: "advisors" },
              { label: "By Providers", count: byProviders.length, value: "providers" },
              { label: "Free", count: free.length, value: "free" },
              { label: "CPD Accredited", count: cpdAccredited.length, value: "cpd" },
            ].map(({ label, count, value }) => {
              const isActive = value === activeCategory || (value === null && !activeCategory);
              return (
                <Link
                  key={label}
                  href={value ? `/academy?category=${value}` : "/academy"}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-sm transition-colors select-none ${
                    isActive
                      ? "border-teal-500 text-teal-700 bg-teal-50 font-semibold"
                      : "border-slate-200 text-slate-600 bg-white hover:border-teal-300 hover:text-teal-700"
                  }`}
                >
                  {label}
                  <span className="text-xs font-medium opacity-60">{count}</span>
                </Link>
              );
            })}
          </div>

          {(() => {
            let visibleCourses = courses;
            if (activeCategory === "advisors") visibleCourses = byAdvisors;
            else if (activeCategory === "providers") visibleCourses = byProviders;
            else if (activeCategory === "free") visibleCourses = free;
            else if (activeCategory === "cpd") visibleCourses = cpdAccredited;

            return visibleCourses.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl">
                <p className="text-slate-500 text-lg mb-2">No courses available yet.</p>
                <p className="text-slate-500 text-sm mb-6">
                  Check back soon — new courses are added regularly.
                </p>
                <Link
                  href="/articles"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Browse guides →
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleCourses.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            );
          })()}

          {/* ADV-178: Related guides section */}
          <aside
            aria-label="Related guides"
            className="mt-12 border-l-4 border-blue-500 pl-5 py-1"
          >
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
              Related guides
            </h2>
            <ul className="flex flex-col gap-2">
              <li>
                <Link
                  href="/articles?category=professional"
                  className="text-sm text-blue-700 hover:text-blue-900 hover:underline font-medium"
                >
                  CPD &amp; Professional Development →
                </Link>
              </li>
              <li>
                <Link
                  href="/articles?category=beginners"
                  className="text-sm text-blue-700 hover:text-blue-900 hover:underline font-medium"
                >
                  Financial Planning Basics →
                </Link>
              </li>
              <li>
                <Link
                  href="/articles?category=news"
                  className="text-sm text-blue-700 hover:text-blue-900 hover:underline font-medium"
                >
                  Industry News →
                </Link>
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </>
  );
}
