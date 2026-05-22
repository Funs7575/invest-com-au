import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  SITE_NAME,
} from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import ShouldISwitchClient from "./ShouldISwitchClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Should I Switch Broker? Savings Calculator (${CURRENT_YEAR}) — ${SITE_NAME}`,
  description:
    "See how much you'd save per year by switching Australian broker. Enter your current platform, trade size, and frequency — we compute the annual cost across every major broker and rank the top three cheapest alternatives.",
  alternates: { canonical: "/tools/should-i-switch" },
  openGraph: {
    title: "Should I Switch Broker? — Annual Savings Calculator",
    description:
      "Compare your current broker against every Australian platform. Live brokerage + FX math shows exactly how much you'd save by switching.",
    url: absoluteUrl("/tools/should-i-switch"),
    images: [
      {
        url: "/api/og?title=Should+I+Switch+Broker%3F&subtitle=Annual+Savings+Calculator&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const appLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `Should I Switch Broker? — ${SITE_NAME}`,
  description:
    "Free interactive tool that calculates your annual broker cost and ranks the cheapest alternatives for your trading profile.",
  url: absoluteUrl("/tools/should-i-switch"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const switchFaqLd = faqJsonLd([
  {
    q: "When should I switch brokers in Australia?",
    a: "Consider switching if: your current brokerage fee is more than double the cheapest alternative for your trade size; you're being charged inactivity fees; you need features your current broker lacks (e.g. CHESS sponsorship, US shares, fractional shares); or your broker's platform reliability is poor. Run the numbers first — annual savings must exceed one-off switching costs (possible capital gains events, transfer fees) within 2-3 years.",
  },
  {
    q: "Does switching brokers trigger capital gains tax?",
    a: "Only if you sell holdings rather than transfer them. CHESS-to-CHESS transfers (between CHESS-sponsored brokers like CommSec, SelfWealth, Pearler, CMC) involve no sale — shares move with their original cost base intact. If you move from a CHESS broker to a custodian (Stake, Superhero, eToro), you must sell and rebuy, triggering a CGT event on any gains. Always check whether both platforms are CHESS-sponsored before switching.",
  },
  {
    q: "Which Australian broker has the lowest fees?",
    a: "For most retail investors making less than 5 trades/month, the cheapest CHESS-sponsored options are Pearler ($6.50/trade) and SelfWealth ($9.50/trade). For active traders (daily/weekly), Moomoo ($3/trade), CMC Markets ($0 for <$1k trades), and Tiger Brokers ($1.99 + 0.08% ASX) are consistently cheapest. Always verify the current fee schedule directly — brokerage changes without notice.",
  },
  {
    q: "What is CHESS sponsorship and why does it matter?",
    a: "CHESS (Clearing House Electronic Subregister System) sponsorship means your shares are registered directly in your name with a Holder Identification Number (HIN), backed by the ASX. If your broker becomes insolvent, your shares are protected — they're yours, not the broker's. Custodian structures (common with newer fintech brokers) hold shares in an omnibus account; you have a beneficial interest but face counterparty risk if the broker fails. Most experienced investors prefer CHESS for any significant holding.",
  },
  {
    q: "How long does a broker transfer take in Australia?",
    a: "A CHESS-to-CHESS HIN transfer typically takes 3-5 business days. The process involves completing the receiving broker's transfer-in form with your current HIN and SRN (Securityholder Reference Number). Some brokers charge a small processing fee ($55-$110); most have dropped fees in recent years. There is no trading restriction during the transfer — your holdings are just temporarily locked.",
  },
]);

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  {
    name: "Should I Switch Broker?",
    url: absoluteUrl("/tools/should-i-switch"),
  },
]);

function Loading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-6 w-64 bg-slate-100 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default async function ShouldISwitchPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, inactivity_fee, cta_text, benefit_cta, affiliate_url, sponsorship_tier, status, platform_type",
    )
    .eq("status", "active")
    .eq("is_crypto", false)
    .order("name");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(switchFaqLd) }}
      />
      <Suspense fallback={<Loading />}>
        <ShouldISwitchClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
