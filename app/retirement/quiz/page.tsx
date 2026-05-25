import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import { RETIREMENT_ONBOARDING_CONFIG } from "@/lib/hub-onboarding-configs";
import HubOnboardingShell from "@/components/HubOnboardingShell";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

export const metadata: Metadata = {
  title:
    "Retirement Readiness Diagnostic — Free 3-Question Assessment | Invest.com.au",
  description:
    "Answer 3 quick questions to get a personalised retirement strategy — drawdown, Age Pension eligibility, annuity options, and TTR planning. Free, instant, no login required.",
  alternates: { canonical: `${SITE_URL}/retirement/quiz` },
  openGraph: {
    title: "Retirement Readiness Diagnostic | Invest.com.au",
    description:
      "3-question personalised retirement income strategy. Covers drawdown, Age Pension means test, annuities, and TTR planning.",
    url: `${SITE_URL}/retirement/quiz`,
  },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Retirement Planning", url: `${SITE_URL}/retirement` },
  { name: "Retirement Readiness Diagnostic" },
]);

export default function RetirementQuizPage() {
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
        <HubOnboardingShell config={RETIREMENT_ONBOARDING_CONFIG} />
      </Suspense>
      <ComplianceFooter className="mt-8 mx-4" />
    </>
  );
}
