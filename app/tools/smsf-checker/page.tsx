import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import SmsfCheckerClient from "./SmsfCheckerClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `SMSF Eligibility Checker (${CURRENT_YEAR}) — Collectibles, Property & Crypto in Super`,
  description:
    "Check whether an asset class can be held inside your self-managed super fund. Covers SISA s62A collectables rules, related-party acquisitions, in-house assets, LRBA constraints, and storage / insurance requirements.",
  alternates: { canonical: "/tools/smsf-checker" },
  openGraph: {
    title: `SMSF Eligibility Checker (${CURRENT_YEAR})`,
    description:
      "Step-by-step checker for whether residential property, shares, collectables, crypto or business real property can sit inside an SMSF.",
    url: absoluteUrl("/tools/smsf-checker"),
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `SMSF Eligibility Checker — ${SITE_NAME}`,
  description:
    "Interactive screening tool covering the main SISA constraints on SMSF investments — collectables, related-party acquisitions, LRBAs and personal-use rules.",
  url: absoluteUrl("/tools/smsf-checker"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  {
    name: "SMSF Eligibility Checker",
    url: absoluteUrl("/tools/smsf-checker"),
  },
]);

const smsfFaqLd = faqJsonLd([
  {
    q: "What assets can an SMSF hold in Australia?",
    a: "An SMSF can hold most investment assets: ASX-listed shares and ETFs, unlisted shares (with restrictions), residential property (but NOT purchased from a related party and cannot be lived in or rented by members/relatives), commercial property (which CAN be leased to a related party at market rent), managed funds, cash deposits, bonds, crypto assets (as speculative assets under an investment strategy), art and collectables (with strict storage/insurance/usage rules). The sole purpose test (SISA s62) is the overarching filter — every asset must be held for the purpose of providing retirement benefits.",
  },
  {
    q: "Can an SMSF buy residential property?",
    a: "Yes, with strict conditions: it must be bought at arm's length (not from a member or related party), no member or related party can live in or holiday in the property, and it must be managed as a genuine investment. The SMSF can borrow to buy residential property via a Limited Recourse Borrowing Arrangement (LRBA) — but the property must be held in a bare trust until the loan is repaid. Financial advice is strongly recommended before this strategy.",
  },
  {
    q: "What are collectables rules for SMSFs?",
    a: "Since 1 July 2011, collectables and personal-use assets (artwork, jewellery, antiques, coins, wine, stamps, etc.) held in an SMSF must be stored in a location not used or accessible to any member or related party, insured in the SMSF's name within 7 days of acquisition, not leased to related parties, and valued by an independent qualified valuer before any disposal. The rules are designed to prevent members personally enjoying SMSF assets before retirement.",
  },
  {
    q: "What is a related-party acquisition restriction in an SMSF?",
    a: "Under SISA s66, an SMSF generally cannot acquire assets from members or related parties. The main exceptions are: listed shares and units at market price; business real property (commercial/industrial property used wholly in a business) at market value; certain in-house assets within the 5% rule. Residential property from a related party is prohibited — an SMSF trustee cannot buy the family home from a member, even at market price.",
  },
  {
    q: "What is an in-house asset and what is the SMSF limit?",
    a: "An in-house asset is a loan to, investment in, or lease with a related party of the SMSF. The limit is 5% of the fund's total assets at market value. If the in-house asset ratio breaches 5% (e.g. due to market movements), the trustee must prepare a written plan to reduce the ratio to below 5% and execute it. Business real property leased to a related party at arm's length rent is NOT an in-house asset — it's the main carve-out that makes SMSF commercial property viable for small-business owners.",
  },
]);

function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function SmsfCheckerPage() {
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(smsfFaqLd) }}
      />
      <Suspense fallback={<Loading />}>
        <SmsfCheckerClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
