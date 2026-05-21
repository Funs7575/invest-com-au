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

const PAGE_TITLE = `Invest in Whisky in Australia — Casks, Bottles & Platforms (${CURRENT_YEAR})`;
const PAGE_DESCRIPTION =
  "Compare whisky investment platforms, understand cask vs bottle investing, storage requirements, valuations, and the risks of illiquidity and no regulatory protection in Australia.";
const CANONICAL = "/invest/alternatives/whisky";

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
    name: "WhiskyInvestDirect",
    category: "Cask & Bottle Trading",
    description:
      "UK-based marketplace for buying and selling maturing Scotch whisky casks. Investors take legal title to individual casks stored in HMRC-bonded warehouses. No management fees — you pay storage and insurance only.",
    access: "Yes (international including AU)",
    minInvestment: "~£500",
    liquidity: "Secondary market",
  },
  {
    name: "Cask Trade",
    category: "Cask Brokerage",
    description:
      "Global cask whisky brokerage connecting buyers and sellers. Offers single-malt Scotch casks across a range of distilleries and ages. Handles provenance verification and bonded warehouse transfers.",
    access: "Yes (international)",
    minInvestment: "£1,000+",
    liquidity: "Broker-facilitated",
  },
  {
    name: "Maverix",
    category: "Fractional (AU-based)",
    description:
      "Australian fractional alternative asset platform offering exposure to whisky alongside wine and other collectibles. Low minimum investment with AUD denomination — no currency conversion required.",
    access: "Yes (Australian)",
    minInvestment: "A$50",
    liquidity: "Platform secondary market",
  },
  {
    name: "The Whisky Exchange",
    category: "Bottle Market",
    description:
      "One of the world's largest whisky retailers, with an active secondary market for rare and collectable bottles. Primarily a retail platform but frequently used by collectors investing in limited-release bottles.",
    access: "Yes (international)",
    minInvestment: "Varies",
    liquidity: "Retail / auction",
  },
];

const RISKS = [
  {
    title: "Illiquidity",
    description:
      "Whisky casks can take years to find a buyer. Secondary markets exist but are thin compared to shares. You may not be able to exit at your desired price or timeframe.",
  },
  {
    title: "No ASIC Regulation",
    description:
      "Whisky is a tangible collectible, not a financial product. There is no Product Disclosure Statement, no obligation for regulated advice, and no Compensation Scheme of Last Resort if a platform fails.",
  },
  {
    title: "Storage & Insurance Costs",
    description:
      "Bonded warehouse storage, insurance, and ongoing warehousing fees erode returns over time. Cask evaporation ('angels' share') also reduces volume by 1-3% per year.",
  },
  {
    title: "Valuation Uncertainty",
    description:
      "Cask valuations are not independently audited in real time. Market prices depend on distillery reputation, age statement, and current consumer trends — all of which shift.",
  },
  {
    title: "Provenance Risk",
    description:
      "Authenticity fraud exists in the whisky market. Always verify chain of custody documents, distillery certificates, and use a reputable broker with verifiable warehouse records.",
  },
  {
    title: "Tax Treatment",
    description:
      "Capital Gains Tax applies on disposal. Investment-grade whisky held for more than 12 months qualifies for the 50% CGT discount. SMSF trustees face strict ATO collectibles rules — storage and insurance must comply with SISR regulation 13.18AA.",
  },
];

const FAQS = [
  {
    question: "Is whisky investment regulated in Australia?",
    answer:
      "No. Investment-grade whisky (casks and bottles) is a tangible collectible under Australian law, not a financial product under the Corporations Act 2001. It is not regulated by ASIC. Investors have no access to the Compensation Scheme of Last Resort, no right to a PDS, and no regulated advice obligations apply to vendors.",
  },
  {
    question: "What is the difference between cask and bottle whisky investment?",
    answer:
      "Cask whisky means you own a physical cask maturing in a bonded warehouse. Returns come from appreciation in the liquid's age and rarity over time, plus any bottling premium. Bottle whisky means you purchase sealed bottles from distilleries or the secondary market, hoping the bottle appreciates in value — often driven by limited releases, distillery closures, or collector demand.",
  },
  {
    question: "Can I hold whisky in my SMSF?",
    answer:
      "Yes, subject to strict ATO rules under SISR Regulation 13.18AA. The whisky must be insured for market value, stored with a third-party custodian (not at a trustee's home), not leased or used by related parties, and valued annually at market value. Failure to comply risks the fund losing its tax concessions.",
  },
  {
    question: "What return has Scotch whisky delivered historically?",
    answer:
      "The Knight Frank Whisky Index has shown strong long-term returns for rare whisky — approximately 373% over 10 years to 2022, though these figures are dominated by rare collectible bottles rather than commodity casks. Past performance is not indicative of future results, and the market for mass-market casks is less liquid and more volatile.",
  },
  {
    question: "Are Australian distillery casks available to invest in?",
    answer:
      "Yes. A growing number of Australian distilleries — particularly in Tasmania, Victoria, and New South Wales — offer cask ownership programs directly to investors. These carry similar risks to Scotch casks, with the added dynamic of a younger industry with fewer established secondary market buyers.",
  },
];

export default async function WhiskyInvestPage() {
  const listings = await fetchListingsBySubCategory("fund", "whisky");
  const categoryTabs = getAllInvestCategories().map((c) => ({ slug: c.slug, label: c.label }));

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Alternatives", url: absoluteUrl("/invest/alternatives") },
    { name: "Whisky" },
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
            <span className="text-slate-700">Whisky</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200/60 rounded-2xl p-4 md:p-6 mb-4">
            <div className="flex items-start gap-3 mb-2">
              <span className="text-3xl" aria-hidden="true">🥃</span>
              <div>
                <h1 className="text-xl md:text-4xl font-extrabold text-slate-900">
                  Invest in Whisky in Australia
                </h1>
                <p className="text-xs md:text-base text-slate-600 mt-1">
                  Casks, bottles, and fractional platforms — a factual overview of whisky as an
                  alternative asset for Australian investors in {CURRENT_YEAR}.
                </p>
              </div>
            </div>
            <p className="text-[0.56rem] md:text-xs text-slate-400 mt-2">{ADVERTISER_DISCLOSURE_SHORT}</p>
          </div>

          {/* Unregulated collectible notice */}
          <div className="mb-4">
            <AltAssetNotice assetLabel="Investment-grade whisky (casks and bottles)" />
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
            <h2 className="text-xl font-bold mb-3">What Is Whisky Investing?</h2>
            <div className="prose prose-slate max-w-none">
              <p>
                Whisky investing involves purchasing either maturing casks directly from distilleries
                or bonded warehouses, or acquiring rare and collectable bottles from distilleries,
                retailers, or secondary markets. Unlike shares or ETFs, whisky is a tangible asset
                — you own a physical product that appreciates (or depreciates) based on age,
                rarity, distillery reputation, and market demand.
              </p>
              <p>
                The Scottish Whisky Association and independent indices such as the Knight Frank
                Luxury Investment Index have tracked strong long-term returns for rare whisky.
                However, these headline returns are heavily weighted towards a small number of
                ultra-rare collectible bottlings. Most cask investors participate in a less
                liquid, more speculative market where returns are far less certain.
              </p>
              <p>
                Australian distilleries — particularly in Tasmania — have built strong reputations
                globally, creating a domestic cask market that offers Australian investors a
                locally accessible entry point without currency risk.
              </p>
            </div>
          </section>

          {/* Cask vs Bottle */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Cask vs Bottle: Key Differences</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-bold text-amber-900 mb-2">Cask Whisky</h3>
                <ul className="text-sm text-slate-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0 mt-0.5">+</span>
                    You own a maturing physical cask in a bonded warehouse
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0 mt-0.5">+</span>
                    Value increases as the whisky ages and gains complexity
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0 mt-0.5">+</span>
                    Can be bottled under your own label at maturity
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0 mt-0.5">-</span>
                    Annual evaporation (&quot;angels&apos; share&quot;) reduces volume
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0 mt-0.5">-</span>
                    Storage and insurance costs apply throughout the hold period
                  </li>
                </ul>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-900 mb-2">Bottle Whisky</h3>
                <ul className="text-sm text-slate-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0 mt-0.5">+</span>
                    Lower entry point — from a few hundred dollars
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0 mt-0.5">+</span>
                    Driven by distillery rarity, limited releases, and collector demand
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0 mt-0.5">+</span>
                    Easier to price via auction records and secondary markets
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0 mt-0.5">-</span>
                    Condition and seal integrity are critical — storage matters
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0 mt-0.5">-</span>
                    High counterfeit risk — authentication is essential
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Platforms */}
          <section className="mb-8">
            <h2 className="text-xl font-bold mb-4">Platforms &amp; Providers</h2>
            <p className="text-sm text-slate-500 mb-4">
              Factual overview only — not a recommendation. Verify all platform details directly before
              making any investment decision.
            </p>
            <div className="space-y-4">
              {PLATFORMS.map((p) => (
                <div
                  key={p.name}
                  className="bg-white border border-slate-200 rounded-xl p-4 md:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
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
              <h2 className="text-xl font-bold mb-3">Browse Whisky Investment Listings</h2>
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
                <p className="text-slate-500 text-sm mb-3">No whisky listings yet — check back soon.</p>
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
                { label: "Wine Investing", href: "/invest/alternatives/wine" },
                { label: "Watch Investing", href: "/invest/alternatives/watches" },
                { label: "Art Investing", href: "/invest/alternatives/art" },
                { label: "Compare Platforms", href: "/invest/alternatives/platforms" },
                { label: "Browse All Listings", href: "/invest/alternatives/listings" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors"
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
