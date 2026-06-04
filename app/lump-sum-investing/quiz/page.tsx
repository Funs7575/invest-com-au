import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_URL, breadcrumbJsonLd } from "@/lib/seo";
import HubOnboardingShell from "@/components/HubOnboardingShell";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "What Should You Do With Your Lump Sum? Free 3-Question Quiz | Invest.com.au",
  description:
    "Answer 3 quick questions to get a personalised next-step plan for your windfall — redundancy, inheritance, property sale or other. Free, instant, no login.",
  alternates: { canonical: `${SITE_URL}/lump-sum-investing/quiz` },
};

const breadcrumbs = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Lump-Sum Investing", url: `${SITE_URL}/lump-sum-investing` },
  { name: "Lump-Sum Quiz" },
]);

export default function LumpSumQuizPage() {
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
        <HubOnboardingShell configKey="lump-sum-investing" />
      </Suspense>
    </>
  );
}
