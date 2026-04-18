import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";
import NonResidentDividendClient from "./NonResidentDividendClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Non-Resident Australian Dividend Calculator (${CURRENT_YEAR}) — Withholding Tax & Franking`,
  description:
    "Calculate the final cash you receive on an Australian fully/partially/unfranked dividend as a non-resident. Includes Double Tax Agreement rates for major jurisdictions.",
  alternates: { canonical: "/non-resident-dividend-calculator" },
  openGraph: {
    title: `Non-Resident Dividend Calculator (${CURRENT_YEAR})`,
    description:
      "Australian dividend withholding tax and DTA-reduced rates for non-resident investors in ASX shares.",
    url: absoluteUrl("/non-resident-dividend-calculator"),
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `Non-Resident Dividend Calculator — ${SITE_NAME}`,
  description:
    "Calculate withholding tax and final cash dividends for non-residents receiving Australian share distributions.",
  url: absoluteUrl("/non-resident-dividend-calculator"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Foreign Investment", url: absoluteUrl("/foreign-investment") },
  {
    name: "Non-Resident Dividend Calculator",
    url: absoluteUrl("/non-resident-dividend-calculator"),
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
      <Suspense fallback={<Loading />}>
        <NonResidentDividendClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
