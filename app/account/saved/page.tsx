import type { Metadata } from "next";
import { Suspense } from "react";
import SavedComparisonsClient from "./SavedComparisonsClient";

export const metadata: Metadata = {
  title: "Saved Comparisons | My Account",
  robots: "noindex, nofollow",
};

export default function SavedComparisonsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mx-auto" />
        </div>
      }
    >
      <SavedComparisonsClient />
    </Suspense>
  );
}
