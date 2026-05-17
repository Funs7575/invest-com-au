import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import { WHOLESALE_ONBOARDING_CONFIG } from "@/lib/hub-onboarding-configs";
import HubOnboardingShell from "@/components/HubOnboardingShell";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Do You Qualify as a Wholesale Investor? Free 3-Question s708 Test | Invest.com.au",
  description:
    "Find out if you meet the Australian s708 wholesale investor test (net assets $2.5M or income $250k). Instantly see which wholesale products — PE, hedge funds, private credit — match your profile.",
  alternates: { canonical: `${SITE_URL}/wholesale/quiz` },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Wholesale Investing", url: `${SITE_URL}/wholesale` },
  { name: "Wholesale Investor Quiz" },
]);

export default function WholesaleQuizPage() {
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
        <HubOnboardingShell config={WHOLESALE_ONBOARDING_CONFIG} />
      </Suspense>
    </>
  );
}
