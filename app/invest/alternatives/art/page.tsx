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

const PAGE_TITLE = `Invest in Art in Australia — Fine Art, Fractional & Indigenous Art (${CURRENT_YEAR})`;
const PAGE_DESCRIPTION =
  "A factual guide to art investment for Australians. Compare platforms including Masterworks, understand valuation, authentication, storage, CGT treatment, and the regulatory status of art as an alternative asset.";
const CANONICAL = "/invest/alternatives/art";

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
    name: "Masterworks",
    category: "Fractional Art (US)",
    description:
      "The world's leading fractional art investment platform. Securitises individual blue-chip paintings by artists such as Banksy, Basquiat, Warhol, and Monet as SEC-qualified offerings. Investors buy and sell shares, with Masterworks managing storage, insurance, and eventual sale.",
    access: "Via US account",
    minInvestment: "USD $500",
    fees: "1.5% p.a. + 20% profit share",
    liquidity: "Secondary market",
  },
  {
    name: "Maverix",
    category: "Fractional (AU-based)",
    description:
      "Australian fractional platform offering exposure to art alongside whisky, wine, and luxury goods. AUD-denominated with a low minimum — designed for the Australian retail market.",
    access: "Yes (Australian)",
    minInvestment: "AUD $50",
    fees: "0–2%",
    liquidity: "Platform secondary market",
  },
  {
    name: "Sotheby's / Christie's",
    category: "Auction Houses",
    description:
      "The world's two largest fine art auction houses. Offer access to the primary and secondary markets for established and emerging artists globally. Both have Australian operations with regular Sydney sales.",
    access: "Yes (AU offices)",
    minInvestment: "Varies (thousands to millions)",
    fees: "25–28% buyer's premium",
    liquidity: "Auction cycle (biannual)",
  },
  {
    name: "Artsy",
    category: "Online Art Marketplace",
    description:
      "Global online marketplace connecting galleries, collectors, and auction houses. Provides price transparency, artist biographies, and exhibition history. Used for both direct purchases and auction participation.",
    access: "Yes (international)",
    minInvestment: "Varies",
    fees: "Gallery commission",
    liquidity: "Direct sale / gallery",
  },
];

const ART_SEGMENTS = [
  {
    segment: "Blue-Chip Contemporary",
    examples: "Banksy, Basquiat, Warhol, Hirst",
    characteristics:
      "High liquidity relative to other art segments. Auction house sales provide transparent price discovery. Typically requires significant capital. Heavily concentrated in a small number of artists.",
    return: "Artprice Global Index: ~14.1% p.a. (long term)",
  },
  {
    segment: "Emerging Australian Artists",
    examples: "Shortlisted Archibald Prize artists, NAVA-registered creators",
    characteristics:
      "Lower entry prices. Strong upside if artist gains critical recognition. Very illiquid — no established secondary market for most works. Values highly subjective.",
    return: "Highly variable, no reliable benchmark index",
  },
  {
    segment: "Indigenous Australian Art",
    examples: "Works from the Desert Schools, Tiwi Islands, and Arnhem Land",
    characteristics:
      "Culturally significant with growing institutional and international collector demand. Requires cultural sensitivity and provenance documentation. Some works have delivered exceptional long-term returns.",
    return: "Sotheby's & Bonhams record prices; no standard index",
  },
  {
    segment: "Prints & Multiples",
    examples: "Limited-edition prints, lithographs, silkscreens by established artists",
    characteristics:
      "Lower entry point than original works. Market is more accessible and more active. Authentication risk is lower than originals but still present.",
    return: "Varies by artist and edition size; generally lower than originals",
  },
];

const RISKS = [
  {
    title: "No ASIC Regulation",
    description:
      "Art is a tangible collectible, not a financial product under the Corporations Act 2001. There is no ASIC oversight, no PDS requirements, no regulated advice obligations, and no Compensation Scheme of Last Resort.",
  },
  {
    title: "Valuation Subjectivity",
    description:
      "Art prices are not set by markets — they are set by dealers, auction houses, and collector demand. Values can decline sharply if an artist falls out of critical favour or supply increases through estate sales.",
  },
  {
    title: "Illiquidity",
    description:
      "Even blue-chip art can take months to sell at auction. Emerging and Indigenous art may be almost entirely illiquid outside of specialist dealers. There is no guaranteed buyer at your desired price.",
  },
  {
    title: "Authenticity & Provenance",
    description:
      "Art fraud is a well-documented global problem. Forgeries, misattributed works, and undisclosed restoration significantly affect value. Independent authentication and provenance verification are essential for high-value purchases.",
  },
  {
    title: "Storage, Insurance & Condition",
    description:
      "Fine art requires climate-controlled storage, specialist insurance, and professional framing and conservation. Improper storage, UV exposure, and humidity damage can destroy value irreparably.",
  },
  {
    title: "Tax Treatment",
    description:
      "Capital Gains Tax applies on disposal. The personal use asset exemption (under $10,000, acquired for personal enjoyment) may apply in limited circumstances. SMSF rules under SISR Regulation 13.18AA apply for art held in super — the work cannot be displayed at a trustee's home or used by related parties.",
  },
];

const FAQS = [
  {
    question: "Is art investment regulated in Australia?",
    answer:
      "No. Art is a tangible collectible, not a financial product under the Corporations Act 2001. ASIC does not regulate art investment. There are no requirements for a Product Disclosure Statement, no regulated advice standards apply to art dealers or galleries, and investors have no access to the Compensation Scheme of Last Resort if a dealer or platform fails.",
  },
  {
    question: "Can Australians use Masterworks?",
    answer:
      "Yes, but with additional steps. Masterworks is a US platform regulated by the SEC. Australians can sign up, but will need to complete identity verification and may need to provide additional tax information (potentially an ITIN). All transactions are in USD, exposing investors to AUD/USD currency risk. The process typically takes 1-2 weeks.",
  },
  {
    question: "Is Indigenous Australian art a good investment?",
    answer:
      "Certain Indigenous Australian works — particularly from established desert art centres such as Papunya Tula, Yuendumu, and the APY Lands — have delivered strong returns at major auction houses. However, the market is specialised, values are highly subjective, and buyers must be aware of authenticity issues and the importance of proper provenance documentation. Cultural protocols around ownership and display of certain sacred works should also be considered.",
  },
  {
    question: "What is the Artprice Global Index?",
    answer:
      "The Artprice Global Index tracks auction price results globally across all art categories, providing a benchmark return for the contemporary art market. It has shown approximately 14.1% annualised returns over the long term. Like all investment indices, it is subject to survivorship bias and does not represent the returns most investors receive — the best-performing lots dominate the headline figure.",
  },
  {
    question: "What CGT applies to art in Australia?",
    answer:
      "Capital Gains Tax applies when you sell art at a profit. Art held for more than 12 months qualifies for the 50% CGT discount for Australian residents. The personal use asset exemption (acquired for under $10,000, primarily for personal enjoyment) may reduce or eliminate CGT in limited circumstances — but art purchased explicitly as an investment is unlikely to qualify. Seek independent tax advice for your specific situation.",
  },
];

export default async function ArtInvestPage() {
  const listings = await fetchListingsBySubCategory("fund", "art");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Alternatives", url: absoluteUrl("/invest/alternatives") },
    { name: "Art" },
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
            <span className="text-slate-700">Art</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200/60 rounded-2xl p-4 md:p-6 mb-4">
            <div className="flex items-start gap-3 mb-2">
              <span className="text-3xl" aria-hidden="true">🎨</span>
              <div>
                <h1 className="text-xl md:text-4xl font-extrabold text-slate-900">
                  Invest in Art in Australia
                </h1>
                <p className="text-xs md:text-base text-slate-600 mt-1">
                  Fine art, fractional platforms, and Indigenous Australian art — a factual overview
                  of art as an alternative asset for Australians in {CURRENT_YEAR}.
                </p>
              </div>
            </div>
            <p className="text-[0.56rem] md:text-xs text-slate-400 mt-2">{ADVERTISER_DISCLOSURE_SHORT}</p>
          </div>

          {/* Unregulated collectible notice */}
          <div className="mb-4">
            <AltAssetNotice assetLabel="Fine art and collectible works" />
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

          {/* Overview */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-3">Art as an Alternative Asset</h2>
            <div className="prose prose-slate max-w-none">
              <p>
                Fine art has long served as a store of value for wealthy collectors and institutions.
                Unlike most financial assets, art values are driven by aesthetic demand, cultural
                significance, artist reputation, scarcity, and critical consensus — not by
                underlying cashflows or earnings growth. This makes art returns largely uncorrelated
                with traditional financial markets.
              </p>
              <p>
                The Artprice Global Index has tracked approximately 14.1% annualised returns for
                the contemporary art market over the long term. These headline figures are heavily
                influenced by a small number of high-profile artists and auction results. The
                broader market for art — including emerging artists and secondary-tier works —
                is far more volatile and illiquid.
              </p>
              <p>
                For Australian investors, the art market offers both domestic opportunities
                (Indigenous Australian art has attracted significant international institutional
                interest) and international exposure via fractional platforms such as Masterworks
                that lower the entry threshold from millions to hundreds of dollars.
              </p>
            </div>
          </section>

          {/* Market segments */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Art Market Segments</h2>
            <div className="space-y-4">
              {ART_SEGMENTS.map((seg) => (
                <div key={seg.segment} className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-900">{seg.segment}</h3>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                      e.g. {seg.examples}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-2">{seg.characteristics}</p>
                  <p className="text-xs text-slate-400">
                    <strong className="text-slate-600">Return benchmark:</strong> {seg.return}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Platforms */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Platforms &amp; Access Points</h2>
            <p className="text-sm text-slate-500 mb-4">
              Factual overview only — not a recommendation. Verify all platform details directly.
            </p>
            <div className="space-y-4">
              {PLATFORMS.map((p) => (
                <div key={p.name} className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
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
                      <p className="text-slate-400 mb-0.5">Fees</p>
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
              <h2 className="text-xl font-bold mb-3">Browse Art Investment Listings</h2>
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
                <p className="text-slate-500 text-sm mb-3">No art listings yet — check back soon.</p>
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
                { label: "Wine Investing", href: "/invest/alternatives/wine" },
                { label: "Watch Investing", href: "/invest/alternatives/watches" },
                { label: "Compare Platforms", href: "/invest/alternatives/platforms" },
                { label: "Browse All Listings", href: "/invest/alternatives/listings" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:border-purple-400 hover:text-purple-700 transition-colors"
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
