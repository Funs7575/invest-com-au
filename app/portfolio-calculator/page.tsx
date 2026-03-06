import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import PortfolioCalculatorClient from "./PortfolioCalculatorClient";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";

export const revalidate = 3600; // ISR: revalidate every hour

export const metadata = {
  title: `Portfolio Fee Calculator — How Much Are You Really Paying? (${CURRENT_YEAR})`,
  description: "Enter your trading activity and see exactly what you'd pay at every Australian broker. Find out if you're overpaying and how much you could save.",
  alternates: { canonical: "/portfolio-calculator" },
  openGraph: {
    title: "Portfolio Fee Calculator — Invest.com.au",
    description: "See exactly what you'd pay at every Australian broker. Find out if you're overpaying.",
    images: [{ url: "/api/og?title=Portfolio+Fee+Calculator&subtitle=How+much+are+you+really+paying%3F&type=default", width: 1200, height: 630 }],
  },
};

export default async function PortfolioCalculatorPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active");

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Calculators", url: absoluteUrl("/calculators") },
    { name: "Portfolio Fee Calculator" },
  ]);

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "How are broker fees calculated?", acceptedAnswer: { "@type": "Answer", text: "Fees include brokerage per trade, FX conversion costs for international shares (calculated as a round trip), and inactivity fees where applicable. The total is estimated for a full year based on your trading frequency." } },
      { "@type": "Question", name: "What's the cheapest broker in Australia?", acceptedAnswer: { "@type": "Answer", text: "It depends on your trading pattern. For ASX-only trades, brokers like Stake offer $0 brokerage. For US shares, the cheapest depends on trade size and FX costs. Use this calculator to find the cheapest for your specific situation." } },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <PortfolioCalculatorClient brokers={(brokers as Broker[]) || []} />
    </>
  );
}
