import type { Metadata } from "next";
import UnsubscribeClient from "./UnsubscribeClient";

export const metadata: Metadata = {
  title: "Unsubscribe — Invest.com.au",
  description: "Manage your email preferences or unsubscribe from Invest.com.au emails.",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16 md:py-24">
      <UnsubscribeClient />
    </div>
  );
}
