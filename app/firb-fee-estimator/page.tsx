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
    "Estimate the Australian FIRB application fee for residential, commercial, agricultural, business, or critical-infrastructure acquisitions. Based on the Treasury fee schedule.",
  alternates: { canonical: "/firb-fee-estimator" },
  openGraph: {
    title: `FIRB Application Fee Estimator (${CURRENT_YEAR})`,
    description:
      "Indicative Australian FIRB application fee based on asset class, transaction value, and investor type.",
    url: absoluteUrl("/firb-fee-estimator"),
  },
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

const faqLd = faqJsonLd([
  {
    q: "Who needs FIRB approval to buy property in Australia?",
    a: "Foreign persons — including non-residents, temporary visa holders, and foreign-controlled companies — generally need FIRB approval before acquiring an interest in Australian residential or agricultural land, or certain businesses and sensitive sectors. Australian citizens and permanent residents living overseas may also need approval in some circumstances.",
  },
  {
    q: "How much does FIRB approval cost?",
    a: "The FIRB application fee is set by the Federal Government and is based on the value of the proposed acquisition and the asset type (residential, commercial, agricultural, or business). For residential property, fees start at $4,200 for properties valued under $75,000 and scale up to over $1 million for properties valued above $40 million. This estimator calculates an indicative fee based on the published Treasury schedule.",
  },
  {
    q: "What is a foreign person under Australian FIRB rules?",
    a: "Under the Foreign Acquisitions and Takeovers Act 1975, a 'foreign person' includes any individual who is not an Australian citizen or permanent resident, a foreign government or foreign government investor, and a corporation or trust in which foreign persons hold a 20% or more interest (or combined 40%+ for multiple foreign persons).",
  },
  {
    q: "Can a temporary resident buy property in Australia?",
    a: "Temporary residents (those holding a temporary visa that permits continuous stay of at least 12 months) can generally buy one established dwelling to use as their principal place of residence, with FIRB approval. They cannot buy investment properties or vacant land unless they intend to build a new dwelling. The property must be sold when the temporary visa expires.",
  },
  {
    q: "Are FIRB fees refundable if the application is rejected?",
    a: "No. FIRB application fees are non-refundable regardless of the outcome. The fee covers the cost of assessing the application, not approval itself. It is important to seek legal advice before lodging an application to assess the likelihood of approval and any conditions that may apply.",
  },
  {
    q: "What happens if you buy property without FIRB approval?",
    a: "Buying Australian property without required FIRB approval is a serious offence. Penalties include forced divestiture orders (being required to sell the property, often within 12 months), civil pecuniary penalties of up to $330,000 for individuals, and criminal penalties. Foreign investors should always confirm their approval requirements before exchanging contracts.",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
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
