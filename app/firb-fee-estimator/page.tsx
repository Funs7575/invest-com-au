import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import CalcToPlanBridge from "@/components/get-matched/CalcToPlanBridge";
import FirbFeeEstimatorClient from "./FirbFeeEstimatorClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `FIRB Application Fee Estimator (${CURRENT_YEAR}) — Foreign Investment Australia`,
  description:
    "Estimate your FIRB application fee by asset class and deal value: residential, commercial, agribusiness, or critical infrastructure. Uses Treasury rates.",
  alternates: { canonical: "/firb-fee-estimator" },
  openGraph: {
    title: `FIRB Application Fee Estimator (${CURRENT_YEAR})`,
    description:
      "Indicative Australian FIRB application fee based on asset class, transaction value, and investor type.",
    url: absoluteUrl("/firb-fee-estimator"),
    images: [{ url: `/api/og?title=${encodeURIComponent("FIRB Fee Estimator")}&sub=${encodeURIComponent("Calculate Application Fee · Property · Business · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `FIRB Fee Estimator — ${SITE_NAME}`,
  description:
    "Free Australian FIRB application fee estimator based on the published Treasury fee schedule.",
  url: absoluteUrl("/firb-fee-estimator"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Foreign Investment", url: absoluteUrl("/foreign-investment") },
  { name: "FIRB Fee Estimator", url: absoluteUrl("/firb-fee-estimator") },
]);

const firbFaqLd = faqJsonLd([
  {
    q: "Who needs to apply to FIRB?",
    a: "Foreign persons (including temporary residents) must apply to the Foreign Investment Review Board (FIRB) before acquiring an interest in Australian residential real estate, agricultural land above certain thresholds, or sensitive national security businesses. Temporary residents generally need FIRB approval to buy residential property (except a principal place of residence for their own use).",
  },
  {
    q: "How much does a FIRB application cost?",
    a: "FIRB application fees are set by the Australian Treasury based on the type and value of the acquisition. For residential property, fees start at $4,200 for properties valued under $75,000 and scale to $272,400 for properties valued at $10 million or more. Commercial, agricultural, and business acquisitions follow different fee schedules.",
  },
  {
    q: "How long does FIRB approval take?",
    a: "The standard FIRB review period is 30 days, but the government can extend this by up to 90 days by issuing an interim order. In practice, most straightforward residential applications are decided within 30 days. Complex commercial or national security reviews can take significantly longer.",
  },
  {
    q: "Are there exemptions from FIRB approval?",
    a: "Yes. Australian citizens, permanent residents, and New Zealand citizens are generally exempt. Acquisitions through an Australian company or trust where no foreign person holds more than 20% are often exempt. Certain low-value commercial acquisitions below thresholds (the commercial land threshold is $330 million for most countries, $1.339 billion for FTA partners) are also exempt.",
  },
  {
    q: "What happens if you buy property without FIRB approval?",
    a: "Acquiring property without required FIRB approval is a criminal offence. The Australian government can order the sale of the property, impose civil penalties up to $157,500 for individuals, and pursue criminal prosecution. In practice, enforcement focuses on high-value or politically sensitive cases, but the risk of forced disposal is real.",
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

export default function FirbFeeEstimatorPage() {
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(firbFaqLd) }}
      />
      <Suspense fallback={<Loading />}>
        <FirbFeeEstimatorClient />
      </Suspense>
      <div className="container-custom pb-8">
        <CalcToPlanBridge
          goal="foreign_investor"
          headline="Ready to make your move on Australian property?"
          subtitle="Answer 5-7 quick questions — we'll match you with verified Pro Squads (FIRB lawyers + tax + buyer's agents)."
        />
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
