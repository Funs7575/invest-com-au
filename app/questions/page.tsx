import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";
import { itemListJsonLd, faqJsonLd } from "@/lib/schema-markup";
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

// ItemList over the answered questions so the index is citable by AI
// answer engines. itemListJsonLd absoluteUrl-wraps each url, so pass
// site-relative paths.
const listLd = itemListJsonLd(
  "Australian Investing Questions Answered",
  QUESTIONS.map((q, i) => ({
    position: i + 1,
    name: q.question,
    url: `/questions/${q.slug}`,
    description: q.shortAnswer,
  })),
);

const HUB_FAQS = [
  {
    q: "What topics does the Australian Investing Q&A hub cover?",
    a: "The Q&A hub covers seven topic categories: (1) Superannuation — salary sacrifice, SMSF setup, contribution limits, accessing super early; (2) Tax — CGT discount, negative gearing, franking credits, investment income reporting; (3) Investing — how to buy shares, ETFs vs LICs, CHESS sponsorship, dollar-cost averaging; (4) Property — investment property tax, FIRB requirements for non-residents, land tax; (5) Retirement — transition to retirement strategies, pension phase, age pension means test; (6) Budgeting — emergency fund sizing, debt reduction order, salary sacrifice vs extra mortgage payments; and (7) Business — small business CGT concessions, trust structures, Division 7A loans.",
  },
  {
    q: "Are the answers on this page personal financial advice?",
    a: "No. All answers in this Q&A hub are general financial information only and are not personal financial advice. They do not take into account your individual objectives, financial situation, tax position, or specific needs. For complex or high-stakes decisions — SMSF setup, property investment, retirement planning — consult a licensed financial adviser who holds an appropriate AFSL. The answers here are a starting point for understanding concepts, not a substitute for tailored professional advice.",
  },
  {
    q: "How are the Q&A answers written and verified?",
    a: "Each answer is written by the Invest.com.au editorial team and reviewed for accuracy against ATO guidance, ASIC's MoneySmart resources, and AFSA publications. Answers cite the relevant ATO or legislative reference where applicable. Content is reviewed annually and updated when ATO rulings, legislative changes, or SG rate adjustments affect the answer. The publication or last-reviewed date is shown on each individual question page.",
  },
  {
    q: "Can I submit a question that isn't answered here?",
    a: "Yes. If you have a question that isn't covered in the hub, email hello@invest.com.au with the subject 'Question submission'. We review all submissions and add questions that are broadly relevant to Australian investors. We cannot provide personal financial advice by email — if your question is highly specific to your situation, we will point you to a licensed adviser instead.",
  },
];

const hubFaqLd = faqJsonLd(HUB_FAQS);

const CATEGORY_ORDER: QuestionCategory[] = [
  "super",
  "tax",
  "investing",
  "property",
  "retirement",
  "budgeting",
  "business",
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }}
      />
      {hubFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(hubFaqLd) }}
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

        <HubAdvisorCTA
          heading="Your question may need a personal answer"
          subheading="General Q&A covers the rules — but SMSF, tax, retirement, and property decisions depend on your income, tax position, and goals. A licensed financial adviser can apply the rules to your specific situation."
          intent={{ need: "planning", context: ["investing_questions", "tax_strategy", "financial_planning"] }}
          source="questions_hub"
          ctaLabel="Find a financial adviser"
          className="mt-8 py-12 bg-amber-50 border border-amber-200 rounded-xl"
        />

        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">About this Q&amp;A hub</h2>
          <div className="space-y-3">
            {HUB_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
