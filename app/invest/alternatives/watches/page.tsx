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

const PAGE_TITLE = `Invest in Luxury Watches in Australia — Rolex, Patek, AP (${CURRENT_YEAR})`;
const PAGE_DESCRIPTION =
  "A factual guide to luxury watch investment in Australia. Compare platforms, understand authentication, storage, illiquidity risks, and CGT treatment for collectable timepieces.";
const CANONICAL = "/invest/alternatives/watches";

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
    name: "Chrono24",
    category: "Watch Marketplace",
    description:
      "World's largest online marketplace for luxury watches, with over 500,000 listings. Used by both individual collectors and professional dealers. Offers buyer protection and price trend data across makes and models.",
    access: "Yes (international)",
    minInvestment: "Varies (100s to 100,000s)",
    liquidity: "Marketplace listing",
  },
  {
    name: "Rally",
    category: "Fractional Collectibles",
    description:
      "US-based fractional investment platform offering equity shares in vintage watches and other collectibles. Assets are professionally sourced, authenticated, vaulted, and insured. Secondary market trading available.",
    access: "Via US account",
    minInvestment: "USD $10",
    liquidity: "Platform secondary market",
  },
  {
    name: "WatchBox",
    category: "Pre-Owned Trading",
    description:
      "Major pre-owned luxury watch dealer with offices globally. Offers buying, selling, and trade-in services for certified pre-owned watches from Rolex, Patek Philippe, Audemars Piguet, and others.",
    access: "Yes (AU delivery)",
    minInvestment: "Varies",
    liquidity: "Dealer buy-back / resale",
  },
  {
    name: "Konvi",
    category: "Fractional Luxury Goods",
    description:
      "Fractional investment platform covering luxury goods including watches. Investors buy fractional ownership in individual timepieces. Authentication and storage are handled by the platform.",
    access: "Limited in AU",
    minInvestment: "From $100",
    liquidity: "Platform secondary market",
  },
];

const TOP_MAKES = [
  {
    brand: "Rolex",
    notes: "Most liquid secondary market. Sports models (Daytona, Submariner, GMT-Master) have historically carried significant premiums above retail. Waitlists at authorised dealers drive secondary demand.",
  },
  {
    brand: "Patek Philippe",
    notes: "Long-considered the pinnacle of watch investment. The Nautilus and Aquanaut sport lines have delivered extraordinary secondary market appreciation. Complex pieces (perpetual calendars, repeaters) attract collector premiums.",
  },
  {
    brand: "Audemars Piguet",
    notes: "Royal Oak and Royal Oak Offshore are the primary investment-grade references. Limited and artist collaboration editions command the highest secondary market multiples.",
  },
  {
    brand: "Richard Mille",
    notes: "Ultra-high-end sports watches often retailing above $100,000. Certain celebrity-collaboration pieces have sold at multiple times retail at auction, though the market is thinner and more volatile.",
  },
];

const RISKS = [
  {
    title: "Authentication Risk",
    description:
      "Counterfeit and frankenwatch (mix of genuine and fake parts) risk is significant in the luxury watch market. Only purchase from verified dealers, authorised service centres, or with full provenance documentation and box-and-papers.",
  },
  {
    title: "Illiquidity",
    description:
      "Watch values are driven by collector trends that can shift rapidly. A reference that commands a 200% premium one year may trade below retail the next. There is no guaranteed secondary market at your expected price.",
  },
  {
    title: "Condition Sensitivity",
    description:
      "Polishing, scratches, and non-original parts can dramatically reduce collector value. Investment-grade watches should be stored in proper humidity and temperature-controlled conditions, unworn or minimally worn.",
  },
  {
    title: "No ASIC Regulation",
    description:
      "Luxury watches are tangible collectibles, not regulated financial products. No ASIC oversight applies, no PDS requirements exist, and investors have no access to the Compensation Scheme of Last Resort.",
  },
  {
    title: "Market Concentration Risk",
    description:
      "The liquid investment watch market is heavily concentrated in a small number of references from a few brands. Diversification within the asset class is difficult at reasonable price points.",
  },
  {
    title: "Tax Treatment",
    description:
      "Capital Gains Tax applies on disposal. Watches held for more than 12 months qualify for the 50% CGT discount. The personal use asset exemption does not apply to watches held as investments. SMSF rules under SISR Regulation 13.18AA apply if held in super.",
  },
];

const FAQS = [
  {
    question: "Are luxury watches a good investment?",
    answer:
      "Certain luxury watches — particularly sports models from Rolex, Patek Philippe, and Audemars Piguet — have historically delivered strong returns. The Knight Frank Luxury Investment Index tracked a 147% gain for watches over 10 years to 2022. However, the market is illiquid, heavily trend-dependent, and concentrated in a small number of references. Not all watches appreciate — entry-level luxury from most brands depreciates significantly once purchased.",
  },
  {
    question: "Which watches are the most investment-grade?",
    answer:
      "The most consistently investment-grade references include the Rolex Daytona (Paul Newman dials in particular), Rolex GMT-Master II, Patek Philippe Nautilus ref. 5711, Audemars Piguet Royal Oak ref. 15202ST, and Richard Mille limited RM-series. Box and papers, original condition, and documented service history all support premium valuations.",
  },
  {
    question: "Do I pay GST on a watch purchase in Australia?",
    answer:
      "Yes. Luxury watches purchased in Australia attract GST at 10% on the sale price. Watches purchased overseas by Australian residents travelling back are subject to the A$900 duty-free personal importation limit (per person). Goods brought in above this threshold attract GST and customs duty.",
  },
  {
    question: "Can I hold a watch in my SMSF?",
    answer:
      "Yes, subject to ATO rules under SISR Regulation 13.18AA. The watch must be insured for its market value, stored with a third-party custodian (not worn or kept at a trustee's home), not used by any related party, and valued at market value annually. Non-compliance risks the SMSF's concessional tax status.",
  },
  {
    question: "How do I authenticate a watch before buying?",
    answer:
      "For high-value purchases: have the watch inspected by an authorised dealer or independent watchmaker who specialises in the brand; verify serial numbers against manufacturer records where possible; check for original box, papers, and service history; and use escrow or buyer-protection services when purchasing via marketplaces. Third-party authentication services like the Horopedia or brand-specific specialists can provide written authentication.",
  },
];

export default async function WatchesInvestPage() {
  const listings = await fetchListingsBySubCategory("fund", "watches");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Alternatives", url: absoluteUrl("/invest/alternatives") },
    { name: "Watches" },
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
            <span className="text-slate-700">Watches</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-4 md:p-6 mb-4">
            <div className="flex items-start gap-3 mb-2">
              <span className="text-3xl" aria-hidden="true">⌚</span>
              <div>
                <h1 className="text-xl md:text-4xl font-extrabold text-slate-900">
                  Invest in Luxury Watches
                </h1>
                <p className="text-xs md:text-base text-slate-600 mt-1">
                  Rolex, Patek Philippe, Audemars Piguet — a factual guide to watch collecting
                  as an alternative investment for Australians in {CURRENT_YEAR}.
                </p>
              </div>
            </div>
            <p className="text-[0.56rem] md:text-xs text-slate-400 mt-2">{ADVERTISER_DISCLOSURE_SHORT}</p>
          </div>

          {/* Unregulated collectible notice */}
          <div className="mb-4">
            <AltAssetNotice assetLabel="Luxury watches" />
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
            <h2 className="text-xl font-bold mb-3">Luxury Watches as an Alternative Asset</h2>
            <div className="prose prose-slate max-w-none">
              <p>
                The investment-grade luxury watch market is dominated by a handful of Swiss
                manufacturers whose sports and dress watches command significant premiums on the
                secondary market. Unlike most luxury goods, certain watch references have demonstrated
                sustained price appreciation driven by limited production, brand prestige, and
                collector demand — particularly in Asia and the Middle East.
              </p>
              <p>
                The Knight Frank Luxury Investment Index tracked watch appreciation of 147% over
                10 years to 2022. However, this figure reflects a period of extraordinary demand
                that has moderated since 2022–2023, as interest rate rises and reduced discretionary
                spending pulled secondary market premiums closer to retail prices. The market for
                mass-market luxury watches remains broadly depreciating after purchase.
              </p>
              <p>
                For Australian investors, watch investing is typically done via direct purchase
                from authorised dealers (with secondary sale via auction or marketplace) or through
                fractional platforms that provide exposure to high-value pieces at lower entry
                points. As a non-financial product, all standard investor protections are absent.
              </p>
            </div>
          </section>

          {/* Top brands */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Investment-Grade Watch Brands</h2>
            <div className="space-y-3">
              {TOP_MAKES.map((make) => (
                <div key={make.brand} className="bg-white border border-slate-200 rounded-xl p-4">
                  <h3 className="font-bold text-slate-900 mb-1">{make.brand}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{make.notes}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Factual overview only. Brand positioning and secondary market values change over time.
              Not a recommendation to purchase any specific watch or brand.
            </p>
          </section>

          {/* Platforms */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Platforms &amp; Marketplaces</h2>
            <p className="text-sm text-slate-500 mb-4">
              Factual overview only — not a recommendation. Verify all platform details directly.
            </p>
            <div className="space-y-4">
              {PLATFORMS.map((p) => (
                <div key={p.name} className="bg-white border border-slate-200 rounded-xl p-4 md:p-5">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-medium">
                      {p.category}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">{p.description}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400 mb-0.5">AU Access</p>
                      <p className="font-semibold text-slate-700">{p.access}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-slate-400 mb-0.5">Min Investment</p>
                      <p className="font-semibold text-slate-700">{p.minInvestment}</p>
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
              <h2 className="text-xl font-bold mb-3">Browse Watch Investment Listings</h2>
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
                <p className="text-slate-500 text-sm mb-3">No watch listings yet — check back soon.</p>
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
                { label: "Art Investing", href: "/invest/alternatives/art" },
                { label: "Compare Platforms", href: "/invest/alternatives/platforms" },
                { label: "Browse All Listings", href: "/invest/alternatives/listings" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors"
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
