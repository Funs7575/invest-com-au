import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME, REVIEW_AUTHOR } from "@/lib/seo";
import { COURSE_CONFIG, COURSE_MODULES } from "@/lib/course";
import { GENERAL_ADVICE_WARNING, COURSE_AFFILIATE_DISCLOSURE, ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import CoursePageClient from "./CoursePageClient";

export const metadata: Metadata = {
  title: `${COURSE_CONFIG.title} — ${SITE_NAME}`,
  description: COURSE_CONFIG.description,
  alternates: { canonical: "/course" },
  openGraph: {
    title: `${COURSE_CONFIG.title} — ${SITE_NAME}`,
    description: COURSE_CONFIG.subtitle,
    url: "/course",
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Investing Course")}&subtitle=${encodeURIComponent("The Complete Beginner's Guide")}&type=default`,
        width: 1200,
        height: 630,
        alt: COURSE_CONFIG.title,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export const revalidate = 3600;

const totalMinutes = COURSE_MODULES.reduce(
  (sum, m) => sum + m.lessons.length * 10,
  0
);

export default function CoursePage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Course" },
  ]);

  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: COURSE_CONFIG.title,
    description: COURSE_CONFIG.description,
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${Math.round(totalMinutes / 60)}H`,
    },
    offers: {
      "@type": "Offer",
      price: COURSE_CONFIG.price,
      priceCurrency: COURSE_CONFIG.currency,
      availability: "https://schema.org/InStock",
      url: absoluteUrl("/course"),
    },
    numberOfCredits: COURSE_MODULES.length,
    educationalLevel: "Beginner",
    inLanguage: "en-AU",
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

      <div className="py-12">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-green-700">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-green-700">Course</span>
          </nav>

          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full mb-4 uppercase tracking-wide">
              New — Investing Course
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
              {COURSE_CONFIG.title}
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-6">
              {COURSE_CONFIG.subtitle}
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500 mb-8">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                {COURSE_CONFIG.totalModules} modules
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {COURSE_CONFIG.totalLessons} lessons
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                ~{COURSE_CONFIG.estimatedHours} hours
              </span>
            </div>
          </div>

          {/* What you'll learn — module cards */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-8">What You&apos;ll Learn</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {COURSE_MODULES.map((mod) => (
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
                  <p className="text-xs text-slate-500 mb-3">{mod.description}</p>
                  <ul className="space-y-1.5">
                    {mod.lessons.map((lesson) => (
                      <li key={lesson.slug} className="flex items-center gap-2 text-xs text-slate-600">
                        {lesson.isFreePreview ? (
                          <Link
                            href={`/course/${lesson.slug}`}
                            className="flex items-center gap-2 hover:text-green-700 transition-colors"
                          >
                            <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[0.5rem]">▶</span>
                            {lesson.title}
                            <span className="text-[0.5rem] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">FREE</span>
                          </Link>
                        ) : (
                          <>
                            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[0.5rem]">🔒</span>
                            {lesson.title}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Free preview CTA */}
          <div className="text-center mb-16 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-2">Try Before You Buy</h2>
            <p className="text-sm text-slate-600 mb-4">
              3 lessons are completely free — no sign-up required.
            </p>
            <Link
              href="/course/what-is-the-asx"
              className="inline-block px-6 py-3 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 hover:scale-105 hover:shadow-[0_0_12px_rgba(21,128,61,0.3)] transition-all duration-200"
            >
              Start Free Preview →
            </Link>
          </div>

          {/* Pricing */}
          <div id="pricing" className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-2">One Price. Lifetime Access.</h2>
            <p className="text-sm text-slate-500 text-center mb-8 max-w-lg mx-auto">
              Pay once and get every lesson, future updates, and a{" "}
              {COURSE_CONFIG.guarantee.toLowerCase().replace(".", "")}
            </p>
            <CoursePageClient />
          </div>

          {/* Who this is for */}
          <div className="mb-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Who This Course Is For</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: "🇦🇺", text: "Australians who want to start investing but don't know where to begin" },
                { icon: "📊", text: "People confused by brokerage fees, CHESS sponsorship, and platform differences" },
                { icon: "💼", text: "Anyone considering an SMSF but unsure of the rules" },
                { icon: "📈", text: "New investors ready to buy their first ETF or shares on the ASX" },
              ].map((item) => (
                <div key={item.text} className="flex gap-3 p-4 rounded-lg bg-slate-50">
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <p className="text-sm text-slate-700">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-16 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: "Is this financial advice?",
                  a: "No. This course provides general education about investing in Australia. It is not personal financial advice. Always consider your own circumstances and consult a licensed adviser if needed.",
                },
                {
                  q: "What if I already have an Investor Pro subscription?",
                  a: `Pro subscribers get a $100 discount — pay just $${COURSE_CONFIG.proPrice} instead of $${COURSE_CONFIG.price}. The discount is applied automatically at checkout.`,
                },
                {
                  q: "Is there a money-back guarantee?",
                  a: COURSE_CONFIG.guarantee,
                },
                {
                  q: "How long do I have access?",
                  a: "Lifetime. You pay once and keep access to all lessons forever, including any future updates we add.",
                },
                {
                  q: "Do I need any prior investing experience?",
                  a: "None at all. The course is designed for complete beginners who have never bought a share before.",
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
            <p className="text-[0.6rem] text-slate-400">{GENERAL_ADVICE_WARNING}</p>
            <p className="text-[0.6rem] text-slate-400">{COURSE_AFFILIATE_DISCLOSURE}</p>
            <p className="text-[0.6rem] text-slate-400">{ADVERTISER_DISCLOSURE_SHORT}</p>
            <p className="text-xs text-slate-400 mt-4">
              Course content by{" "}
              <a href={REVIEW_AUTHOR.url} className="underline hover:text-green-700">{REVIEW_AUTHOR.name}</a>.{" "}
              <Link href="/how-we-earn" className="underline hover:text-green-700">How we earn</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
