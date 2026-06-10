import type { Metadata } from "next";
import { Suspense } from "react";
import AdvisorShortlistClient from "./AdvisorShortlistClient";

export const metadata: Metadata = {
  title: "My Saved Advisors",
  description: "Your saved financial advisors. Compare up to 4 advisors side by side.",
  robots: { index: false, follow: false },
};

export default function AdvisorShortlistPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-3 pb-6 md:pt-4 md:pb-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-lg md:text-xl font-extrabold text-slate-900">My Saved Advisors</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-0.5">
          Tap the bookmark on any advisor to save them here. Compare up to 4 side by side.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        }
      >
        <AdvisorShortlistClient />
      </Suspense>
    </div>
  );
}
