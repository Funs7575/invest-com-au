import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import HubOnboardingShell from "@/components/HubOnboardingShell";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Where Are You in Your Business Exit? Free 3-Question Quiz | Invest.com.au",
  description:
    "Answer 3 quick questions to get a personalised exit-planning next step — maximise price, minimise CGT, fast sale, or legacy. Free, instant, no login.",
  alternates: { canonical: `${SITE_URL}/sell-business/quiz` },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Sell a Business", url: `${SITE_URL}/sell-business` },
  { name: "Business Exit Quiz" },
]);

export default function SellBusinessQuizPage() {
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
        <HubOnboardingShell configKey="sell-business" />
      </Suspense>
    </>
  );
}
