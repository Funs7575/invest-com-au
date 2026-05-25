import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  CURRENT_MONTH_YEAR,
  REVIEW_AUTHOR,
  SITE_URL,
  SITE_NAME,
} from "@/lib/seo";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import AltAssetNotice from "@/components/invest/AltAssetNotice";
import InvestListingsClient from "@/components/InvestListingsClient";
import { getAllInvestCategories } from "@/lib/invest-categories";
import { fetchListingsBySubCategory } from "@/lib/investment-listings-query";

export const revalidate = 3600;

const PAGE_TITLE = `Invest in Wine in Australia — Fine Wine Platforms & Casks (${CURRENT_YEAR})`;
const PAGE_DESCRIPTION =
  "A factual guide to fine wine investment for Australians. Compare platforms, understand storage costs, illiquidity risks, CGT treatment, and SMSF rules for wine as an alternative asset.";
const CANONICAL = "/invest/alternatives/wine";

export async function generateMetadata(): Promise<Metadata> {
  return {
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
}

const PLATFORMS = [
  {
    name: "Vinovest",
    category: "Managed Wine Portfolios",
    description:
      "AI-powered wine investment platform that selects, stores, and insures fine wine on your behalf. Offers managed portfolios and a self-directed trading marketplace. Australian investors can sign up directly.",
    access: "Yes (direct AU access)",
    minInvestment: "USD $1,000",
    fees: "2.85% p.a.",
    liquidity: "Secondary market",
  },
  {
    name: "Cult Wines",
    category: "Fine Wine Brokerage",
    description:
      "Global fine wine investment specialist with over 20 years of experience. Provides bespoke portfolio management, professional storage in UK and Hong Kong bonded warehouses, and access to the Liv-ex trading network.",
    access: "Yes (AU office)",
    minInvestment: "AUD $10,000",
    fees: "2.5% p.a. + performance",
    liquidity: "Broker-facilitated",
  },
  {
    name: "Maverix",
    category: "Fractional (AU-based)",
    description:
      "Australian fractional alternative asset platform offering wine exposure alongside whisky, art, and luxury goods. AUD-denominated with a very low minimum investment.",
    access: "Yes (Australian)",
    minInvestment: "AUD $50",
    fees: "0–2%",
    liquidity: "Platform secondary market",
  },
  {
    name: "Uvinum",
    category: "Bottle Marketplace",
    description:
      "European wine marketplace with a large selection of investment-grade bottles. Used primarily for purchasing collectable bottles from major French, Italian, and Spanish regions. Ships internationally including to Australia.",
    access: "Yes (international)",
    minInvestment: "Varies per bottle",
    fees: "Included in price",
    liquidity: "Marketplace resale",
  },
];

const KEY_FACTS = [
  { label: "Liv-ex Fine Wine 1000 (20yr annualised)", value: "~13.6% p.a.", note: "Source: Liv-ex. Past performance is not indicative of future results." },
  { label: "Australian wine export value (2023)", value: "A$2.5B+", note: "Source: Wine Australia" },
  { label: "Number of Australian wineries", value: "2,500+", note: "Source: Wine Australia" },
];

const RISKS = [
  {
    title: "Illiquidity",
    description:
      "Fine wine does not trade on an exchange. Selling depends on finding a buyer through a broker, auction house, or platform secondary market. In a down market, this can take months or longer.",
  },
  {
    title: "No ASIC Regulation",
    description:
      "Wine is a tangible collectible, not a financial product under the Corporations Act 2001. There is no ASIC oversight, no mandated PDS, no regulated advice requirements, and no Compensation Scheme of Last Resort.",
  },
  {
    title: "Storage & Insurance Costs",
    description:
      "Proper temperature-controlled storage in a bonded facility is essential for wine to retain value. Annual storage, insurance, and handling fees reduce net returns. Storage in a non-commercial setting can void insurance and destroy value.",
  },
  {
    title: "Counterfeit Risk",
    description:
      "Wine fraud is well-documented. Fake or adulterated bottles of prestigious labels circulate in the collector market. Authentication via trusted auction houses or provenance chains is essential.",
  },
  {
    title: "Taste and Vintage Risk",
    description:
      "Wine can spoil, be affected by bad vintages, or fall out of critical favour. Even well-stored bottles from reputable producers can disappoint at auction if taste trends change.",
  },
  {
    title: "CGT and SMSF Rules",
    description:
      "Capital Gains Tax applies on disposal. Wine held in an SMSF must comply with SISR Regulation 13.18AA — stored off-premises, insured at market value, not used or displayed by trustees or related parties.",
  },
];

const FAQS = [
  {
    question: "Is wine a regulated investment in Australia?",
    answer:
      "No. Wine is a tangible collectible, not a financial product under the Corporations Act 2001. ASIC does not regulate wine investment. There is no requirement for a Product Disclosure Statement, no financial advice obligations, and no access to the Compensation Scheme of Last Resort if a platform fails.",
  },
  {
    question: "What is the Liv-ex and why does it matter?",
    answer:
      "The London International Vintners Exchange (Liv-ex) is the global secondary market for fine wine. It publishes indices including the Fine Wine 50 and Fine Wine 1000 that track the price performance of the world's most collectable wines. Liv-ex data is used as the benchmark for fine wine investment returns globally.",
  },
  {
    question: "What regions are most popular for wine investment?",
    answer:
      "Bordeaux (particularly the classified growths like Petrus, Mouton Rothschild, and Haut-Brion) has historically dominated fine wine investment. Burgundy (Domaine de la Romanée-Conti and premier crus) and Super Tuscans (Sassicaia, Ornellaia) are also strongly traded. Australian wine investment tends to focus on Penfolds Grange, Henschke Hill of Grace, and limited-edition releases from boutique South Australian producers.",
  },
  {
    question: "Can I invest in Australian wine?",
    answer:
      "Yes. Penfolds Grange is the most actively traded Australian wine on secondary markets and features on the Liv-ex 1000. Other investment-grade Australian wines include Henschke Hill of Grace, Torbreck The Laird, and limited Ben Glaetzer releases. As a newer segment, Australian fine wine has lower secondary market liquidity than Bordeaux or Burgundy.",
  },
  {
    question: "What are the CGT implications of wine investment?",
    answer:
      "Wine disposed of at a profit is subject to Capital Gains Tax. The personal use asset exemption (assets acquired for under $10,000 used for personal enjoyment) may apply in some circumstances, but investment-grade wine purchased explicitly as an investment is unlikely to qualify. Wine held for more than 12 months qualifies for the 50% CGT discount for Australian residents.",
  },
];

export default async function WineInvestPage() {
  const listings = await fetchListingsBySubCategory("fund", "wine");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Alternatives", url: absoluteUrl("/invest/alternatives") },
    { name: "Wine" },
  ]);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: absoluteUrl(CANONICAL),
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href="/invest" className="hover:text-slate-900">Invest</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <Link href="/invest/alternatives" className="hover:text-slate-900">Alternatives</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-slate-700">Wine</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200/60 rounded-2xl p-4 md:p-6 mb-4">
            <div className="flex items-start gap-3 mb-2">
              <span className="text-3xl" aria-hidden="true">🍷</span>
              <div>
                <h1 className="text-xl md:text-4xl font-extrabold text-slate-900">
                  Invest in Wine in Australia
                </h1>
                <p className="text-xs md:text-base text-slate-600 mt-1">
                  A factual guide to fine wine as an alternative asset — platforms, storage,
                  risks, and tax treatment for Australian investors in {CURRENT_YEAR}.
                </p>
              </div>
            </div>
            <p className="text-[0.56rem] md:text-xs text-slate-400 mt-2">{ADVERTISER_DISCLOSURE_SHORT}</p>
          </div>

          {/* Unregulated collectible notice */}
          <div className="mb-4">
            <AltAssetNotice assetLabel="Fine wine" />
          </div>

          {/* Author byline */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-6 pb-4 border-b border-slate-100">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Reviewed by{" "}
              <Link href="/reviewers/editorial-team" className="font-semibold text-slate-700 hover:text-slate-900">
                {REVIEW_AUTHOR.name}
              </Link>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Updated {CURRENT_MONTH_YEAR}
            </span>
          </div>

          {/* Key facts */}
          <section className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {KEY_FACTS.map((fact) => (
                <div key={fact.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-rose-600 mb-1">{fact.value}</p>
                  <p className="text-sm font-semibold text-slate-800 mb-0.5">{fact.label}</p>
                  <p className="text-xs text-slate-400">{fact.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Overview */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3">Fine Wine as an Investment</h2>
            <div className="prose prose-slate max-w-none">
              <p>
                Fine wine has a centuries-old history as a store of value. Investment-grade wine is
                typically limited-production wine from prestigious regions such as Bordeaux, Burgundy,
                and the Rhône Valley in France, alongside notable Australian producers such as Penfolds.
                Value is driven by scarcity, critical scores (Parker, Burghound), producer reputation,
                and growing collector demand from Asia.
              </p>
              <p>
                The Liv-ex Fine Wine 1000 index — the broadest benchmark of fine wine market performance
                — has delivered approximately 13.6% annualised returns over 20 years. However, this
                figure reflects the top tier of tradeable fine wine, not the average portfolio. Access
                to the best-performing lots is competitive and typically requires established relationships
                with négociants or allocation-list membership.
              </p>
              <p>
                For Australian investors, specialised wine investment platforms like Vinovest and
                Cult Wines simplify the process of acquiring, storing, insuring, and trading
                investment-grade wine without needing to manage physical custody. Fractional
                options via Maverix allow smaller initial exposures with AUD denomination.
              </p>
            </div>
          </section>

          {/* Platforms */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Wine Investment Platforms</h2>
            <p className="text-sm text-slate-500 mb-4">
              Factual overview only — not a recommendation. Verify all platform details directly.
            </p>
            <div className="space-y-4">
              {PLATFORMS.map((p) => (
                <div key={p.name} className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-medium">
                      {p.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">{p.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400 mb-0.5">AU Access</p>
                      <p className="font-semibold text-slate-700">{p.access}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400 mb-0.5">Min Investment</p>
                      <p className="font-semibold text-slate-700">{p.minInvestment}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400 mb-0.5">Annual Fees</p>
                      <p className="font-semibold text-slate-700">{p.fees}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400 mb-0.5">Liquidity</p>
                      <p className="font-semibold text-slate-700">{p.liquidity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Risks */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Key Risks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RISKS.map((risk) => (
                <div key={risk.title} className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <h3 className="font-bold text-red-900 text-sm mb-1">{risk.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{risk.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Listings */}
          {listings.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-3">Browse Wine Investment Listings</h2>
              <Suspense fallback={<div className="py-8 text-center text-slate-400">Loading listings…</div>}>
                <InvestListingsClient
                  listings={listings}
                  categories={categoryTabs}
                  lockedCategory="alternatives"
                  pageTitle=""
                  pageSubtitle=""
                />
              </Suspense>
            </section>
          )}

          {listings.length === 0 && (
            <section className="mb-8">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                <p className="text-slate-500 text-sm mb-3">No wine listings yet — check back soon.</p>
                <Link
                  href="/invest/alternatives/listings"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-600 hover:text-rose-800"
                >
                  Browse all alternative investment listings →
                </Link>
              </div>
            </section>
          )}

          {/* FAQ */}
          <section id="faq" className="mb-10 scroll-mt-20">
            <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <details key={i} className="border border-slate-200 rounded-lg">
                  <summary className="px-4 py-3 font-semibold text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                    {faq.question}
                  </summary>
                  <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Cross-links */}
          <div className="bg-slate-50 rounded-xl p-4 md:p-5 mb-6">
            <h3 className="text-base font-bold mb-3">Explore Related Pages</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Alternatives Hub", href: "/invest/alternatives" },
                { label: "Whisky Investing", href: "/invest/alternatives/whisky" },
                { label: "Watch Investing", href: "/invest/alternatives/watches" },
                { label: "Art Investing", href: "/invest/alternatives/art" },
                { label: "Compare Platforms", href: "/invest/alternatives/platforms" },
                { label: "Browse All Listings", href: "/invest/alternatives/listings" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:border-rose-400 hover:text-rose-700 transition-colors"
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
