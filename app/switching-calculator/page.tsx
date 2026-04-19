import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import SwitchingCalculatorClient from "./SwitchingCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Switching Cost Calculator — How Much Could You Save? (${CURRENT_YEAR})`,
  description: "Find out exactly how much you're overpaying with your current broker. Enter your trades and see the annual savings from switching to a cheaper platform.",
  alternates: { canonical: "/switching-calculator" },
  openGraph: {
    title: "Broker Switching Calculator — Save Up to $2,000/Year",
    description: "Enter your trades, see your exact annual cost at every broker, and find out how much you'd save by switching.",
    images: [{ url: "/api/og?title=Switching+Calculator&subtitle=How+much+are+you+overpaying%3F&type=default", width: 1200, height: 630 }],
  },
};

export default async function SwitchingCalculatorPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, slug, name, platform_type, asx_fee, us_fee, fx_rate, inactivity_fee, rating, affiliate_url, logo_url, chess_sponsored, smsf_support, fee_last_checked, fee_verified_date")
    .eq("status", "active")
    .in("platform_type", ["share_broker", "cfd_forex"])
    .order("rating", { ascending: false });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `Broker Switching Calculator — ${SITE_NAME}`,
    description: "Calculate how much you could save by switching to a cheaper Australian broker.",
    url: "https://invest.com.au/switching-calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SwitchingCalculatorClient brokers={(brokers || []) as import("@/lib/types").Broker[]} />
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
