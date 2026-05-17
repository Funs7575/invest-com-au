import { Suspense } from "react";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { INSURANCE_ONBOARDING_CONFIG } from "@/lib/hub-onboarding-configs";
import HubOnboardingShell from "@/components/HubOnboardingShell";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "What Insurance Do I Need? — Insurance Diagnostic Quiz | Invest.com.au",
  description:
    "Answer 3 quick questions to find out which insurance cover is most important for your situation — life, income protection, health, or home and contents.",
  alternates: { canonical: `${SITE_URL}/insurance/quiz` },
  openGraph: {
    title: "What Insurance Do I Need?",
    description:
      "3-question diagnostic quiz to identify the right insurance cover for your life situation.",
    url: `${SITE_URL}/insurance/quiz`,
  },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Insurance", url: `${SITE_URL}/insurance` },
  { name: "Insurance Diagnostic Quiz" },
]);

export default function InsuranceQuizPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <HubOnboardingShell config={INSURANCE_ONBOARDING_CONFIG} />
      </Suspense>
    </>
  );
}
