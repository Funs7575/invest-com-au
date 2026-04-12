import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import FeeSimulatorClient from "./FeeSimulatorClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Interactive Fee Simulator — Compare Broker Costs in Real Time (${CURRENT_YEAR})`,
  description:
    "Drag sliders to instantly compare annual brokerage costs across every Australian platform. See how trades, trade size, and US allocation affect your fees.",
  alternates: { canonical: "/fee-simulator" },
  openGraph: {
    title: "Interactive Fee Simulator — Compare Broker Costs in Real Time",
    description:
      "Drag sliders to instantly compare annual brokerage costs across every Australian platform.",
    images: [
      {
        url: "/api/og?title=Fee+Simulator&subtitle=Compare+Broker+Costs+in+Real+Time&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default async function FeeSimulatorPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "id, slug, name, color, icon, logo_url, platform_type, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, inactivity_fee, rating, affiliate_url, chess_sponsored, pros, deal, deal_text, cta_text, benefit_cta"
    )
    .eq("status", "active")
    .in("platform_type", ["share_broker", "cfd_forex"])
    .order("rating", { ascending: false });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `Interactive Fee Simulator — ${SITE_NAME}`,
    description:
      "Compare annual brokerage costs across Australian investment platforms in real time.",
    url: "https://invest.com.au/fee-simulator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FeeSimulatorClient
        brokers={(brokers || []) as import("@/lib/types").Broker[]}
      />
    </>
  );
}
