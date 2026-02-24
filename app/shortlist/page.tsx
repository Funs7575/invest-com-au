import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ShortlistClient from "./ShortlistClient";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `My Brokers — Shortlist — ${SITE_NAME}`,
  description:
    "Your saved brokers. Compare your shortlisted Australian trading platforms side by side.",
  robots: { index: false, follow: false },
};

export default function ShortlistPage() {
  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
          My Brokers
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Your saved brokers. Tap the heart on any broker to add it here.
        </p>
        <ShortlistClient />
      </main>
      <Footer />
    </>
  );
}
