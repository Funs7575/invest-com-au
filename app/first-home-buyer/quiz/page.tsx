import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import HubOnboardingShell from "@/components/HubOnboardingShell";

export const revalidate = 86400;

export const metadata: Metadata = {
  title:
    "First Home Buyer Eligibility Quiz — FHSS, FHG & State Grants | Invest.com.au",
  description:
    "Find out which first-home-buyer schemes you qualify for: FHSS, First Home Guarantee, and your state's grants and stamp-duty concessions.",
  alternates: { canonical: `${SITE_URL}/first-home-buyer/quiz` },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "First Home Buyer", url: `${SITE_URL}/first-home-buyer` },
  { name: "Eligibility Quiz" },
]);

export default function FirstHomeBuyerQuizPage() {
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
        <HubOnboardingShell configKey="first-home-buyer" />
      </Suspense>
    </>
  );
}
