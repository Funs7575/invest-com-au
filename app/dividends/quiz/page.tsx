import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import { DIVIDENDS_ONBOARDING_CONFIG } from "@/lib/hub-onboarding-configs";
import HubOnboardingShell from "@/components/HubOnboardingShell";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Which Dividend Investing Strategy Suits You? | Invest.com.au",
  description:
    "3-question diagnostic to find your best ASX dividend approach — income, growth, or franking-credit maximisation in SMSF or pension phase.",
  alternates: { canonical: `${SITE_URL}/dividends/quiz` },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Dividends Hub", url: `${SITE_URL}/dividends` },
  { name: "Dividend Strategy Quiz" },
]);

export default function DividendsQuizPage() {
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
        <HubOnboardingShell config={DIVIDENDS_ONBOARDING_CONFIG} />
      </Suspense>
    </>
  );
}
