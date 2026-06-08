import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { HELP_CATEGORIES } from "@/lib/help-content";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Help Centre | Invest.com.au",
  description: "Answers to common questions about using invest.com.au — broker comparisons, calculators, accounts, and investing basics.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help Centre | Invest.com.au",
    description: "Find answers to common questions about broker comparisons, calculators, and investing basics.",
    url: absoluteUrl("/help"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Help Centre")}&sub=${encodeURIComponent("Broker Comparisons · Calculators · Investing Basics")}`, width: 1200, height: 630 }],
  },
};

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Help Centre", url: absoluteUrl("/help") },
]);

const HELP_FAQS = [
  {
    q: "How do I compare share trading platforms on Invest.com.au?",
    a: "Use the Compare tool at /compare — it lets you filter by asset class, brokerage fee, account type, and platform features across all major Australian brokers. The Fee Simulator at /fee-simulator shows your estimated annual cost based on how often you trade and your average trade size. If you'd prefer a guided recommendation, take the 2-minute Platform Quiz at /quiz.",
  },
  {
    q: "Are the broker reviews on Invest.com.au independent?",
    a: "Yes. Brokers and platforms cannot pay to influence their star ratings, rankings, or editorial coverage. Commercial relationships (affiliate commissions, featured placement fees) are separate from our editorial team and do not affect scores. Our star ratings are based on a weighted scorecard covering fees, product range, safety, and platform features — see /methodology for the full breakdown.",
  },
  {
    q: "What calculators and tools does Invest.com.au offer?",
    a: "Invest.com.au provides Australian-specific financial calculators and tools including: Fee Simulator (compare platform costs by trade frequency), CGT Calculator (capital gains tax estimate), FIRE Calculator (financial independence target), Compound Interest Calculator, Franking Credits Calculator, SMSF Calculator, Negative Gearing Calculator, Fee Impact Calculator (long-term drag on returns), FHSS Calculator, and Portfolio X-Ray. Most are free and do not require an account.",
  },
  {
    q: "How do I contact Invest.com.au support?",
    a: "Email help@invest.com.au — we respond within 1 business day. For media or editorial enquiries use editorial@invest.com.au. For advisor listing and directory enquiries use advisors@invest.com.au. For broker or platform data corrections, use the 'Report an error' link on any broker review page.",
  },
];

const faqLd = faqJsonLd(HELP_FAQS);

const CATEGORY_ICONS: Record<string, string> = {
  "getting-started": "🚀",
  "brokers": "📊",
  "investing-basics": "📚",
  "account": "👤",
};

export default function HelpIndexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}

      <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
        {/* Header */}
        <div className="bg-slate-900 text-white py-10 md:py-16 px-4">
          <div className="container-custom max-w-3xl text-center">
            <h1 className="text-2xl md:text-4xl font-extrabold mb-3">Help Centre</h1>
            <p className="text-slate-300 text-sm md:text-base">
              Find answers to common questions about invest.com.au
            </p>
          </div>
        </div>

        <div className="container-custom max-w-4xl py-8 md:py-12 px-4">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-slate-700">Home</Link>
            <span className="mx-1.5">/</span>
            <span className="text-slate-700">Help Centre</span>
          </nav>

          {/* Categories grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {HELP_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/help/${cat.slug}`}
                className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {CATEGORY_ICONS[cat.slug] ?? "📄"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm md:text-base font-bold text-slate-900 group-hover:text-blue-700 mb-1">
                      {cat.title}
                    </h2>
                    <p className="text-xs text-slate-500 line-clamp-2">{cat.description}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {cat.articles.length} article{cat.articles.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick links */}
          <div className="border-t border-slate-100 pt-8">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">
              Popular Articles
            </h2>
            <ul className="space-y-2">
              {HELP_CATEGORIES.flatMap((cat) =>
                cat.articles.slice(0, 2).map((art) => (
                  <li key={`${cat.slug}/${art.slug}`}>
                    <Link
                      href={`/help/${cat.slug}/${art.slug}`}
                      className="text-sm text-blue-700 hover:underline"
                    >
                      {art.title}
                    </Link>
                    <span className="text-xs text-slate-400 ml-2">— {cat.title}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* FAQ */}
          <section className="mt-10 border-t border-slate-100 pt-8">
            <h2 className="text-base font-bold text-slate-700 mb-4">Common questions</h2>
            <div className="space-y-3">
              {HELP_FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-white">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none text-sm">
                    {faq.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Contact */}
          <div className="mt-10 bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
            <p className="text-sm font-semibold text-slate-800 mb-1">Can&apos;t find what you&apos;re looking for?</p>
            <p className="text-xs text-slate-500 mb-3">
              Email us at{" "}
              <a href="mailto:help@invest.com.au" className="text-blue-700 hover:underline">
                help@invest.com.au
              </a>{" "}
              — we respond within 1 business day.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
