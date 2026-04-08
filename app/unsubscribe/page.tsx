import type { Metadata } from "next";
import { Suspense } from "react";
import UnsubscribeClient from "./UnsubscribeClient";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Manage your email preferences or unsubscribe from Invest.com.au emails.",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 md:py-24">
      <Suspense fallback={<div className="animate-pulse h-32 bg-slate-100 rounded-xl" />}>
        <UnsubscribeClient />
      </Suspense>
    </div>
  );
}
