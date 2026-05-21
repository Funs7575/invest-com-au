import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME, SITE_URL } from "@/lib/seo";
import { itemListJsonLd } from "@/lib/schema-markup";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Life Event Financial Checklists (${CURRENT_YEAR}) — ${SITE_NAME}`,
  description:
    "Financial checklists for every major Australian life event: retirement, inheritance, redundancy, marriage, having a baby, buying a house, selling a business. What to do and in what order.",
  alternates: { canonical: `${SITE_URL}/just` },
  openGraph: {
    title: `Life Event Financial Checklists (${CURRENT_YEAR})`,
    description:
      "Practical financial action plans for every major Australian life transition — in plain English.",
    url: `${SITE_URL}/just`,
  },
};

const EVENTS = [
  {
    slug: "retired",
    label: "Just retired",
    description: "Pension phase, Age Pension, Centrelink means test, insurance review",
  },
  {
    slug: "inherited",
    label: "Just inherited",
    description: "CGT on inherited assets, super death benefits, 2-year main residence window",
  },
  {
    slug: "made-redundant",
    label: "Just made redundant",
    description: "ETP tax treatment, super carry-forward, Centrelink income maintenance period",
  },
  {
    slug: "got-married",
    label: "Just got married",
    description: "Super nominations, spouse contributions, Medicare Levy Surcharge thresholds",
  },
  {
    slug: "had-a-baby",
    label: "Just had a baby",
    description: "Parental Leave Pay, super gap strategy, life insurance review, will",
  },
  {
    slug: "bought-a-house",
    label: "Just bought a house",
    description: "Buildings insurance, cost base records, depreciation schedules, deductions",
  },
  {
    slug: "sold-a-business",
    label: "Just sold a business",
    description: "Small business CGT concessions, Retirement Exemption, super contributions",
  },
  {
    slug: "started-investing",
    label: "Just started investing",
    description: "Broker account, ETFs, tax records, super-first strategy",
  },
];

export default function JustPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Life events", url: absoluteUrl("/just") },
  ]);

  const itemListLd = itemListJsonLd(
    "Life Event Financial Checklists",
    EVENTS.map((e, i) => ({
      position: i + 1,
      name: e.label,
      url: `/just/${e.slug}`,
      description: e.description,
    })),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <div className="container-custom max-w-3xl py-10">
      <header className="mb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">
          Life event guides · {CURRENT_YEAR}
        </p>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-3">
          You just… now what?
        </h1>
        <p className="text-lg text-slate-500">
          Major life events come with financial decisions that can&apos;t wait. Each guide below covers
          what to do, in what order, and what happens if you get it wrong.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EVENTS.map((e) => (
          <Link
            key={e.slug}
            href={`/just/${e.slug}`}
            className="flex flex-col gap-1.5 p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            <span className="text-base font-bold text-slate-900">{e.label}</span>
            <span className="text-xs text-slate-500 leading-relaxed">{e.description}</span>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-xs text-slate-400">
        These guides provide general financial information only and do not constitute personal financial advice.
        Always consult a licensed financial adviser or tax agent for advice tailored to your situation.
      </p>
      </div>
    </>
  );
}
