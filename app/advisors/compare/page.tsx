import type { Metadata } from "next";
import { Suspense } from "react";
import AdvisorCompareClient from "./AdvisorCompareClient";

export const metadata: Metadata = {
  title: "Compare Financial Advisors — Invest.com.au",
  description: "Side-by-side comparison of your saved Australian financial advisors. Compare fees, specialties, reviews, and credentials.",
  robots: { index: false, follow: false },
};

export default function AdvisorComparePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 pt-5 pb-10 md:pt-10 md:pb-14">
      <Suspense
        fallback={
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-72 bg-slate-200 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-80 bg-slate-100 rounded-2xl" />
              ))}
            </div>
          </div>
        }
      >
        <AdvisorCompareClient />
      </Suspense>
    </div>
  );
}
