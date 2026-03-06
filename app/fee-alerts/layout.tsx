import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Broker Fee Change Alerts — Never Overpay Again",
  description: "Get instant email alerts when any Australian broker changes their fees. Free, instant notifications. Track fee changes across 30+ platforms.",
  alternates: { canonical: "/fee-alerts" },
  openGraph: {
    title: "Fee Change Alerts — Invest.com.au",
    description: "Instant email alerts when broker fees change. Never miss a price increase.",
    images: [{ url: "/api/og?title=Fee+Change+Alerts&subtitle=Never+overpay+again&type=default", width: 1200, height: 630 }],
  },
};

export default function FeeAlertsLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading...</div>}>{children}</Suspense>;
}
