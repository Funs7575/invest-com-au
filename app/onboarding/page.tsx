import type { Metadata } from "next";
import { Suspense } from "react";
import OnboardingClient from "./OnboardingClient";

export const metadata: Metadata = {
  title: "Welcome to Invest.com.au",
  robots: "noindex, nofollow",
};

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mx-auto" />
        </div>
      }
    >
      <OnboardingClient />
    </Suspense>
  );
}
