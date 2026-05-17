import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import { SMSF_ONBOARDING_CONFIG } from "@/lib/hub-onboarding-configs";
import HubOnboardingShell from "@/components/HubOnboardingShell";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Is an SMSF Right for You? Free 3-Question Diagnostic | Invest.com.au",
  description:
    "Answer 3 quick questions to find out if a Self-Managed Super Fund makes sense for your balance, goals, and risk appetite. Free, instant, no login required.",
  alternates: { canonical: `${SITE_URL}/smsf/quiz` },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "SMSF Hub", url: `${SITE_URL}/invest/smsf` },
  { name: "SMSF Suitability Quiz" },
]);

export default function SmsfQuizPage() {
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
        <HubOnboardingShell config={SMSF_ONBOARDING_CONFIG} />
      </Suspense>
    </>
  );
}
