import type { Metadata } from "next";
import { Suspense } from "react";
import PortfolioClient from "./PortfolioClient";

export const metadata: Metadata = {
  title: "Portfolio Fee Monitor — Are You Overpaying? | Invest.com.au",
  description:
    "Track your investing platform fees in real-time. Get instant alerts when fees change or a cheaper broker appears. Free portfolio monitoring for Australian investors.",
  openGraph: {
    title: "Portfolio Fee Monitor — Invest.com.au",
    description: "Track your broker fees. Get alerts when prices change. Never overpay again.",
  },
  alternates: { canonical: "/portfolio" },
};

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-16"><div className="h-10 bg-slate-100 rounded-xl animate-pulse mb-4" /><div className="h-40 bg-slate-100 rounded-xl animate-pulse" /></div>}>
      <PortfolioClient />
    </Suspense>
  );
}
