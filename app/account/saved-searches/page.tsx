import type { Metadata } from "next";
import { Suspense } from "react";

import SavedSearchesClient from "./SavedSearchesClient";

export const metadata: Metadata = {
  title: "Saved Searches | My Account",
  robots: "noindex, nofollow",
};

export const dynamic = "force-dynamic";

export default function SavedSearchesPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mx-auto" />
        </div>
      }
    >
      <SavedSearchesClient />
    </Suspense>
  );
}
