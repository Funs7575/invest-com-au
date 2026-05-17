import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import { SUPER_ONBOARDING_CONFIG } from "@/lib/hub-onboarding-configs";
import HubOnboardingShell from "@/components/HubOnboardingShell";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Is Your Super on Track? Free 3-Question Diagnostic | Invest.com.au",
  description:
    "Answer 3 quick questions to get a personalised superannuation strategy — fee reduction, extra contributions, consolidation, or transition-to-retirement planning. Free, instant, no login.",
  alternates: { canonical: `${SITE_URL}/super/quiz` },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Superannuation", url: `${SITE_URL}/super` },
  { name: "Super Strategy Quiz" },
]);

export default function SuperQuizPage() {
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
        <HubOnboardingShell config={SUPER_ONBOARDING_CONFIG} />
      </Suspense>
      <ComplianceFooter className="mt-8 mx-4" />
    </>
  );
}
