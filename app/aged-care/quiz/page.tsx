import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import { AGED_CARE_ONBOARDING_CONFIG } from "@/lib/hub-onboarding-configs";
import HubOnboardingShell from "@/components/HubOnboardingShell";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

export const metadata: Metadata = {
  title:
    "Aged Care Funding Diagnostic — Free 3-Question Assessment | Invest.com.au",
  description:
    "Answer 3 quick questions to understand your aged care funding situation — home care packages, residential costs, RAD/DAP, means testing, and reverse mortgages explained. Free, instant, no login required.",
  alternates: { canonical: `${SITE_URL}/aged-care/quiz` },
  openGraph: {
    title: "Aged Care Funding Diagnostic | Invest.com.au",
    description:
      "3-question aged care funding assessment. Covers home care packages, residential care costs, RAD/DAP, and reverse mortgages.",
    url: `${SITE_URL}/aged-care/quiz`,
  },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Aged Care", url: `${SITE_URL}/aged-care` },
  { name: "Aged Care Funding Diagnostic" },
]);

export default function AgedCareQuizPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <Suspense
        fallback={
          <div className="py-16 text-center animate-pulse">
            <div className="h-8 w-48 bg-slate-200 rounded mx-auto" />
          </div>
        }
      >
        <HubOnboardingShell config={AGED_CARE_ONBOARDING_CONFIG} />
      </Suspense>
      <ComplianceFooter className="mt-8 mx-4" />
    </>
  );
}
