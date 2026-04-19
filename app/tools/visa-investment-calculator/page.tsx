import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";
import VisaCalculatorClient from "./VisaCalculatorClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Australian Investor Visa Calculator (${CURRENT_YEAR}) — Business 188, SIV, Premium Investor, Global Talent`,
  description:
    "Compare Australian investor visa pathways: Business Innovation (188A), Investor (188B), Significant Investor (188C), Premium Investor, and Global Talent. Investment thresholds, stay requirements, and pathway to permanent residency.",
  alternates: { canonical: "/tools/visa-investment-calculator" },
  openGraph: {
    title: `Australian Investor Visa Calculator (${CURRENT_YEAR})`,
    description:
      "Side-by-side Business Innovation, SIV, Premium Investor and Global Talent visa pathways.",
    url: absoluteUrl("/tools/visa-investment-calculator"),
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `Australian Investor Visa Calculator — ${SITE_NAME}`,
  description:
    "Interactive side-by-side comparison of Australia's business and investor visa pathways with investment thresholds and stay requirements.",
  url: absoluteUrl("/tools/visa-investment-calculator"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  {
    name: "Visa Investment Calculator",
    url: absoluteUrl("/tools/visa-investment-calculator"),
  },
]);

function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom max-w-5xl">
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-80 bg-slate-100 rounded-xl" />
          <div className="h-80 bg-slate-100 rounded-xl" />
          <div className="h-80 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function VisaInvestmentCalculatorPage() {
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
        <VisaCalculatorClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="default" />
      </div>
    </>
  );
}
