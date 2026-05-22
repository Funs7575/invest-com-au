import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import SwitchingCalculatorClient from "./SwitchingCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";
import CalcToPlanBridge from "@/components/get-matched/CalcToPlanBridge";

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

const switchingFaqLd = faqJsonLd([
  {
    q: "How do I calculate the cost of switching brokers?",
    a: "Enter your average trade size, number of trades per month, and approximate portfolio value. The calculator computes your annual brokerage at your current platform and at every alternative, showing you the exact annual savings from switching. Don't forget to include one-off switching costs: CHESS transfer ($0 for most brokers today) and any exit fees.",
  },
  {
    q: "What are the hidden costs of switching Australian brokers?",
    a: "The main costs are: brokerage on selling positions you can't CHESS-transfer (some brokers hold shares in a custodial structure requiring sale rather than transfer), potential capital gains tax triggered by selling (check your cost-base), any inactivity or account-closure fees, and FX conversion if holding USD positions. CHESS-sponsored brokers (e.g. CommSec, SelfWealth, Pearler) allow free CHESS transfers — your holdings move without selling.",
  },
  {
    q: "Can I transfer shares directly to a new broker without selling?",
    a: "Yes, via CHESS transfer — but only between CHESS-sponsored brokers. If you move from a CHESS broker to a custodian (like Stake, eToro, Superhero HIN-less), you must sell first. Moving between two CHESS brokers is free via CHESS participant transfer, takes 3-5 business days, and has no tax event.",
  },
  {
    q: "How much can I save per year by switching to a cheaper broker?",
    a: "Savings depend heavily on trade frequency and size. An active trader making 20 ASX trades/month at $20 brokerage ($4,800/yr) switching to a $3 flat-fee broker saves ~$4,140/yr. A buy-and-hold investor making 2 trades/month saves ~$370/yr. The bigger your trade frequency and the higher your current fee, the larger the annual saving.",
  },
  {
    q: "What is the best broker for infrequent investors in Australia?",
    a: "For investors who trade less than once a month, the key metrics are: minimum fee per trade, inactivity fees (CommSec, NAB Trade, ANZ Share Investing all charge these), and whether the platform is CHESS-sponsored. Pearler ($6.50/trade, no inactivity fee, CHESS), SelfWealth ($9.50/trade, CHESS), and Moomoo (0 brokerage on first 90 days, then $3/trade) are consistently competitive for low-frequency investors.",
  },
]);

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(switchingFaqLd) }} />
      <SwitchingCalculatorClient brokers={(brokers || []) as import("@/lib/types").Broker[]} />
      <div className="container-custom pb-8">
        <CalcToPlanBridge
          goal="grow"
          headline="Want a personalised broker shortlist?"
          subtitle="Answer 5-7 quick questions — we'll match you with the right broker for your goal, budget, and experience."
        />
        <ComplianceFooter variant="calculator" />
      </div>

    </>
  );
}
