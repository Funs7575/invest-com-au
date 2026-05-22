import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import AlternativeReturnsClient from "./AlternativeReturnsClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Alternative Asset Returns Calculator (${CURRENT_YEAR}) — Watches, Cars, Wine, ASX, Property`,
  description:
    "Estimate what an investment in luxury watches, classic cars, fine wine, ASX 200 or Australian residential property would be worth today. Compare alternative-asset index returns side by side, using historical annualised averages.",
  alternates: { canonical: "/tools/alternative-returns" },
  openGraph: {
    title: `Alternative Asset Returns Calculator (${CURRENT_YEAR})`,
    description:
      "Compare luxury watch, classic car, fine wine, ASX 200 and Australian property returns from a chosen purchase year.",
    url: absoluteUrl("/tools/alternative-returns"),
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `Alternative Asset Returns Calculator — ${SITE_NAME}`,
  description:
    "Free historical-index calculator for luxury watches, classic cars, fine wine, ASX 200 shares and Australian residential property.",
  url: absoluteUrl("/tools/alternative-returns"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  {
    name: "Alternative Asset Returns Calculator",
    url: absoluteUrl("/tools/alternative-returns"),
  },
]);

const altReturnsFaqLd = faqJsonLd([
  {
    q: "Are luxury watches a good investment in Australia?",
    a: "Luxury watches (particularly Rolex, Patek Philippe, and AP) produced strong annualised returns of ~8-12% over 2005-2022, driven by supply constraints and global demand. However, returns have corrected sharply since late 2022 as the secondary market softened. As an alternative asset, watches lack dividends, carry storage/insurance costs, and are highly illiquid — they suit collectors who also enjoy ownership, not purely financial investors.",
  },
  {
    q: "How do classic car returns compare to Australian shares?",
    a: "The Hagerty Price Guide and Knight Frank Luxury Investment Index suggest classic cars have averaged 6-10% p.a. over the long run, broadly comparable to ASX equities but with far less liquidity and much higher holding costs (storage, insurance, maintenance, restoration). Returns are concentrated in trophy models (Ferrari 250, Porsche 911 Carrera RS) — the average collector car appreciates far less. Unlike shares, cars cannot be partially sold.",
  },
  {
    q: "What is the Liv-ex Fine Wine Index?",
    a: "The Liv-ex Fine Wine 100 is the industry benchmark for Bordeaux first-growth and super-second wine investment returns. It showed impressive gains in 2021-22 but has pulled back. Fine wine offers some inflation-hedging qualities, but has high entry costs (professional storage in bond is mandatory for investment-grade wine), poor liquidity, and significant counterparty risk from fake bottles. In Australia, direct wine investment is accessible via platforms like Cult Wines.",
  },
  {
    q: "Are alternative assets counted as investments for super?",
    a: "Inside an SMSF, collectables and personal-use assets (including classic cars, watches, wine, art) can be held but are subject to strict ATO rules: they must be stored separately from any member's use, insured in the SMSF's name within 7 days, not leased to members, and valued by an independent qualified valuer. The asset must genuinely be held for retirement benefit — not for personal enjoyment. Break these rules and the fund faces Non-Arm's Length Income (NALI) tax at 45%.",
  },
  {
    q: "How does Australian residential property compare to shares long term?",
    a: "Over the last 30 years, Australian residential property and the ASX All Ordinaries have both delivered roughly 7-9% total returns per annum (capital growth + rental yield / dividends). Property has been less volatile year-to-year but is highly illiquid, geographically concentrated, and requires significant leverage to achieve meaningful exposure. Shares offer easier diversification, lower transaction costs, and better liquidity. Both asset classes beat cash and bonds over long horizons.",
  },
]);

function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom max-w-5xl">
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-72 bg-slate-100 rounded-xl" />
          <div className="h-72 bg-slate-100 rounded-xl" />
          <div className="h-72 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function AlternativeReturnsCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(altReturnsFaqLd) }}
      />
      <Suspense fallback={<Loading />}>
        <AlternativeReturnsClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
