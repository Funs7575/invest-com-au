import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import { CRYPTO_ONBOARDING_CONFIG } from "@/lib/hub-onboarding-configs";
import HubOnboardingShell from "@/components/HubOnboardingShell";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "What Crypto Strategy Suits You? Free 3-Question Quiz | Invest.com.au",
  description:
    "Answer 3 quick questions to find the right cryptocurrency approach for your experience level, goals, and risk tolerance. Free, instant, no login.",
  alternates: { canonical: `${SITE_URL}/crypto/quiz` },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Cryptocurrency", url: `${SITE_URL}/crypto` },
  { name: "Crypto Strategy Quiz" },
]);

export default function CryptoQuizPage() {
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
        <HubOnboardingShell config={CRYPTO_ONBOARDING_CONFIG} />
      </Suspense>
      <ComplianceFooter className="mt-8 mx-4" />
    </>
  );
}
