import type { Metadata } from "next";
import { Suspense } from "react";
import NewThreadClient from "./NewThreadClient";

export const metadata: Metadata = {
  title: "New Thread - Community Forum",
  description: "Start a new discussion in the Invest.com.au community forum.",
  robots: { index: false, follow: false },
};

export default function NewThreadPage() {
  return (
    <Suspense
      fallback={
        <div className="container-custom max-w-4xl py-12">
          <div className="bg-white border border-slate-200 rounded-xl p-8 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/3 mb-6" />
            <div className="h-10 bg-slate-100 rounded mb-4" />
            <div className="h-10 bg-slate-100 rounded mb-4" />
            <div className="h-40 bg-slate-100 rounded mb-4" />
            <div className="h-10 bg-slate-200 rounded w-32" />
          </div>
        </div>
      }
    >
      <NewThreadClient />
    </Suspense>
  );
}
