import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import { faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import {
  QUESTIONS_BY_SLUG,
  QUESTIONS,
  CATEGORY_LABELS,
} from "@/lib/questions-data";

export const revalidate = 86400;

export async function generateStaticParams() {
  return QUESTIONS.map((q) => ({ slug: q.slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const question = QUESTIONS_BY_SLUG.get(slug);
  if (!question) return {};
  return {
    title: question.metaTitle,
    description: question.metaDescription,
    alternates: { canonical: `/questions/${slug}` },
    openGraph: {
      title: question.metaTitle,
      description: question.metaDescription,
      url: `/questions/${slug}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(question.question)}&subtitle=Invest.com.au+Q%26A&type=default`,
          width: 1200,
          height: 630,
          alt: question.question,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function QuestionPage({ params }: Props) {
  const { slug } = await params;
  const question = QUESTIONS_BY_SLUG.get(slug);
  if (!question) return notFound();

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Questions", url: absoluteUrl("/questions") },
    { name: question.question, url: absoluteUrl(`/questions/${slug}`) },
  ]);

  const faqLd =
    question.faqs.length > 0
      ? faqJsonLd(question.faqs.map((f) => ({ q: f.q, a: f.a })))
      : null;

  // Speakable: mark the question + short answer as the extractable answer region
  // so AI/voice engines surface the direct answer. See lib/schema-markup.ts.
  const speakableLd = speakableWebPageJsonLd({
    name: question.question,
    path: `/questions/${slug}`,
    selectors: ["#question-title", "#question-short-answer"],
  });

  const relatedQuestions = question.relatedSlugs
    .map((s) => QUESTIONS_BY_SLUG.get(s))
    .filter(Boolean);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }}
      />

      <main className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-emerald-700">
            Home
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <Link href="/questions" className="hover:text-emerald-700">
            Questions
          </Link>
          <span className="mx-2" aria-hidden="true">
            /
          </span>
          <span
            className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium"
            aria-label={`Category: ${CATEGORY_LABELS[question.category]}`}
          >
            {CATEGORY_LABELS[question.category]}
          </span>
        </nav>

        {/* Question header */}
        <header className="mb-8">
          <h1 id="question-title" className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug mb-4">
            {question.question}
          </h1>
          {/* Short answer box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-5 py-4">
            <p className="text-sm font-semibold text-emerald-800 mb-1">
              Short answer
            </p>
            <p id="question-short-answer" className="text-gray-800">{question.shortAnswer}</p>
          </div>
        </header>

        {/* Detailed sections */}
        {question.sections.length > 0 && (
          <article className="prose prose-gray max-w-none mb-10">
            {question.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
                  {section.heading}
                </h2>
                <p className="text-gray-700 leading-relaxed">{section.body}</p>
              </section>
            ))}
          </article>
        )}

        {/* Related tools */}
        {question.relatedTools && question.relatedTools.length > 0 && (
          <div className="mb-10 p-5 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Related tools
            </h2>
            <ul className="space-y-2">
              {question.relatedTools.map((tool) => (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
                  >
                    {tool.label}
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* FAQ section */}
        {question.faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Frequently asked questions
            </h2>
            <dl className="space-y-6">
              {question.faqs.map((faq) => (
                <div key={faq.q}>
                  <dt className="font-semibold text-gray-900 mb-1">{faq.q}</dt>
                  <dd className="text-gray-700 leading-relaxed">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Related questions */}
        {relatedQuestions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Related questions
            </h2>
            <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
              {relatedQuestions.map((rq) => (
                <li key={rq!.slug}>
                  <Link
                    href={`/questions/${rq!.slug}`}
                    className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <span className="text-gray-800 group-hover:text-emerald-700">
                      {rq!.question}
                    </span>
                    <svg
                      className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 flex-shrink-0 ml-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* General advice disclaimer */}
        <p className="text-xs text-gray-500 border-t pt-6 leading-relaxed">
          {GENERAL_ADVICE_WARNING}
        </p>
      </main>
    </>
  );
}
