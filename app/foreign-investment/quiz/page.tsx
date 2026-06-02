import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import HubOnboardingShell from "@/components/HubOnboardingShell";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "What Type of Overseas Investor Are You? Free 3-Question Quiz | Invest.com.au",
  description:
    "Non-resident, expat, new migrant or visa holder? Answer 3 questions to get guidance on Australian shares, property, super and banking tailored to your situation.",
  alternates: { canonical: `${SITE_URL}/foreign-investment/quiz` },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
  { name: "Overseas Investor Quiz" },
]);

export default function ForeignInvestmentQuizPage() {
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
        <HubOnboardingShell configKey="foreign-investment" />
      </Suspense>
    </>
  );
}
