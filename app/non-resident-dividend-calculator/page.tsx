import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import NonResidentDividendClient from "./NonResidentDividendClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Non-Resident Australian Dividend Calculator (${CURRENT_YEAR}) — Withholding Tax & Franking`,
  description:
    "Calculate the net cash on an Australian fully/partially/unfranked dividend as a non-resident. Includes DTA withholding rates for major jurisdictions.",
  alternates: { canonical: "/non-resident-dividend-calculator" },
  openGraph: {
    title: `Non-Resident Dividend Calculator (${CURRENT_YEAR})`,
    description:
      "Australian dividend withholding tax and DTA-reduced rates for non-resident investors in ASX shares.",
    url: absoluteUrl("/non-resident-dividend-calculator"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Non-Resident Dividend Tax Calculator")}&sub=${encodeURIComponent("Withholding Tax · DTA · Franking Credits · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const softwareLd = calculatorJsonLd({
  name: "Non-Resident Dividend Calculator",
  description:
    "Calculate withholding tax and final cash dividends for non-residents receiving Australian share distributions.",
  path: "/non-resident-dividend-calculator",
});

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Foreign Investment", url: absoluteUrl("/foreign-investment") },
  {
    name: "Non-Resident Dividend Calculator",
    url: absoluteUrl("/non-resident-dividend-calculator"),
  },
]);

const nonResDivFaqLd = faqJsonLd([
  {
    q: "What withholding tax rate applies to Australian dividends for non-residents?",
    a: "The standard Australian withholding tax rate on unfranked dividends paid to non-residents is 30%. This is reduced by Double Tax Agreements (DTAs) for residents of treaty countries — typically to 15% for most countries, or to 0% on fully franked dividends because the underlying company tax has already been paid.",
  },
  {
    q: "Do non-residents receive franking credits on Australian dividends?",
    a: "Non-residents do not receive cash refunds of franking credits. However, fully franked dividends are generally exempt from withholding tax because the company has already paid tax at the 30% corporate rate. Partially franked dividends have withholding tax applied only to the unfranked portion, reduced by any applicable DTA rate.",
  },
  {
    q: "Which countries have Double Tax Agreements (DTAs) with Australia?",
    a: "Australia has DTAs with over 40 countries including the United Kingdom, United States, Canada, Japan, New Zealand, Germany, Singapore, Hong Kong, and all major European Union countries. The DTA typically reduces withholding tax on dividends from 30% to 15%, though specific rates vary by treaty.",
  },
  {
    q: "How do I declare Australian dividends as a non-resident?",
    a: "Your Australian broker or share registry will automatically withhold the applicable tax before paying dividends. You receive the net amount and a dividend statement showing gross dividend, franking credit, and withholding tax. You may need to declare this income in your home country, potentially claiming a foreign tax credit for Australian tax withheld.",
  },
]);


function Loading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-4 w-48 bg-slate-100 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function NonResidentDividendCalculatorPage() {
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(nonResDivFaqLd) }}
      />
      <Suspense fallback={<Loading />}>
        <NonResidentDividendClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
