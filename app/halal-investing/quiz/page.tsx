import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import HubOnboardingShell from "@/components/HubOnboardingShell";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Which Halal Investment Pathway Fits You? Free 3-Question Quiz | Invest.com.au",
  description:
    "3 questions to find your Sharia-compliant investment approach — super (Crescent Wealth), home finance (MCCA), or shares (AAOIFI-screened ETFs).",
  alternates: { canonical: `${SITE_URL}/halal-investing/quiz` },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Halal Investing", url: `${SITE_URL}/halal-investing` },
  { name: "Halal Investing Quiz" },
]);

export default function HalalInvestingQuizPage() {
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
        <HubOnboardingShell configKey="halal-investing" />
      </Suspense>
    </>
  );
}
