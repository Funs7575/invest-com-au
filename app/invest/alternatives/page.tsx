import Link from "next/link";
import type { Metadata } from "next";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  CURRENT_MONTH_YEAR,
  REVIEW_AUTHOR,
  SITE_NAME,
  ORGANIZATION_JSONLD,
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

const PAGE_TITLE = `Alternative Investments in Australia — Wine, Art, Cars, Watches (${CURRENT_YEAR})`;
const PAGE_DESCRIPTION =
  "Explore alternative investments in Australia including wine, art, classic cars, watches, coins and whisky. Compare platforms, browse listings, and read investment guides.";
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

/* ── Sub-category quick links ── */
const SUB_CATEGORIES = [
  { name: "Wine", slug: "wine", emoji: "🍷" },
  { name: "Art", slug: "art", emoji: "🎨" },
  { name: "Cars", slug: "cars", emoji: "🏎️" },
  { name: "Watches", slug: "watches", emoji: "⌚" },
  { name: "Coins", slug: "coins", emoji: "🪙" },
  { name: "Whisky", slug: "whisky", emoji: "🥃" },
];

/* ── Featured platforms ── */
const FEATURED_PLATFORMS = [
  {
    name: "Vinovest",
    category: "Wine Investment",
    description:
      "AI-powered wine investment platform that buys, stores, and insures fine wine on your behalf. Portfolios are professionally managed with options for self-directed investing.",
    offers: "Managed wine portfolios, authenticated storage, secondary market access",
  },
  {
    name: "Masterworks",
    category: "Art Investment",
    description:
      "Fractional art investment platform that securitises blue-chip contemporary artwork. Investors buy shares in individual paintings by artists like Banksy, Basquiat, and Warhol.",
    offers: "Fractional shares in blue-chip art, secondary market trading, SEC-qualified offerings",
  },
  {
    name: "Maverix",
    category: "Fractional Alternatives",
    description:
      "Australian-based fractional investment platform offering access to a mix of alternative asset classes including wine, whisky, and luxury goods.",
    offers: "Low minimums ($50), Australian-regulated, mixed alternative assets",
  },
  {
    name: "Cult Wines",
    category: "Wine Storage & Trading",
    description:
      "Global fine wine investment and storage specialist with over 20 years of history. Offers portfolio management, professional storage, and active trading of fine wines.",
    offers: "Professional wine storage, portfolio management, global trading network",
  },
  {
    name: "Rally",
    category: "Collectibles",
    description:
      "Fractional investment platform for collectibles including classic cars, rare books, sports memorabilia, and vintage watches. Assets are professionally vaulted and insured.",
    offers: "Fractional collectible shares, curated asset selection, secondary market",
  },
];

/* ── Key stats ── */
const KEY_STATS = [
  { value: "13.6% p.a.", label: "Wine Returns (20yr)", source: "Liv-ex Fine Wine 1000" },
  { value: "14.1% p.a.", label: "Art Returns", source: "Artprice Global Index" },
  { value: "$2.5B+", label: "Australian Collectibles Market", source: "IBISWorld" },
];

/* ── FAQs ── */
const FAQS = [
  {
    question: "What are alternative investments?",
    answer:
      "Alternative investments are asset classes outside traditional stocks, bonds, and cash. They include tangible assets like wine, art, classic cars, watches, coins, and whisky. These assets often have low correlation with share markets, providing portfolio diversification benefits.",
  },
  {
    question: "Can Australians invest in alternative assets?",
    answer:
      "Yes. Australians can invest in alternatives through specialist platforms like Vinovest (wine), Masterworks (art via US account), and Maverix (fractional alternatives based in Australia). Some platforms require overseas account setup, while others operate directly in Australia.",
  },
  {
    question: "Are alternative investments regulated in Australia?",
    answer:
      "Most alternative investment platforms are not regulated by ASIC as financial products. Wine, art, and collectibles are generally not considered financial products under the Corporations Act 2001. However, some fractional or tokenised offerings may fall under ASIC regulation depending on their structure.",
  },
  {
    question: "What are the tax implications of alternative investments in Australia?",
    answer:
      "Alternative investments are generally subject to Capital Gains Tax (CGT) when sold for a profit. Personal use assets acquired for under $10,000 may be exempt. Assets held for over 12 months qualify for the 50% CGT discount. SMSF trustees should note strict rules around holding collectibles in super.",
  },
  {
    question: "How much should I allocate to alternative investments?",
    answer:
      "Most financial advisers suggest limiting alternative investments to 5-15% of your total portfolio. Alternatives are typically less liquid than shares and may have higher transaction costs. Start small, diversify across asset classes, and only invest money you will not need in the short term.",
  },
];

/* ── Navigation cards ── */
const NAV_CARDS = [
  {
    title: "Browse Listings",
    description: "Explore alternative investment opportunities across wine, art, cars, watches, coins, and whisky.",
    href: "/invest/alternatives/listings",
    accent: "rose",
  },
  {
    title: "Compare Platforms",
    description: "Side-by-side comparison of the best alternative investment platforms available to Australians.",
    href: "/invest/alternatives/platforms",
    accent: "indigo",
  },
  {
    title: "Investment Guides",
    description: "Learn how to invest in alternatives with our in-depth guides covering tax, SMSF rules, and strategy.",
    href: "/invest/alternatives/guides",
    accent: "emerald",
  },
];

export default function AlternativesHubPage() {
  /* ── JSON-LD ── */
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Alternatives" },
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
            <span className="text-slate-700">Alternatives</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200/50 rounded-2xl p-4 md:p-6 mb-3 md:mb-4">
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
              Alternative Investments in Australia
            </h1>
            <p className="text-xs md:text-base text-slate-600 mb-2">
              Diversify beyond shares and property with wine, art, classic cars, watches, rare coins,
              and whisky. Explore platforms, browse listings, and learn how Australians are accessing
              alternative asset classes in {CURRENT_YEAR}.
            </p>
            <p className="text-[0.56rem] md:text-xs text-slate-400">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>

          {/* Browse Listings CTA */}
          <Link
            href="/invest/alternatives/listings"
            className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-50 to-emerald-100/40 border border-emerald-200 rounded-2xl mb-4 hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-1">Browse Listings</p>
              <p className="text-lg font-extrabold text-slate-900">View all alternative investment opportunities &rarr;</p>
              <p className="text-sm text-slate-600 mt-0.5">Wine, art, cars, watches, whisky, sub-categories &amp; more</p>
            </div>
            <svg className="w-8 h-8 text-emerald-600 shrink-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          {/* General Advice Warning — collapsed on mobile, visible on desktop */}
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

          {/* PDS / FSG / AFCA */}
          <p className="text-[0.58rem] text-slate-400 leading-relaxed mb-3">
            {PDS_CONSIDERATION} {FSG_NOTE} {AFCA_REFERENCE}
          </p>

          {/* Author byline */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-4 pb-4 border-b border-slate-100">
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

          {/* ── 3-column navigation grid ── */}
          <ScrollReveal animation="scroll-fade-in" className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 md:mb-10">
            {NAV_CARDS.map((card) => {
              const accentClasses: Record<string, { border: string; bg: string; text: string; hover: string }> = {
                rose: { border: "border-rose-200", bg: "bg-rose-50", text: "text-rose-700", hover: "hover:border-rose-400" },
                indigo: { border: "border-indigo-200", bg: "bg-indigo-50", text: "text-indigo-700", hover: "hover:border-indigo-400" },
                emerald: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", hover: "hover:border-emerald-400" },
              };
              const a = accentClasses[card.accent] || accentClasses.rose;
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

          {/* ── Sub-category quick links ── */}
          <div className="mb-8 md:mb-10">
            <h2 className="text-lg md:text-xl font-bold mb-3">Browse by Category</h2>
            <div className="flex flex-wrap gap-2">
              {SUB_CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/invest/alternatives/listings/${cat.slug}`}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:border-rose-400 hover:text-rose-700 transition-colors font-medium"
                >
                  {cat.emoji} {cat.name}
                </Link>
              ))}
            </div>
          </div>

          {/* ── Editorial overview ── */}
          <ScrollReveal animation="scroll-fade-in">
            <div className="prose prose-slate max-w-none mb-8 md:mb-10">
              <h2 className="text-xl font-bold mb-3">What Are Alternative Investments?</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Alternative investments encompass any asset class outside the traditional trio of
                shares, bonds, and cash. In Australia, the most popular alternative asset classes
                include fine wine, contemporary and Indigenous art, classic cars, luxury watches,
                rare coins, and premium whisky. These tangible assets have attracted growing
                interest from Australian investors seeking to diversify portfolios and access
                returns that are less correlated with the ASX.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                The global alternative investment market has experienced significant growth over
                the past decade, driven by fractional ownership platforms that lower entry barriers
                from hundreds of thousands of dollars to as little as $50. For Australian
                investors, this democratisation means access to asset classes previously reserved
                for ultra-high-net-worth individuals and institutional funds. Platforms like
                Vinovest and Masterworks have made it possible to invest in fine wine and
                blue-chip art from a standard brokerage account.
              </p>
              <p className="text-slate-600 leading-relaxed mb-4">
                The Australian collectibles and alternative asset market is estimated at over
                $2.5 billion and growing. Fine wine has delivered annualised returns of 13.6%
                over the past 20 years according to the Liv-ex Fine Wine 1000 index, while
                the Artprice Global Index shows contemporary art returning approximately
                14.1% per annum. Classic cars, rare watches, and premium whisky have also
                shown strong long-term appreciation, though with varying levels of liquidity
                and storage requirements.
              </p>
              <p className="text-slate-600 leading-relaxed">
                Before investing in alternatives, Australians should understand the unique
                risks including illiquidity, storage and insurance costs, authenticity
                verification, and specific tax treatment under CGT rules. SMSF trustees
                face additional ATO requirements when holding collectibles in super. Our
                platform comparison, listings, and guides below will help you navigate
                the Australian alternative investment landscape with confidence.
              </p>
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

          {/* ── Featured platforms ── */}
          <div className="mb-8 md:mb-10">
            <h2 className="text-xl font-bold mb-4">Featured Platforms</h2>
            <ScrollReveal animation="scroll-fade-in">
              <div className="space-y-4">
                {FEATURED_PLATFORMS.map((platform) => (
                  <div
                    key={platform.name}
                    className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-900">{platform.name}</h3>
                          <span className="text-xs font-medium px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full">
                            {platform.category}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-2">
                          {platform.description}
                        </p>
                        <p className="text-xs text-slate-500">
                          <strong className="text-slate-700">Offers:</strong> {platform.offers}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
            <p className="text-xs text-slate-500 mt-3">
              <Link
                href="/invest/alternatives/platforms"
                className="text-rose-600 hover:text-rose-800 font-semibold underline"
              >
                View full platform comparison →
              </Link>
            </p>
          </div>

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

          {/* ── Cross-links to related invest categories ── */}
          <div className="bg-slate-50 rounded-xl p-4 md:p-5 mb-6 md:mb-8">
            <h3 className="text-lg font-bold mb-3">Explore More Investment Categories</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Mining & Resources", href: "/invest/mining" },
                { label: "Farmland & Agriculture", href: "/invest/farmland" },
                { label: "Startups & Venture", href: "/invest/startups" },
                { label: "Browse All Listings", href: "/invest/alternatives/listings" },
                { label: "Compare Platforms", href: "/invest/alternatives/platforms" },
                { label: "Investment Guides", href: "/invest/alternatives/guides" },
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
