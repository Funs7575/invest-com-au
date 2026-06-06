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
import AlternativesPlatformsClient, {
  type AlternativePlatform,
} from "@/components/alternatives/AlternativesPlatformsClient";

export const revalidate = 3600;

const PAGE_TITLE = `Best Alternative Investment Platforms in Australia (${CURRENT_YEAR})`;
const PAGE_DESCRIPTION =
  "Compare the best alternative investment platforms available to Australians. Side-by-side comparison of fees, minimums, asset classes, and Australian access for wine, art, watches, and collectibles platforms.";
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

/* ── Platform data (static — curator-managed) ───────────────────────────── */
// These are well-researched, factually accurate descriptions. No affiliate
// links here — all navigation is factual comparison only (AFSL-safe).
const PLATFORMS: AlternativePlatform[] = [
  {
    name: "Vinovest",
    slug: "vinovest",
    assetClass: "Wine",
    minInvestmentAud: 1600, // ~$1,000 USD
    minInvestment: "$1,000 USD",
    fees: "2.85% p.a.",
    australianDirect: true,
    australiaAccess: "Direct (AU)",
    rating: 4.2,
    description:
      "Vinovest is an AI-powered wine investment platform that purchases, authenticates, stores, and insures fine wine on your behalf. The platform offers both managed portfolios and a self-directed trading marketplace for experienced wine investors. Vinovest's proprietary algorithm selects investment-grade wines with high appreciation potential based on critic scores, historical price trends, and production rarity.",
    pros: [
      "Fully managed portfolio option with AI-driven wine selection",
      "Professional bonded warehouse storage and insurance included",
      "Strong historical track record — portfolio wines average 13%+ annualised returns",
      "Direct Australian access — no US account required",
    ],
    cons: [
      "2.85% annual management fee reduces net returns",
      "~$1,000 USD minimum may exclude very early-stage investors",
      "Liquidity depends on secondary market demand — not instant",
      "USD-denominated — exposed to AUD/USD currency fluctuation",
    ],
    bestFor: "Beginners who want hands-off wine investing with professional management and direct Australian access.",
    signupFromAustralia:
      "Australians can sign up directly via the Vinovest website. No US account is required. Bank transfers in AUD are accepted (converted to USD at market rates on deposit). Identity verification via Australian passport or licence.",
  },
  {
    name: "Cult Wines",
    slug: "cult-wines",
    assetClass: "Wine",
    minInvestmentAud: 16000, // ~$10,000 USD
    minInvestment: "$10,000 USD",
    fees: "2.5% p.a. + performance",
    australianDirect: true,
    australiaAccess: "Direct (AU)",
    rating: 4.0,
    description:
      "Cult Wines is a global fine wine investment specialist with over 20 years of experience and a dedicated Sydney office serving Australian clients. They offer bespoke portfolio management, professional storage in London City Bond and other top-tier facilities, and an active trading network. Their team of MW-qualified wine experts curates investment-grade Bordeaux, Burgundy, and Champagne portfolios.",
    pros: [
      "20+ years of track record in fine wine investment with transparent performance data",
      "Dedicated account managers for white-glove personalised service",
      "Extensive global trading network — not just platform-to-platform liquidity",
      "Sydney office — direct Australian client support",
    ],
    cons: [
      "High $10,000 USD minimum investment limits entry",
      "Performance fees (typically 10–15% above hurdle) reduce upside",
      "Fee structure is more complex than simpler platforms",
    ],
    bestFor: "Serious wine collectors and high-net-worth investors wanting bespoke service and expert curation.",
    signupFromAustralia:
      "Cult Wines accepts Australian clients directly through their Sydney office or website. AUD deposits accepted. Contact their Sydney team or complete the online onboarding. Standard KYC required (passport and proof of address).",
  },
  {
    name: "Masterworks",
    slug: "masterworks",
    assetClass: "Art",
    minInvestmentAud: 780, // ~$500 USD
    minInvestment: "$500 USD",
    fees: "1.5% p.a. + 20% profit",
    australianDirect: false,
    australiaAccess: "Via US account",
    rating: 4.3,
    description:
      "Masterworks is the leading fractional contemporary art investment platform, allowing investors to buy shares in individual blue-chip paintings by artists including Banksy, Basquiat, Warhol, and Monet. Each artwork is securitised as an SEC-qualified offering. Investors can trade shares on Masterworks' secondary market before the artwork is sold. Masterworks has completed 23+ exits with an average net return of ~17.8% per annum on exited paintings.",
    pros: [
      "Access to blue-chip art that typically requires millions to purchase outright",
      "SEC-qualified offerings provide US regulatory oversight and disclosure",
      "Active secondary market allows trading before sale event",
      "Strong exit track record — 23+ completed sales with positive returns",
    ],
    cons: [
      "Requires US account setup — adds friction and time (1–2 weeks)",
      "20% profit share significantly reduces gross returns",
      "Individual artwork risk — each painting is a concentrated position",
      "USD-only — full AUD/USD currency exposure",
    ],
    bestFor: "Investors seeking exposure to the contemporary art market willing to set up a US account.",
    signupFromAustralia:
      "Australians can sign up directly on the Masterworks website or app. You will need to complete identity verification (passport or licence) and may need to provide W-8BEN documentation. No US address or ITIN required for non-US persons, though the process takes 1–2 weeks. All transactions are in USD.",
  },
  {
    name: "Maverix",
    slug: "maverix",
    assetClass: "Fractional (mixed)",
    minInvestmentAud: 50,
    minInvestment: "$50",
    fees: "0–2% (varies)",
    australianDirect: true,
    australiaAccess: "Direct (AU)",
    rating: 3.8,
    description:
      "Maverix is an Australian-based fractional alternative investment platform offering AUD-denominated access to wine, whisky, and luxury goods at very low minimums. As a local platform, there is no currency conversion, no overseas account setup, and all assets are held and insured in Australia or in secure international facilities with Australian regulatory oversight. Maverix is suited to investors wanting to dip a toe into alternatives without large capital commitments.",
    pros: [
      "100% Australian-based — AUD-denominated, no currency risk",
      "Ultra-low $50 minimum — accessible to all income levels",
      "Diversified across multiple alternative asset classes",
      "No overseas account required — straightforward Australian onboarding",
    ],
    cons: [
      "Relatively young platform with a shorter performance track record",
      "Smaller selection of individual assets vs global specialists",
      "Secondary market liquidity still developing — harder to exit quickly",
    ],
    bestFor: "Australian beginners wanting low-minimum AUD entry to diversified alternatives without overseas complexity.",
    signupFromAustralia:
      "Maverix is Australian. Sign up directly on their website with standard Australian ID verification (driver's licence or passport). Deposit via bank transfer or debit card in AUD. No currency conversion, no US account, no ITIN needed.",
  },
  {
    name: "Rally",
    slug: "rally",
    assetClass: "Collectibles",
    minInvestmentAud: 16, // ~$10 USD
    minInvestment: "$10 USD",
    fees: "0% ongoing (exit only)",
    australianDirect: false,
    australiaAccess: "Via US account",
    rating: 3.5,
    description:
      "Rally (formerly Rally Rd.) is a fractional investment platform for collectibles including classic cars, rare books, sports memorabilia, vintage watches, and historic manuscripts. Assets are professionally sourced, vaulted, and insured. Investors buy equity shares during timed initial offerings (ISOs) and can trade on Rally's secondary market during trading windows. The low $10 USD minimum and zero ongoing fees make it accessible for experimental allocations.",
    pros: [
      "Ultra-low $10 USD minimum makes collectible investing accessible for experimentation",
      "Zero ongoing management fees — cost is only at exit",
      "Curated selection of rare and culturally significant collectibles",
      "Strong authentication and vaulting standards",
    ],
    cons: [
      "Requires non-Australian account setup (US-accessible)",
      "Secondary market trading windows are restricted — limited liquidity",
      "No physical possession of assets",
      "USD-denominated — AUD/USD currency exposure",
    ],
    bestFor: "Hobbyist investors interested in collectibles wanting very low-cost experimental exposure.",
    signupFromAustralia:
      "Australians can sign up via the Rally app or website without a US address. Standard international identity verification is required. Some users report needing a US phone number — this can be worked around with a virtual number. Transactions are in USD.",
  },
  {
    name: "Konvi",
    slug: "konvi",
    assetClass: "Luxury goods",
    minInvestmentAud: 160, // ~$100 USD
    minInvestment: "~$100",
    fees: "2–5% (varies)",
    australianDirect: false,
    australiaAccess: "Limited",
    rating: 3.2,
    description:
      "Konvi is a fractional luxury goods investment platform offering shares in high-end items including designer handbags (Hermès Birkin), rare sneakers, and luxury watches. The platform handles authentication, storage, and eventual sale, distributing returns to shareholders. Konvi targets the rapidly growing pre-owned luxury market where scarcity has driven strong capital appreciation for top-tier items.",
    pros: [
      "Unique access to Hermès Birkins and other scarcity-driven luxury assets",
      "Professional authentication and insured vaulting",
      "Lower minimum than buying individual luxury items outright",
    ],
    cons: [
      "Higher fee range (2–5%) compared to many competitors",
      "Limited or waitlisted availability for Australian investors",
      "Niche asset class with uncertain long-term return consistency",
      "Less regulatory oversight than AU-based alternatives",
    ],
    bestFor: "Investors interested in the luxury goods market who understand niche market dynamics and accept limited AU availability.",
    signupFromAustralia:
      "Konvi has limited availability for Australian investors — check their website for current access status. A waitlist may apply. When available, standard international identity verification is required. Confirm current AUD/local currency options directly with Konvi before proceeding.",
  },
];

/* ── FAQs ─────────────────────────────────────────────────────────────────── */
const FAQS = [
  {
    question: "Can Australians use Masterworks?",
    answer:
      "Yes, Australians can use Masterworks without a US address or tax ID number (ITIN). You need to complete Masterworks' standard international identity verification. The sign-up process typically takes 1–2 weeks. All investments are denominated in USD, so you have full AUD/USD currency exposure. Masterworks has paid out to Australian investors on completed artwork exits.",
  },
  {
    question: "What is the best wine investment platform for Australians?",
    answer:
      "For beginners seeking direct Australian access and simplicity, Vinovest offers managed portfolios with a ~$1,000 USD minimum and AUD deposits. For serious wine investors wanting white-glove service, Cult Wines has a Sydney office and an established track record. For ultra-low entry, Australian platform Maverix includes wine among its mixed asset classes from just $50 AUD.",
  },
  {
    question: "Are alternative investment platforms regulated in Australia?",
    answer:
      "Most alternative investment platforms operating in wine, art, and collectibles are NOT regulated by ASIC as financial products. Wine and art are generally not financial products under the Corporations Act 2001. Some fractional or tokenised offerings may fall under ASIC regulation depending on their structure. Maverix, as an Australian business, operates under Australian commercial regulations. Masterworks is SEC-regulated in the US. Always verify a platform's regulatory status before investing.",
  },
  {
    question: "What fees do alternative investment platforms charge?",
    answer:
      "Fees vary significantly. Annual management fees range from 0% (Rally — cost is at exit only) to 2.85% p.a. (Vinovest). Performance fees can significantly reduce returns — Masterworks takes 20% of profits above their 8% hurdle. Always model the total cost of ownership including management fees, performance fees, storage, insurance, and transaction costs to compare net returns fairly.",
  },
  {
    question: "How liquid are alternative investments?",
    answer:
      "Alternative investments are significantly less liquid than ASX shares or ETFs. Most platforms offer secondary markets where you can sell your position before the underlying asset is sold, but there is no guarantee of finding a buyer at your desired price. Fine wine and art typically require 2–7 year hold periods to realise appreciation. Rally restricts secondary market trading to specific windows. Always hold alternatives only with capital you will not need in the short to medium term.",
  },
  {
    question: "Can I hold alternative investments in my SMSF?",
    answer:
      "Yes, but with strict ATO requirements. SMSF collectibles (wine, art, coins, cars, etc.) must be insured in the fund's name, stored at arm's length under a documented arrangement, not displayed in a member's residence or business, not used personally by any member or related party, and storage arrangements must be reviewed by trustees at least annually. Breaches can result in significant penalties.",
  },
];

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function AlternativesPlatformsPage() {
  const vertical = getVerticalBySlug("alternatives");

  /* JSON-LD */
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Alternatives", url: absoluteUrl("/invest/alternatives") },
    { name: "Compare Platforms" },
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

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: PAGE_TITLE,
    numberOfItems: PLATFORMS.length,
    publisher: ORGANIZATION_JSONLD,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/invest" className="hover:text-slate-900">Invest</Link>
            <span className="mx-2">/</span>
            <Link href="/invest/alternatives" className="hover:text-slate-900">Alternatives</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Compare Platforms</span>
          </nav>

          {/* Hero */}
          <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200/50 rounded-2xl p-4 md:p-6 mb-3 md:mb-4">
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
              {PAGE_TITLE}
            </h1>
            <p className="text-xs md:text-base text-slate-600 mb-2">
              Compare alternative investment platforms side by side. We evaluate each platform on fees,
              minimum investment, asset class coverage, and direct accessibility for Australian investors.
              Updated {CURRENT_MONTH_YEAR}.
            </p>
            <p className="text-[0.56rem] md:text-xs text-slate-500">{ADVERTISER_DISCLOSURE_SHORT}</p>
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-6 pb-4 border-b border-slate-100">
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

          {/* ── Interactive directory (client component) ── */}
          <h2 className="text-lg md:text-2xl font-bold mb-3">
            Platform Comparison — {PLATFORMS.length} Platforms
          </h2>
          <AlternativesPlatformsClient platforms={PLATFORMS} />

          {/* ── FAQ section ── */}
          <div id="faq" className="mb-10 scroll-mt-20 mt-8">
            <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <details key={i} className="border border-slate-200 rounded-lg">
                  <summary className="px-4 py-3 font-semibold text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                    {faq.question}
                  </summary>
                  <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
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
                { label: "Property Platforms", href: "/property-platforms" },
                { label: "SMSF Hub", href: "/smsf" },
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
