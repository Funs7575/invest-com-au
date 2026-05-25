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

export default async function SwitchingCalculatorPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, slug, name, platform_type, asx_fee, us_fee, fx_rate, inactivity_fee, rating, affiliate_url, logo_url, chess_sponsored, smsf_support, fee_last_checked, fee_verified_date")
    .eq("status", "active")
    .in("platform_type", ["share_broker", "cfd_forex"])
    .order("rating", { ascending: false });

  const switchingFaqLd = faqJsonLd([
    {
      q: "How much could I save by switching brokers?",
      a: "Savings depend on how many trades you make and which platforms you compare. A frequent trader doing 20 ASX trades per year at $19.95 per trade pays roughly $400 annually in brokerage. Switching to a $0 brokerage platform saves that entire amount. For occasional investors, the difference is smaller but still meaningful.",
    },
    {
      q: "How do I transfer my shares to a new broker?",
      a: "If your shares are CHESS-sponsored, you can initiate an off-market transfer (also called a broker-to-broker transfer) through your new broker. You provide your Holder Identification Number (HIN), and the shares move within 3–5 business days. There is usually no cost for CHESS transfers, though some brokers charge a small fee per line of stock.",
    },
    {
      q: "What is CHESS sponsorship and why does it matter when switching?",
      a: "CHESS sponsorship means your ASX shares are registered in your name on the ASX subregister with a unique HIN. If your broker fails, your shares remain yours and can be transferred to a new broker immediately. Custodian-held (non-CHESS) shares are legally owned by the broker on your behalf, creating counterparty risk.",
    },
    {
      q: "Are brokerage fees the only cost of trading?",
      a: "No. Other costs include market impact (especially for thinly traded shares), currency conversion fees on US and international trades (typically 0.5% to 1%), inactivity fees if your account goes dormant, and any account-keeping fees. The total cost of ownership can be much higher than the headline brokerage rate.",
    },
  ]);

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
