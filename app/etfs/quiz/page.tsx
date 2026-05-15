import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import { ETF_ONBOARDING_CONFIG } from "@/lib/hub-onboarding-configs";
import HubOnboardingShell from "@/components/HubOnboardingShell";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Which ETFs Suit Your Investing Style? Free 3-Question Quiz | Invest.com.au",
  description:
    "Answer 3 quick questions to find the right ETF strategy: dividend income, global growth, diversification, or simplification. Personalised Australian ETF recommendations, free and instant.",
  alternates: { canonical: `${SITE_URL}/etfs/quiz` },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "ETF Investing", url: `${SITE_URL}/etfs` },
  { name: "ETF Strategy Quiz" },
]);

export default function EtfQuizPage() {
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
        <HubOnboardingShell config={ETF_ONBOARDING_CONFIG} />
      </Suspense>
      <ComplianceFooter className="mt-8 mx-4" />
    </>
  );
}
