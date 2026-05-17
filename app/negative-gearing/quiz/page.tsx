import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import { NEGATIVE_GEARING_ONBOARDING_CONFIG } from "@/lib/hub-onboarding-configs";
import HubOnboardingShell from "@/components/HubOnboardingShell";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Is Negative Gearing Right for You? Free 3-Question Tax Quiz | Invest.com.au",
  description:
    "Answer 3 quick questions to find out whether the negative gearing tax maths works at your income level — property, shares, or both. Free, instant, no login.",
  alternates: { canonical: `${SITE_URL}/negative-gearing/quiz` },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Negative Gearing", url: `${SITE_URL}/negative-gearing` },
  { name: "Negative Gearing Quiz" },
]);

export default function NegativeGearingQuizPage() {
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
        <HubOnboardingShell config={NEGATIVE_GEARING_ONBOARDING_CONFIG} />
      </Suspense>
    </>
  );
}
