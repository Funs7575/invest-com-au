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
import ScrollReveal from "@/components/ScrollReveal";

export const revalidate = 3600;

const PAGE_TITLE = `Best Alternative Investment Platforms in Australia (${CURRENT_YEAR})`;
const PAGE_DESCRIPTION =
  "Compare the best alternative investment platforms available to Australians. Side-by-side comparison of fees, minimums, asset classes, and Australian access for wine, art, and collectible platforms.";
const CANONICAL = "/invest/alternatives/platforms";

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

/* ── Platform data ── */
interface Platform {
  name: string;
  slug: string;
  assetClass: string;
  minInvestment: string;
  fees: string;
  australiaAccess: string;
  rating: number;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  signupFromAustralia: string;
}

const PLATFORMS: Platform[] = [
  {
    name: "Vinovest",
    slug: "vinovest",
    assetClass: "Wine",
    minInvestment: "$1,000",
    fees: "2.85% annual",
    australiaAccess: "Yes (direct)",
    rating: 4.2,
    description:
      "Vinovest is an AI-powered wine investment platform that purchases, authenticates, stores, and insures fine wine on your behalf. The platform offers both managed portfolios and a self-directed trading marketplace for experienced wine investors.",
    pros: [
      "Fully managed portfolio option with AI-driven selection",
      "Professional bonded warehouse storage included",
      "Strong historical returns (13%+ annualised)",
    ],
    cons: [
      "2.85% annual management fee is above average",
      "Minimum $1,000 investment may exclude beginners",
      "Liquidity depends on secondary market demand",
    ],
    bestFor: "Beginners who want hands-off wine investing with professional management.",
    signupFromAustralia:
      "Australians can sign up directly via the Vinovest website. No US account is required. Deposits can be made via bank transfer in AUD, which is converted to USD at market rates.",
  },
  {
    name: "Cult Wines",
    slug: "cult-wines",
    assetClass: "Wine",
    minInvestment: "$10,000",
    fees: "2.5% p.a. + performance",
    australiaAccess: "Yes (direct)",
    rating: 4.0,
    description:
      "Cult Wines is a global fine wine investment specialist with over 20 years of experience. They offer bespoke portfolio management, professional storage in bonded warehouses, and an active trading network. Their team of wine experts and data analysts curate investment-grade wines.",
    pros: [
      "20+ years of track record in fine wine investment",
      "Dedicated account managers for personalised service",
      "Extensive global trading network for liquidity",
    ],
    cons: [
      "High $10,000 minimum investment",
      "Performance fees reduce upside returns",
      "Complex fee structure can be difficult to parse",
    ],
    bestFor: "Serious wine collectors and high-net-worth investors wanting white-glove service.",
    signupFromAustralia:
      "Cult Wines has a presence in Australia and accepts Australian clients directly. Contact their Sydney office or sign up online. Deposits in AUD are accepted.",
  },
  {
    name: "Masterworks",
    slug: "masterworks",
    assetClass: "Art",
    minInvestment: "$500 USD",
    fees: "1.5% annual + 20% profit",
    australiaAccess: "Via US account",
    rating: 4.3,
    description:
      "Masterworks is the leading fractional art investment platform, allowing investors to buy shares in individual blue-chip paintings by artists like Banksy, Basquiat, Warhol, and Monet. Each artwork is securitised as an SEC-qualified offering, and investors can trade shares on a secondary market.",
    pros: [
      "Access to blue-chip art that typically requires millions to purchase",
      "SEC-qualified offerings provide regulatory oversight",
      "Active secondary market for trading shares before sale",
    ],
    cons: [
      "Requires US account setup which adds friction for Australians",
      "20% profit share significantly reduces net returns",
      "Individual artwork risk — each painting is a concentrated bet",
    ],
    bestFor: "Investors seeking exposure to the contemporary art market with fractional entry points.",
    signupFromAustralia:
      "Australians need to set up a US-based account through Masterworks. You will need to provide identification and may need a US tax identification number (ITIN). The process typically takes 1-2 weeks. All transactions are in USD.",
  },
  {
    name: "Maverix",
    slug: "maverix",
    assetClass: "Fractional (mixed)",
    minInvestment: "$50",
    fees: "0-2%",
    australiaAccess: "Yes (Australian)",
    rating: 3.8,
    description:
      "Maverix is an Australian-based fractional alternative investment platform offering low-minimum access to a diversified range of alternative assets including wine, whisky, luxury goods, and more. As a local platform, it provides AUD-denominated investments with no currency conversion.",
    pros: [
      "Australian-based and regulated — no overseas account needed",
      "Extremely low $50 minimum investment",
      "Diversified across multiple alternative asset classes",
    ],
    cons: [
      "Relatively new platform with limited track record",
      "Smaller selection of assets compared to global platforms",
      "Secondary market liquidity is still developing",
    ],
    bestFor: "Australian beginners wanting low-cost entry to diversified alternative assets.",
    signupFromAustralia:
      "Maverix is based in Australia. Sign up directly on their website with standard Australian ID verification. Deposits in AUD via bank transfer or card. No currency conversion needed.",
  },
  {
    name: "Rally",
    slug: "rally",
    assetClass: "Collectibles",
    minInvestment: "$10 USD",
    fees: "0% ongoing",
    australiaAccess: "Via US account",
    rating: 3.5,
    description:
      "Rally (formerly Rally Rd.) is a fractional investment platform for collectibles including classic cars, rare books, sports memorabilia, vintage watches, and more. Assets are professionally sourced, vaulted, and insured. Investors buy equity shares during initial offerings and can trade on Rally's secondary market.",
    pros: [
      "Ultra-low $10 minimum makes collectible investing accessible",
      "No ongoing management fees",
      "Curated selection of rare and interesting collectibles",
    ],
    cons: [
      "Requires US account setup for Australian investors",
      "Limited control — you cannot take physical possession",
      "Secondary market trading windows are restricted",
    ],
    bestFor: "Hobbyist investors interested in collectibles with very low entry costs.",
    signupFromAustralia:
      "Australians can access Rally by signing up via their app or website. A US address is not required, but identity verification and a US tax form may be needed. Transactions are in USD.",
  },
  {
    name: "Konvi",
    slug: "konvi",
    assetClass: "Luxury goods",
    minInvestment: "$100",
    fees: "2-5%",
    australiaAccess: "Limited",
    rating: 3.2,
    description:
      "Konvi is a fractional luxury goods investment platform offering shares in high-end items including designer handbags, sneakers, and luxury watches. The platform handles authentication, storage, and eventual sale of assets, distributing returns to shareholders.",
    pros: [
      "Unique access to luxury goods as an investment class",
      "Low minimum investment of $100",
      "Professional authentication and storage included",
    ],
    cons: [
      "Higher fee range (2-5%) compared to competitors",
      "Limited availability for Australian investors",
      "Niche asset class with uncertain long-term returns",
    ],
    bestFor: "Investors interested in luxury goods who understand the niche market dynamics.",
    signupFromAustralia:
      "Konvi has limited availability in Australia. Check their website for current access status. You may need to join a waitlist. When available, standard identity verification is required.",
  },
];

/* ── FAQs ── */
const FAQS = [
  {
    question: "Can Australians use Masterworks?",
    answer:
      "Yes, Australians can use Masterworks by setting up a US-based account. You will need to complete identity verification and may require an Individual Taxpayer Identification Number (ITIN). The sign-up process typically takes 1-2 weeks. All investments are denominated in USD, so you will be exposed to AUD/USD currency fluctuations.",
  },
  {
    question: "What is the best wine investment platform?",
    answer:
      "For beginners, Vinovest offers the best combination of ease of use, managed portfolios, and direct Australian access with a $1,000 minimum. For serious collectors and high-net-worth investors, Cult Wines provides a more personalised service with dedicated account managers, though the $10,000 minimum and performance fees are higher.",
  },
  {
    question: "Are alternative investment platforms regulated in Australia?",
    answer:
      "Most alternative investment platforms operating in the wine, art, and collectibles space are not regulated by ASIC as financial products. Maverix, as an Australian-based platform, operates under Australian business regulations. Platforms like Masterworks are SEC-regulated in the US. Always check a platform's regulatory status and read their terms carefully before investing.",
  },
  {
    question: "What fees do alternative investment platforms charge?",
    answer:
      "Fees vary significantly across platforms. Annual management fees typically range from 0% (Rally) to 2.85% (Vinovest). Some platforms also charge performance fees (e.g., Masterworks takes 20% of profits). Entry and exit fees may apply. Always review the full fee schedule before investing, as these fees directly reduce your net returns.",
  },
  {
    question: "How liquid are alternative investments?",
    answer:
      "Alternative investments are generally less liquid than shares or ETFs. Most platforms offer secondary markets where you can sell your shares before the underlying asset is sold, but there is no guarantee of finding a buyer at your desired price. Hold periods can range from months to several years depending on the asset class and platform.",
  },
];

function renderStarRating(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(empty);
}

export default function AlternativesPlatformsPage() {
  /* ── JSON-LD ── */
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Alternatives", url: absoluteUrl("/invest/alternatives") },
    { name: "Platforms" },
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

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: PAGE_TITLE,
    numberOfItems: PLATFORMS.length,
    itemListElement: PLATFORMS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.name,
      url: absoluteUrl(`/invest/alternatives/platforms#${p.slug}`),
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
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
            <span className="text-slate-700">Platforms</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200/50 rounded-2xl p-4 md:p-6 mb-3 md:mb-4">
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
              {PAGE_TITLE}
            </h1>
            <p className="text-xs md:text-base text-slate-600 mb-2">
              Compare alternative investment platforms side by side. We evaluate each platform on
              fees, minimum investment, asset class coverage, and accessibility for Australian
              investors. Updated {CURRENT_MONTH_YEAR}.
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

          {/* ── Comparison table (desktop) ── */}
          <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4">
            Platform Comparison ({PLATFORMS.length})
          </h2>

          <div className="hidden md:block overflow-x-auto mb-8">
            <ScrollReveal animation="table-row-stagger" as="table" className="w-full border border-slate-200 rounded-lg">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-sm">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Platform</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Asset Class</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Min Investment</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Fees</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">AU Access</th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {PLATFORMS.map((p, i) => (
                  <tr key={p.slug} className={`hover:bg-slate-50 ${i === 0 ? "bg-indigo-50/40" : ""}`}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <a href={`#${p.slug}`} className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                        {p.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm">{p.assetClass}</td>
                    <td className="px-4 py-3 text-sm">{p.minInvestment}</td>
                    <td className="px-4 py-3 text-sm">{p.fees}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={p.australiaAccess.startsWith("Yes") ? "text-emerald-600 font-semibold" : "text-amber-600"}>
                        {p.australiaAccess}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-amber-500">{renderStarRating(p.rating)}</span>
                      <span className="text-sm text-slate-500 ml-1">{p.rating}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ScrollReveal>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3 mb-6">
            {PLATFORMS.map((p, i) => (
              <a
                key={p.slug}
                href={`#${p.slug}`}
                className="block bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                    <span className="font-bold text-slate-900">{p.name}</span>
                  </div>
                  <span className="text-xs text-amber-500">{renderStarRating(p.rating)} {p.rating}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                  <span className="text-slate-400">Asset Class</span>
                  <span>{p.assetClass}</span>
                  <span className="text-slate-400">Minimum</span>
                  <span>{p.minInvestment}</span>
                  <span className="text-slate-400">Fees</span>
                  <span>{p.fees}</span>
                  <span className="text-slate-400">AU Access</span>
                  <span className={p.australiaAccess.startsWith("Yes") ? "text-emerald-600 font-semibold" : "text-amber-600"}>
                    {p.australiaAccess}
                  </span>
                </div>
              </a>
            ))}
          </div>

          {/* ── Detailed platform sections ── */}
          <div className="space-y-8 mb-8 md:mb-10">
            {PLATFORMS.map((p) => (
              <ScrollReveal key={p.slug} animation="scroll-fade-in">
                <section
                  id={p.slug}
                  className="bg-white border border-slate-200 rounded-xl p-4 md:p-6 scroll-mt-20"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                    <span className="text-xs font-medium px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                      {p.assetClass}
                    </span>
                    <span className="text-sm text-amber-500 ml-auto">
                      {renderStarRating(p.rating)} {p.rating}/5
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {p.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Pros */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <h4 className="text-sm font-bold text-emerald-800 mb-2">Pros</h4>
                      <ul className="space-y-1.5">
                        {p.pros.map((pro, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-emerald-600 font-bold mt-0.5 shrink-0">+</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {/* Cons */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <h4 className="text-sm font-bold text-red-800 mb-2">Cons</h4>
                      <ul className="space-y-1.5">
                        {p.cons.map((con, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="text-red-600 font-bold mt-0.5 shrink-0">-</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
                    <p className="text-sm">
                      <strong className="text-slate-800">Best for:</strong>{" "}
                      <span className="text-slate-600">{p.bestFor}</span>
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="text-sm font-bold text-blue-800 mb-1">
                      How to Sign Up from Australia
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {p.signupFromAustralia}
                    </p>
                  </div>
                </section>
              </ScrollReveal>
            ))}
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

          {/* ── Cross-links ── */}
          <div className="bg-slate-50 rounded-xl p-4 md:p-5 mb-6 md:mb-8">
            <h3 className="text-lg font-bold mb-3">Related Pages</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Alternatives Hub", href: "/invest/alternatives" },
                { label: "Browse Listings", href: "/invest/alternatives/listings" },
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
