import type { Metadata } from "next";
import ShortlistClient from "./ShortlistClient";

export const metadata: Metadata = {
  title: "My Brokers — Shortlist",
  description:
    "Your saved brokers. Compare your shortlisted Australian trading platforms side by side.",
  robots: { index: false, follow: false },
};

export default function ShortlistPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-5 pb-8 md:pt-10 md:pb-12">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold text-slate-900">
            My Brokers
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Tap the heart on any broker to save it here.
          </p>
        </div>
      </div>
      <ShortlistClient />
    </div>
  );
}
