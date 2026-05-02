import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
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
      <Suspense fallback={<Loading />}>
        <AlternativeReturnsClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
