import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME, SITE_URL } from "@/lib/seo";
import { itemListJsonLd, faqJsonLd } from "@/lib/schema-markup";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

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
    images: [{ url: `/api/og?title=${encodeURIComponent("Life Event Financial Checklists")}&sub=${encodeURIComponent("Marriage · Home · Retirement · Kids · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
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

const JUST_FAQS = [
  {
    q: "What types of life events are covered in these financial checklists?",
    a: "The guides cover major Australian life events with significant financial implications: retirement (super drawdown, Centrelink, estate planning), receiving an inheritance (estate administration, investment decisions, tax), redundancy (payment entitlements, super co-contributions, career transition costs), marriage or divorce (asset pooling, beneficiary updates, property decisions), having a baby (parental leave, super gap, life insurance, wills), buying a first home (first home buyer incentives, cost base records, deductions), selling a business (small business CGT concessions, Retirement Exemption, super contributions), and starting investing for the first time (broker account setup, ETF basics, tax records). Each guide covers what to do in chronological order.",
  },
  {
    q: "Why does timing matter so much with life event financial decisions?",
    a: "Many financial decisions linked to life events have hard deadlines set by law. For example: you have 90 days to contribute a redundancy payment to super before it loses its concessional treatment; inheritance probate timelines affect when you can sell estate assets; the First Home Super Saver Scheme has application windows; and CGT on inherited assets has date-of-death rules that affect your cost base. Missing these windows can cost thousands in tax. The guides map the time-sensitive steps so you can prioritise correctly.",
  },
  {
    q: "Is this financial advice?",
    a: "No. These checklists provide general financial information — they explain what actions are typically taken and what rules generally apply in each situation. They do not take into account your individual tax position, super fund rules, state-specific property laws, or personal financial circumstances. Use them as a starting-point orientation, then work with a licensed financial adviser and tax agent to get advice tailored to your situation. For complex events (inheritance, business sale, divorce), specialist advice is essential before taking action.",
  },
  {
    q: "How do I find a professional who specialises in my life event?",
    a: "Use the Get Matched tool (/get-matched) and select your life event as your context — it will identify the right type of professional for your situation (financial planner, SMSF accountant, tax agent, estate lawyer, mortgage broker) and show you verified options near you. You can also browse the adviser directory (/advisors) and filter by specialisation. For business sales, look for advisers with 'small business CGT' or 'exit planning' listed as a specialisation.",
  },
];

const justFaqLd = faqJsonLd(JUST_FAQS);

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
      {justFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(justFaqLd) }}
        />
      )}
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

      <HubAdvisorCTA
        heading="Get financial advice for your life change"
        subheading="Major life events — inheriting, retiring, selling a business — often require coordinated action across super, tax, estate planning, and investment accounts. A financial adviser can prioritise what to do first and model the outcomes before you act."
        intent={{ need: "planning", context: ["life_event", "financial_transition"] }}
        source="just_hub"
        ctaLabel="Find a financial adviser"
        className="mt-10 py-12 bg-amber-50 border border-amber-200 rounded-xl"
      />

      <p className="mt-10 text-xs text-slate-400">
        These guides provide general financial information only and do not constitute personal financial advice.
        Always consult a licensed financial adviser or tax agent for advice tailored to your situation.
      </p>

      <section className="mt-10 border-t border-slate-200 pt-8">
        <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {JUST_FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
      </div>
    </>
  );
}
