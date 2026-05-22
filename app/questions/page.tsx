import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import {
  QUESTIONS,
  CATEGORY_LABELS,
  type QuestionCategory,
} from "@/lib/questions-data";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Investing Questions Answered — Australian Finance Q&A",
  description:
    "Plain-English answers to common Australian investing questions: super, tax, property, ETFs, negative gearing, franking credits, and more.",
  alternates: { canonical: "/questions" },
  openGraph: {
    title: "Investing Questions Answered",
    description:
      "Common Australian investing questions answered in plain English — super, tax, property, shares, ETFs, retirement, and budgeting.",
    url: "/questions",
    images: [
      {
        url: "/api/og?title=Investing+Q%26A&subtitle=Common+Australian+Finance+Questions+Answered&type=default",
        width: 1200,
        height: 630,
        alt: "Investing Questions Answered",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Questions", url: absoluteUrl("/questions") },
]);

const questionsHubFaqLd = faqJsonLd(
  QUESTIONS.slice(0, 20).map((q) => ({ q: q.question, a: q.shortAnswer }))
);

const CATEGORY_ORDER: QuestionCategory[] = [
  "super",
  "tax",
  "investing",
  "property",
  "retirement",
  "budgeting",
  "business",
  "crypto",
  "insurance",
];

function groupByCategory(
  questions: typeof QUESTIONS
): Record<string, typeof QUESTIONS> {
  const groups: Record<string, typeof QUESTIONS> = {};
  for (const q of questions) {
    if (!groups[q.category]) groups[q.category] = [];
    groups[q.category]!.push(q);
  }
  return groups;
}

export default function QuestionsPage() {
  const grouped = groupByCategory(QUESTIONS);
  const categories = CATEGORY_ORDER.filter((c) => grouped[c]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {questionsHubFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(questionsHubFaqLd) }}
        />
      )}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Investing Questions Answered
          </h1>
          <p className="text-lg text-gray-600">
            Plain-English answers to common Australian investing questions —
            super, tax, property, shares, ETFs, and more.
          </p>
        </header>

        <div className="space-y-12">
          {categories.map((category) => {
            const qs = grouped[category]!;
            return (
              <section key={category}>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-sm font-normal px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {CATEGORY_LABELS[category]}
                  </span>
                </h2>
                <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                  {qs.map((q) => (
                    <li key={q.slug}>
                      <Link
                        href={`/questions/${q.slug}`}
                        className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-gray-800 group-hover:text-emerald-700 font-medium">
                          {q.question}
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
            );
          })}
        </div>
      </main>
    </>
  );
}
