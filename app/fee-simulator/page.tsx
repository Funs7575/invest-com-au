import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { absoluteUrl, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
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

const softwareAppLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `Interactive Fee Simulator — ${SITE_NAME}`,
  description:
    "Compare annual brokerage costs across Australian investment platforms in real time.",
  url: absoluteUrl("/fee-simulator"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const feeSimFaqLd = faqJsonLd([
  {
    q: "How do I compare broker fees in Australia?",
    a: "Use sliders to set your average trade size, number of trades per month, and US share allocation. The simulator instantly recalculates annual brokerage + FX costs across every major Australian platform — Moomoo, Pearler, SelfWealth, CMC Markets, Commsec, Tiger Brokers, Interactive Brokers, and more. The cheapest broker depends entirely on your trade frequency and size — no single platform wins for all profiles.",
  },
  {
    q: "Why do FX fees matter more than brokerage for US shares?",
    a: "For US share trades over $5,000, currency conversion fees (FX margin) typically cost more than brokerage. A $10,000 US trade at 0.6% FX margin costs $60 in conversion — double a $30 flat-fee brokerage. Interactive Brokers charges 0.002% FX conversion (about $0.20 per $10,000), which is why it dominates for larger US share traders. Brokers rarely advertise FX margins prominently — always factor them into your total cost.",
  },
  {
    q: "What is an inactivity fee and which Australian brokers charge one?",
    a: "An inactivity fee is charged when you don't trade for a set period (typically 12 months). CommsecPocket, NAB Trade, and ANZ Share Investing have historically charged inactivity fees of $10–$25 per quarter. Most modern low-cost platforms (Pearler, SelfWealth, Moomoo, Stake) have dropped inactivity fees entirely. If you're a buy-and-hold investor who trades infrequently, check whether your current platform charges one — it can add $50–$100/year in avoidable costs.",
  },
  {
    q: "How much does brokerage cost per year for an average Australian investor?",
    a: "An investor who makes 2 ASX trades per month at $5,000 each pays roughly $156–$480/year in brokerage depending on platform ($6.50–$20 per trade). An active trader making 20 trades/month at the same size pays $1,560–$4,800/year. US share trading adds FX costs: the same 2 trades/month at $5,000 USD each adds $120–$600/year in conversion depending on broker. The fee simulator lets you model your exact profile.",
  },
  {
    q: "Is the cheapest broker always the best choice?",
    a: "Not necessarily. Total cost includes brokerage + FX fees + inactivity fees + platform fees (if any). Beyond cost, consider: CHESS sponsorship (shares in your name, protects from broker insolvency), research tools, order types (limit orders, stop-loss), SMSF account support, and international market access. A broker saving $200/year but lacking CHESS or advanced order types may not be right for every investor.",
  },
]);

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(feeSimFaqLd) }}
      />
      <FeeSimulatorClient
        brokers={(brokers || []) as import("@/lib/types").Broker[]}
      />
    </>
  );
}
