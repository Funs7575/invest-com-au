import type { Metadata } from "next";
import { Suspense } from "react";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Shortlisted Brokers",
  description:
    "Side-by-side detailed comparison of your shortlisted Australian brokers.",
  robots: { index: false, follow: false },
};

export default function ShortlistComparePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 pt-5 pb-8 md:pt-10 md:pb-12">
      <Suspense
        fallback={
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-slate-200 rounded mb-4" />
            <div className="h-96 bg-slate-100 rounded-xl" />
          </div>
        }
      >
        <CompareClient />
      </Suspense>
    </div>
  );
}
