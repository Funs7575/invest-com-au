import Link from "next/link";
import type { Metadata } from "next";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  CURRENT_MONTH_YEAR,
  REVIEW_AUTHOR,
} from "@/lib/seo";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
  PDS_CONSIDERATION,
  FSG_NOTE,
  AFCA_REFERENCE,
} from "@/lib/compliance";
import ScrollReveal from "@/components/ScrollReveal";

export const revalidate = 3600;

const PAGE_TITLE = `Alternative Investment Guides — How to Invest in Wine, Art & Collectibles`;
const PAGE_DESCRIPTION =
  "In-depth guides on alternative investing in Australia. Learn how to invest in wine, art, collectibles, understand SMSF rules, CGT treatment, insurance, and platform comparisons.";
const CANONICAL = "/invest/alternatives/guides";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl(CANONICAL),
  },
  twitter: { card: "summary_large_image" as const },
};

/* ── Guide data ── */
interface Guide {
  title: string;
  slug: string;
  description: string;
  readTime: number;
  category: string;
  categoryColor: string;
}

const GUIDES: Guide[] = [
  {
    title: "How to Invest in Wine in Australia",
    slug: "#",
    description:
      "A comprehensive guide to getting started with wine investment. Covers what to buy, which regions offer the best returns, how to store wine properly, and the tax implications for Australian investors.",
    readTime: 8,
    category: "Wine",
    categoryColor: "bg-rose-100 text-rose-700",
  },
  {
    title: "How to Invest in Art in Australia",
    slug: "#",
    description:
      "Everything you need to know about buying art for investment. Explores gallery purchases, fractional art platforms, Indigenous Australian art as an asset class, and emerging digital art markets.",
    readTime: 7,
    category: "Art",
    categoryColor: "bg-purple-100 text-purple-700",
  },
  {
    title: "SMSF Collectibles Rules Explained",
    slug: "#",
    description:
      "The ATO has strict rules for holding wine, art, coins, and cars in your Self-Managed Super Fund. This guide breaks down the compliance requirements, storage rules, and common mistakes to avoid.",
    readTime: 6,
    category: "SMSF & Tax",
    categoryColor: "bg-blue-100 text-blue-700",
  },
  {
    title: "Capital Gains Tax on Collectibles",
    slug: "#",
    description:
      "Understand the CGT treatment of alternative assets in Australia. Covers the personal use asset exemption for items under $10,000, the 50% CGT discount for long-term holdings, and record-keeping obligations.",
    readTime: 5,
    category: "SMSF & Tax",
    categoryColor: "bg-blue-100 text-blue-700",
  },
  {
    title: "Insurance for Collectible Investments",
    slug: "#",
    description:
      "Protecting your alternative investments with specialist insurance. Covers valuation requirements, choosing the right insurer, storage facility considerations, and what policies typically exclude.",
    readTime: 4,
    category: "Insurance",
    categoryColor: "bg-amber-100 text-amber-700",
  },
  {
    title: "Wine vs Art vs Watches — Which Alternative Asset Is Best?",
    slug: "#",
    description:
      "A head-to-head comparison of the most popular alternative asset classes. Analyses historical returns, liquidity profiles, storage costs, entry points, and which type of investor each asset suits best.",
    readTime: 10,
    category: "Comparison",
    categoryColor: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Fractional Alternative Investments Explained",
    slug: "#",
    description:
      "How platforms like Masterworks and Rally allow you to buy fractional shares in expensive assets. Covers how fractionalisation works, the fee structures, risks, secondary market trading, and regulatory considerations.",
    readTime: 6,
    category: "Platforms",
    categoryColor: "bg-indigo-100 text-indigo-700",
  },
  {
    title: "The Australian Collectibles Market Report",
    slug: "#",
    description:
      "An in-depth look at the Australian collectibles market. Covers market size and growth trends, recent auction records, emerging categories, demographic shifts, and the impact of online platforms on valuations.",
    readTime: 12,
    category: "Market Research",
    categoryColor: "bg-slate-200 text-slate-700",
  },
];

/* ── FAQs ── */
const FAQS = [
  {
    question: "Where should I start with alternative investment education?",
    answer:
      "Start with our comparison guide \"Wine vs Art vs Watches\" to understand which asset class suits your goals and risk profile. Then read the specific asset guide (wine, art, etc.) that interests you most. If you plan to invest through super, the SMSF Collectibles Rules guide is essential reading before making any decisions.",
  },
  {
    question: "Do I need professional advice before investing in alternatives?",
    answer:
      "While not legally required for most alternative investments, professional advice is strongly recommended — especially for SMSF holdings, high-value purchases, and tax planning. A financial adviser can help you determine the right allocation, and a tax accountant can ensure you comply with CGT obligations.",
  },
  {
    question: "How often are these guides updated?",
    answer:
      "We review and update our alternative investment guides quarterly, or sooner if there are significant regulatory changes, market events, or new platform launches. Each guide displays its last update date. Tax and SMSF guides are reviewed annually in line with ATO guidance updates.",
  },
  {
    question: "Are these guides suitable for beginners?",
    answer:
      "Yes. Our guides are written for Australian investors of all experience levels. Each guide starts with foundational concepts before covering advanced topics. We explain industry jargon, link to official ATO and ASIC resources, and provide practical next steps at the end of each article.",
  },
];

export default function AlternativesGuidesPage() {
  /* ── JSON-LD ── */
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Alternatives", url: absoluteUrl("/invest/alternatives") },
    { name: "Guides" },
  ]);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/invest" className="hover:text-slate-900">
              Invest
            </Link>
            <span className="mx-2">/</span>
            <Link href="/invest/alternatives" className="hover:text-slate-900">
              Alternatives
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Guides</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200/50 rounded-2xl p-4 md:p-6 mb-3 md:mb-4">
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
              Alternative Investment Guides
            </h1>
            <p className="text-xs md:text-base text-slate-600 mb-2">
              Learn how to invest in wine, art, watches, and collectibles in Australia. Our guides
              cover everything from getting started to SMSF rules, CGT treatment, and platform
              comparisons. Updated {CURRENT_MONTH_YEAR}.
            </p>
            <p className="text-[0.56rem] md:text-xs text-slate-400">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>

          {/* General Advice Warning */}
          <div className="hidden md:block bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 text-[0.69rem] text-slate-500 leading-relaxed">
            <strong className="text-slate-600">General Advice Warning:</strong>{" "}
            {GENERAL_ADVICE_WARNING}
          </div>
          <div className="md:hidden mb-3">
            <details className="bg-slate-50 border border-slate-200 rounded-lg">
              <summary className="px-3 py-2 text-[0.62rem] text-slate-500 font-medium cursor-pointer flex items-center gap-1">
                <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                General advice only — not a personal recommendation.
              </summary>
              <p className="px-3 pb-2.5 text-[0.62rem] text-slate-500 leading-relaxed">
                {GENERAL_ADVICE_WARNING}
              </p>
            </details>
          </div>

          <p className="text-[0.58rem] text-slate-400 leading-relaxed mb-3">
            {PDS_CONSIDERATION} {FSG_NOTE} {AFCA_REFERENCE}
          </p>

          {/* Author byline */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-6 pb-4 border-b border-slate-100">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Reviewed by{" "}
              <Link href="/reviewers/editorial-team" className="font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                {REVIEW_AUTHOR.name}
              </Link>
              <span className="text-slate-400">{REVIEW_AUTHOR.jobTitle}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Updated {CURRENT_MONTH_YEAR}
            </span>
          </div>

          {/* ── Guide cards grid ── */}
          <h2 className="text-lg md:text-2xl font-bold mb-4">
            All Guides ({GUIDES.length})
          </h2>

          <ScrollReveal animation="scroll-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 md:mb-10">
              {GUIDES.map((guide) => (
                <Link
                  key={guide.title}
                  href={guide.slug}
                  className="block bg-white border border-slate-200 rounded-xl p-4 md:p-5 hover:shadow-lg hover:scale-[1.02] transition-all flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${guide.categoryColor}`}>
                      {guide.category}
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">
                      {guide.readTime} min read
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2 flex-1">
                    {guide.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {guide.description}
                  </p>
                </Link>
              ))}
            </div>
          </ScrollReveal>

          {/* ── FAQ section ── */}
          <div id="faq" className="mb-10 scroll-mt-20">
            <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <details key={i} className="border border-slate-200 rounded-lg">
                  <summary className="px-4 py-3 font-semibold text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                    {faq.question}
                  </summary>
                  <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>

          {/* ── Cross-links ── */}
          <div className="bg-slate-50 rounded-xl p-4 md:p-5 mb-6 md:mb-8">
            <h3 className="text-lg font-bold mb-3">Related Pages</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Alternatives Hub", href: "/invest/alternatives" },
                { label: "Compare Platforms", href: "/invest/alternatives/platforms" },
                { label: "Browse Listings", href: "/invest/alternatives/listings" },
              ].map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:border-slate-700 hover:text-slate-900 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
