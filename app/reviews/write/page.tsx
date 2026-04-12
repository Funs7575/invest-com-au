import type { Metadata } from "next";
import { Suspense } from "react";
import WriteReviewClient from "./WriteReviewClient";

export const metadata: Metadata = {
  title: "Write a Review — Earn Pro Free",
  description: "Write a verified review of an Australian broker and earn 1 month of Investor Pro free. Share your honest experience.",
  robots: "noindex, nofollow",
};

export default function WriteReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mx-auto" />
        </div>
      }
    >
      <WriteReviewClient />
    </Suspense>
  );
}
