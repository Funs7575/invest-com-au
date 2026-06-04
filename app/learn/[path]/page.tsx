import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LEARNING_PATHS, getLearningPath, sumEstimatedMinutes } from "@/lib/learning-paths";
import { absoluteUrl, breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import LearningPathClient from "./LearningPathClient";

export const revalidate = 86400;

// ─── Static params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return LEARNING_PATHS.map((p) => ({ path: p.slug }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string }>;
}): Promise<Metadata> {
  const { path: pathSlug } = await params;
  const learningPath = getLearningPath(pathSlug);
  if (!learningPath) return { robots: { index: false } };

  const totalMins = sumEstimatedMinutes(learningPath);
  const hours = (totalMins / 60).toFixed(1);

  return {
    title: `${learningPath.title} | Learning Path ${CURRENT_YEAR} | Invest.com.au`,
    description: `${learningPath.description} ${learningPath.steps.length} steps · ~${hours}h · ${learningPath.audience}.`,
    alternates: { canonical: `${SITE_URL}/learn/${learningPath.slug}` },
    openGraph: {
      title: learningPath.title,
      description: learningPath.description,
      url: `${SITE_URL}/learn/${learningPath.slug}`,
      type: "website",
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LearningPathPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path: pathSlug } = await params;
  const learningPath = getLearningPath(pathSlug);
  if (!learningPath) notFound();

  const totalMins = sumEstimatedMinutes(learningPath);
  const hoursDisplay =
    totalMins < 60
      ? `${totalMins} min`
      : `${(totalMins / 60).toFixed(1)} hrs`;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Learning Paths", url: absoluteUrl("/learn") },
    { name: learningPath.title },
  ]);

  // Course JSON-LD (schema.org)
  const courseJsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: learningPath.title,
    description: learningPath.description,
    url: absoluteUrl(`/learn/${learningPath.slug}`),
    provider: {
      "@type": "Organization",
      name: "Invest.com.au",
      url: absoluteUrl("/"),
    },
    audience: {
      "@type": "EducationalAudience",
      educationalRole: "student",
      audienceType: learningPath.audience,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${totalMins}M`,
    },
    numberOfCredits: learningPath.steps.length,
  };

  // ItemList JSON-LD for steps
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${learningPath.title} — steps`,
    numberOfItems: learningPath.steps.length,
    itemListElement: learningPath.steps.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.title,
      url: absoluteUrl(
        step.kind === "article"
          ? `/article/${step.slug}`
          : step.kind === "question"
            ? `/questions/${step.slug}`
            : step.kind === "glossary"
              ? `/glossary/${step.slug}`
              : step.slug
      ),
    })),
  };

  const STEP_LABEL: Record<string, string> = {
    article: "Article",
    question: "Q&A",
    glossary: "Glossary",
    calculator: "Calculator",
    page: "Guide",
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <div className="bg-white min-h-screen">
        {/* Header */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-4xl">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
            >
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <span className="text-slate-600">/</span>
              <Link
                href="/learn"
                className="hover:text-white transition-colors"
              >
                Learning Paths
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium truncate">
                {learningPath.title}
              </span>
            </nav>

            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                {learningPath.audience}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                {learningPath.steps.length} steps
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                ~{hoursDisplay}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3">
              {learningPath.title}
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl">
              {learningPath.description}
            </p>
          </div>
        </section>

        {/* Main content */}
        <section className="py-10 md:py-14">
          <div className="container-custom max-w-4xl">
            {/* General advice warning */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-8 text-xs text-amber-800 leading-relaxed">
              {GENERAL_ADVICE_WARNING}
            </div>

            {/* Client component — progress tracking */}
            <LearningPathClient path={learningPath} />

            {/* Step quick-reference table (SR + non-JS fallback) */}
            <div className="mt-10 sr-only" aria-hidden="true">
              <h2 className="sr-only">Steps overview</h2>
              <ol>
                {learningPath.steps.map((step, i) => (
                  <li key={i}>
                    {i + 1}. {step.title} ({STEP_LABEL[step.kind]} · ~{step.estimatedMinutes} min)
                  </li>
                ))}
              </ol>
            </div>

            {/* CTA — back to all paths */}
            <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between gap-4 flex-wrap">
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                All learning paths
              </Link>

              <Link
                href="/brokers"
                className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900 transition-colors"
              >
                Compare brokers
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
