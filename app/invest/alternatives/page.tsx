import Link from "next/link";
import type { Metadata } from "next";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  CURRENT_MONTH_YEAR,
  REVIEW_AUTHOR,
  ORGANIZATION_JSONLD,
} from "@/lib/seo";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
  PDS_CONSIDERATION,
  FSG_NOTE,
  AFCA_REFERENCE,
} from "@/lib/compliance";
import { getVerticalBySlug } from "@/lib/verticals";
import ScrollReveal from "@/components/ScrollReveal";

export const revalidate = 3600;

const PAGE_TITLE = `Alternative Investments in Australia — Wine, Art, Watches & More (${CURRENT_YEAR})`;
const PAGE_DESCRIPTION =
  "Explore alternative investments in Australia including wine, art, classic cars, watches, coins, and whisky. Compare platforms, browse listings, and read expert investment guides.";
const CANONICAL = "/invest/alternatives";

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

/* ── Key stats ── */
const KEY_STATS = [
  { value: "13.6% p.a.", label: "Wine Returns (20yr)", source: "Liv-ex Fine Wine 1000" },
  { value: "14.1% p.a.", label: "Art Returns (20yr)", source: "Artprice Global Index" },
  { value: "$2.5B+", label: "AU Collectibles Market", source: "IBISWorld" },
];

/* ── Navigation cards ── */
const NAV_CARDS = [
  {
    title: "Compare Platforms",
    description: "Side-by-side comparison of fees, minimums, asset classes, and AU access across wine, art, and collectibles platforms.",
    href: "/invest/alternatives/platforms",
    accent: "rose",
  },
  {
    title: "Browse Listings",
    description: "Explore alternative investment opportunities across wine, art, cars, watches, coins, and whisky.",
    href: "/invest/alternatives/listings",
    accent: "emerald",
  },
  {
    title: "Investment Guides",
    description: "Learn how to invest in alternatives with our in-depth guides covering tax, SMSF rules, and strategy.",
    href: "/invest/alternatives/guides",
    accent: "indigo",
  },
];

/* ── FAQs (pull from verticals config) ── */
// Also includes additional hub-level FAQs
const ADDITIONAL_FAQS = [
  {
    question: "What are alternative investments?",
    answer:
      "Alternative investments are asset classes outside traditional stocks, bonds, and cash. They include tangible assets like wine, art, classic cars, watches, coins, and whisky. These assets often have low correlation with share markets, providing portfolio diversification benefits.",
  },
];

export default function AlternativesHubPage() {
  const vertical = getVerticalBySlug("alternatives");

  /* ── FAQs: from vertical config + additional hub FAQs ── */
  const faqs = [...(vertical?.faqs ?? []), ...ADDITIONAL_FAQS];

  /* ── JSON-LD ── */
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Alternatives" },
  ]);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  // FinancialService JSON-LD for the hub (matches sibling verticals like crypto, savings)
  const financialServiceJsonLd = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    name: "Alternative Investment Platform Comparison",
    description: PAGE_DESCRIPTION,
    url: absoluteUrl(CANONICAL),
    provider: ORGANIZATION_JSONLD,
    areaServed: { "@type": "Country", name: "Australia" },
  };

  return (
    <>
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(financialServiceJsonLd) }} />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/invest" className="hover:text-slate-900">Invest</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Alternatives</span>
          </nav>

          {/* Hero — uses vertical config heading/subtext */}
          <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200/50 rounded-2xl p-4 md:p-6 mb-3 md:mb-4">
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
              {vertical?.heroHeadline ?? "Compare Alternative Investment Platforms in Australia"}
            </h1>
            <p className="text-xs md:text-base text-slate-600 mb-2">
              {vertical?.heroSubtext ??
                `Diversify beyond shares and property with wine, art, classic cars, watches, rare coins, and whisky. Compare platforms, browse listings, and learn how Australians are accessing alternative asset classes in ${CURRENT_YEAR}.`}
            </p>
            <p className="text-[0.56rem] md:text-xs text-slate-500">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>

          {/* Stats strip from vertical config */}
          {vertical && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {vertical.stats.map((stat) => (
                <div key={stat.label} className="bg-white border border-rose-100 rounded-xl p-3 text-center">
                  <div className="text-lg md:text-2xl font-extrabold text-rose-600">{stat.value}</div>
                  <div className="text-[0.65rem] md:text-xs text-slate-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Compare Platforms primary CTA — platforms is now a structured comparison page */}
          <Link
            href="/invest/alternatives/platforms"
            className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-rose-50 to-rose-100/40 border border-rose-200 rounded-2xl mb-4 hover:border-rose-300 hover:shadow-md transition-all"
          >
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-rose-700 mb-1">Compare Platforms</p>
              <p className="text-lg font-extrabold text-slate-900">Side-by-side platform comparison &rarr;</p>
              <p className="text-sm text-slate-600 mt-0.5">Fees, minimums, asset classes, and AU access — filterable and sortable</p>
            </div>
            <svg className="w-8 h-8 text-rose-600 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* General Advice Warning */}
          <div className="hidden md:block bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 text-[0.69rem] text-slate-500 leading-relaxed">
            <strong className="text-slate-600">General Advice Warning:</strong>{" "}
            {GENERAL_ADVICE_WARNING}
          </div>
          <div className="md:hidden mb-3">
            <details className="bg-slate-50 border border-slate-200 rounded-lg">
              <summary className="px-3 py-2 text-[0.62rem] text-slate-500 font-medium cursor-pointer flex items-center gap-1">
                <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                General advice only — not a personal recommendation.
              </summary>
              <p className="px-3 pb-2.5 text-[0.62rem] text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </details>
          </div>

          <p className="text-[0.58rem] text-slate-500 leading-relaxed mb-3">
            {PDS_CONSIDERATION} {FSG_NOTE} {AFCA_REFERENCE}
          </p>

          {/* Author byline */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-4 pb-4 border-b border-slate-100">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Reviewed by{" "}
              <Link href="/reviewers/editorial-team" className="font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                {REVIEW_AUTHOR.name}
              </Link>
              <span className="text-slate-400">{REVIEW_AUTHOR.jobTitle}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Updated {CURRENT_MONTH_YEAR}
            </span>
          </div>

          {/* ── 3-column navigation grid ── */}
          <ScrollReveal animation="scroll-fade-in" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 md:mb-10">
            {NAV_CARDS.map((card) => {
              const accentClasses: Record<string, { border: string; bg: string; text: string; hover: string }> = {
                rose:    { border: "border-rose-200",    bg: "bg-rose-50",    text: "text-rose-700",    hover: "hover:border-rose-400" },
                indigo:  { border: "border-indigo-200",  bg: "bg-indigo-50",  text: "text-indigo-700",  hover: "hover:border-indigo-400" },
                emerald: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", hover: "hover:border-emerald-400" },
              };
              const a = accentClasses[card.accent] ?? accentClasses.rose;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`block p-5 border ${a.border} ${a.hover} rounded-xl ${a.bg} transition-all hover:shadow-lg hover:scale-[1.02]`}
                >
                  <h2 className={`text-lg font-bold mb-1.5 ${a.text}`}>{card.title}</h2>
                  <p className="text-sm text-slate-600">{card.description}</p>
                </Link>
              );
            })}
          </ScrollReveal>

          {/* ── Sub-category quick links (driven from vertical config) ── */}
          {vertical && (
            <div className="mb-8 md:mb-10">
              <h2 className="text-lg md:text-xl font-bold mb-3">Browse by Asset Class</h2>
              <div className="flex flex-wrap gap-2">
                {vertical.subcategories.map((cat) => (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    title={cat.description}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:border-rose-400 hover:text-rose-700 transition-colors font-medium"
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Editorial overview (from vertical config sections) ── */}
          <ScrollReveal animation="scroll-fade-in">
            <div className="prose prose-slate max-w-none mb-8 md:mb-10">
              {(vertical?.sections ?? []).map((section) => (
                <div key={section.heading} className="mb-6">
                  <h2 className="text-xl font-bold mb-3">{section.heading}</h2>
                  <p className="text-slate-600 leading-relaxed">{section.body}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* ── Key stats ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 md:mb-10">
            {KEY_STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-white border border-slate-200 rounded-xl p-5 text-center hover:shadow-md transition-shadow"
              >
                <div className="text-2xl md:text-3xl font-extrabold text-rose-600 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-slate-800 mb-0.5">{stat.label}</div>
                <div className="text-xs text-slate-400">{stat.source}</div>
              </div>
            ))}
          </div>

          {/* ── FAQ section (from vertical config + additional) ── */}
          <div id="faq" className="mb-10 scroll-mt-20">
            <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details key={i} className="border border-slate-200 rounded-lg">
                  <summary className="px-4 py-3 font-semibold text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                    {faq.question}
                  </summary>
                  <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>

          {/* ── Advisor cross-link ── */}
          {vertical?.advisorTypes && vertical.advisorTypes.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5 mb-6">
              <h3 className="text-base font-bold text-amber-900 mb-2">Need personalised advice?</h3>
              <p className="text-sm text-amber-800 mb-3">
                Alternative investments carry unique risks — storage, liquidity, insurance, and SMSF compliance considerations differ from mainstream investments. Speaking with a qualified adviser can help.
              </p>
              <div className="flex flex-wrap gap-2">
                {vertical.advisorTypes.map((at) => (
                  <Link
                    key={at.href}
                    href={at.href}
                    className="px-3 py-1.5 bg-white border border-amber-300 rounded-full text-sm text-amber-900 hover:bg-amber-100 transition-colors font-medium"
                  >
                    {at.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── Cross-links to related invest categories ── */}
          <div className="bg-slate-50 rounded-xl p-4 md:p-5 mb-6 md:mb-8">
            <h3 className="text-lg font-bold mb-3">Explore Related Investment Categories</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Property Platforms", href: "/property-platforms" },
                { label: "SMSF Hub", href: "/smsf" },
                { label: "Mining & Resources", href: "/invest/mining" },
                { label: "Farmland & Agriculture", href: "/invest/farmland" },
                { label: "Startups & Venture", href: "/invest/startups" },
                { label: "Browse All Listings", href: "/invest/alternatives/listings" },
              ].map((link) => (
                <Link
                  key={link.href}
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
