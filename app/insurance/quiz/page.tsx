import { Suspense } from "react";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import HubOnboardingShell from "@/components/HubOnboardingShell";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "What Insurance Do I Need? — Insurance Diagnostic Quiz | Invest.com.au",
  description:
    "Answer 3 quick questions to find out which insurance cover is most important for your situation — life, income protection, health, or home and contents.",
  alternates: { canonical: `${SITE_URL}/insurance/quiz` },
  openGraph: {
    title: "What Insurance Do I Need?",
    description:
      "3-question diagnostic quiz to identify the right insurance cover for your life situation.",
    url: `${SITE_URL}/insurance/quiz`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Insurance Needs Assessment")}&sub=${encodeURIComponent("What Cover Do You Need · Personalised · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Insurance", url: `${SITE_URL}/insurance` },
  { name: "Insurance Diagnostic Quiz" },
]);

export default function InsuranceQuizPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <div role="status" aria-label="Loading" className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <HubOnboardingShell configKey="insurance" />
      </Suspense>
    </>
  );
}
