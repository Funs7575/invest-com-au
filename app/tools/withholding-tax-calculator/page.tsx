import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";
import WithholdingTaxClient from "./WithholdingTaxClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Australian Withholding Tax Calculator (${CURRENT_YEAR}) — DTA Rates by Country`,
  description:
    "Calculate the Australian withholding tax on dividends, interest, and royalties for non-residents. Includes DTA-reduced rates for 19 countries with live data from our foreign-investment rates database.",
  alternates: { canonical: "/tools/withholding-tax-calculator" },
  openGraph: {
    title: `Australian Withholding Tax Calculator (${CURRENT_YEAR})`,
    description:
      "DTA-reduced withholding rates on Australian dividends, interest, and royalties by country.",
    url: absoluteUrl("/tools/withholding-tax-calculator"),
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `Withholding Tax Calculator — ${SITE_NAME}`,
  description:
    "Free DTA withholding-rate lookup for non-resident investors in Australian shares, bonds, and royalty streams.",
  url: absoluteUrl("/tools/withholding-tax-calculator"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  {
    name: "Withholding Tax Calculator",
    url: absoluteUrl("/tools/withholding-tax-calculator"),
  },
]);

function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-6 w-64 bg-slate-100 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-80 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function WithholdingTaxCalculatorPage() {
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
        <WithholdingTaxClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
